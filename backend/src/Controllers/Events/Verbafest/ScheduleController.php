<?php
namespace App\Controllers\Events\Verbafest;

use App\Database;
use App\Router;
use App\Services\Events\Verbafest\VerbafestAuth;
use App\Services\Events\Verbafest\ConflictDetectionService;
use PDO;

class ScheduleController {
    private PDO $db;
    private ConflictDetectionService $conflictService;

    public function __construct() {
        $this->db = Database::getConnection();
        $this->conflictService = new ConflictDetectionService($this->db);
    }

    /**
     * GET /events/verbafest/schedule
     * List schedule slots with filters.
     */
    public function list(): void {
        VerbafestAuth::requireUser();

        $where = [];
        $params = [];

        if (!empty($_GET['event_type'])) {
            $where[] = "s.event_type = ?";
            $params[] = trim($_GET['event_type']);
        }

        if (!empty($_GET['panel_id'])) {
            $where[] = "s.panel_id = ?";
            $params[] = (int)$_GET['panel_id'];
        }

        if (!empty($_GET['room_id'])) {
            $where[] = "s.room_id = ?";
            $params[] = (int)$_GET['room_id'];
        }

        if (!empty($_GET['date'])) {
            $where[] = "DATE(s.start_time) = ?";
            $params[] = trim($_GET['date']);
        }

        if (!empty($_GET['search']) || !empty($_GET['q'])) {
            $search = trim($_GET['search'] ?? $_GET['q']);
            $where[] = "(s.slot_code LIKE ? OR s.slot_label LIKE ?)";
            $wildcard = "%{$search}%";
            array_push($params, $wildcard, $wildcard);
        }

        $whereSql = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";

        $sql = "
            SELECT 
                s.id, s.slot_code, s.event_type, s.start_time, s.end_time, s.panel_id, s.room_id, s.slot_label, s.created_at,
                p.panel_code, p.name AS panel_name, p.status AS panel_status,
                COALESCE(r_direct.room_code, r_panel.room_code) AS room_code,
                COALESCE(r_direct.name, r_panel.name) AS room_name,
                COUNT(ga.id) AS allocated_participants_count
            FROM vf_schedule_slots s
            LEFT JOIN vf_panels p ON s.panel_id = p.id
            LEFT JOIN vf_rooms r_direct ON s.room_id = r_direct.id
            LEFT JOIN vf_rooms r_panel ON p.room_id = r_panel.id
            LEFT JOIN vf_group_allocations ga ON ga.slot_id = s.id
            {$whereSql}
            GROUP BY s.id
            ORDER BY s.start_time ASC, s.slot_code ASC
        ";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $slots = $stmt->fetchAll(PDO::FETCH_ASSOC);

        Router::sendJson(['data' => $slots]);
    }

