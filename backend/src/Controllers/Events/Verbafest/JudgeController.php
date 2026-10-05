<?php
namespace App\Controllers\Events\Verbafest;

use App\Database;
use App\Router;
use App\Services\Events\Verbafest\VerbafestAuth;
use PDO;

class JudgeController {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    /**
     * GET /events/verbafest/judges
     * List all judges with filters.
     */
    public function list(): void {
        VerbafestAuth::requireUser();

        $where = [];
        $params = [];

        if (!empty($_GET['event_type'])) {
            $where[] = "j.event_type = ?";
            $params[] = trim($_GET['event_type']);
        }

        if (!empty($_GET['search']) || !empty($_GET['q'])) {
            $s = trim($_GET['search'] ?? $_GET['q']);
            $where[] = "(j.name LIKE ? OR j.email LIKE ? OR j.designation LIKE ?)";
            $wildcard = "%{$s}%";
            array_push($params, $wildcard, $wildcard, $wildcard);
        }

        $whereSql = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";

        $sql = "
            SELECT 
                j.id, j.user_id, j.name, j.email, j.phone, j.designation, j.event_type, j.access_pin, j.created_at,
                u.name AS user_account_name,
                COUNT(pj.panel_id) AS assigned_panel_count
            FROM vf_judges j
            LEFT JOIN users u ON j.user_id = u.id
            LEFT JOIN vf_panel_judges pj ON pj.judge_id = j.id
            {$whereSql}
            GROUP BY j.id
            ORDER BY j.name ASC
        ";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $judges = $stmt->fetchAll(PDO::FETCH_ASSOC);

        Router::sendJson(['data' => $judges]);
    }

    /**
     * GET /events/verbafest/judges/{id}
     * Get single judge details and assigned panels.
     */
    public function get(array $params): void {
        VerbafestAuth::requireUser();
        $id = (int)($params['id'] ?? 0);

        $stmt = $this->db->prepare("
            SELECT j.*, u.name AS user_account_name, u.email AS user_account_email
            FROM vf_judges j
            LEFT JOIN users u ON j.user_id = u.id
            WHERE j.id = ?
        ");
        $stmt->execute([$id]);
        $judge = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$judge) {
            Router::sendJson(['error' => 'Judge not found.'], 404);
        }

        // Fetch assigned panels
        $panelStmt = $this->db->prepare("
            SELECT p.id, p.panel_code, p.event_type, p.name, p.status, pj.is_head_judge, pj.assigned_at,
                   r.room_code, r.name AS room_name
            FROM vf_panel_judges pj
            JOIN vf_panels p ON pj.panel_id = p.id
            LEFT JOIN vf_rooms r ON p.room_id = r.id
            WHERE pj.judge_id = ?
            ORDER BY p.panel_code ASC
        ");
        $panelStmt->execute([$id]);
        $judge['panels'] = $panelStmt->fetchAll(PDO::FETCH_ASSOC);

        Router::sendJson(['data' => $judge]);
    }

    /**
     * POST /events/verbafest/judges
     * Create a new judge (internal or external).
     */
    public function create(): void {
        VerbafestAuth::requireManager();

        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            Router::sendJson(['error' => 'Invalid JSON payload.'], 400);
        }

        $name = trim($input['name'] ?? '');
        $email = trim(strtolower($input['email'] ?? ''));
        $phone = !empty($input['phone']) ? trim($input['phone']) : null;
        $designation = !empty($input['designation']) ? trim($input['designation']) : null;
        $eventType = trim($input['event_type'] ?? 'both');
        $accessPin = trim($input['access_pin'] ?? '');
        $userId = !empty($input['user_id']) ? (int)$input['user_id'] : null;

        $validEvents = ['gd', 'debate', 'both'];

        if (empty($name)) {
            Router::sendJson(['error' => 'name is required.'], 400);
        }
        if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Router::sendJson(['error' => 'A valid email address is required.'], 400);
        }
        if (empty($accessPin)) {
            Router::sendJson(['error' => 'access_pin is required.'], 400);
        }
        if (!in_array($eventType, $validEvents, true)) {
            Router::sendJson(['error' => "Invalid event_type. Must be 'gd', 'debate', or 'both'."], 400);
        }

