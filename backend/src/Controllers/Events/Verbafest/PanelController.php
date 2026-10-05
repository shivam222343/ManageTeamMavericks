<?php
namespace App\Controllers\Events\Verbafest;

use App\Database;
use App\Router;
use App\Services\Events\Verbafest\VerbafestAuth;
use PDO;

class PanelController {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    /**
     * GET /events/verbafest/panels
     * List all panels with filters.
     */
    public function list(): void {
        VerbafestAuth::requireUser();

        $where = [];
        $params = [];

        if (!empty($_GET['event_type'])) {
            $where[] = "p.event_type = ?";
            $params[] = trim($_GET['event_type']);
        }

        if (!empty($_GET['status'])) {
            $where[] = "p.status = ?";
            $params[] = trim($_GET['status']);
        }

        if (!empty($_GET['room_id'])) {
            $where[] = "p.room_id = ?";
            $params[] = (int)$_GET['room_id'];
        }

        if (!empty($_GET['search']) || !empty($_GET['q'])) {
            $s = trim($_GET['search'] ?? $_GET['q']);
            $where[] = "(p.panel_code LIKE ? OR p.name LIKE ?)";
            $wildcard = "%{$s}%";
            array_push($params, $wildcard, $wildcard);
        }

        $whereSql = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";

        $sql = "
            SELECT 
                p.id, p.panel_code, p.event_type, p.name, p.room_id, p.capacity, p.current_group_id, p.status, p.created_at, p.updated_at,
                r.room_code, r.name AS room_name, r.room_type, r.capacity AS room_capacity,
                COUNT(pj.judge_id) AS judge_count
            FROM vf_panels p
            LEFT JOIN vf_rooms r ON p.room_id = r.id
            LEFT JOIN vf_panel_judges pj ON pj.panel_id = p.id
            {$whereSql}
            GROUP BY p.id
            ORDER BY p.event_type ASC, p.panel_code ASC
        ";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $panels = $stmt->fetchAll(PDO::FETCH_ASSOC);

        Router::sendJson(['data' => $panels]);
    }