    /**
     * GET /events/verbafest/schedule/{id}
     * Get single schedule slot details.
     */
    public function get(array $params): void {
        VerbafestAuth::requireUser();
        $id = (int)($params['id'] ?? 0);

        $stmt = $this->db->prepare("
            SELECT s.*, p.panel_code, p.name AS panel_name, p.status AS panel_status, p.capacity AS panel_capacity,
                   COALESCE(r_direct.room_code, r_panel.room_code) AS room_code,
                   COALESCE(r_direct.name, r_panel.name) AS room_name,
                   COALESCE(r_direct.capacity, r_panel.capacity) AS room_capacity
            FROM vf_schedule_slots s
            LEFT JOIN vf_panels p ON s.panel_id = p.id
            LEFT JOIN vf_rooms r_direct ON s.room_id = r_direct.id
            LEFT JOIN vf_rooms r_panel ON p.room_id = r_panel.id
            WHERE s.id = ?
        ");
        $stmt->execute([$id]);
        $slot = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$slot) {
            Router::sendJson(['error' => 'Schedule slot not found.'], 404);
        }

        // Fetch allocated members
        $memStmt = $this->db->prepare("
            SELECT ga.id AS allocation_id, ga.group_code, ga.attendance_status, ga.allocated_at,
                   p.id AS participant_id, p.participant_code, p.full_name, p.email, p.phone, p.college
            FROM vf_group_allocations ga
            JOIN vf_participants p ON ga.participant_id = p.id
            WHERE ga.slot_id = ?
            ORDER BY ga.group_code ASC, p.participant_code ASC
        ");
        $memStmt->execute([$id]);
        $slot['members'] = $memStmt->fetchAll(PDO::FETCH_ASSOC);

        Router::sendJson(['data' => $slot]);
    }

    /**
     * POST /events/verbafest/schedule
     * Create a schedule slot.
     */
    public function create(): void {
        VerbafestAuth::requireManager();

        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            Router::sendJson(['error' => 'Invalid JSON payload.'], 400);
        }

        $code = trim($input['slot_code'] ?? '');
        $type = trim($input['event_type'] ?? '');
        $startTime = trim($input['start_time'] ?? '');
        $endTime = trim($input['end_time'] ?? '');
        $panelId = !empty($input['panel_id']) ? (int)$input['panel_id'] : null;
        $roomId = !empty($input['room_id']) ? (int)$input['room_id'] : null;
        $label = trim($input['slot_label'] ?? '');

        $validEvents = ['gd', 'debate', 'mindsaga'];

        if (empty($code) || empty($label)) {
            Router::sendJson(['error' => 'slot_code and slot_label are required.'], 400);
        }
        if (!in_array($type, $validEvents, true)) {
            Router::sendJson(['error' => "Invalid event_type. Must be 'gd', 'debate', or 'mindsaga'."], 400);
        }

        $tStart = strtotime($startTime);
        $tEnd = strtotime($endTime);
        if ($tStart === false || $tEnd === false) {
            Router::sendJson(['error' => 'start_time and end_time must be valid date/time strings.'], 400);
        }
        if ($tStart >= $tEnd) {
            Router::sendJson(['error' => 'start_time must be strictly before end_time.'], 400);
        }

        // Check slot_code uniqueness
        $chkCode = $this->db->prepare("SELECT id FROM vf_schedule_slots WHERE slot_code = ?");
        $chkCode->execute([$code]);
        if ($chkCode->fetch()) {
            Router::sendJson(['error' => "Schedule slot code '{$code}' already exists."], 409);
        }

        // Validate panel if supplied
        if ($panelId !== null) {
            $pStmt = $this->db->prepare("SELECT id, event_type, room_id FROM vf_panels WHERE id = ?");
            $pStmt->execute([$panelId]);
            $panel = $pStmt->fetch(PDO::FETCH_ASSOC);
            if (!$panel) {
                Router::sendJson(['error' => "Panel with ID {$panelId} does not exist."], 404);
            }
            if ($panel['event_type'] !== $type) {
                Router::sendJson([
                    'error' => "Event mismatch: Panel '{$panelId}' is a '{$panel['event_type']}' panel, but slot is for '{$type}'."
                ], 422);
            }
            if ($roomId === null && !empty($panel['room_id'])) {
                $roomId = (int)$panel['room_id'];
            }
        }

        // Validate room if supplied
        if ($roomId !== null) {
            $rStmt = $this->db->prepare("SELECT id FROM vf_rooms WHERE id = ?");
            $rStmt->execute([$roomId]);
            if (!$rStmt->fetch()) {
                Router::sendJson(['error' => "Room with ID {$roomId} does not exist."], 404);
            }
        }

        $stmt = $this->db->prepare("
            INSERT INTO vf_schedule_slots (slot_code, event_type, start_time, end_time, panel_id, room_id, slot_label)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$code, $type, $startTime, $endTime, $panelId, $roomId, $label]);
        $newId = (int)$this->db->lastInsertId();

