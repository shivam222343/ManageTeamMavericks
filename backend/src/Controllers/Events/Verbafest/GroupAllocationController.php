<?php
namespace App\Controllers\Events\Verbafest;

use App\Database;
use App\Router;
use App\Services\Events\Verbafest\VerbafestAuth;
use App\Services\Events\Verbafest\ConflictDetectionService;
use PDO;

class GroupAllocationController {
    private PDO $db;
    private ConflictDetectionService $conflictService;

    public function __construct() {
        $this->db = Database::getConnection();
        $this->conflictService = new ConflictDetectionService($this->db);
    }

    /**
     * GET /events/verbafest/allocations
     * List allocations with filters.
     */
    public function list(): void {
        VerbafestAuth::requireUser();

        $where = [];
        $params = [];

        if (!empty($_GET['event_type'])) {
            $where[] = "ga.event_type = ?";
            $params[] = trim($_GET['event_type']);
        }
        if (!empty($_GET['group_code'])) {
            $where[] = "ga.group_code = ?";
            $params[] = trim($_GET['group_code']);
        }
        if (!empty($_GET['slot_id'])) {
            $where[] = "ga.slot_id = ?";
            $params[] = (int)$_GET['slot_id'];
        }
        if (!empty($_GET['panel_id'])) {
            $where[] = "ga.panel_id = ?";
            $params[] = (int)$_GET['panel_id'];
        }
        if (!empty($_GET['participant_id'])) {
            $where[] = "ga.participant_id = ?";
            $params[] = (int)$_GET['participant_id'];
        }
        if (!empty($_GET['attendance_status'])) {
            $where[] = "ga.attendance_status = ?";
            $params[] = trim($_GET['attendance_status']);
        }

        $whereSql = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";

        $sql = "
            SELECT 
                ga.id, ga.group_code, ga.event_type, ga.participant_id, ga.slot_id, ga.panel_id,
                ga.attendance_status, ga.allocated_at,
                p.participant_code, p.full_name, p.email, p.phone, p.college,
                s.slot_code, s.slot_label, s.start_time, s.end_time,
                pn.panel_code, pn.name AS panel_name,
                r.room_code, r.name AS room_name
            FROM vf_group_allocations ga
            JOIN vf_participants p ON ga.participant_id = p.id
            JOIN vf_schedule_slots s ON ga.slot_id = s.id
            LEFT JOIN vf_panels pn ON ga.panel_id = pn.id
            LEFT JOIN vf_rooms r ON (pn.room_id = r.id OR s.room_id = r.id)
            {$whereSql}
            ORDER BY s.start_time ASC, ga.group_code ASC, p.participant_code ASC
        ";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $allocations = $stmt->fetchAll(PDO::FETCH_ASSOC);

        Router::sendJson(['data' => $allocations]);
    }

    /**
     * GET /events/verbafest/allocations/{id}
     */
    public function get(array $params): void {
        VerbafestAuth::requireUser();
        $id = (int)($params['id'] ?? 0);

        $sql = "
            SELECT 
                ga.id, ga.group_code, ga.event_type, ga.participant_id, ga.slot_id, ga.panel_id,
                ga.attendance_status, ga.allocated_at,
                p.participant_code, p.full_name, p.email, p.phone, p.college,
                s.slot_code, s.slot_label, s.start_time, s.end_time,
                pn.panel_code, pn.name AS panel_name, pn.capacity AS panel_capacity,
                r.room_code, r.name AS room_name
            FROM vf_group_allocations ga
            JOIN vf_participants p ON ga.participant_id = p.id
            JOIN vf_schedule_slots s ON ga.slot_id = s.id
            LEFT JOIN vf_panels pn ON ga.panel_id = pn.id
            LEFT JOIN vf_rooms r ON (pn.room_id = r.id OR s.room_id = r.id)
            WHERE ga.id = ?
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        $alloc = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$alloc) {
            Router::sendJson(['error' => 'Group allocation not found.'], 404);
        }