    /**
     * GET /events/verbafest/panels/{id}
     * Get panel details with assigned judges and room info.
     */
    public function get(array $params): void {
        VerbafestAuth::requireUser();
        $id = (int)($params['id'] ?? 0);

        $stmt = $this->db->prepare("
            SELECT p.*, r.room_code, r.name AS room_name, r.capacity AS room_capacity, r.location_details
            FROM vf_panels p
            LEFT JOIN vf_rooms r ON p.room_id = r.id
            WHERE p.id = ?
        ");
        $stmt->execute([$id]);
        $panel = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$panel) {
            Router::sendJson(['error' => 'Panel not found.'], 404);
        }

        // Fetch assigned judges
        $judgeStmt = $this->db->prepare("
            SELECT j.id, j.name, j.email, j.phone, j.designation, j.event_type, pj.is_head_judge, pj.assigned_at
            FROM vf_panel_judges pj
            JOIN vf_judges j ON pj.judge_id = j.id
            WHERE pj.panel_id = ?
            ORDER BY pj.is_head_judge DESC, j.name ASC
        ");
        $judgeStmt->execute([$id]);
        $panel['judges'] = $judgeStmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch current group allocations if present
        $panel['current_group'] = null;
        if (!empty($panel['current_group_id'])) {
            $grpStmt = $this->db->prepare("
                SELECT ga.id, ga.group_code, ga.attendance_status, p.participant_code, p.full_name, p.email, p.college
                FROM vf_group_allocations ga
                JOIN vf_participants p ON ga.participant_id = p.id
                WHERE ga.id = ? OR ga.group_code = (SELECT group_code FROM vf_group_allocations WHERE id = ? LIMIT 1)
            ");
            $grpStmt->execute([$panel['current_group_id'], $panel['current_group_id']]);
            $panel['current_group'] = $grpStmt->fetchAll(PDO::FETCH_ASSOC);
        }

        Router::sendJson(['data' => $panel]);
    }

    /**
     * POST /events/verbafest/panels
     * Create a new panel.
     */
    public function create(): void {
        VerbafestAuth::requireManager();

        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            Router::sendJson(['error' => 'Invalid JSON payload.'], 400);
        }

        $code = trim($input['panel_code'] ?? '');
        $type = trim($input['event_type'] ?? '');
        $name = trim($input['name'] ?? '');
        $roomId = (int)($input['room_id'] ?? 0);
        $capacity = isset($input['capacity']) ? (int)$input['capacity'] : 10;
        $status = trim($input['status'] ?? 'FREE');

        $validTypes = ['gd', 'debate'];
        $validStatuses = ['FREE', 'OCCUPIED', 'READY', 'BREAK', 'JUDGES_ABSENT'];

        if (empty($code) || empty($name)) {
            Router::sendJson(['error' => 'panel_code and name are required.'], 400);
        }
        if (!in_array($type, $validTypes, true)) {
            Router::sendJson(['error' => "Invalid event_type. Must be 'gd' or 'debate'."], 400);
        }
        if ($roomId <= 0) {
            Router::sendJson(['error' => 'A valid room_id is required.'], 400);
        }
        if ($capacity <= 0) {
            Router::sendJson(['error' => 'capacity must be a positive integer.'], 400);
        }
        if (!in_array($status, $validStatuses, true)) {
            Router::sendJson(['error' => 'Invalid status. Must be one of: ' . implode(', ', $validStatuses)], 400);
        }

        // Verify room exists
        $chkRoom = $this->db->prepare("SELECT id FROM vf_rooms WHERE id = ?");
        $chkRoom->execute([$roomId]);
        if (!$chkRoom->fetch()) {
            Router::sendJson(['error' => "Room with ID {$roomId} does not exist."], 404);
        }

        // Verify panel_code uniqueness
        $chkCode = $this->db->prepare("SELECT id FROM vf_panels WHERE panel_code = ?");
        $chkCode->execute([$code]);
        if ($chkCode->fetch()) {
            Router::sendJson(['error' => "Panel with code '{$code}' already exists."], 409);
        }

        $stmt = $this->db->prepare("
            INSERT INTO vf_panels (panel_code, event_type, name, room_id, capacity, status)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$code, $type, $name, $roomId, $capacity, $status]);
        $newId = (int)$this->db->lastInsertId();

        Router::sendJson([
            'message' => 'Panel created successfully.',
            'data' => [
                'id' => $newId,
                'panel_code' => $code,
                'event_type' => $type,
                'name' => $name,
                'room_id' => $roomId,
                'capacity' => $capacity,
                'status' => $status
            ]
        ], 201);
    }

    /**
     * PUT /events/verbafest/panels/{id}
     * Update panel details.
     */
    public function update(array $params): void {
        VerbafestAuth::requireManager();
        $id = (int)($params['id'] ?? 0);

        $stmt = $this->db->prepare("SELECT * FROM vf_panels WHERE id = ?");
        $stmt->execute([$id]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$existing) {
            Router::sendJson(['error' => 'Panel not found.'], 404);
        }

        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            Router::sendJson(['error' => 'Invalid JSON payload.'], 400);
        }

        $code = trim($input['panel_code'] ?? $existing['panel_code']);
        $type = trim($input['event_type'] ?? $existing['event_type']);
        $name = trim($input['name'] ?? $existing['name']);
        $roomId = isset($input['room_id']) ? (int)$input['room_id'] : (int)$existing['room_id'];
        $capacity = isset($input['capacity']) ? (int)$input['capacity'] : (int)$existing['capacity'];
        $status = trim($input['status'] ?? $existing['status']);
        $currentGroupId = array_key_exists('current_group_id', $input)
            ? (empty($input['current_group_id']) ? null : (int)$input['current_group_id'])
            : $existing['current_group_id'];