        // If user_id is provided, verify it exists in users table
        if ($userId !== null) {
            $uStmt = $this->db->prepare("SELECT id FROM users WHERE id = ?");
            $uStmt->execute([$userId]);
            if (!$uStmt->fetch()) {
                Router::sendJson(['error' => "User account with ID {$userId} does not exist."], 404);
            }
        }

        $stmt = $this->db->prepare("
            INSERT INTO vf_judges (user_id, name, email, phone, designation, event_type, access_pin)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$userId, $name, $email, $phone, $designation, $eventType, $accessPin]);
        $newId = (int)$this->db->lastInsertId();

        Router::sendJson([
            'message' => 'Judge created successfully.',
            'data' => [
                'id' => $newId,
                'user_id' => $userId,
                'name' => $name,
                'email' => $email,
                'phone' => $phone,
                'designation' => $designation,
                'event_type' => $eventType,
                'access_pin' => $accessPin
            ]
        ], 201);
    }

    /**
     * PUT /events/verbafest/judges/{id}
     * Update judge details.
     */
    public function update(array $params): void {
        VerbafestAuth::requireManager();
        $id = (int)($params['id'] ?? 0);

        $stmt = $this->db->prepare("SELECT * FROM vf_judges WHERE id = ?");
        $stmt->execute([$id]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$existing) {
            Router::sendJson(['error' => 'Judge not found.'], 404);
        }

        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            Router::sendJson(['error' => 'Invalid JSON payload.'], 400);
        }

        $name = trim($input['name'] ?? $existing['name']);
        $email = trim(strtolower($input['email'] ?? $existing['email']));
        $phone = array_key_exists('phone', $input) ? (empty($input['phone']) ? null : trim($input['phone'])) : $existing['phone'];
        $designation = array_key_exists('designation', $input) ? (empty($input['designation']) ? null : trim($input['designation'])) : $existing['designation'];
        $eventType = trim($input['event_type'] ?? $existing['event_type']);
        $accessPin = trim($input['access_pin'] ?? $existing['access_pin']);
        $userId = array_key_exists('user_id', $input)
            ? (empty($input['user_id']) ? null : (int)$input['user_id'])
            : $existing['user_id'];

        $validEvents = ['gd', 'debate', 'both'];

        if (empty($name)) {
            Router::sendJson(['error' => 'name cannot be empty.'], 400);
        }
        if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Router::sendJson(['error' => 'A valid email address is required.'], 400);
        }
        if (empty($accessPin)) {
            Router::sendJson(['error' => 'access_pin cannot be empty.'], 400);
        }
        if (!in_array($eventType, $validEvents, true)) {
            Router::sendJson(['error' => "Invalid event_type. Must be 'gd', 'debate', or 'both'."], 400);
        }

        if ($userId !== null && $userId !== (int)$existing['user_id']) {
            $uStmt = $this->db->prepare("SELECT id FROM users WHERE id = ?");
            $uStmt->execute([$userId]);
            if (!$uStmt->fetch()) {
                Router::sendJson(['error' => "User account with ID {$userId} does not exist."], 404);
            }
        }

        // If changing event_type, verify compatibility with currently assigned panels
        if ($eventType !== $existing['event_type'] && $eventType !== 'both') {
            $chkAssigned = $this->db->prepare("
                SELECT p.panel_code, p.event_type
                FROM vf_panel_judges pj
                JOIN vf_panels p ON pj.panel_id = p.id
                WHERE pj.judge_id = ? AND p.event_type != ?
            ");
            $chkAssigned->execute([$id, $eventType]);
            $incompatible = $chkAssigned->fetchAll(PDO::FETCH_ASSOC);
            if (!empty($incompatible)) {
                $codes = array_column($incompatible, 'panel_code');
                Router::sendJson([
                    'error' => "Cannot change event_type to '{$eventType}': Judge is assigned to panels of different type (" . implode(', ', $codes) . ")."
                ], 422);
            }
        }

        $upd = $this->db->prepare("
            UPDATE vf_judges SET
                user_id = ?,
                name = ?,
                email = ?,
                phone = ?,
                designation = ?,
                event_type = ?,
                access_pin = ?
            WHERE id = ?
        ");
        $upd->execute([$userId, $name, $email, $phone, $designation, $eventType, $accessPin, $id]);

        Router::sendJson(['message' => 'Judge updated successfully.']);
    }

    /**
     * GET /events/verbafest/judges/{id}/panels
     * View panels assigned to a judge.
     */
    public function getPanels(array $params): void {
        VerbafestAuth::requireUser();
        $id = (int)($params['id'] ?? 0);

        $stmt = $this->db->prepare("SELECT id, name, event_type FROM vf_judges WHERE id = ?");
        $stmt->execute([$id]);
        $judge = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$judge) {
            Router::sendJson(['error' => 'Judge not found.'], 404);
        }

        $panelStmt = $this->db->prepare("
            SELECT p.*, pj.is_head_judge, pj.assigned_at, r.room_code, r.name AS room_name
            FROM vf_panel_judges pj
            JOIN vf_panels p ON pj.panel_id = p.id
            LEFT JOIN vf_rooms r ON p.room_id = r.id
            WHERE pj.judge_id = ?
            ORDER BY p.event_type ASC, p.panel_code ASC
        ");
        $panelStmt->execute([$id]);
        $panels = $panelStmt->fetchAll(PDO::FETCH_ASSOC);

        Router::sendJson([
            'judge' => $judge,
            'panels' => $panels
        ]);
    }

    /**
     * POST /events/verbafest/judges/{id}/panels
     * Assign judge to panel from judge perspective.
     */
    public function assignPanel(array $params): void {
        VerbafestAuth::requireManager();
        $judgeId = (int)($params['id'] ?? 0);

        $input = json_decode(file_get_contents('php://input'), true);
        $panelId = (int)($input['panel_id'] ?? 0);
        $isHeadJudge = !empty($input['is_head_judge']) ? 1 : 0;

        if ($panelId <= 0) {
            Router::sendJson(['error' => 'panel_id is required.'], 400);
        }

        $judgeStmt = $this->db->prepare("SELECT id, name, event_type FROM vf_judges WHERE id = ?");
        $judgeStmt->execute([$judgeId]);
        $judge = $judgeStmt->fetch(PDO::FETCH_ASSOC);
        if (!$judge) {
            Router::sendJson(['error' => 'Judge not found.'], 404);
        }

        $panelStmt = $this->db->prepare("SELECT id, panel_code, event_type FROM vf_panels WHERE id = ?");
        $panelStmt->execute([$panelId]);
        $panel = $panelStmt->fetch(PDO::FETCH_ASSOC);
        if (!$panel) {
            Router::sendJson(['error' => 'Panel not found.'], 404);
        }

        if ($judge['event_type'] !== 'both' && $judge['event_type'] !== $panel['event_type']) {
            Router::sendJson([
                'error' => "Event type mismatch: Judge '{$judge['name']}' has event type '{$judge['event_type']}' and cannot evaluate '{$panel['event_type']}' panel."
            ], 422);
        }

        $chk = $this->db->prepare("SELECT panel_id FROM vf_panel_judges WHERE panel_id = ? AND judge_id = ?");
        $chk->execute([$panelId, $judgeId]);
        if ($chk->fetch()) {
            Router::sendJson(['error' => 'Judge is already assigned to this panel.'], 409);
        }

        $ins = $this->db->prepare("
            INSERT INTO vf_panel_judges (panel_id, judge_id, is_head_judge)
            VALUES (?, ?, ?)
        ");
        $ins->execute([$panelId, $judgeId, $isHeadJudge]);

        Router::sendJson([
            'message' => 'Panel assigned to judge successfully.',
            'judge_id' => $judgeId,
            'panel_id' => $panelId,
            'is_head_judge' => $isHeadJudge
        ], 201);
    }

    /**
     * DELETE /events/verbafest/judges/{id}/panels/{panelId}
     * Remove judge from panel.
     */
    public function removePanel(array $params): void {
        VerbafestAuth::requireManager();
        $judgeId = (int)($params['id'] ?? 0);
        $panelId = (int)($params['panelId'] ?? 0);

        $del = $this->db->prepare("DELETE FROM vf_panel_judges WHERE panel_id = ? AND judge_id = ?");
        $del->execute([$panelId, $judgeId]);

        if ($del->rowCount() === 0) {
            Router::sendJson(['error' => 'Assignment not found.'], 404);
        }

        Router::sendJson(['message' => 'Panel removed from judge successfully.']);
    }
}
