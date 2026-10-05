<?php
namespace App\Controllers\Events\Verbafest;

use App\Database;
use App\Router;
use App\Services\Events\Verbafest\VerbafestAuth;
use PDO;
use Exception;

class ParticipantController {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    /**
     * GET /events/verbafest/participants
     * List and search participants with filtering & pagination.
     */
    public function list(): void {
        VerbafestAuth::requireUser();

        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = max(1, min(200, (int)($_GET['limit'] ?? 25)));
        $offset = ($page - 1) * $limit;

        $where = [];
        $params = [];

        // Full text search across multiple columns
        $search = trim($_GET['search'] ?? $_GET['q'] ?? '');
        if ($search !== '') {
            $where[] = "(participant_code LIKE ? OR full_name LIKE ? OR email LIKE ? OR phone LIKE ? OR college LIKE ? OR prn LIKE ?)";
            $wildcard = "%{$search}%";
            array_push($params, $wildcard, $wildcard, $wildcard, $wildcard, $wildcard, $wildcard);
        }

        // Field-specific filters
        if (!empty($_GET['code'])) {
            $where[] = "participant_code LIKE ?";
            $params[] = "%" . trim($_GET['code']) . "%";
        }
        if (!empty($_GET['name'])) {
            $where[] = "full_name LIKE ?";
            $params[] = "%" . trim($_GET['name']) . "%";
        }
        if (!empty($_GET['email'])) {
            $where[] = "email LIKE ?";
            $params[] = "%" . trim($_GET['email']) . "%";
        }
        if (!empty($_GET['phone'])) {
            $where[] = "phone LIKE ?";
            $params[] = "%" . trim($_GET['phone']) . "%";
        }
        if (!empty($_GET['college'])) {
            $where[] = "college LIKE ?";
            $params[] = "%" . trim($_GET['college']) . "%";
        }
        if (!empty($_GET['prn'])) {
            $where[] = "prn LIKE ?";
            $params[] = "%" . trim($_GET['prn']) . "%";
        }
        if (isset($_GET['reg_gd']) && $_GET['reg_gd'] !== '') {
            $where[] = "reg_gd = ?";
            $params[] = (int)$_GET['reg_gd'];
        }
        if (isset($_GET['reg_debate']) && $_GET['reg_debate'] !== '') {
            $where[] = "reg_debate = ?";
            $params[] = (int)$_GET['reg_debate'];
        }
        if (isset($_GET['reg_mindsaga']) && $_GET['reg_mindsaga'] !== '') {
            $where[] = "reg_mindsaga = ?";
            $params[] = (int)$_GET['reg_mindsaga'];
        }
        if (!empty($_GET['checkin_status'])) {
            $where[] = "checkin_status = ?";
            $params[] = trim($_GET['checkin_status']);
        }

        $whereSql = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";

        // Count total
        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM vf_participants {$whereSql}");
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        // Fetch paginated
        $sql = "SELECT id, participant_code, full_name, email, phone, college, prn, 
                       reg_gd, reg_debate, reg_mindsaga, checkin_status, checkin_time, created_at, updated_at
                FROM vf_participants {$whereSql}
                ORDER BY id ASC
                LIMIT {$limit} OFFSET {$offset}";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $participants = $stmt->fetchAll(PDO::FETCH_ASSOC);

        Router::sendJson([
            'data' => $participants,
            'pagination' => [
                'total' => $total,
                'page' => $page,
                'limit' => $limit,
                'total_pages' => ceil($total / $limit)
            ]
        ]);
    }