        Router::sendJson([
            'message' => 'Schedule slot created successfully.',
            'data' => [
                'id' => $newId,
                'slot_code' => $code,
                'event_type' => $type,
                'start_time' => $startTime,
                'end_time' => $endTime,
                'panel_id' => $panelId,
                'room_id' => $roomId,
                'slot_label' => $label
            ]
        ], 201);
    }

    /**
     * PUT /events/verbafest/schedule/{id}
     * Update schedule slot.
     */
    public function update(array $params): void {
        VerbafestAuth::requireManager();
        $id = (int)($params['id'] ?? 0);

        $stmt = $this->db->prepare("SELECT * FROM vf_schedule_slots WHERE id = ?");
        $stmt->execute([$id]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$existing) {
            Router::sendJson(['error' => 'Schedule slot not found.'], 404);
        }

        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            Router::sendJson(['error' => 'Invalid JSON payload.'], 400);
        }

        $code = trim($input['slot_code'] ?? $existing['slot_code']);
        $type = trim($input['event_type'] ?? $existing['event_type']);
        $startTime = trim($input['start_time'] ?? $existing['start_time']);
        $endTime = trim($input['end_time'] ?? $existing['end_time']);
        $panelId = array_key_exists('panel_id', $input)
            ? (empty($input['panel_id']) ? null : (int)$input['panel_id'])
            : ($existing['panel_id'] ? (int)$existing['panel_id'] : null);
        $roomId = array_key_exists('room_id', $input)
            ? (empty($input['room_id']) ? null : (int)$input['room_id'])
            : ($existing['room_id'] ? (int)$existing['room_id'] : null);
        $label = trim($input['slot_label'] ?? $existing['slot_label']);

        $validEvents = ['gd', 'debate', 'mindsaga'];

        if (empty($code) || empty($label)) {
            Router::sendJson(['error' => 'slot_code and slot_label cannot be empty.'], 400);
        }
        if (!in_array($type, $validEvents, true)) {
            Router::sendJson(['error' => "Invalid event_type. Must be 'gd', 'debate', or 'mindsaga'."], 400);
        }

        $tStart = strtotime($startTime);
        $tEnd = strtotime($endTime);
        if ($tStart === false || $tEnd === false || $tStart >= $tEnd) {
            Router::sendJson(['error' => 'start_time must precede end_time.'], 400);
        }

        if ($code !== $existing['slot_code']) {
            $chkCode = $this->db->prepare("SELECT id FROM vf_schedule_slots WHERE slot_code = ? AND id != ?");
            $chkCode->execute([$code, $id]);
            if ($chkCode->fetch()) {
                Router::sendJson(['error' => "Schedule slot code '{$code}' already in use."], 409);
            }
        }

        // If panel supplied, validate
        if ($panelId !== null) {
            $pStmt = $this->db->prepare("SELECT id, event_type FROM vf_panels WHERE id = ?");
            $pStmt->execute([$panelId]);
            $panel = $pStmt->fetch(PDO::FETCH_ASSOC);
            if (!$panel) {
                Router::sendJson(['error' => "Panel with ID {$panelId} does not exist."], 404);
            }
            if ($panel['event_type'] !== $type) {
                Router::sendJson([
                    'error' => "Event mismatch: Panel is '{$panel['event_type']}', slot is '{$type}'."
                ], 422);
            }
        }

        // If slot has allocated participants and times changed, verify no conflict for any participant
        if ($startTime !== $existing['start_time'] || $endTime !== $existing['end_time']) {
            $memStmt = $this->db->prepare("SELECT id, participant_id FROM vf_group_allocations WHERE slot_id = ?");
            $memStmt->execute([$id]);
            $allocated = $memStmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($allocated as $alloc) {
                $conflict = $this->conflictService->checkParticipantSlotTimesConflict(
                    (int)$alloc['participant_id'],
                    $startTime,
                    $endTime,
                    $type,
                    null,
                    (int)$alloc['id']
                );
                if ($conflict['has_conflict']) {
                    Router::sendJson([
                        'error' => "Cannot update slot times: Would cause scheduling conflict for allocated participant ID {$alloc['participant_id']}.",
                        'conflict' => $conflict
                    ], 409);
                }
            }
        }

        $upd = $this->db->prepare("
            UPDATE vf_schedule_slots SET
                slot_code = ?,
                event_type = ?,
                start_time = ?,
                end_time = ?,
                panel_id = ?,
                room_id = ?,
                slot_label = ?
            WHERE id = ?
        ");
        $upd->execute([$code, $type, $startTime, $endTime, $panelId, $roomId, $label, $id]);

        Router::sendJson(['message' => 'Schedule slot updated successfully.']);
    }

    /**
     * DELETE /events/verbafest/schedule/{id}
     * Safely delete slot if no participants are allocated.
     */
    public function delete(array $params): void {
        VerbafestAuth::requireManager();
        $id = (int)($params['id'] ?? 0);

        $chk = $this->db->prepare("SELECT id FROM vf_schedule_slots WHERE id = ?");
        $chk->execute([$id]);
        if (!$chk->fetch()) {
            Router::sendJson(['error' => 'Schedule slot not found.'], 404);
        }

        $cntStmt = $this->db->prepare("SELECT COUNT(*) FROM vf_group_allocations WHERE slot_id = ?");
        $cntStmt->execute([$id]);
        $allocCount = (int)$cntStmt->fetchColumn();

        if ($allocCount > 0) {
            Router::sendJson([
                'error' => "Cannot delete schedule slot: {$allocCount} participant(s) are currently allocated to this slot. Reassign or remove allocations first."
            ], 409);
        }

        $del = $this->db->prepare("DELETE FROM vf_schedule_slots WHERE id = ?");
        $del->execute([$id]);

        Router::sendJson(['message' => 'Schedule slot deleted successfully.']);
    }

    /**
     * GET /events/verbafest/schedule/{id}/members
     */
    public function getMembers(array $params): void {
        VerbafestAuth::requireUser();
        $id = (int)($params['id'] ?? 0);

        $stmt = $this->db->prepare("SELECT id, slot_code, slot_label, event_type, start_time, end_time FROM vf_schedule_slots WHERE id = ?");
        $stmt->execute([$id]);
        $slot = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$slot) {
            Router::sendJson(['error' => 'Schedule slot not found.'], 404);
        }

        $memStmt = $this->db->prepare("
            SELECT ga.id AS allocation_id, ga.group_code, ga.attendance_status, ga.allocated_at,
                   p.id AS participant_id, p.participant_code, p.full_name, p.email, p.phone, p.college
            FROM vf_group_allocations ga
            JOIN vf_participants p ON ga.participant_id = p.id
            WHERE ga.slot_id = ?
            ORDER BY ga.group_code ASC, p.participant_code ASC
        ");
        $memStmt->execute([$id]);
        $members = $memStmt->fetchAll(PDO::FETCH_ASSOC);

        Router::sendJson([
            'slot' => $slot,
            'members' => $members
        ]);
    }
}