        $validTypes = ['gd', 'debate'];
        $validStatuses = ['FREE', 'OCCUPIED', 'READY', 'BREAK', 'JUDGES_ABSENT'];

        if (empty($code) || empty($name)) {
            Router::sendJson(['error' => 'panel_code and name cannot be empty.'], 400);
        }
        if (!in_array($type, $validTypes, true)) {
            Router::sendJson(['error' => "Invalid event_type. Must be 'gd' or 'debate'."], 400);
        }
        if ($capacity <= 0) {
            Router::sendJson(['error' => 'capacity must be a positive integer.'], 400);
        }
        if (!in_array($status, $validStatuses, true)) {
            Router::sendJson(['error' => 'Invalid status. Must be one of: ' . implode(', ', $validStatuses)], 400);
        }

        if ($roomId !== (int)$existing['room_id']) {
            $chkRoom = $this->db->prepare("SELECT id FROM vf_rooms WHERE id = ?");
            $chkRoom->execute([$roomId]);
            if (!$chkRoom->fetch()) {
                Router::sendJson(['error' => "Room with ID {$roomId} does not exist."], 404);
            }
        }

        if ($code !== $existing['panel_code']) {
            $chk = $this->db->prepare("SELECT id FROM vf_panels WHERE panel_code = ? AND id != ?");
            $chk->execute([$code, $id]);
            if ($chk->fetch()) {
                Router::sendJson(['error' => "Panel with code '{$code}' already exists."], 409);
            }
        }

        $upd = $this->db->prepare("
            UPDATE vf_panels SET
                panel_code = ?,
                event_type = ?,
                name = ?,
                room_id = ?,
                capacity = ?,
                current_group_id = ?,
                status = ?,
                updated_at = NOW()
            WHERE id = ?
        ");
        $upd->execute([$code, $type, $name, $roomId, $capacity, $currentGroupId, $status, $id]);

        Router::sendJson(['message' => 'Panel updated successfully.']);
    }

    /**
     * PATCH /events/verbafest/panels/{id}/status
     * Quick status update.
     */
    public function updateStatus(array $params): void {
        VerbafestAuth::requireUser();
        $id = (int)($params['id'] ?? 0);

        $input = json_decode(file_get_contents('php://input'), true);
        $status = trim($input['status'] ?? '');

        $validStatuses = ['FREE', 'OCCUPIED', 'READY', 'BREAK', 'JUDGES_ABSENT'];
        if (!in_array($status, $validStatuses, true)) {
            Router::sendJson(['error' => 'Invalid status. Must be one of: ' . implode(', ', $validStatuses)], 400);
        }

        $stmt = $this->db->prepare("SELECT id FROM vf_panels WHERE id = ?");
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            Router::sendJson(['error' => 'Panel not found.'], 404);
        }

        $upd = $this->db->prepare("UPDATE vf_panels SET status = ?, updated_at = NOW() WHERE id = ?");
        $upd->execute([$status, $id]);