    /**
     * GET /events/verbafest/participants/{id}
     * Get participant by ID or participant_code.
     */
    public function get(array $params): void {
        VerbafestAuth::requireUser();
        $idOrCode = trim($params['id'] ?? '');

        if (empty($idOrCode)) {
            Router::sendJson(['error' => 'Participant ID or code is required.'], 400);
        }

        if (ctype_digit($idOrCode)) {
            $stmt = $this->db->prepare("SELECT * FROM vf_participants WHERE id = ?");
            $stmt->execute([(int)$idOrCode]);
        } else {
            $stmt = $this->db->prepare("SELECT * FROM vf_participants WHERE participant_code = ?");
            $stmt->execute([$idOrCode]);
        }

        $participant = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$participant) {
            Router::sendJson(['error' => 'Participant not found.'], 404);
        }

        // Attach allocations
        $allocStmt = $this->db->prepare("
            SELECT ga.id, ga.group_code, ga.event_type, ga.slot_id, ga.panel_id, ga.attendance_status, ga.allocated_at,
                   s.slot_code, s.slot_label, s.start_time, s.end_time,
                   p.panel_code, p.name AS panel_name,
                   r.room_code, r.name AS room_name
            FROM vf_group_allocations ga
            JOIN vf_schedule_slots s ON ga.slot_id = s.id
            LEFT JOIN vf_panels p ON ga.panel_id = p.id
            LEFT JOIN vf_rooms r ON (p.room_id = r.id OR s.room_id = r.id)
            WHERE ga.participant_id = ?
            ORDER BY s.start_time ASC
        ");
        $allocStmt->execute([$participant['id']]);
        $participant['allocations'] = $allocStmt->fetchAll(PDO::FETCH_ASSOC);

        // Attach Mind Saga sync info if registered
        if ($participant['reg_mindsaga']) {
            $msStmt = $this->db->prepare("SELECT * FROM vf_mindsaga_sync WHERE participant_id = ?");
            $msStmt->execute([$participant['id']]);
            $participant['mindsaga_sync'] = $msStmt->fetch(PDO::FETCH_ASSOC) ?: null;
        }

        Router::sendJson(['data' => $participant]);
    }

    /**
     * GET /events/verbafest/participants/code/{code}
     */
    public function getByCode(array $params): void {
        $code = trim($params['code'] ?? '');
        $this->get(['id' => $code]);
    }

    /**
     * POST /events/verbafest/participants
     * Create a new participant.
     */
    public function create(): void {
        VerbafestAuth::requireManager();

        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            Router::sendJson(['error' => 'Invalid JSON payload.'], 400);
        }

        $code = trim($input['participant_code'] ?? '');
        $name = trim($input['full_name'] ?? '');
        $email = trim(strtolower($input['email'] ?? ''));
        $phone = trim($input['phone'] ?? '');
        $college = trim($input['college'] ?? 'KIT College of Engineering');
        $prn = !empty($input['prn']) ? trim($input['prn']) : null;
        $regGd = !empty($input['reg_gd']) ? 1 : 0;
        $regDebate = !empty($input['reg_debate']) ? 1 : 0;
        $regMindsaga = !empty($input['reg_mindsaga']) ? 1 : 0;
        $checkinStatus = $input['checkin_status'] ?? 'not_arrived';

