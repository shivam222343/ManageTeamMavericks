<?php
// src/Controllers/SubEventControlRoomController.php
namespace App\Controllers;

use App\Database;
use App\Router;
use App\Middleware\AuthMiddleware;
use PDO;

class SubEventControlRoomController {

    /**
     * Ensure all necessary tables for Sub-Event Control Room exist.
     */
    public static function initTables(PDO $db): void {
        // 1. Sub-event Rounds
        $db->exec("CREATE TABLE IF NOT EXISTS sub_event_rounds (
            id INT AUTO_INCREMENT PRIMARY KEY,
            sub_event_id INT NOT NULL,
            round_number INT NOT NULL DEFAULT 1,
            name VARCHAR(255) NOT NULL,
            venue VARCHAR(255) DEFAULT 'TBD',
            status ENUM('pending', 'ongoing', 'completed') NOT NULL DEFAULT 'pending',
            round_type ENUM('elimination', 'points', 'shortlist_limit') NOT NULL DEFAULT 'elimination',
            shortlist_target INT DEFAULT NULL,
            description TEXT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_sub_round (sub_event_id, round_number)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

        // 2. Sub-event Groups
        $db->exec("CREATE TABLE IF NOT EXISTS sub_event_groups (
            id INT AUTO_INCREMENT PRIMARY KEY,
            sub_event_id INT NOT NULL,
            round_id INT NOT NULL,
            name VARCHAR(255) NOT NULL,
            topic VARCHAR(255) DEFAULT NULL,
            status ENUM('unassigned', 'assigned', 'evaluating', 'evaluated') NOT NULL DEFAULT 'unassigned',
            panel_id INT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_round_groups (round_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

        // 3. Sub-event Group Members
        $db->exec("CREATE TABLE IF NOT EXISTS sub_event_group_members (
            id INT AUTO_INCREMENT PRIMARY KEY,
            group_id INT NOT NULL,
            registration_id INT NOT NULL,
            participant_name VARCHAR(255) NOT NULL,
            participant_email VARCHAR(255) DEFAULT NULL,
            participant_phone VARCHAR(50) DEFAULT NULL,
            year VARCHAR(50) DEFAULT NULL,
            department VARCHAR(100) DEFAULT NULL,
            college VARCHAR(255) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_group_reg (group_id, registration_id),
            INDEX idx_reg_group (registration_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

        // 4. Sub-event Panels
        $db->exec("CREATE TABLE IF NOT EXISTS sub_event_panels (
            id INT AUTO_INCREMENT PRIMARY KEY,
            sub_event_id INT NOT NULL,
            round_id INT NOT NULL,
            name VARCHAR(255) NOT NULL,
            panel_number INT NOT NULL DEFAULT 1,
            venue VARCHAR(255) DEFAULT 'TBD',
            instructions TEXT DEFAULT NULL,
            status ENUM('available', 'in_session', 'evaluating', 'completed') NOT NULL DEFAULT 'available',
            assigned_group_id INT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_round_panels (round_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

        // 5. Sub-event Panel Judges
        $db->exec("CREATE TABLE IF NOT EXISTS sub_event_panel_judges (
            id INT AUTO_INCREMENT PRIMARY KEY,
            panel_id INT NOT NULL,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) DEFAULT NULL,
            phone VARCHAR(50) DEFAULT NULL,
            access_code VARCHAR(32) NOT NULL,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            last_login_at DATETIME DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_access_code (access_code),
            INDEX idx_panel_judge (panel_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

        // 6. Sub-event Evaluation Parameters
        $db->exec("CREATE TABLE IF NOT EXISTS sub_event_evaluation_parameters (
            id INT AUTO_INCREMENT PRIMARY KEY,
            panel_id INT NOT NULL,
            name VARCHAR(255) NOT NULL,
            max_marks INT NOT NULL DEFAULT 10,
            weightage INT NOT NULL DEFAULT 1,
            display_order INT NOT NULL DEFAULT 0,
            INDEX idx_panel_params (panel_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

        // 7. Sub-event Evaluations
        $db->exec("CREATE TABLE IF NOT EXISTS sub_event_evaluations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            sub_event_id INT NOT NULL,
            round_id INT NOT NULL,
            panel_id INT NOT NULL,
            judge_id INT NOT NULL,
            group_id INT DEFAULT NULL,
            registration_id INT NOT NULL,
            parameter_id INT NOT NULL,
            marks DECIMAL(5,2) NOT NULL DEFAULT 0.00,
            comments TEXT DEFAULT NULL,
            submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uq_judge_eval (panel_id, judge_id, round_id, registration_id, parameter_id),
            INDEX idx_reg_eval (registration_id, round_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

        // 8. Sub-event Round Participants Status
        $db->exec("CREATE TABLE IF NOT EXISTS sub_event_round_participants (
            id INT AUTO_INCREMENT PRIMARY KEY,
            sub_event_id INT NOT NULL,
            round_id INT NOT NULL,
            registration_id INT NOT NULL,
            status ENUM('available', 'in_group', 'shortlisted', 'eliminated', 'qualified') NOT NULL DEFAULT 'available',
            total_score DECIMAL(8,2) NOT NULL DEFAULT 0.00,
            `rank` INT DEFAULT NULL,
            notes TEXT DEFAULT NULL,
            is_promoted TINYINT(1) NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uq_round_reg (round_id, registration_id),
            INDEX idx_sub_reg (sub_event_id, registration_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

        try {
            $db->exec("ALTER TABLE event_sub_events ADD COLUMN rounds_initialized TINYINT(1) NOT NULL DEFAULT 0");
        } catch (\Exception $e) {}
    }

    /**
     * Generate unique random uppercase access code for judge.
     */
    public static function generateAccessCode(PDO $db): string {
        $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        for ($i = 0; $i < 10; $i++) {
            $code = '';
            for ($c = 0; $c < 8; $c++) {
                $code .= $chars[rand(0, strlen($chars) - 1)];
            }
            $stmt = $db->prepare("SELECT COUNT(*) FROM sub_event_panel_judges WHERE access_code = ?");
            $stmt->execute([$code]);
            if ($stmt->fetchColumn() == 0) {
                return $code;
            }
        }
        return strtoupper(bin2hex(random_bytes(4)));
    }

    /**
     * Ensure default rounds exist for a subevent if empty.
     */
    private static function ensureDefaultRounds(PDO $db, int $subEventId, string $subName): array {
        $stmtInit = $db->prepare("SELECT rounds_initialized FROM event_sub_events WHERE id = ?");
        $stmtInit->execute([$subEventId]);
        $isInit = (int)($stmtInit->fetchColumn() ?? 0);

        $stmt = $db->prepare("SELECT * FROM sub_event_rounds WHERE sub_event_id = ? ORDER BY round_number ASC");
        $stmt->execute([$subEventId]);
        $rounds = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (!$isInit && empty($rounds)) {
            // Create default 3 rounds (Round 1, Semi Final, Final Round)
            $db->prepare("INSERT INTO sub_event_rounds (sub_event_id, round_number, name, venue, status, round_type, shortlist_target, description)
                VALUES (?, 1, 'Round 1', 'CSBS Department | Kitcoek', 'completed', 'elimination', 120, 'Initial elimination & aptitude/GD round')
            ")->execute([$subEventId]);

            $db->prepare("INSERT INTO sub_event_rounds (sub_event_id, round_number, name, venue, status, round_type, shortlist_target, description)
                VALUES (?, 2, 'Semi Final', 'CSBS Department | Kitcoek', 'ongoing', 'elimination', 4, 'Intensive knockout semi-final stage')
            ")->execute([$subEventId]);

            $db->prepare("INSERT INTO sub_event_rounds (sub_event_id, round_number, name, venue, status, round_type, shortlist_target, description)
                VALUES (?, 3, 'Final Round', 'TBD', 'pending', 'elimination', 2, 'Grand final championship debate/round')
            ")->execute([$subEventId]);

            $db->prepare("UPDATE event_sub_events SET rounds_initialized = 1 WHERE id = ?")->execute([$subEventId]);

            $stmt->execute([$subEventId]);
            $rounds = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } else if (!$isInit && !empty($rounds)) {
            $db->prepare("UPDATE event_sub_events SET rounds_initialized = 1 WHERE id = ?")->execute([$subEventId]);
        }

        return $rounds;
    }

    /**
     * GET /api.php/events/{id}/sub-events/{subId}/control-room
     * Get the full control room metadata and state.
     */
    public function getControlRoom(array $params): void {
        AuthMiddleware::authenticate();
        $eventId = (int)$params['id'];
        $subEventId = (int)$params['subId'];
        $db = Database::getConnection();
        self::initTables($db);

        // Fetch sub-event info
        $subStmt = $db->prepare("SELECT s.*, e.name as event_name, e.slug as event_slug FROM event_sub_events s JOIN events e ON s.event_id = e.id WHERE s.id = ? AND s.event_id = ?");
        $subStmt->execute([$subEventId, $eventId]);
        $subEvent = $subStmt->fetch(PDO::FETCH_ASSOC);

        if (!$subEvent) {
            Router::jsonResponse(['error' => 'Sub-event not found'], 404);
            return;
        }

        // Ensure default rounds
        $rounds = self::ensureDefaultRounds($db, $subEventId, $subEvent['name']);

        // Fetch counts
        $regCountStmt = $db->prepare("SELECT COUNT(*) FROM event_registration_sub_events WHERE sub_event_id = ?");
        $regCountStmt->execute([$subEventId]);
        $totalRegistered = (int)$regCountStmt->fetchColumn();

        $attCountStmt = $db->prepare("SELECT COUNT(*) FROM event_registration_sub_events WHERE sub_event_id = ? AND attendance = 1");
        $attCountStmt->execute([$subEventId]);
        $totalPresent = (int)$attCountStmt->fetchColumn();

        Router::jsonResponse([
            'sub_event' => $subEvent,
            'rounds' => $rounds,
            'stats' => [
                'total_registered' => $totalRegistered,
                'total_present' => $totalPresent,
                'total_rounds' => count($rounds)
            ]
        ]);
    }

    /**
     * GET /api.php/events/{id}/sub-events/{subId}/rounds
     */
    public function listRounds(array $params): void {
        AuthMiddleware::authenticate();
        $subEventId = (int)$params['subId'];
        $db = Database::getConnection();
        self::initTables($db);

        $stmt = $db->prepare("SELECT r.*, 
            (SELECT COUNT(*) FROM sub_event_groups g WHERE g.round_id = r.id) as total_groups,
            (SELECT COUNT(*) FROM sub_event_panels p WHERE p.round_id = r.id) as total_panels,
            (SELECT COUNT(*) FROM sub_event_round_participants rp WHERE rp.round_id = r.id AND rp.status = 'shortlisted') as shortlisted_count
            FROM sub_event_rounds r 
            WHERE r.sub_event_id = ? 
            ORDER BY r.round_number ASC");
        $stmt->execute([$subEventId]);
        $rounds = $stmt->fetchAll(PDO::FETCH_ASSOC);

        Router::jsonResponse($rounds);
    }

    /**
     * POST /api.php/events/{id}/sub-events/{subId}/rounds
     * Create a new round.
     */
    public function createRound(array $params): void {
        AuthMiddleware::authenticate();
        $subEventId = (int)$params['subId'];
        $data = Router::getJsonBody();
        $db = Database::getConnection();
        self::initTables($db);

        $name = trim($data['name'] ?? '');
        if (empty($name)) {
            Router::jsonResponse(['error' => 'Round name is required'], 400);
            return;
        }

        // Get max round number
        $stmtMax = $db->prepare("SELECT COALESCE(MAX(round_number), 0) + 1 FROM sub_event_rounds WHERE sub_event_id = ?");
        $stmtMax->execute([$subEventId]);
        $nextNumber = (int)$stmtMax->fetchColumn();

        $stmt = $db->prepare("INSERT INTO sub_event_rounds (sub_event_id, round_number, name, venue, status, round_type, shortlist_target, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $subEventId,
            (int)($data['round_number'] ?? $nextNumber),
            $name,
            $data['venue'] ?? 'TBD',
            $data['status'] ?? 'pending',
            $data['round_type'] ?? 'elimination',
            !empty($data['shortlist_target']) ? (int)$data['shortlist_target'] : null,
            $data['description'] ?? null
        ]);

        $roundId = (int)$db->lastInsertId();
        Router::jsonResponse(['success' => true, 'id' => $roundId, 'message' => 'Round created successfully']);
    }

    /**
     * PUT /api.php/events/{id}/sub-events/{subId}/rounds/{roundId}
     */
    public function updateRound(array $params): void {
        AuthMiddleware::authenticate();
        $roundId = (int)$params['roundId'];
        $data = Router::getJsonBody();
        $db = Database::getConnection();
        self::initTables($db);

        $stmt = $db->prepare("UPDATE sub_event_rounds 
            SET name = COALESCE(?, name),
                venue = COALESCE(?, venue),
                status = COALESCE(?, status),
                round_type = COALESCE(?, round_type),
                shortlist_target = ?,
                description = COALESCE(?, description)
            WHERE id = ?");
        $stmt->execute([
            $data['name'] ?? null,
            $data['venue'] ?? null,
            $data['status'] ?? null,
            $data['round_type'] ?? null,
            isset($data['shortlist_target']) ? ($data['shortlist_target'] === '' ? null : (int)$data['shortlist_target']) : null,
            $data['description'] ?? null,
            $roundId
        ]);

        Router::jsonResponse(['success' => true, 'message' => 'Round updated']);
    }

    /**
     * DELETE /api.php/events/{id}/sub-events/{subId}/rounds/{roundId}
     */
    public function deleteRound(array $params): void {
        AuthMiddleware::authenticate();
        $roundId = (int)$params['roundId'];
        $db = Database::getConnection();
        self::initTables($db);

        $db->prepare("DELETE FROM sub_event_rounds WHERE id = ?")->execute([$roundId]);
        $db->prepare("DELETE FROM sub_event_groups WHERE round_id = ?")->execute([$roundId]);
        $db->prepare("DELETE FROM sub_event_panels WHERE round_id = ?")->execute([$roundId]);
        $db->prepare("DELETE FROM sub_event_evaluations WHERE round_id = ?")->execute([$roundId]);
        $db->prepare("DELETE FROM sub_event_round_participants WHERE round_id = ?")->execute([$roundId]);

        Router::jsonResponse(['success' => true, 'message' => 'Round deleted successfully']);
    }

    /**
     * GET /api.php/events/{id}/sub-events/{subId}/participants
     * List all participants for the subevent with their round status & group assignment.
     */
    public function listParticipants(array $params): void {
        AuthMiddleware::authenticate();
        $subEventId = (int)$params['subId'];
        $roundId = isset($_GET['round_id']) ? (int)$_GET['round_id'] : null;
        $db = Database::getConnection();
        self::initTables($db);

        // Check if round is initial round or subsequent round
        $isSubsequentRound = false;
        $eligibleShortlistedIds = [];
        if ($roundId) {
            $rStmt = $db->prepare("SELECT * FROM sub_event_rounds WHERE id = ? AND sub_event_id = ?");
            $rStmt->execute([$roundId, $subEventId]);
            $currentRound = $rStmt->fetch(PDO::FETCH_ASSOC);

            $minRoundStmt = $db->prepare("SELECT id, round_number FROM sub_event_rounds WHERE sub_event_id = ? ORDER BY round_number ASC, id ASC LIMIT 1");
            $minRoundStmt->execute([$subEventId]);
            $initialRound = $minRoundStmt->fetch(PDO::FETCH_ASSOC);

            if ($currentRound && $initialRound && ((int)$currentRound['round_number'] > (int)$initialRound['round_number'] || $currentRound['id'] != $initialRound['id'])) {
                $isSubsequentRound = true;

                // Find previous round
                $prevRoundStmt = $db->prepare("
                    SELECT id FROM sub_event_rounds 
                    WHERE sub_event_id = ? AND round_number < ? 
                    ORDER BY round_number DESC, id DESC LIMIT 1
                ");
                $prevRoundStmt->execute([$subEventId, $currentRound['round_number']]);
                $prevRoundId = (int)$prevRoundStmt->fetchColumn();

                $elStmt = $db->prepare("
                    SELECT DISTINCT registration_id 
                    FROM sub_event_round_participants 
                    WHERE (round_id = ? AND status != 'eliminated')
                       OR (? > 0 AND round_id = ? AND (status = 'shortlisted' OR is_promoted = 1))
                ");
                $elStmt->execute([$roundId, $prevRoundId, $prevRoundId]);
                $eligibleShortlistedIds = $elStmt->fetchAll(PDO::FETCH_COLUMN);
            }
        }

        // Fetch sub-event registration records (filtered by shortlist if subsequent round)
        $shortlistWhere = "";
        $queryParams = [$subEventId];

        if ($isSubsequentRound) {
            if (empty($eligibleShortlistedIds)) {
                // No candidates shortlisted for this round yet
                Router::jsonResponse([]);
                return;
            }
            $inClause = implode(',', array_fill(0, count($eligibleShortlistedIds), '?'));
            $shortlistWhere = "AND rs.registration_id IN ($inClause)";
            $queryParams = array_merge($queryParams, $eligibleShortlistedIds);
        }

        $query = "
            SELECT 
                rs.id as sub_reg_id,
                rs.registration_id,
                rs.sub_event_id,
                rs.team_name,
                rs.team_members,
                rs.attendance as sub_attendance,
                rs.attendance_marked_at,
                r.full_name,
                r.email,
                r.phone,
                r.registration_token,
                r.attendance as main_attendance
            FROM event_registration_sub_events rs
            JOIN event_registrations r ON rs.registration_id = r.id
            WHERE rs.sub_event_id = ?
            {$shortlistWhere}
            ORDER BY r.full_name ASC
        ";
        $stmt = $db->prepare($query);
        $stmt->execute($queryParams);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $regIds = array_column($rows, 'registration_id');
        $answersMap = [];
        if (!empty($regIds)) {
            $inClause = implode(',', array_fill(0, count($regIds), '?'));
            $ansStmt = $db->prepare("
                SELECT era.registration_id, era.answer_text, ff.label
                FROM event_registration_answers era
                LEFT JOIN form_fields ff ON era.field_id = ff.id
                WHERE era.registration_id IN ($inClause)
            ");
            $ansStmt->execute($regIds);
            while ($aRow = $ansStmt->fetch(PDO::FETCH_ASSOC)) {
                $rId = (int)$aRow['registration_id'];
                if (!isset($answersMap[$rId])) $answersMap[$rId] = [];
                $answersMap[$rId][$aRow['label'] ?? 'field'] = $aRow['answer_text'];
            }
        }

        // Fetch group memberships for current round if specified
        $groupMap = [];
        if ($roundId) {
            $gStmt = $db->prepare("
                SELECT gm.registration_id, g.id as group_id, g.name as group_name, g.panel_id, p.name as panel_name
                FROM sub_event_group_members gm
                JOIN sub_event_groups g ON gm.group_id = g.id
                LEFT JOIN sub_event_panels p ON g.panel_id = p.id
                WHERE g.round_id = ?
            ");
            $gStmt->execute([$roundId]);
            while ($gRow = $gStmt->fetch(PDO::FETCH_ASSOC)) {
                $groupMap[$gRow['registration_id']] = $gRow;
            }
        }

        // Fetch round participant status
        $roundStatusMap = [];
        if ($roundId) {
            $rpStmt = $db->prepare("SELECT registration_id, status, total_score, `rank`, is_promoted FROM sub_event_round_participants WHERE round_id = ?");
            $rpStmt->execute([$roundId]);
            while ($rpRow = $rpStmt->fetch(PDO::FETCH_ASSOC)) {
                $roundStatusMap[$rpRow['registration_id']] = $rpRow;
            }
        }

        $participants = [];
        foreach ($rows as $row) {
            $regId = (int)$row['registration_id'];
            $formResp = $answersMap[$regId] ?? [];
            
            // Extract academic year / branch from form responses
            $year = 'First Year (FY)';
            $department = 'Engineering';
            $college = "KIT's CoEK";

            foreach ($formResp as $key => $val) {
                $keyLower = strtolower($key);
                if (strpos($keyLower, 'year') !== false) {
                    $year = is_array($val) ? implode(', ', $val) : (string)$val;
                }
                if (strpos($keyLower, 'branch') !== false || strpos($keyLower, 'department') !== false) {
                    $department = is_array($val) ? implode(', ', $val) : (string)$val;
                }
                if (strpos($keyLower, 'college') !== false) {
                    $college = is_array($val) ? implode(', ', $val) : (string)$val;
                }
            }

            // Clean up year string
            $yearUpper = strtoupper($year);
            if (strpos($yearUpper, 'FIRST') !== false || strpos($yearUpper, 'FY') !== false || $year === '1') {
                $year = 'First Year (FY)';
            } elseif (strpos($yearUpper, 'SECOND') !== false || strpos($yearUpper, 'SY') !== false || $year === '2') {
                $year = 'Second Year (SY)';
            } elseif (strpos($yearUpper, 'THIRD') !== false || strpos($yearUpper, 'TY') !== false || $year === '3') {
                $year = 'Third Year (TY)';
            } elseif (strpos($yearUpper, 'FINAL') !== false || strpos($yearUpper, 'FOURTH') !== false || strpos($yearUpper, 'B.TECH') !== false || strpos($yearUpper, 'LY') !== false || $year === '4') {
                $year = 'Last Year (B.Tech)';
            }

            $regId = (int)$row['registration_id'];
            $groupInfo = $groupMap[$regId] ?? null;
            $roundStatus = $roundStatusMap[$regId] ?? null;

            // Attendance check: if marked present anywhere (main or sub-event or round), keep them present for all rounds
            $isAttended = ($row['sub_attendance'] == 1 || $row['main_attendance'] == 1 || strtolower((string)$row['sub_attendance']) === 'present' || strtolower((string)$row['main_attendance']) === 'present');

            $availability = 'available';
            if (!$isAttended) {
                $availability = 'absent';
            } elseif ($groupInfo) {
                $availability = 'in_group';
            } elseif ($roundStatus && $roundStatus['status'] === 'eliminated') {
                $availability = 'eliminated';
            } elseif ($roundStatus && $roundStatus['status'] === 'shortlisted') {
                $availability = 'shortlisted';
            }

            $participants[] = [
                'registration_id' => $regId,
                'sub_reg_id' => (int)$row['sub_reg_id'],
                'full_name' => $row['full_name'],
                'email' => $row['email'],
                'phone' => $row['phone'],
                'registration_token' => $row['registration_token'],
                'main_attendance' => (int)$row['main_attendance'],
                'sub_attendance' => $isAttended ? 1 : 0,
                'attendance' => $isAttended ? 1 : 0,
                'team_name' => $row['team_name'],
                'team_members' => json_decode($row['team_members'] ?? '[]', true) ?? [],
                'year' => $year,
                'department' => $department,
                'college' => $college,
                'group' => $groupInfo,
                'round_status' => $roundStatus['status'] ?? 'available',
                'total_score' => (float)($roundStatus['total_score'] ?? 0.00),
                'rank' => $roundStatus['rank'] ?? null,
                'is_promoted' => (int)($roundStatus['is_promoted'] ?? 0),
                'availability' => $availability
            ];
        }

        Router::jsonResponse($participants);
    }

    /**
     * POST /api.php/events/{id}/sub-events/{subId}/participants
     * Admin spot registration / add on-the-spot participant.
     */
    public function addSpotParticipant(array $params): void {
        AuthMiddleware::authenticate();
        $eventId = (int)$params['id'];
        $subEventId = (int)$params['subId'];
        $data = Router::getJsonBody();
        $db = Database::getConnection();
        self::initTables($db);

        $name = trim($data['full_name'] ?? '');
        $email = trim($data['email'] ?? '');
        $phone = trim($data['phone'] ?? '');

        if (empty($name) || empty($email)) {
            Router::jsonResponse(['error' => 'Participant name and email are required'], 400);
            return;
        }

        // Generate token
        $token = 'MV-' . strtoupper(substr(uniqid(), -6));
        $year = $data['year'] ?? 'First Year (FY)';
        $department = $data['department'] ?? 'CS/IT';
        $college = $data['college'] ?? "KIT's College of Engineering";

        $formResponses = [
            'Full Name' => $name,
            'Email Address' => $email,
            'Phone Number' => $phone,
            'Year' => $year,
            'Department' => $department,
            'College' => $college,
            'Spot Registration' => 'Yes (Admin Entry)'
        ];

        // 1. Insert into event_registrations
        $stmtReg = $db->prepare("
            INSERT INTO event_registrations 
            (event_id, full_name, email, phone, status, payment_status, attendance, attendance_marked_at, registration_token, form_responses, selected_sub_event_ids)
            VALUES (?, ?, ?, ?, 'confirmed', 'verified', 1, NOW(), ?, ?, ?)
        ");
        $stmtReg->execute([
            $eventId,
            $name,
            $email,
            $phone,
            $token,
            json_encode($formResponses),
            json_encode([$subEventId])
        ]);
        $registrationId = (int)$db->lastInsertId();

        // 2. Insert into event_registration_sub_events
        $stmtSubReg = $db->prepare("
            INSERT INTO event_registration_sub_events
            (registration_id, sub_event_id, team_name, team_members, fee, attendance, attendance_marked_at)
            VALUES (?, ?, ?, ?, 0.00, 1, NOW())
        ");
        $stmtSubReg->execute([
            $registrationId,
            $subEventId,
            $data['team_name'] ?? null,
            json_encode($data['team_members'] ?? [])
        ]);

        Router::jsonResponse([
            'success' => true,
            'registration_id' => $registrationId,
            'token' => $token,
            'message' => "Spot participant {$name} added successfully with attendance marked present!"
        ]);
    }

    /**
     * GET /api.php/events/{id}/sub-events/{subId}/groups
     * List groups for a specific round.
     */
    public function listGroups(array $params): void {
        AuthMiddleware::authenticate();
        $subEventId = (int)$params['subId'];
        $roundId = isset($_GET['round_id']) ? (int)$_GET['round_id'] : null;
        $db = Database::getConnection();
        self::initTables($db);

        if (!$roundId) {
            Router::jsonResponse(['error' => 'round_id is required'], 400);
            return;
        }

        $stmt = $db->prepare("
            SELECT g.*, p.name as panel_name, p.venue as panel_venue, p.status as panel_status
            FROM sub_event_groups g
            LEFT JOIN sub_event_panels p ON g.panel_id = p.id
            WHERE g.sub_event_id = ? AND g.round_id = ?
            ORDER BY g.id ASC
        ");
        $stmt->execute([$subEventId, $roundId]);
        $groups = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch members for each group
        $stmtMembers = $db->prepare("
            SELECT gm.*, r.registration_token, r.attendance as main_attendance, rs.attendance as sub_attendance
            FROM sub_event_group_members gm
            JOIN event_registrations r ON gm.registration_id = r.id
            JOIN event_registration_sub_events rs ON (rs.registration_id = r.id AND rs.sub_event_id = ?)
            WHERE gm.group_id = ?
        ");

        $result = [];
        foreach ($groups as $g) {
            $stmtMembers->execute([$subEventId, $g['id']]);
            $members = $stmtMembers->fetchAll(PDO::FETCH_ASSOC);
            $g['members'] = $members;
            $g['member_count'] = count($members);
            $result[] = $g;
        }

        Router::jsonResponse($result);
    }

    /**
     * POST /api.php/events/{id}/sub-events/{subId}/groups
     * Create a manual group.
     */
    public function createGroup(array $params): void {
        AuthMiddleware::authenticate();
        $subEventId = (int)$params['subId'];
        $data = Router::getJsonBody();
        $db = Database::getConnection();
        self::initTables($db);

        $roundId = (int)($data['round_id'] ?? 0);
        $name = trim($data['name'] ?? '');
        $topic = trim($data['topic'] ?? '');
        $memberIds = (array)($data['registration_ids'] ?? []);

        if (!$roundId || empty($name)) {
            Router::jsonResponse(['error' => 'round_id and group name are required'], 400);
            return;
        }

        // Insert group
        $stmt = $db->prepare("INSERT INTO sub_event_groups (sub_event_id, round_id, name, topic, status) VALUES (?, ?, ?, ?, 'unassigned')");
        $stmt->execute([$subEventId, $roundId, $name, $topic]);
        $groupId = (int)$db->lastInsertId();

        // Insert members
        if (!empty($memberIds)) {
            $insertMem = $db->prepare("
                INSERT IGNORE INTO sub_event_group_members 
                (group_id, registration_id, participant_name, participant_email, participant_phone, year, department, college)
                SELECT ?, r.id, r.full_name, r.email, r.phone, 'First Year (FY)', 'CS', 'KIT'
                FROM event_registrations r
                WHERE r.id = ?
            ");
            foreach ($memberIds as $regId) {
                $insertMem->execute([$groupId, (int)$regId]);
            }
        }

        Router::jsonResponse(['success' => true, 'group_id' => $groupId, 'message' => "Group '{$name}' created"]);
    }

    /**
     * POST /api.php/events/{id}/sub-events/{subId}/groups/auto-generate
     * Auto Grouping Strategy: 'year_based' or 'random'
     */
    public function autoGenerateGroups(array $params): void {
        AuthMiddleware::authenticate();
        $subEventId = (int)$params['subId'];
        $data = Router::getJsonBody();
        $db = Database::getConnection();
        self::initTables($db);

        $roundId = (int)($data['round_id'] ?? 0);
        $capacity = max(2, (int)($data['capacity'] ?? 4));
        $strategy = $data['strategy'] ?? 'year_based'; // 'year_based' or 'random'
        $onlyPresent = !empty($data['only_present']); // Only participants marked present
        $prefix = trim($data['group_prefix'] ?? 'Group');
        $selectedIds = !empty($data['registration_ids']) ? array_map('intval', (array)$data['registration_ids']) : [];

        // Check if round is initial round or subsequent round
        $isSubsequentRound = false;
        $eligibleShortlistedIds = [];
        if ($roundId) {
            $rStmt = $db->prepare("SELECT * FROM sub_event_rounds WHERE id = ? AND sub_event_id = ?");
            $rStmt->execute([$roundId, $subEventId]);
            $currentRound = $rStmt->fetch(PDO::FETCH_ASSOC);

            $minRoundStmt = $db->prepare("SELECT id, round_number FROM sub_event_rounds WHERE sub_event_id = ? ORDER BY round_number ASC, id ASC LIMIT 1");
            $minRoundStmt->execute([$subEventId]);
            $initialRound = $minRoundStmt->fetch(PDO::FETCH_ASSOC);

            if ($currentRound && $initialRound && ((int)$currentRound['round_number'] > (int)$initialRound['round_number'] || $currentRound['id'] != $initialRound['id'])) {
                $isSubsequentRound = true;

                // Find previous round
                $prevRoundStmt = $db->prepare("
                    SELECT id FROM sub_event_rounds 
                    WHERE sub_event_id = ? AND round_number < ? 
                    ORDER BY round_number DESC, id DESC LIMIT 1
                ");
                $prevRoundStmt->execute([$subEventId, $currentRound['round_number']]);
                $prevRoundId = (int)$prevRoundStmt->fetchColumn();

                $elStmt = $db->prepare("
                    SELECT DISTINCT registration_id 
                    FROM sub_event_round_participants 
                    WHERE (round_id = ? AND status != 'eliminated')
                       OR (? > 0 AND round_id = ? AND (status = 'shortlisted' OR is_promoted = 1))
                ");
                $elStmt->execute([$roundId, $prevRoundId, $prevRoundId]);
                $eligibleShortlistedIds = $elStmt->fetchAll(PDO::FETCH_COLUMN);
            }
        }

        // Fetch eligible participants who are NOT yet in any group for this round
        $attCondition = $onlyPresent ? "AND (COALESCE(rs.attendance, 0) = 1 OR COALESCE(r.attendance, 0) = 1 OR rs.attendance = 'present' OR r.attendance = 'present')" : "";
        $selectedClause = "";
        $queryParams = [$subEventId];

        if ($isSubsequentRound) {
            if (empty($eligibleShortlistedIds)) {
                Router::jsonResponse(['error' => 'No candidates have been shortlisted for this round yet. Please shortlist or promote candidates from the previous round first.'], 400);
                return;
            }
            $inShortlist = implode(',', array_fill(0, count($eligibleShortlistedIds), '?'));
            $selectedClause .= " AND rs.registration_id IN ($inShortlist)";
            $queryParams = array_merge($queryParams, $eligibleShortlistedIds);
        }

        if (!empty($selectedIds)) {
            $selIn = implode(',', array_fill(0, count($selectedIds), '?'));
            $selectedClause .= " AND rs.registration_id IN ($selIn)";
            $queryParams = array_merge($queryParams, $selectedIds);
        }

        $queryParams[] = $roundId;

        $query = "
            SELECT 
                rs.registration_id,
                r.full_name,
                r.email,
                r.phone
            FROM event_registration_sub_events rs
            JOIN event_registrations r ON rs.registration_id = r.id
            WHERE rs.sub_event_id = ?
            {$selectedClause}
            {$attCondition}
            AND rs.registration_id NOT IN (
                SELECT gm.registration_id 
                FROM sub_event_group_members gm 
                JOIN sub_event_groups g ON gm.group_id = g.id 
                WHERE g.round_id = ?
            )
            ORDER BY r.id ASC
        ";
        $stmt = $db->prepare($query);
        $stmt->execute($queryParams);
        $candidates = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($candidates)) {
            Router::jsonResponse(['error' => 'No available unassigned participants found to form groups.'], 400);
            return;
        }

        $candIds = array_column($candidates, 'registration_id');
        $candAnswersMap = [];
        if (!empty($candIds)) {
            $inClause = implode(',', array_fill(0, count($candIds), '?'));
            $ansStmt = $db->prepare("
                SELECT era.registration_id, era.answer_text, ff.label
                FROM event_registration_answers era
                LEFT JOIN form_fields ff ON era.field_id = ff.id
                WHERE era.registration_id IN ($inClause)
            ");
            $ansStmt->execute($candIds);
            while ($aRow = $ansStmt->fetch(PDO::FETCH_ASSOC)) {
                $rId = (int)$aRow['registration_id'];
                if (!isset($candAnswersMap[$rId])) $candAnswersMap[$rId] = [];
                $candAnswersMap[$rId][$aRow['label'] ?? 'field'] = $aRow['answer_text'];
            }
        }

        // Parse candidate years
        $processedCandidates = [];
        foreach ($candidates as $c) {
            $regId = (int)$c['registration_id'];
            $formResp = $candAnswersMap[$regId] ?? [];
            $year = 'FY';
            $department = 'Engineering';
            $college = "KIT's CoEK";

            foreach ($formResp as $k => $v) {
                $kL = strtolower($k);
                if (strpos($kL, 'year') !== false) {
                    $vStr = strtoupper(is_array($v) ? implode(' ', $v) : (string)$v);
                    if (strpos($vStr, 'FIRST') !== false || strpos($vStr, 'FY') !== false) $year = 'FY';
                    elseif (strpos($vStr, 'SECOND') !== false || strpos($vStr, 'SY') !== false) $year = 'SY';
                    elseif (strpos($vStr, 'THIRD') !== false || strpos($vStr, 'TY') !== false) $year = 'TY';
                    elseif (strpos($vStr, 'FINAL') !== false || strpos($vStr, 'B.TECH') !== false || strpos($vStr, 'LY') !== false) $year = 'B.Tech';
                }
                if (strpos($kL, 'department') !== false || strpos($kL, 'branch') !== false) {
                    $department = is_array($v) ? implode(', ', $v) : (string)$v;
                }
                if (strpos($kL, 'college') !== false) {
                    $college = is_array($v) ? implode(', ', $v) : (string)$v;
                }
            }

            $processedCandidates[] = [
                'registration_id' => (int)$c['registration_id'],
                'full_name' => $c['full_name'],
                'email' => $c['email'],
                'phone' => $c['phone'],
                'year' => $year,
                'department' => $department,
                'college' => $college
            ];
        }

        $totalCandidates = count($processedCandidates);
        $numGroups = max(1, (int)ceil($totalCandidates / $capacity));
        $groupsBucket = array_fill(0, $numGroups, []);

        if ($strategy === 'year_based') {
            // Group by year buckets first, then round-robin distribute to ensure year diversity
            $yearBuckets = ['FY' => [], 'SY' => [], 'TY' => [], 'B.Tech' => []];
            foreach ($processedCandidates as $pc) {
                $y = $pc['year'];
                if (!isset($yearBuckets[$y])) $yearBuckets['FY'][] = $pc;
                else $yearBuckets[$y][] = $pc;
            }

            // Shuffle inside each bucket
            foreach ($yearBuckets as &$b) {
                shuffle($b);
            }

            // Round robin across all available buckets with automatic fallback to any remaining candidates
            $groupIndex = 0;
            foreach ($yearBuckets as $yKey => $bucket) {
                foreach ($bucket as $item) {
                    $groupsBucket[$groupIndex][] = $item;
                    $groupIndex = ($groupIndex + 1) % $numGroups;
                }
            }
        } else {
            // Pure random shuffle
            shuffle($processedCandidates);
            $groupIndex = 0;
            foreach ($processedCandidates as $item) {
                $groupsBucket[$groupIndex][] = $item;
                $groupIndex = ($groupIndex + 1) % $numGroups;
            }
        }

        // Get current group count to name nicely (e.g. Group 1, Group 2, ...)
        $stmtExisting = $db->prepare("SELECT COUNT(*) FROM sub_event_groups WHERE round_id = ?");
        $stmtExisting->execute([$roundId]);
        $startIdx = (int)$stmtExisting->fetchColumn() + 1;

        $createdGroups = [];
        $db->beginTransaction();
        try {
            $insertGroup = $db->prepare("INSERT INTO sub_event_groups (sub_event_id, round_id, name, status) VALUES (?, ?, ?, 'unassigned')");
            $insertMember = $db->prepare("
                INSERT INTO sub_event_group_members 
                (group_id, registration_id, participant_name, participant_email, participant_phone, year, department, college)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");

            foreach ($groupsBucket as $i => $members) {
                if (empty($members)) continue;
                $groupName = "{$prefix} " . ($startIdx + $i);
                $insertGroup->execute([$subEventId, $roundId, $groupName]);
                $groupId = (int)$db->lastInsertId();

                foreach ($members as $m) {
                    $insertMember->execute([
                        $groupId,
                        $m['registration_id'],
                        $m['full_name'],
                        $m['email'],
                        $m['phone'],
                        $m['year'],
                        $m['department'],
                        $m['college']
                    ]);
                }
                $createdGroups[] = ['id' => $groupId, 'name' => $groupName, 'count' => count($members)];
            }
            $db->commit();
        } catch (\Exception $e) {
            $db->rollBack();
            Router::jsonResponse(['error' => 'Failed to generate groups: ' . $e->getMessage()], 500);
            return;
        }

        Router::jsonResponse([
            'success' => true,
            'groups_created' => count($createdGroups),
            'participants_grouped' => $totalCandidates,
            'strategy' => $strategy,
            'groups' => $createdGroups
        ]);
    }

    /**
     * DELETE /api.php/events/{id}/sub-events/{subId}/groups/{groupId}
     */
    public function deleteGroup(array $params): void {
        AuthMiddleware::authenticate();
        $groupId = (int)$params['groupId'];
        $db = Database::getConnection();
        self::initTables($db);

        $db->prepare("DELETE FROM sub_event_groups WHERE id = ?")->execute([$groupId]);
        $db->prepare("DELETE FROM sub_event_group_members WHERE group_id = ?")->execute([$groupId]);
        $db->prepare("UPDATE sub_event_panels SET assigned_group_id = NULL WHERE assigned_group_id = ?")->execute([$groupId]);

        Router::jsonResponse(['success' => true, 'message' => 'Group removed']);
    }

    /**
     * GET /api.php/events/{id}/sub-events/{subId}/panels
     * List all panels for the sub-event across all rounds.
     */
    public function listPanels(array $params): void {
        AuthMiddleware::authenticate();
        $subEventId = (int)$params['subId'];
        $roundId = isset($_GET['round_id']) && !empty($_GET['round_id']) ? (int)$_GET['round_id'] : null;
        $db = Database::getConnection();
        self::initTables($db);

        $stmt = $db->prepare("
            SELECT p.*, r.name as round_name, g.name as assigned_group_name, g.status as assigned_group_status, g.round_id as assigned_group_round_id, gr.name as assigned_group_round_name
            FROM sub_event_panels p
            LEFT JOIN sub_event_rounds r ON p.round_id = r.id
            LEFT JOIN sub_event_groups g ON p.assigned_group_id = g.id
            LEFT JOIN sub_event_rounds gr ON g.round_id = gr.id
            WHERE p.sub_event_id = ?
            ORDER BY p.panel_number ASC, p.id ASC
        ");
        $stmt->execute([$subEventId]);
        $panels = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $stmtJudges = $db->prepare("SELECT * FROM sub_event_panel_judges WHERE panel_id = ? ORDER BY id ASC");
        $stmtParams = $db->prepare("SELECT * FROM sub_event_evaluation_parameters WHERE panel_id = ? ORDER BY display_order ASC");
        $stmtAssignedGroups = $db->prepare("
            SELECT g.id, g.name, g.topic, g.status, g.round_id, r.name as round_name,
                   (SELECT COUNT(*) FROM sub_event_group_members gm WHERE gm.group_id = g.id) as member_count
            FROM sub_event_groups g
            LEFT JOIN sub_event_rounds r ON g.round_id = r.id
            WHERE g.panel_id = ? AND g.status != 'evaluated' AND (? IS NULL OR g.round_id = ?)
            ORDER BY g.id ASC
        ");

        $result = [];
        foreach ($panels as $p) {
            $stmtJudges->execute([$p['id']]);
            $p['judges'] = $stmtJudges->fetchAll(PDO::FETCH_ASSOC);

            $stmtParams->execute([$p['id']]);
            $p['parameters'] = $stmtParams->fetchAll(PDO::FETCH_ASSOC);

            $stmtAssignedGroups->execute([$p['id'], $roundId, $roundId]);
            $assignedGroups = $stmtAssignedGroups->fetchAll(PDO::FETCH_ASSOC);
            $p['assigned_groups'] = $assignedGroups;
            $p['assigned_groups_count'] = count($assignedGroups);

            // Determine if panel is currently busy evaluating a group
            $isBusy = false;
            $evaluatingGroupName = null;
            if ($p['assigned_group_id'] && $p['status'] === 'in_session') {
                foreach ($assignedGroups as $ag) {
                    if ((int)$ag['id'] === (int)$p['assigned_group_id']) {
                        if ($ag['status'] !== 'evaluated') {
                            $evaluatingGroupName = $ag['name'];
                            $isBusy = true;
                        }
                        break;
                    }
                }
                if (!$evaluatingGroupName && !empty($p['assigned_group_name']) && $p['assigned_group_status'] !== 'evaluated') {
                    $evaluatingGroupName = $p['assigned_group_name'];
                    $isBusy = true;
                }
            }

            $p['is_busy'] = $isBusy;
            $p['evaluating_group_name'] = $evaluatingGroupName;

            $result[] = $p;
        }

        Router::jsonResponse($result);
    }

    /**
     * POST /api.php/events/{id}/sub-events/{subId}/panels
     * Create a new panel with judges and evaluation criteria.
     */
    public function createPanel(array $params): void {
        AuthMiddleware::authenticate();
        $subEventId = (int)$params['subId'];
        $data = Router::getJsonBody();
        $db = Database::getConnection();
        self::initTables($db);

        $roundId = (int)($data['round_id'] ?? 0);
        $name = trim($data['name'] ?? 'Panel A');
        $venue = trim($data['venue'] ?? 'Hall 1');
        $instructions = trim($data['instructions'] ?? '');
        $judges = (array)($data['judges'] ?? []);
        $evalParams = (array)($data['evaluation_parameters'] ?? []);

        if (!$roundId || empty($name)) {
            Router::jsonResponse(['error' => 'round_id and panel name are required'], 400);
            return;
        }

        // Get next panel number
        $stmtNum = $db->prepare("SELECT COALESCE(MAX(panel_number), 0) + 1 FROM sub_event_panels WHERE sub_event_id = ?");
        $stmtNum->execute([$subEventId]);
        $nextNum = (int)$stmtNum->fetchColumn();

        $db->beginTransaction();
        try {
            // 1. Insert panel
            $stmt = $db->prepare("
                INSERT INTO sub_event_panels (sub_event_id, round_id, name, panel_number, venue, instructions, status)
                VALUES (?, ?, ?, ?, ?, ?, 'available')
            ");
            $stmt->execute([$subEventId, $roundId, $name, $nextNum, $venue, $instructions]);
            $panelId = (int)$db->lastInsertId();

            // 2. Insert judges
            $insertJudge = $db->prepare("
                INSERT INTO sub_event_panel_judges (panel_id, name, email, phone, access_code)
                VALUES (?, ?, ?, ?, ?)
            ");

            if (empty($judges)) {
                // Default 1 judge if empty
                $accessCode = self::generateAccessCode($db);
                $insertJudge->execute([$panelId, 'Judge 1', 'judge@example.com', '', $accessCode]);
            } else {
                foreach ($judges as $j) {
                    $jName = trim($j['name'] ?? 'Judge');
                    $jEmail = trim($j['email'] ?? '');
                    $code = !empty($j['access_code']) && strtoupper($j['access_code']) !== 'AUTO' ? strtoupper(trim($j['access_code'])) : self::generateAccessCode($db);
                    $insertJudge->execute([$panelId, $jName, $jEmail, $j['phone'] ?? '', $code]);
                }
            }

            // 3. Insert Evaluation parameters
            $insertParam = $db->prepare("
                INSERT INTO sub_event_evaluation_parameters (panel_id, name, max_marks, weightage, display_order)
                VALUES (?, ?, ?, ?, ?)
            ");

            if (empty($evalParams)) {
                // Default parameters: Content (10), Presentation (10), Teamwork (10)
                $defaultParams = [
                    ['name' => 'Content & Articulation', 'max' => 10, 'weight' => 1, 'order' => 1],
                    ['name' => 'Presentation & Delivery', 'max' => 10, 'weight' => 1, 'order' => 2],
                    ['name' => 'Teamwork & Rebuttal', 'max' => 10, 'weight' => 1, 'order' => 3],
                ];
                foreach ($defaultParams as $dp) {
                    $insertParam->execute([$panelId, $dp['name'], $dp['max'], $dp['weight'], $dp['order']]);
                }
            } else {
                foreach ($evalParams as $idx => $p) {
                    $pName = trim($p['name'] ?? 'Parameter');
                    $pMax = max(1, (int)($p['max_marks'] ?? 10));
                    $pWeight = max(1, (int)($p['weightage'] ?? 1));
                    $insertParam->execute([$panelId, $pName, $pMax, $pWeight, $idx + 1]);
                }
            }

            $db->commit();
            Router::jsonResponse(['success' => true, 'panel_id' => $panelId, 'message' => "Panel '{$name}' created successfully"]);
        } catch (\Exception $e) {
            $db->rollBack();
            Router::jsonResponse(['error' => 'Failed to create panel: ' . $e->getMessage()], 500);
        }
    }

    /**
     * POST /api.php/events/{id}/sub-events/{subId}/panels/{panelId}/assign-group
     * Assign multiple groups or a single group to a panel in real-time.
     */
    public function assignGroupToPanel(array $params): void {
        AuthMiddleware::authenticate();
        $panelId = (int)$params['panelId'];
        $data = Router::getJsonBody();
        $db = Database::getConnection();
        self::initTables($db);

        // Accept array of group_ids or single group_id
        $groupIds = [];
        if (isset($data['group_ids']) && is_array($data['group_ids'])) {
            $groupIds = array_values(array_filter(array_map('intval', $data['group_ids'])));
        } else if (isset($data['group_id']) && $data['group_id'] !== '') {
            $groupIds = [(int)$data['group_id']];
        }

        $activeGroupId = isset($data['active_group_id']) && $data['active_group_id'] !== ''
            ? (int)$data['active_group_id']
            : (!empty($groupIds) ? $groupIds[0] : null);

        // 1. Remove panel_id from groups previously assigned to this panel that are not in new groupIds
        if (!empty($groupIds)) {
            $inClause = implode(',', array_fill(0, count($groupIds), '?'));
            $paramsClear = array_merge([$panelId], $groupIds);
            $db->prepare("UPDATE sub_event_groups SET panel_id = NULL, status = 'unassigned' WHERE panel_id = ? AND id NOT IN ($inClause)")
                ->execute($paramsClear);

            // 2. Assign selected groups to this panel
            $paramsAssign = array_merge([$panelId], $groupIds);
            $db->prepare("UPDATE sub_event_groups SET panel_id = ?, status = 'assigned' WHERE id IN ($inClause)")
                ->execute($paramsAssign);
        } else {
            $db->prepare("UPDATE sub_event_groups SET panel_id = NULL, status = 'unassigned' WHERE panel_id = ?")
                ->execute([$panelId]);
        }

        // 3. Update panel's active assigned group and status
        $panelStatus = $activeGroupId ? 'in_session' : 'available';
        $db->prepare("UPDATE sub_event_panels SET assigned_group_id = ?, status = ? WHERE id = ?")
            ->execute([$activeGroupId, $panelStatus, $panelId]);

        Router::jsonResponse(['success' => true, 'message' => 'Assigned groups updated successfully in real-time']);
    }

    /**
     * POST /api.php/events/{id}/sub-events/{subId}/panels/{panelId}/regenerate-codes
     */
    public function regenerateJudgeCodes(array $params): void {
        AuthMiddleware::authenticate();
        $panelId = (int)$params['panelId'];
        $db = Database::getConnection();
        self::initTables($db);

        $stmtJudges = $db->prepare("SELECT id FROM sub_event_panel_judges WHERE panel_id = ?");
        $stmtJudges->execute([$panelId]);
        $judgeIds = $stmtJudges->fetchAll(PDO::FETCH_COLUMN);

        $updateStmt = $db->prepare("UPDATE sub_event_panel_judges SET access_code = ? WHERE id = ?");
        foreach ($judgeIds as $jId) {
            $newCode = self::generateAccessCode($db);
            $updateStmt->execute([$newCode, $jId]);
        }

        Router::jsonResponse(['success' => true, 'message' => 'Judge access codes regenerated successfully']);
    }

    /**
     * DELETE /api.php/events/{id}/sub-events/{subId}/panels/{panelId}
     */
    public function deletePanel(array $params): void {
        AuthMiddleware::authenticate();
        $panelId = (int)$params['panelId'];
        $db = Database::getConnection();
        self::initTables($db);

        $db->prepare("DELETE FROM sub_event_panels WHERE id = ?")->execute([$panelId]);
        $db->prepare("DELETE FROM sub_event_panel_judges WHERE panel_id = ?")->execute([$panelId]);
        $db->prepare("DELETE FROM sub_event_evaluation_parameters WHERE panel_id = ?")->execute([$panelId]);
        $db->prepare("UPDATE sub_event_groups SET panel_id = NULL, status = 'unassigned' WHERE panel_id = ?")->execute([$panelId]);

        Router::jsonResponse(['success' => true, 'message' => 'Panel removed']);
    }

    /**
     * GET /api.php/events/{id}/sub-events/{subId}/shortlist
     * Leaderboard and shortlisting management.
     */
    public function getShortlist(array $params): void {
        AuthMiddleware::authenticate();
        $subEventId = (int)$params['subId'];
        $roundId = isset($_GET['round_id']) ? (int)$_GET['round_id'] : null;
        $db = Database::getConnection();
        self::initTables($db);

        if (!$roundId) {
            Router::jsonResponse(['error' => 'round_id is required'], 400);
            return;
        }

        // Fetch round details
        $rStmt = $db->prepare("SELECT * FROM sub_event_rounds WHERE id = ?");
        $rStmt->execute([$roundId]);
        $round = $rStmt->fetch(PDO::FETCH_ASSOC);

        // Fetch all evaluated / participating candidates for this round
        $query = "
            SELECT 
                r.id as registration_id,
                r.full_name,
                r.email,
                r.phone,
                r.registration_token,
                g.id as group_id,
                g.name as group_name,
                ROUND(COALESCE(SUM(e.marks) / NULLIF(COUNT(DISTINCT e.judge_id), 0), 0.00), 2) as total_score,
                COUNT(DISTINCT e.judge_id) as judges_evaluated,
                rp.status as round_status,
                rp.is_promoted
            FROM event_registrations r
            JOIN sub_event_group_members gm ON gm.registration_id = r.id
            JOIN sub_event_groups g ON gm.group_id = g.id
            LEFT JOIN sub_event_evaluations e ON (e.registration_id = r.id AND e.round_id = g.round_id)
            LEFT JOIN sub_event_round_participants rp ON (rp.registration_id = r.id AND rp.round_id = g.round_id)
            WHERE g.round_id = ? AND g.sub_event_id = ?
            GROUP BY r.id, g.id, rp.status, rp.is_promoted
            ORDER BY total_score DESC, r.full_name ASC
        ";

        $stmt = $db->prepare($query);
        $stmt->execute([$roundId, $subEventId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Calculate ranks
        $ranked = [];
        $rank = 1;
        foreach ($rows as $row) {
            $row['rank'] = $rank++;
            $row['total_score'] = (float)$row['total_score'];
            $row['status'] = $row['round_status'] ?? 'pending';
            $ranked[] = $row;
        }

        Router::jsonResponse([
            'round' => $round,
            'shortlist' => $ranked,
            'total_shortlisted' => count(array_filter($ranked, fn($x) => $x['status'] === 'shortlisted' || $x['is_promoted'] == 1))
        ]);
    }

    /**
     * POST /api.php/events/{id}/sub-events/{subId}/shortlist/promote
     * Promote shortlisted candidates to next round.
     */
    public function promoteShortlist(array $params): void {
        AuthMiddleware::authenticate();
        $subEventId = (int)$params['subId'];
        $data = Router::getJsonBody();
        $currentRoundId = (int)($data['current_round_id'] ?? 0);
        $nextRoundId = (int)($data['next_round_id'] ?? 0);
        $registrationIds = (array)($data['registration_ids'] ?? []);

        $db = Database::getConnection();
        self::initTables($db);

        if (!$currentRoundId || empty($registrationIds)) {
            Router::jsonResponse(['error' => 'current_round_id and registration_ids are required'], 400);
            return;
        }

        $db->beginTransaction();
        try {
            // Update current round status to shortlisted
            $stmtUpdateCurrent = $db->prepare("
                INSERT INTO sub_event_round_participants (sub_event_id, round_id, registration_id, status, is_promoted)
                VALUES (?, ?, ?, 'shortlisted', 1)
                ON DUPLICATE KEY UPDATE status = 'shortlisted', is_promoted = 1
            ");

            // If next round exists, register them into next round
            $stmtInsertNext = $nextRoundId ? $db->prepare("
                INSERT INTO sub_event_round_participants (sub_event_id, round_id, registration_id, status)
                VALUES (?, ?, ?, 'available')
                ON DUPLICATE KEY UPDATE status = 'available'
            ") : null;

            foreach ($registrationIds as $regId) {
                $stmtUpdateCurrent->execute([$subEventId, $currentRoundId, (int)$regId]);
                if ($stmtInsertNext) {
                    $stmtInsertNext->execute([$subEventId, $nextRoundId, (int)$regId]);
                }
            }

            $db->commit();
            Router::jsonResponse(['success' => true, 'message' => count($registrationIds) . ' participants shortlisted successfully!']);
        } catch (\Exception $e) {
            $db->rollBack();
            Router::jsonResponse(['error' => 'Failed to promote shortlist: ' . $e->getMessage()], 500);
        }
    }

    /**
     * GET /api.php/events/{id}/sub-events/{subId}/evaluations
     * Group-wise evaluation matrix for admin audit with candidate details and parameter breakdowns.
     */
    public function getEvaluations(array $params): void {
        AuthMiddleware::authenticate();
        $subEventId = (int)$params['subId'];
        $roundId = isset($_GET['round_id']) ? (int)$_GET['round_id'] : null;
        $db = Database::getConnection();
        self::initTables($db);

        // Fetch all groups in this round/sub-event
        $groupQuery = "
            SELECT 
                g.id, g.name, g.topic, g.status, g.round_id, g.panel_id,
                r.name as round_name, r.round_number,
                p.name as panel_name, p.venue as panel_venue,
                (SELECT COUNT(*) FROM sub_event_group_members gm WHERE gm.group_id = g.id) as member_count,
                (SELECT COUNT(DISTINCT e.judge_id) FROM sub_event_evaluations e WHERE e.group_id = g.id) as judges_evaluated,
                (SELECT MAX(e.updated_at) FROM sub_event_evaluations e WHERE e.group_id = g.id) as last_evaluated_at
            FROM sub_event_groups g
            LEFT JOIN sub_event_rounds r ON g.round_id = r.id
            LEFT JOIN sub_event_panels p ON g.panel_id = p.id
            WHERE g.sub_event_id = ? AND (? IS NULL OR g.round_id = ?)
            ORDER BY g.id ASC
        ";
        $gStmt = $db->prepare($groupQuery);
        $gStmt->execute([$subEventId, $roundId, $roundId]);
        $groups = $gStmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch all evaluation parameters for this sub-event/round
        $paramStmt = $db->prepare("
            SELECT DISTINCT p.* 
            FROM sub_event_evaluation_parameters p
            JOIN sub_event_panels pan ON p.panel_id = pan.id
            WHERE pan.sub_event_id = ? AND (? IS NULL OR pan.round_id = ?)
            ORDER BY p.display_order ASC, p.id ASC
        ");
        $paramStmt->execute([$subEventId, $roundId, $roundId]);
        $allParams = $paramStmt->fetchAll(PDO::FETCH_ASSOC);

        // For each group, fetch members and their detailed matrix evaluations
        $resultGroups = [];
        foreach ($groups as $grp) {
            $grpId = (int)$grp['id'];

            // Fetch group members
            $mStmt = $db->prepare("
                SELECT 
                    gm.registration_id, gm.participant_name, gm.year, gm.department,
                    r.registration_token, r.email, r.phone,
                    rp.total_score, rp.status as shortlist_status
                FROM sub_event_group_members gm
                JOIN event_registrations r ON gm.registration_id = r.id
                LEFT JOIN sub_event_round_participants rp ON (rp.registration_id = gm.registration_id AND rp.round_id = ?)
                WHERE gm.group_id = ?
                ORDER BY gm.participant_name ASC
            ");
            $mStmt->execute([$grp['round_id'] ?: $roundId, $grpId]);
            $members = $mStmt->fetchAll(PDO::FETCH_ASSOC);

            // Fetch evaluations for this group
            $eStmt = $db->prepare("
                SELECT 
                    e.*,
                    j.name as judge_name,
                    param.name as parameter_name,
                    param.max_marks as parameter_max_marks
                FROM sub_event_evaluations e
                JOIN sub_event_panel_judges j ON e.judge_id = j.id
                JOIN sub_event_evaluation_parameters param ON e.parameter_id = param.id
                WHERE e.group_id = ?
                ORDER BY e.updated_at ASC
            ");
            $eStmt->execute([$grpId]);
            $groupEvals = $eStmt->fetchAll(PDO::FETCH_ASSOC);

            // Structure member evaluations matrix
            $structuredMembers = [];
            $groupTotalScore = 0;
            $evaluatedMembersCount = 0;
            $shortlistedMembersCount = 0;

            foreach ($members as $m) {
                $regId = (int)$m['registration_id'];
                $mEvals = array_filter($groupEvals, fn($ev) => (int)$ev['registration_id'] === $regId);

                // Group evaluations by parameter
                $paramBreakdown = [];
                $memberTotal = 0;
                $allComments = [];

                foreach ($allParams as $p) {
                    $pId = (int)$p['id'];
                    $pevals = array_filter($mEvals, fn($ev) => (int)$ev['parameter_id'] === $pId);
                    
                    $marksList = array_map(fn($ev) => (float)$ev['marks'], $pevals);
                    $avgParamMarks = count($marksList) > 0 ? round(array_sum($marksList) / count($marksList), 2) : null;
                    
                    if ($avgParamMarks !== null) {
                        $memberTotal += $avgParamMarks;
                    }

                    foreach ($pevals as $ev) {
                        if (!empty($ev['comments'])) {
                            $allComments[] = $ev['judge_name'] . ': ' . $ev['comments'];
                        }
                    }

                    $paramBreakdown[] = [
                        'parameter_id' => $pId,
                        'name' => $p['name'],
                        'max_marks' => (float)$p['max_marks'],
                        'avg_marks' => $avgParamMarks,
                        'judge_scores' => array_values(array_map(fn($ev) => [
                            'judge_id' => (int)$ev['judge_id'],
                            'judge_name' => $ev['judge_name'],
                            'marks' => (float)$ev['marks'],
                            'comments' => $ev['comments']
                        ], $pevals))
                    ];
                }

                if (!empty($mEvals)) {
                    $evaluatedMembersCount++;
                }

                $finalCandidateScore = $m['total_score'] !== null ? (float)$m['total_score'] : round($memberTotal, 2);
                $groupTotalScore += $finalCandidateScore;

                if ($m['shortlist_status'] === 'shortlisted') {
                    $shortlistedMembersCount++;
                }

                $structuredMembers[] = [
                    'registration_id' => $regId,
                    'participant_name' => $m['participant_name'],
                    'registration_token' => $m['registration_token'],
                    'email' => $m['email'],
                    'phone' => $m['phone'],
                    'year' => $m['year'],
                    'department' => $m['department'],
                    'total_score' => $finalCandidateScore,
                    'shortlist_status' => $m['shortlist_status'] ?: 'available',
                    'parameter_breakdown' => $paramBreakdown,
                    'feedback_comments' => implode(' | ', $allComments)
                ];
            }

            $grp['members'] = $structuredMembers;
            $grp['evaluated_members_count'] = $evaluatedMembersCount;
            $grp['shortlisted_members_count'] = $shortlistedMembersCount;
            $grp['avg_group_score'] = count($structuredMembers) > 0 ? round($groupTotalScore / count($structuredMembers), 2) : 0;
            $grp['highest_score'] = count($structuredMembers) > 0 ? max(array_map(fn($sm) => $sm['total_score'], $structuredMembers)) : 0;

            $resultGroups[] = $grp;
        }

        Router::jsonResponse([
            'groups' => $resultGroups,
            'parameters' => $allParams,
            'total_groups' => count($resultGroups)
        ]);
    }

    // ==========================================
    // JUDGE ACCESS & SCORING PORTAL ENDPOINTS
    // ==========================================

    /**
     * POST /api.php/judge/auth/login
     * Single input access code login for judges.
     */
    public function judgeLogin(): void {
        $data = Router::getJsonBody();
        $accessCode = strtoupper(trim($data['access_code'] ?? ''));

        if (empty($accessCode)) {
            Router::jsonResponse(['error' => 'Please enter your 8-character Access Code'], 400);
            return;
        }

        $db = Database::getConnection();
        self::initTables($db);

        $stmt = $db->prepare("
            SELECT 
                j.*, 
                p.id as panel_id, 
                p.name as panel_name, 
                p.venue as panel_venue, 
                p.instructions as panel_instructions,
                p.assigned_group_id,
                r.id as round_id,
                r.name as round_name,
                r.round_number,
                s.id as sub_event_id,
                s.name as sub_event_name,
                s.type as sub_event_type,
                e.id as event_id,
                e.name as event_name
            FROM sub_event_panel_judges j
            JOIN sub_event_panels p ON j.panel_id = p.id
            JOIN sub_event_rounds r ON p.round_id = r.id
            JOIN event_sub_events s ON p.sub_event_id = s.id
            JOIN events e ON s.event_id = e.id
            WHERE j.access_code = ? AND j.is_active = 1
        ");
        $stmt->execute([$accessCode]);
        $judge = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$judge) {
            Router::jsonResponse(['error' => 'Invalid or inactive access code. Please check with the control room coordinator.'], 401);
            return;
        }

        // Update last login
        $db->prepare("UPDATE sub_event_panel_judges SET last_login_at = NOW() WHERE id = ?")->execute([$judge['id']]);

        // Generate judge session token
        $token = base64_encode(json_encode([
            'judge_id' => $judge['id'],
            'panel_id' => $judge['panel_id'],
            'sub_event_id' => $judge['sub_event_id'],
            'round_id' => $judge['round_id'],
            'access_code' => $accessCode,
            'time' => time()
        ]));

        Router::jsonResponse([
            'success' => true,
            'token' => $token,
            'judge' => [
                'id' => (int)$judge['id'],
                'name' => $judge['name'],
                'email' => $judge['email'],
                'access_code' => $judge['access_code']
            ],
            'panel' => [
                'id' => (int)$judge['panel_id'],
                'name' => $judge['panel_name'],
                'venue' => $judge['panel_venue'],
                'instructions' => $judge['panel_instructions'],
                'assigned_group_id' => $judge['assigned_group_id'] ? (int)$judge['assigned_group_id'] : null
            ],
            'round' => [
                'id' => (int)$judge['round_id'],
                'name' => $judge['round_name'],
                'number' => (int)$judge['round_number']
            ],
            'sub_event' => [
                'id' => (int)$judge['sub_event_id'],
                'name' => $judge['sub_event_name'],
                'type' => $judge['sub_event_type']
            ],
            'event' => [
                'id' => (int)$judge['event_id'],
                'name' => $judge['event_name']
            ]
        ]);
    }

    /**
     * GET /api.php/judge/panel-data
     * Fetch live panel data for logged-in judge (assigned group, members, evaluation parameters, existing marks, all assigned groups queue).
     */
    public function getJudgePanelData(): void {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        $token = str_replace('Bearer ', '', $authHeader);

        $payload = json_decode(base64_decode($token), true);
        if (!$payload || empty($payload['judge_id'])) {
            Router::jsonResponse(['error' => 'Unauthorized judge session'], 401);
            return;
        }

        $judgeId = (int)$payload['judge_id'];
        $panelId = (int)$payload['panel_id'];
        $db = Database::getConnection();
        self::initTables($db);

        // Fetch panel info
        $pStmt = $db->prepare("
            SELECT p.*, r.name as round_name, r.round_number, s.name as sub_event_name, s.type as sub_event_type, e.name as event_name
            FROM sub_event_panels p
            JOIN sub_event_rounds r ON p.round_id = r.id
            JOIN event_sub_events s ON p.sub_event_id = s.id
            JOIN events e ON s.event_id = e.id
            WHERE p.id = ?
        ");
        $pStmt->execute([$panelId]);
        $panel = $pStmt->fetch(PDO::FETCH_ASSOC);

        if (!$panel) {
            Router::jsonResponse(['error' => 'Panel not found'], 404);
            return;
        }

        // Fetch all assigned groups queue for this panel
        $qStmt = $db->prepare("
            SELECT g.id, g.name, g.topic, g.status, g.round_id, r.name as round_name,
                   (SELECT COUNT(*) FROM sub_event_group_members gm WHERE gm.group_id = g.id) as member_count
            FROM sub_event_groups g
            LEFT JOIN sub_event_rounds r ON g.round_id = r.id
            WHERE g.panel_id = ?
            ORDER BY g.id ASC
        ");
        $qStmt->execute([$panelId]);
        $assignedQueue = $qStmt->fetchAll(PDO::FETCH_ASSOC);

        // Determine active assigned group
        $activeGroupId = $panel['assigned_group_id'];
        if ($activeGroupId) {
            // Verify if active group is already evaluated
            $chkGroup = $db->prepare("SELECT status FROM sub_event_groups WHERE id = ?");
            $chkGroup->execute([$activeGroupId]);
            $gStatus = $chkGroup->fetchColumn();
            if ($gStatus === 'evaluated') {
                $activeGroupId = null;
            }
        }

        if (!$activeGroupId && !empty($assignedQueue)) {
            // Pick first non-evaluated group
            foreach ($assignedQueue as $qg) {
                if ($qg['status'] !== 'evaluated') {
                    $activeGroupId = (int)$qg['id'];
                    $db->prepare("UPDATE sub_event_panels SET assigned_group_id = ?, status = 'in_session' WHERE id = ?")
                        ->execute([$activeGroupId, $panelId]);
                    break;
                }
            }
        }

        // Fetch evaluation parameters
        $paramStmt = $db->prepare("SELECT * FROM sub_event_evaluation_parameters WHERE panel_id = ? ORDER BY display_order ASC");
        $paramStmt->execute([$panelId]);
        $parameters = $paramStmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch active assigned group & members if any
        $group = null;
        $members = [];
        if ($activeGroupId) {
            $gStmt = $db->prepare("SELECT * FROM sub_event_groups WHERE id = ?");
            $gStmt->execute([$activeGroupId]);
            $group = $gStmt->fetch(PDO::FETCH_ASSOC);

            if ($group && $group['status'] !== 'evaluated') {
                $mStmt = $db->prepare("
                    SELECT gm.*, r.registration_token, r.phone, r.email, rp.status as shortlist_status
                    FROM sub_event_group_members gm
                    JOIN event_registrations r ON gm.registration_id = r.id
                    LEFT JOIN sub_event_round_participants rp ON (rp.registration_id = gm.registration_id AND rp.round_id = ?)
                    WHERE gm.group_id = ?
                    ORDER BY gm.participant_name ASC
                ");
                $mStmt->execute([$group['round_id'], $group['id']]);
                $members = $mStmt->fetchAll(PDO::FETCH_ASSOC);
            } else {
                $group = null;
            }
        }

        // Fetch current evaluations already submitted by this judge for this group
        $existingEvals = [];
        if ($group) {
            $eStmt = $db->prepare("SELECT * FROM sub_event_evaluations WHERE judge_id = ? AND panel_id = ? AND group_id = ?");
            $eStmt->execute([$judgeId, $panelId, $group['id']]);
            $existingEvals = $eStmt->fetchAll(PDO::FETCH_ASSOC);
        }

        // Judge counts on panel
        $jcStmt = $db->prepare("SELECT COUNT(*) FROM sub_event_panel_judges WHERE panel_id = ?");
        $jcStmt->execute([$panelId]);
        $judgesCount = (int)$jcStmt->fetchColumn();

        Router::jsonResponse([
            'panel' => $panel,
            'parameters' => $parameters,
            'assigned_group' => $group,
            'members' => $members,
            'existing_evaluations' => $existingEvals,
            'assigned_groups_queue' => $assignedQueue,
            'judges_count' => $judgesCount
        ]);
    }

    /**
     * POST /api.php/judge/submit-evaluation
     * Judge submits marks for participant(s) or entire group and shortlist recommendations.
     * Computes multi-judge real-time average marks, records shortlisted status, and auto-advances panel for all judges.
     */
    public function submitJudgeEvaluation(): void {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        $token = str_replace('Bearer ', '', $authHeader);

        $payload = json_decode(base64_decode($token), true);
        if (!$payload || empty($payload['judge_id'])) {
            Router::jsonResponse(['error' => 'Unauthorized judge session'], 401);
            return;
        }

        $judgeId = (int)$payload['judge_id'];
        $panelId = (int)$payload['panel_id'];
        $data = Router::getJsonBody();
        $db = Database::getConnection();
        self::initTables($db);

        $roundId = (int)($data['round_id'] ?? $payload['round_id']);
        $subEventId = (int)($data['sub_event_id'] ?? $payload['sub_event_id']);
        $groupId = !empty($data['group_id']) ? (int)$data['group_id'] : null;
        $evaluations = (array)($data['evaluations'] ?? []); // [{registration_id, parameter_id, marks, comments}]
        $shortlistedRegIds = (array)($data['shortlisted_registration_ids'] ?? []);

        if (empty($evaluations)) {
            Router::jsonResponse(['error' => 'Evaluation data cannot be empty'], 400);
            return;
        }

        $db->beginTransaction();
        try {
            $stmtUpsert = $db->prepare("
                INSERT INTO sub_event_evaluations 
                (sub_event_id, round_id, panel_id, judge_id, group_id, registration_id, parameter_id, marks, comments)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    marks = VALUES(marks),
                    comments = VALUES(comments),
                    updated_at = NOW()
            ");

            $evaluatedRegIds = [];
            foreach ($evaluations as $ev) {
                $regId = (int)($ev['registration_id'] ?? 0);
                $paramId = (int)($ev['parameter_id'] ?? 0);
                $marks = max(0, min(10, (float)($ev['marks'] ?? 0)));
                $comments = $ev['comments'] ?? null;

                if ($regId && $paramId) {
                    $evaluatedRegIds[] = $regId;
                    $stmtUpsert->execute([
                        $subEventId,
                        $roundId,
                        $panelId,
                        $judgeId,
                        $groupId,
                        $regId,
                        $paramId,
                        $marks,
                        $comments
                    ]);
                }
            }

            // Real-time Multi-Judge Average Calculation & Shortlist Status Recording:
            // For each evaluated participant, calculate average total score across all evaluating judges in this round
            $uniqueRegIds = array_unique($evaluatedRegIds);
            if (!empty($uniqueRegIds)) {
                $stmtAvg = $db->prepare("
                    SELECT ROUND(COALESCE(SUM(marks) / NULLIF(COUNT(DISTINCT judge_id), 0), 0.00), 2) as avg_score
                    FROM sub_event_evaluations
                    WHERE sub_event_id = ? AND round_id = ? AND registration_id = ?
                ");
                $stmtUpdatePart = $db->prepare("
                    INSERT INTO sub_event_round_participants (sub_event_id, round_id, registration_id, total_score, status)
                    VALUES (?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE total_score = VALUES(total_score), status = VALUES(status)
                ");

                foreach ($uniqueRegIds as $rId) {
                    $stmtAvg->execute([$subEventId, $roundId, $rId]);
                    $avgScore = (float)$stmtAvg->fetchColumn();
                    
                    // Mark shortlisted if selected by judge
                    $candidateStatus = in_array($rId, $shortlistedRegIds) ? 'shortlisted' : 'available';
                    $stmtUpdatePart->execute([$subEventId, $roundId, $rId, $avgScore, $candidateStatus]);
                }
            }

            // Mark group as evaluated and set panel status immediately to AVAILABLE
            if ($groupId) {
                $db->prepare("UPDATE sub_event_groups SET status = 'evaluated' WHERE id = ?")->execute([$groupId]);
            }

            $db->prepare("UPDATE sub_event_panels SET assigned_group_id = NULL, status = 'available' WHERE id = ?")
                ->execute([$panelId]);

            $db->commit();
            Router::jsonResponse([
                'success' => true,
                'message' => 'Evaluation marks and shortlist recommendations saved and synced across all panel judges!',
                'next_group_id' => $nextGroup ? (int)$nextGroup['id'] : null
            ]);
        } catch (\Exception $e) {
            $db->rollBack();
            Router::jsonResponse(['error' => 'Failed to save evaluation: ' . $e->getMessage()], 500);
        }
    }
}