        Router::sendJson([
            'message' => 'Panel status updated successfully.',
            'status' => $status
        ]);
    }

    /**
     * PATCH /events/verbafest/panels/{id}/room
     * Assign / change room for panel.
     */
    public function assignRoom(array $params): void {
        VerbafestAuth::requireManager();
        $id = (int)($params['id'] ?? 0);

        $input = json_decode(file_get_contents('php://input'), true);
        $roomId = (int)($input['room_id'] ?? 0);

        if ($roomId <= 0) {
            Router::sendJson(['error' => 'A valid room_id is required.'], 400);
        }

        $panelStmt = $this->db->prepare("SELECT id FROM vf_panels WHERE id = ?");
        $panelStmt->execute([$id]);
        if (!$panelStmt->fetch()) {
            Router::sendJson(['error' => 'Panel not found.'], 404);
        }

        $roomStmt = $this->db->prepare("SELECT id, name FROM vf_rooms WHERE id = ?");
        $roomStmt->execute([$roomId]);
        $room = $roomStmt->fetch(PDO::FETCH_ASSOC);
        if (!$room) {
            Router::sendJson(['error' => 'Room not found.'], 404);
        }

        $upd = $this->db->prepare("UPDATE vf_panels SET room_id = ?, updated_at = NOW() WHERE id = ?");
        $upd->execute([$roomId, $id]);

        Router::sendJson([
            'message' => 'Room assigned to panel successfully.',
            'panel_id' => $id,
            'room_id' => $roomId,
            'room_name' => $room['name']
        ]);
    }

    /**
     * GET /events/verbafest/panels/{id}/judges
     */
    public function getJudges(array $params): void {
        VerbafestAuth::requireUser();
        $id = (int)($params['id'] ?? 0);

        $panelStmt = $this->db->prepare("SELECT id, panel_code, name, event_type FROM vf_panels WHERE id = ?");
        $panelStmt->execute([$id]);
        $panel = $panelStmt->fetch(PDO::FETCH_ASSOC);
        if (!$panel) {
            Router::sendJson(['error' => 'Panel not found.'], 404);
        }

        $stmt = $this->db->prepare("
            SELECT j.id, j.user_id, j.name, j.email, j.phone, j.designation, j.event_type, pj.is_head_judge, pj.assigned_at
            FROM vf_panel_judges pj
            JOIN vf_judges j ON pj.judge_id = j.id
            WHERE pj.panel_id = ?
            ORDER BY pj.is_head_judge DESC, j.name ASC
        ");
        $stmt->execute([$id]);
        $judges = $stmt->fetchAll(PDO::FETCH_ASSOC);

        Router::sendJson([
            'panel' => $panel,
            'judges' => $judges
        ]);
    }

    /**
     * POST /events/verbafest/panels/{id}/judges
     * Assign a judge to a panel.
     */
    public function assignJudge(array $params): void {
        VerbafestAuth::requireManager();
        $panelId = (int)($params['id'] ?? 0);

        $panelStmt = $this->db->prepare("SELECT id, panel_code, event_type FROM vf_panels WHERE id = ?");
        $panelStmt->execute([$panelId]);
        $panel = $panelStmt->fetch(PDO::FETCH_ASSOC);
        if (!$panel) {
            Router::sendJson(['error' => 'Panel not found.'], 404);
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $judgeId = (int)($input['judge_id'] ?? 0);
        $isHeadJudge = !empty($input['is_head_judge']) ? 1 : 0;

        if ($judgeId <= 0) {
            Router::sendJson(['error' => 'judge_id is required.'], 400);
        }

        $judgeStmt = $this->db->prepare("SELECT id, name, event_type FROM vf_judges WHERE id = ?");
        $judgeStmt->execute([$judgeId]);
        $judge = $judgeStmt->fetch(PDO::FETCH_ASSOC);
        if (!$judge) {
            Router::sendJson(['error' => 'Judge not found.'], 404);
        }

        // Validate event compatibility:
        // GD panel requires GD or both judge
        // Debate panel requires Debate or both judge
        $panelType = $panel['event_type'];
        $judgeType = $judge['event_type'];

        if ($judgeType !== 'both' && $judgeType !== $panelType) {
            Router::sendJson([
                'error' => "Event type mismatch: Judge '{$judge['name']}' has event type '{$judgeType}' and cannot evaluate a '{$panelType}' panel."
            ], 422);
        }

        // Prevent duplicate mapping
        $chk = $this->db->prepare("SELECT panel_id FROM vf_panel_judges WHERE panel_id = ? AND judge_id = ?");
        $chk->execute([$panelId, $judgeId]);
        if ($chk->fetch()) {
            Router::sendJson(['error' => "Judge is already assigned to this panel."], 409);
        }

        $ins = $this->db->prepare("
            INSERT INTO vf_panel_judges (panel_id, judge_id, is_head_judge)
            VALUES (?, ?, ?)
        ");
        $ins->execute([$panelId, $judgeId, $isHeadJudge]);

        Router::sendJson([
            'message' => 'Judge assigned to panel successfully.',
            'panel_id' => $panelId,
            'judge_id' => $judgeId,
            'is_head_judge' => $isHeadJudge
        ], 201);
    }

    /**
     * DELETE /events/verbafest/panels/{id}/judges/{judgeId}
     * Remove judge from panel.
     */
    public function removeJudge(array $params): void {
        VerbafestAuth::requireManager();
        $panelId = (int)($params['id'] ?? 0);
        $judgeId = (int)($params['judgeId'] ?? 0);

        $del = $this->db->prepare("DELETE FROM vf_panel_judges WHERE panel_id = ? AND judge_id = ?");
        $del->execute([$panelId, $judgeId]);

        if ($del->rowCount() === 0) {
            Router::sendJson(['error' => 'Assignment not found.'], 404);
        }

        Router::sendJson(['message' => 'Judge removed from panel successfully.']);
    }

    /**
     * GET /events/verbafest/panels/{id}/schedule
     */
    public function getSchedule(array $params): void {
        VerbafestAuth::requireUser();
        $id = (int)($params['id'] ?? 0);

        $panelStmt = $this->db->prepare("SELECT id, panel_code, name, event_type FROM vf_panels WHERE id = ?");
        $panelStmt->execute([$id]);
        $panel = $panelStmt->fetch(PDO::FETCH_ASSOC);
        if (!$panel) {
            Router::sendJson(['error' => 'Panel not found.'], 404);
        }

        $stmt = $this->db->prepare("
            SELECT s.*, r.room_code, r.name AS room_name, COUNT(ga.id) AS participant_count
            FROM vf_schedule_slots s
            LEFT JOIN vf_rooms r ON s.room_id = r.id
            LEFT JOIN vf_group_allocations ga ON ga.slot_id = s.id
            WHERE s.panel_id = ?
            GROUP BY s.id
            ORDER BY s.start_time ASC
        ");
        $stmt->execute([$id]);
        $slots = $stmt->fetchAll(PDO::FETCH_ASSOC);

        Router::sendJson([
            'panel' => $panel,
            'schedule' => $slots
        ]);
    }

    /**
     * GET /events/verbafest/panels/{id}/group
     */
    public function getCurrentGroup(array $params): void {
        VerbafestAuth::requireUser();
        $id = (int)($params['id'] ?? 0);

        $stmt = $this->db->prepare("SELECT id, panel_code, current_group_id FROM vf_panels WHERE id = ?");
        $stmt->execute([$id]);
        $panel = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$panel) {
            Router::sendJson(['error' => 'Panel not found.'], 404);
        }

        if (empty($panel['current_group_id'])) {
            Router::sendJson([
                'panel_id' => $id,
                'current_group' => null,
                'participants' => []
            ]);
            return;
        }

        // Fetch group details and participants
        $grpStmt = $this->db->prepare("
            SELECT ga.id, ga.group_code, ga.event_type, ga.slot_id, ga.attendance_status,
                   p.id AS participant_id, p.participant_code, p.full_name, p.email, p.phone, p.college
            FROM vf_group_allocations ga
            JOIN vf_participants p ON ga.participant_id = p.id
            WHERE ga.group_code = (SELECT group_code FROM vf_group_allocations WHERE id = ? LIMIT 1)
        ");
        $grpStmt->execute([$panel['current_group_id']]);
        $members = $grpStmt->fetchAll(PDO::FETCH_ASSOC);

        Router::sendJson([
            'panel_id' => $id,
            'current_group_id' => $panel['current_group_id'],
            'participants' => $members
        ]);
    }
}