        // Validations
        if (empty($code)) {
            Router::sendJson(['error' => 'participant_code is required.'], 400);
        }
        if (empty($name)) {
            Router::sendJson(['error' => 'full_name is required.'], 400);
        }
        if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Router::sendJson(['error' => 'A valid email address is required.'], 400);
        }
        if (empty($phone)) {
            Router::sendJson(['error' => 'phone is required.'], 400);
        }

        $validStatuses = ['not_arrived', 'checked_in', 'disqualified', 'completed'];
        if (!in_array($checkinStatus, $validStatuses, true)) {
            Router::sendJson(['error' => 'Invalid checkin_status.'], 400);
        }

        // Check uniqueness of participant_code
        $checkCode = $this->db->prepare("SELECT id FROM vf_participants WHERE participant_code = ?");
        $checkCode->execute([$code]);
        if ($checkCode->fetch()) {
            Router::sendJson(['error' => "Participant code '{$code}' already exists."], 409);
        }

        // Check uniqueness of email
        $checkEmail = $this->db->prepare("SELECT id FROM vf_participants WHERE email = ?");
        $checkEmail->execute([$email]);
        if ($checkEmail->fetch()) {
            Router::sendJson(['error' => "A participant with email '{$email}' already exists."], 409);
        }

        $checkinTime = ($checkinStatus === 'checked_in') ? date('Y-m-d H:i:s') : null;

        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare("
                INSERT INTO vf_participants (
                    participant_code, full_name, email, phone, college, prn,
                    reg_gd, reg_debate, reg_mindsaga, checkin_status, checkin_time
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $code, $name, $email, $phone, $college, $prn,
                $regGd, $regDebate, $regMindsaga, $checkinStatus, $checkinTime
            ]);
            $newId = (int)$this->db->lastInsertId();

            // If registered for mindsaga, prepare mindsaga sync entry
            if ($regMindsaga) {
                $msStmt = $this->db->prepare("
                    INSERT INTO vf_mindsaga_sync (participant_id, participant_code, mind_saga_status)
                    VALUES (?, ?, 'pending')
                    ON DUPLICATE KEY UPDATE updated_at = NOW()
                ");
                $msStmt->execute([$newId, $code]);
            }

            $this->db->commit();

            Router::sendJson([
                'message' => 'Participant created successfully.',
                'data' => [
                    'id' => $newId,
                    'participant_code' => $code,
                    'full_name' => $name,
                    'email' => $email,
                    'phone' => $phone,
                    'college' => $college,
                    'prn' => $prn,
                    'reg_gd' => $regGd,
                    'reg_debate' => $regDebate,
                    'reg_mindsaga' => $regMindsaga,
                    'checkin_status' => $checkinStatus,
                    'checkin_time' => $checkinTime
                ]
            ], 201);
        } catch (\Throwable $e) {
            $this->db->rollBack();
            Router::sendJson(['error' => 'Failed to create participant: ' . $e->getMessage()], 500);
        }
    }

    /**
     * PUT /events/verbafest/participants/{id}
     * Update participant details.
     */
    public function update(array $params): void {
        VerbafestAuth::requireManager();
        $id = (int)($params['id'] ?? 0);

        $stmt = $this->db->prepare("SELECT * FROM vf_participants WHERE id = ?");
        $stmt->execute([$id]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$existing) {
            Router::sendJson(['error' => 'Participant not found.'], 404);
        }

        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            Router::sendJson(['error' => 'Invalid JSON payload.'], 400);
        }

        $code = trim($input['participant_code'] ?? $existing['participant_code']);
        $name = trim($input['full_name'] ?? $existing['full_name']);
        $email = trim(strtolower($input['email'] ?? $existing['email']));
        $phone = trim($input['phone'] ?? $existing['phone']);
        $college = trim($input['college'] ?? $existing['college']);
        $prn = array_key_exists('prn', $input) ? (empty($input['prn']) ? null : trim($input['prn'])) : $existing['prn'];
        $regGd = isset($input['reg_gd']) ? ($input['reg_gd'] ? 1 : 0) : (int)$existing['reg_gd'];
        $regDebate = isset($input['reg_debate']) ? ($input['reg_debate'] ? 1 : 0) : (int)$existing['reg_debate'];
        $regMindsaga = isset($input['reg_mindsaga']) ? ($input['reg_mindsaga'] ? 1 : 0) : (int)$existing['reg_mindsaga'];
        $checkinStatus = $input['checkin_status'] ?? $existing['checkin_status'];

        if (empty($code) || empty($name) || empty($email) || empty($phone)) {
            Router::sendJson(['error' => 'participant_code, full_name, email, and phone cannot be empty.'], 400);
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Router::sendJson(['error' => 'A valid email address is required.'], 400);
        }

        $validStatuses = ['not_arrived', 'checked_in', 'disqualified', 'completed'];
        if (!in_array($checkinStatus, $validStatuses, true)) {
            Router::sendJson(['error' => 'Invalid checkin_status.'], 400);
        }

        // Verify code uniqueness
        if ($code !== $existing['participant_code']) {
            $chk = $this->db->prepare("SELECT id FROM vf_participants WHERE participant_code = ? AND id != ?");
            $chk->execute([$code, $id]);
            if ($chk->fetch()) {
                Router::sendJson(['error' => "Participant code '{$code}' already in use."], 409);
            }
        }

        // Verify email uniqueness
        if ($email !== $existing['email']) {
            $chk = $this->db->prepare("SELECT id FROM vf_participants WHERE email = ? AND id != ?");
            $chk->execute([$email, $id]);
            if ($chk->fetch()) {
                Router::sendJson(['error' => "Email '{$email}' already in use by another participant."], 409);
            }
        }

        // Guard: Prevent unchecking registration flags if participant already has group allocations for that event
        $allocs = $this->db->prepare("SELECT event_type FROM vf_group_allocations WHERE participant_id = ?");
        $allocs->execute([$id]);
        $activeEvents = $allocs->fetchAll(PDO::FETCH_COLUMN);

        if (!$regGd && in_array('gd', $activeEvents, true)) {
            Router::sendJson(['error' => 'Cannot disable GD registration: Participant already has an active GD group allocation.'], 409);
        }
        if (!$regDebate && in_array('debate', $activeEvents, true)) {
            Router::sendJson(['error' => 'Cannot disable Debate registration: Participant already has an active Debate group allocation.'], 409);
        }
        if (!$regMindsaga && in_array('mindsaga', $activeEvents, true)) {
            Router::sendJson(['error' => 'Cannot disable Mind Saga registration: Participant already has an active Mind Saga slot allocation.'], 409);
        }

        // Handle checkin_time
        $checkinTime = $existing['checkin_time'];
        if ($checkinStatus === 'checked_in' && empty($checkinTime)) {
            $checkinTime = date('Y-m-d H:i:s');
        } elseif ($checkinStatus === 'not_arrived') {
            $checkinTime = null;
        }

        $this->db->beginTransaction();
        try {
            $updateStmt = $this->db->prepare("
                UPDATE vf_participants SET
                    participant_code = ?,
                    full_name = ?,
                    email = ?,
                    phone = ?,
                    college = ?,
                    prn = ?,
                    reg_gd = ?,
                    reg_debate = ?,
                    reg_mindsaga = ?,
                    checkin_status = ?,
                    checkin_time = ?,
                    updated_at = NOW()
                WHERE id = ?
            ");
            $updateStmt->execute([
                $code, $name, $email, $phone, $college, $prn,
                $regGd, $regDebate, $regMindsaga, $checkinStatus, $checkinTime, $id
            ]);

            // If mindsaga newly enabled, ensure sync entry
            if ($regMindsaga && !$existing['reg_mindsaga']) {
                $msStmt = $this->db->prepare("
                    INSERT INTO vf_mindsaga_sync (participant_id, participant_code, mind_saga_status)
                    VALUES (?, ?, 'pending')
                    ON DUPLICATE KEY UPDATE participant_code = VALUES(participant_code)
                ");
                $msStmt->execute([$id, $code]);
            }

            $this->db->commit();
            Router::sendJson(['message' => 'Participant updated successfully.']);
        } catch (\Throwable $e) {
            $this->db->rollBack();
            Router::sendJson(['error' => 'Failed to update participant: ' . $e->getMessage()], 500);
        }
    }

    /**
     * POST /events/verbafest/participants/{id}/checkin
     * Mark participant as checked in.
     */
    public function checkin(array $params): void {
        VerbafestAuth::requireUser();
        $id = (int)($params['id'] ?? 0);

        $stmt = $this->db->prepare("SELECT id, checkin_status FROM vf_participants WHERE id = ?");
        $stmt->execute([$id]);
        $p = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$p) {
            Router::sendJson(['error' => 'Participant not found.'], 404);
        }

        $now = date('Y-m-d H:i:s');
        $upd = $this->db->prepare("UPDATE vf_participants SET checkin_status = 'checked_in', checkin_time = ?, updated_at = NOW() WHERE id = ?");
        $upd->execute([$now, $id]);

        Router::sendJson([
            'message' => 'Participant checked in successfully.',
            'checkin_status' => 'checked_in',
            'checkin_time' => $now
        ]);
    }

    /**
     * PATCH /events/verbafest/participants/{id}/checkin
     * Update participant check-in status.
     */
    public function updateCheckinStatus(array $params): void {
        VerbafestAuth::requireUser();
        $id = (int)($params['id'] ?? 0);

        $input = json_decode(file_get_contents('php://input'), true);
        $status = $input['status'] ?? $input['checkin_status'] ?? '';

        $validStatuses = ['not_arrived', 'checked_in', 'disqualified', 'completed'];
        if (!in_array($status, $validStatuses, true)) {
            Router::sendJson(['error' => 'Invalid check-in status. Must be one of: ' . implode(', ', $validStatuses)], 400);
        }

        $stmt = $this->db->prepare("SELECT id, checkin_time FROM vf_participants WHERE id = ?");
        $stmt->execute([$id]);
        $p = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$p) {
            Router::sendJson(['error' => 'Participant not found.'], 404);
        }

        $checkinTime = $p['checkin_time'];
        if ($status === 'checked_in') {
            $checkinTime = $checkinTime ?: date('Y-m-d H:i:s');
        } elseif ($status === 'not_arrived') {
            $checkinTime = null;
        }

        $upd = $this->db->prepare("UPDATE vf_participants SET checkin_status = ?, checkin_time = ?, updated_at = NOW() WHERE id = ?");
        $upd->execute([$status, $checkinTime, $id]);

        Router::sendJson([
            'message' => 'Check-in status updated successfully.',
            'checkin_status' => $status,
            'checkin_time' => $checkinTime
        ]);
    }

    /**
     * GET /events/verbafest/participants/{id}/schedule
     * Get participant's complete schedule.
     */
    public function getSchedule(array $params): void {
        VerbafestAuth::requireUser();
        $id = (int)($params['id'] ?? 0);

        $stmt = $this->db->prepare("SELECT id, participant_code, full_name, checkin_status FROM vf_participants WHERE id = ?");
        $stmt->execute([$id]);
        $participant = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$participant) {
            Router::sendJson(['error' => 'Participant not found.'], 404);
        }

        $sql = "
            SELECT 
                ga.id AS allocation_id,
                ga.group_code,
                ga.event_type,
                ga.attendance_status,
                ga.allocated_at,
                s.id AS slot_id,
                s.slot_code,
                s.slot_label,
                s.start_time,
                s.end_time,
                p.id AS panel_id,
                p.panel_code,
                p.name AS panel_name,
                p.status AS panel_status,
                r.id AS room_id,
                r.room_code,
                r.name AS room_name,
                r.location_details
            FROM vf_group_allocations ga
            JOIN vf_schedule_slots s ON ga.slot_id = s.id
            LEFT JOIN vf_panels p ON ga.panel_id = p.id
            LEFT JOIN vf_rooms r ON (p.room_id = r.id OR s.room_id = r.id)
            WHERE ga.participant_id = ?
            ORDER BY s.start_time ASC
        ";
        $stmtAll = $this->db->prepare($sql);
        $stmtAll->execute([$id]);
        $schedule = $stmtAll->fetchAll(PDO::FETCH_ASSOC);

        Router::sendJson([
            'participant' => $participant,
            'schedule' => $schedule
        ]);
    }
}