        Router::sendJson(['data' => $alloc]);
    }

    /**
     * POST /events/verbafest/allocations
     * Create group allocation with comprehensive validation and conflict detection.
     */
    public function create(): void {
        VerbafestAuth::requireManager();

        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            Router::sendJson(['error' => 'Invalid JSON payload.'], 400);
        }

        $groupCode = trim($input['group_code'] ?? '');
        $eventType = trim($input['event_type'] ?? '');
        $participantId = (int)($input['participant_id'] ?? 0);
        $slotId = (int)($input['slot_id'] ?? 0);
        $panelId = !empty($input['panel_id']) ? (int)$input['panel_id'] : null;
        $attendance = trim($input['attendance_status'] ?? 'pending');

        $validEvents = ['gd', 'debate', 'mindsaga'];
        $validAttendance = ['pending', 'present', 'absent'];

        if (empty($groupCode)) {
            Router::sendJson(['error' => 'group_code is required.'], 400);
        }
        if (!in_array($eventType, $validEvents, true)) {
            Router::sendJson(['error' => "Invalid event_type. Must be 'gd', 'debate', or 'mindsaga'."], 400);
        }
        if ($participantId <= 0) {
            Router::sendJson(['error' => 'A valid participant_id is required.'], 400);
        }
        if ($slotId <= 0) {
            Router::sendJson(['error' => 'A valid slot_id is required.'], 400);
        }
        if (!in_array($attendance, $validAttendance, true)) {
            Router::sendJson(['error' => 'Invalid attendance_status.'], 400);
        }

        // 1. Verify participant exists
        $pStmt = $this->db->prepare("SELECT * FROM vf_participants WHERE id = ?");
        $pStmt->execute([$participantId]);
        $participant = $pStmt->fetch(PDO::FETCH_ASSOC);
        if (!$participant) {
            Router::sendJson(['error' => "Participant with ID {$participantId} does not exist."], 404);
        }

        // 2. Verify participant registration flag
        $isEligible = match ($eventType) {
            'gd' => (bool)$participant['reg_gd'],
            'debate' => (bool)$participant['reg_debate'],
            'mindsaga' => (bool)$participant['reg_mindsaga'],
            default => false
        };

        if (!$isEligible) {
            Router::sendJson([
                'error' => "Participant '{$participant['full_name']}' ({$participant['participant_code']}) is not registered for " . strtoupper($eventType) . "."
            ], 422);
        }

        // 3. Verify slot exists
        $sStmt = $this->db->prepare("SELECT * FROM vf_schedule_slots WHERE id = ?");
        $sStmt->execute([$slotId]);
        $slot = $sStmt->fetch(PDO::FETCH_ASSOC);
        if (!$slot) {
            Router::sendJson(['error' => "Schedule slot with ID {$slotId} does not exist."], 404);
        }

        // 4 & 5. Verify slot event_type matches allocation event_type
        if ($slot['event_type'] !== $eventType) {
            Router::sendJson([
                'error' => "Event mismatch: Schedule slot is for '{$slot['event_type']}', but requested allocation is for '{$eventType}'."
            ], 422);
        }

        // Auto-assign panel from slot if slot specifies a panel and panelId was omitted
        if ($panelId === null && !empty($slot['panel_id'])) {
            $panelId = (int)$slot['panel_id'];
        }

        // 4 & 5. Verify panel exists when required
        if (in_array($eventType, ['gd', 'debate'], true)) {
            if ($panelId === null) {
                Router::sendJson(['error' => "A panel_id is required for " . strtoupper($eventType) . " allocations."], 400);
            }

            $panStmt = $this->db->prepare("SELECT * FROM vf_panels WHERE id = ?");
            $panStmt->execute([$panelId]);
            $panel = $panStmt->fetch(PDO::FETCH_ASSOC);
            if (!$panel) {
                Router::sendJson(['error' => "Panel with ID {$panelId} does not exist."], 404);
            }

            if ($panel['event_type'] !== $eventType) {
                Router::sendJson([
                    'error' => "Event mismatch: Panel '{$panel['panel_code']}' is a '{$panel['event_type']}' panel, but requested allocation is for '{$eventType}'."
                ], 422);
            }

            // 6. Verify panel capacity
            $capStmt = $this->db->prepare("
                SELECT COUNT(*) FROM vf_group_allocations
                WHERE panel_id = ? AND slot_id = ?
            ");
            $capStmt->execute([$panelId, $slotId]);
            $currentAllocCount = (int)$capStmt->fetchColumn();

            if ($currentAllocCount >= (int)$panel['capacity']) {
                Router::sendJson([
                    'error' => "Panel capacity exceeded: Panel '{$panel['name']}' has max capacity of {$panel['capacity']}, which is already reached for this slot ({$currentAllocCount} allocated)."
                ], 409);
            }
        }

        // 7. Verify unique constraint: (participant_id, event_type)
        $uniqStmt = $this->db->prepare("SELECT id, group_code FROM vf_group_allocations WHERE participant_id = ? AND event_type = ?");
        $uniqStmt->execute([$participantId, $eventType]);
        $existingAlloc = $uniqStmt->fetch(PDO::FETCH_ASSOC);
        if ($existingAlloc) {
            Router::sendJson([
                'error' => "Participant is already allocated to a " . strtoupper($eventType) . " group ('{$existingAlloc['group_code']}').",
                'existing_allocation_id' => (int)$existingAlloc['id']
            ], 409);
        }

        // 8 & 9. Run participant conflict detection with buffer rules
        $conflict = $this->conflictService->checkParticipantConflict($participantId, $slotId);
        if ($conflict['has_conflict']) {
            Router::sendJson([
                'error' => "Scheduling conflict detected: {$conflict['reason']}",
                'conflict' => $conflict
            ], 409);
        }

        // 10. Write transactionally
        $this->db->beginTransaction();
        try {
            $ins = $this->db->prepare("
                INSERT INTO vf_group_allocations (group_code, event_type, participant_id, slot_id, panel_id, attendance_status)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $ins->execute([$groupCode, $eventType, $participantId, $slotId, $panelId, $attendance]);
            $newId = (int)$this->db->lastInsertId();

            $this->db->commit();

            Router::sendJson([
                'message' => 'Group allocation created successfully.',
                'data' => [
                    'id' => $newId,
                    'group_code' => $groupCode,
                    'event_type' => $eventType,
                    'participant_id' => $participantId,
                    'slot_id' => $slotId,
                    'panel_id' => $panelId,
                    'attendance_status' => $attendance
                ]
            ], 201);
        } catch (\Throwable $e) {
            $this->db->rollBack();
            Router::sendJson(['error' => 'Failed to create group allocation: ' . $e->getMessage()], 500);
        }
    }

    /**
     * PUT /events/verbafest/allocations/{id}
     * Update an allocation with full conflict and capacity re-validation.
     */
    public function update(array $params): void {
        VerbafestAuth::requireManager();
        $id = (int)($params['id'] ?? 0);

        $stmt = $this->db->prepare("SELECT * FROM vf_group_allocations WHERE id = ?");
        $stmt->execute([$id]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$existing) {
            Router::sendJson(['error' => 'Group allocation not found.'], 404);
        }

        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            Router::sendJson(['error' => 'Invalid JSON payload.'], 400);
        }

        $groupCode = trim($input['group_code'] ?? $existing['group_code']);
        $slotId = isset($input['slot_id']) ? (int)$input['slot_id'] : (int)$existing['slot_id'];
        $panelId = array_key_exists('panel_id', $input)
            ? (empty($input['panel_id']) ? null : (int)$input['panel_id'])
            : ($existing['panel_id'] ? (int)$existing['panel_id'] : null);
        $attendance = trim($input['attendance_status'] ?? $existing['attendance_status']);
        $eventType = $existing['event_type'];
        $participantId = (int)$existing['participant_id'];

        $validAttendance = ['pending', 'present', 'absent'];
        if (!in_array($attendance, $validAttendance, true)) {
            Router::sendJson(['error' => 'Invalid attendance_status.'], 400);
        }

        // Verify slot exists and matches event_type
        $sStmt = $this->db->prepare("SELECT * FROM vf_schedule_slots WHERE id = ?");
        $sStmt->execute([$slotId]);
        $slot = $sStmt->fetch(PDO::FETCH_ASSOC);
        if (!$slot) {
            Router::sendJson(['error' => "Schedule slot with ID {$slotId} does not exist."], 404);
        }
        if ($slot['event_type'] !== $eventType) {
            Router::sendJson(['error' => "Schedule slot is for '{$slot['event_type']}', but allocation is for '{$eventType}'."], 422);
        }

        // Auto-assign panel from slot if missing
        if ($panelId === null && !empty($slot['panel_id'])) {
            $panelId = (int)$slot['panel_id'];
        }

        // Verify panel for GD and Debate
        if (in_array($eventType, ['gd', 'debate'], true)) {
            if ($panelId === null) {
                Router::sendJson(['error' => "A panel_id is required for " . strtoupper($eventType) . " allocations."], 400);
            }

            $panStmt = $this->db->prepare("SELECT * FROM vf_panels WHERE id = ?");
            $panStmt->execute([$panelId]);
            $panel = $panStmt->fetch(PDO::FETCH_ASSOC);
            if (!$panel) {
                Router::sendJson(['error' => "Panel with ID {$panelId} does not exist."], 404);
            }
            if ($panel['event_type'] !== $eventType) {
                Router::sendJson(['error' => "Panel is for '{$panel['event_type']}', but allocation is for '{$eventType}'."], 422);
            }

            // Verify capacity (excluding this allocation itself)
            $capStmt = $this->db->prepare("
                SELECT COUNT(*) FROM vf_group_allocations
                WHERE panel_id = ? AND slot_id = ? AND id != ?
            ");
            $capStmt->execute([$panelId, $slotId, $id]);
            $currentAllocCount = (int)$capStmt->fetchColumn();

            if ($currentAllocCount >= (int)$panel['capacity']) {
                Router::sendJson([
                    'error' => "Panel capacity exceeded: Panel has max capacity of {$panel['capacity']}, currently at {$currentAllocCount}."
                ], 409);
            }
        }

        // Check scheduling conflicts (ignoring current allocation)
        if ($slotId !== (int)$existing['slot_id']) {
            $conflict = $this->conflictService->checkParticipantConflict($participantId, $slotId, $id);
            if ($conflict['has_conflict']) {
                Router::sendJson([
                    'error' => "Scheduling conflict detected: {$conflict['reason']}",
                    'conflict' => $conflict
                ], 409);
            }
        }

        $this->db->beginTransaction();
        try {
            $upd = $this->db->prepare("
                UPDATE vf_group_allocations SET
                    group_code = ?,
                    slot_id = ?,
                    panel_id = ?,
                    attendance_status = ?
                WHERE id = ?
            ");
            $upd->execute([$groupCode, $slotId, $panelId, $attendance, $id]);
            $this->db->commit();

            Router::sendJson(['message' => 'Group allocation updated successfully.']);
        } catch (\Throwable $e) {
            $this->db->rollBack();
            Router::sendJson(['error' => 'Failed to update group allocation: ' . $e->getMessage()], 500);
        }
    }

    /**
     * DELETE /events/verbafest/allocations/{id}
     * Safely remove group allocation.
     */
    public function delete(array $params): void {
        VerbafestAuth::requireManager();
        $id = (int)($params['id'] ?? 0);

        $chk = $this->db->prepare("SELECT id FROM vf_group_allocations WHERE id = ?");
        $chk->execute([$id]);
        if (!$chk->fetch()) {
            Router::sendJson(['error' => 'Group allocation not found.'], 404);
        }

        $del = $this->db->prepare("DELETE FROM vf_group_allocations WHERE id = ?");
        $del->execute([$id]);

        Router::sendJson(['message' => 'Group allocation deleted successfully.']);
    }

    /**
     * PATCH /events/verbafest/allocations/{id}/attendance
     * Quick update of participant attendance for an allocation.
     */
    public function updateAttendance(array $params): void {
        VerbafestAuth::requireUser();
        $id = (int)($params['id'] ?? 0);

        $stmt = $this->db->prepare("SELECT id, attendance_status FROM vf_group_allocations WHERE id = ?");
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            Router::sendJson(['error' => 'Group allocation not found.'], 404);
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $status = trim($input['attendance_status'] ?? $input['status'] ?? '');

        $validStatuses = ['pending', 'present', 'absent'];
        if (!in_array($status, $validStatuses, true)) {
            Router::sendJson(['error' => 'Invalid attendance_status. Must be one of: ' . implode(', ', $validStatuses)], 400);
        }

        $upd = $this->db->prepare("UPDATE vf_group_allocations SET attendance_status = ? WHERE id = ?");
        $upd->execute([$status, $id]);

        Router::sendJson([
            'message' => 'Attendance status updated successfully.',
            'attendance_status' => $status
        ]);
    }

    /**
     * GET /events/verbafest/allocations/groups/{groupCode}
     * Get all participants and details for a group.
     */
    public function getGroupByCode(array $params): void {
        VerbafestAuth::requireUser();
        $code = trim($params['groupCode'] ?? '');

        if (empty($code)) {
            Router::sendJson(['error' => 'group_code is required.'], 400);
        }

        $sql = "
            SELECT 
                ga.id AS allocation_id, ga.group_code, ga.event_type, ga.attendance_status, ga.allocated_at,
                p.id AS participant_id, p.participant_code, p.full_name, p.email, p.phone, p.college,
                s.id AS slot_id, s.slot_code, s.slot_label, s.start_time, s.end_time,
                pn.id AS panel_id, pn.panel_code, pn.name AS panel_name,
                r.room_code, r.name AS room_name
            FROM vf_group_allocations ga
            JOIN vf_participants p ON ga.participant_id = p.id
            JOIN vf_schedule_slots s ON ga.slot_id = s.id
            LEFT JOIN vf_panels pn ON ga.panel_id = pn.id
            LEFT JOIN vf_rooms r ON (pn.room_id = r.id OR s.room_id = r.id)
            WHERE ga.group_code = ?
            ORDER BY p.participant_code ASC
        ";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$code]);
        $members = $stmt->fetchAll(PDO::FETCH_ASSOC);

        Router::sendJson([
            'group_code' => $code,
            'member_count' => count($members),
            'members' => $members
        ]);
    }

    /**
     * GET /events/verbafest/participants/{id}/allocations
     */
    public function getByParticipant(array $params): void {
        VerbafestAuth::requireUser();
        $participantId = (int)($params['id'] ?? 0);

        $sql = "
            SELECT 
                ga.id, ga.group_code, ga.event_type, ga.slot_id, ga.panel_id,
                ga.attendance_status, ga.allocated_at,
                s.slot_code, s.slot_label, s.start_time, s.end_time,
                pn.panel_code, pn.name AS panel_name,
                r.room_code, r.name AS room_name
            FROM vf_group_allocations ga
            JOIN vf_schedule_slots s ON ga.slot_id = s.id
            LEFT JOIN vf_panels pn ON ga.panel_id = pn.id
            LEFT JOIN vf_rooms r ON (pn.room_id = r.id OR s.room_id = r.id)
            WHERE ga.participant_id = ?
            ORDER BY s.start_time ASC
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$participantId]);
        $allocations = $stmt->fetchAll(PDO::FETCH_ASSOC);

        Router::sendJson(['data' => $allocations]);
    }
}
