<?php
namespace App\Controllers;

use App\Database;
use App\Router;
use App\Middleware\AuthMiddleware;
use PDO;

class PanelController {

    private static function initTables(PDO $db): void {
        $db->exec("CREATE TABLE IF NOT EXISTS panels (
            id INT AUTO_INCREMENT PRIMARY KEY,
            campaign_id INT DEFAULT 1,
            panel_code VARCHAR(50) NOT NULL,
            name VARCHAR(255) NOT NULL,
            location VARCHAR(255) NULL,
            created_by INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

        $db->exec("CREATE TABLE IF NOT EXISTS panel_members (
            id INT AUTO_INCREMENT PRIMARY KEY,
            panel_id INT NOT NULL,
            user_id INT NOT NULL,
            UNIQUE KEY uq_panel_user (panel_id, user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

        $db->exec("CREATE TABLE IF NOT EXISTS panel_applicants (
            id INT AUTO_INCREMENT PRIMARY KEY,
            panel_id INT NOT NULL,
            application_id INT NOT NULL,
            interview_status VARCHAR(50) NOT NULL DEFAULT 'waiting',
            attendance TINYINT(1) NOT NULL DEFAULT 0,
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_panel_app (panel_id, application_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

        try {
            $db->exec("ALTER TABLE panel_applicants ADD COLUMN interview_status VARCHAR(50) NOT NULL DEFAULT 'waiting'");
        } catch (\Exception $e) {}

        try {
            $db->exec("ALTER TABLE panel_applicants ADD COLUMN attendance TINYINT(1) NOT NULL DEFAULT 0");
        } catch (\Exception $e) {}

        $db->exec("CREATE TABLE IF NOT EXISTS evaluation_criteria (
            id INT AUTO_INCREMENT PRIMARY KEY,
            campaign_id INT DEFAULT 1,
            title VARCHAR(255) NOT NULL,
            max_marks INT DEFAULT 10,
            weightage INT DEFAULT 1,
            display_order INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

        $db->exec("CREATE TABLE IF NOT EXISTS applicant_evaluations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            panel_id INT NOT NULL,
            application_id INT NOT NULL,
            evaluator_id INT NOT NULL,
            criteria_id INT NOT NULL,
            marks DECIMAL(5,2) DEFAULT 0.00,
            comments TEXT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uq_app_eval (panel_id, application_id, evaluator_id, criteria_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

        // Seed default criteria if empty
        $stmtCount = $db->query("SELECT COUNT(*) FROM evaluation_criteria");
        if ($stmtCount->fetchColumn() == 0) {
            $defaultCriteria = [
                ['title' => 'Technical Aptitude', 'max_marks' => 10, 'order' => 1],
                ['title' => 'Communication Skills', 'max_marks' => 10, 'order' => 2],
                ['title' => 'Problem Solving & Logic', 'max_marks' => 10, 'order' => 3],
                ['title' => 'Confidence & Attitude', 'max_marks' => 10, 'order' => 4],
                ['title' => 'Overall Recommendation', 'max_marks' => 10, 'order' => 5],
            ];
            $stmtIns = $db->prepare("INSERT INTO evaluation_criteria (campaign_id, title, max_marks, display_order) VALUES (1, ?, ?, ?)");
            foreach ($defaultCriteria as $dc) {
                $stmtIns->execute([$dc['title'], $dc['max_marks'], $dc['order']]);
            }
        }
    }

    /**
     * GET /api.php/panels
     */
    public function list(): void {
        $user = AuthMiddleware::authenticate();
        $db = Database::getConnection();
        self::initTables($db);

        // Fetch user permissions from DB
        $stmtUser = $db->prepare("SELECT permissions FROM users WHERE id = ?");
        $stmtUser->execute([$user['userId']]);
        $userPerms = json_decode($stmtUser->fetchColumn() ?? '{}', true) ?? [];
        $canViewAll = $user['role'] === 'coordinator' || !empty($userPerms['panels_view_all']);

        if ($canViewAll) {
            $stmt = $db->prepare("SELECT p.*, u.name as creator_name 
                FROM panels p 
                LEFT JOIN users u ON p.created_by = u.id 
                ORDER BY p.id DESC");
            $stmt->execute();
        } else {
            // Only panels where user is an assigned member
            $stmt = $db->prepare("SELECT p.*, u.name as creator_name 
                FROM panels p 
                LEFT JOIN users u ON p.created_by = u.id 
                WHERE p.id IN (SELECT panel_id FROM panel_members WHERE user_id = ?)
                ORDER BY p.id DESC");
            $stmt->execute([$user['userId']]);
        }
        $panels = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($panels as &$p) {
            // Get members
            $stmtMem = $db->prepare("SELECT u.id, u.name, u.email, u.role 
                FROM panel_members pm 
                JOIN users u ON pm.user_id = u.id 
                WHERE pm.panel_id = ?");
            $stmtMem->execute([$p['id']]);
            $p['members'] = $stmtMem->fetchAll(PDO::FETCH_ASSOC);

            // Get applicants with interview status and attendance
            $stmtApps = $db->prepare("SELECT pa.application_id as id, pa.interview_status, pa.attendance, a.full_name, a.prn, a.email 
                FROM panel_applicants pa 
                JOIN applications a ON pa.application_id = a.id 
                WHERE pa.panel_id = ? 
                ORDER BY pa.id ASC");
            $stmtApps->execute([$p['id']]);
            $p['applicants'] = $stmtApps->fetchAll(PDO::FETCH_ASSOC);
            $p['applicant_count'] = count($p['applicants']);

            $p['is_assigned_to_me'] = in_array($user['userId'], array_column($p['members'], 'id')) || $canViewAll;
        }

        Router::sendJson(['panels' => $panels, 'can_view_all' => $canViewAll]);
    }

    /**
     * POST /api.php/panels
     */
    public function create(): void {
        $user = AuthMiddleware::authenticate();
        if ($user['role'] !== 'coordinator' && $user['role'] !== 'core_member') {
            Router::sendJson(['error' => 'Only coordinators can create panels'], 403);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $name = trim($input['name'] ?? '');
        $code = trim($input['panel_code'] ?? '');
        $location = trim($input['location'] ?? '');
        $memberIds = is_array($input['member_ids'] ?? null) ? $input['member_ids'] : [];
        $applicantIds = is_array($input['applicant_ids'] ?? null) ? $input['applicant_ids'] : [];

        if (empty($name)) {
            Router::sendJson(['error' => 'Panel name is required'], 400);
            return;
        }

        if (empty($code)) {
            $code = 'PANEL-' . strtoupper(substr(md5(uniqid()), 0, 5));
        }

        $db = Database::getConnection();
        self::initTables($db);

        $stmt = $db->prepare("INSERT INTO panels (campaign_id, panel_code, name, location, created_by) VALUES (1, ?, ?, ?, ?)");
        $stmt->execute([$code, $name, $location, $user['userId']]);
        $panelId = $db->lastInsertId();

        // Assign members
        $stmtMem = $db->prepare("INSERT IGNORE INTO panel_members (panel_id, user_id) VALUES (?, ?)");
        foreach ($memberIds as $mId) {
            $stmtMem->execute([$panelId, (int)$mId]);
        }

        // Assign applicants
        $stmtApp = $db->prepare("INSERT IGNORE INTO panel_applicants (panel_id, application_id) VALUES (?, ?)");
        foreach ($applicantIds as $aId) {
            $stmtApp->execute([$panelId, (int)$aId]);
        }

        Router::sendJson(['message' => 'Panel created successfully', 'panel_id' => $panelId], 201);
    }

    /**
     * GET /api.php/panels/{id}
     */
    public function getDetail(array $params): void {
        $id = (int)($params['id'] ?? 0);
        $user = AuthMiddleware::authenticate();
        $db = Database::getConnection();
        self::initTables($db);

        // Fetch user permissions from DB
        $stmtUser = $db->prepare("SELECT permissions FROM users WHERE id = ?");
        $stmtUser->execute([$user['userId']]);
        $userPerms = json_decode($stmtUser->fetchColumn() ?? '{}', true) ?? [];
        $canViewAll = $user['role'] === 'coordinator' || !empty($userPerms['panels_view_all']);

        $stmt = $db->prepare("SELECT p.*, u.name as creator_name FROM panels p LEFT JOIN users u ON p.created_by = u.id WHERE p.id = ?");
        $stmt->execute([$id]);
        $panel = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$panel) {
            Router::sendJson(['error' => 'Panel not found'], 404);
            return;
        }

        // Access check: non-view-all users must be assigned members
        if (!$canViewAll) {
            $stmtCheck = $db->prepare("SELECT COUNT(*) FROM panel_members WHERE panel_id = ? AND user_id = ?");
            $stmtCheck->execute([$id, $user['userId']]);
            if ((int)$stmtCheck->fetchColumn() === 0) {
                Router::sendJson(['error' => 'Access denied: You are not assigned to this panel'], 403);
                return;
            }
        }

        // Members
        $stmtMem = $db->prepare("SELECT u.id, u.name, u.email, u.role FROM panel_members pm JOIN users u ON pm.user_id = u.id WHERE pm.panel_id = ?");
        $stmtMem->execute([$id]);
        $panel['members'] = $stmtMem->fetchAll(PDO::FETCH_ASSOC);

        // Assigned Applicants
        $stmtApp = $db->prepare("SELECT a.id, a.full_name, a.prn, a.email, a.phone, a.status, a.applied_at, pa.interview_status, pa.attendance 
            FROM panel_applicants pa 
            JOIN applications a ON pa.application_id = a.id 
            WHERE pa.panel_id = ? 
            ORDER BY pa.id ASC");
        $stmtApp->execute([$id]);
        $panel['applicants'] = $stmtApp->fetchAll(PDO::FETCH_ASSOC);

        // Criteria
        $stmtCrit = $db->query("SELECT * FROM evaluation_criteria ORDER BY display_order ASC, id ASC");
        $criteria = $stmtCrit->fetchAll(PDO::FETCH_ASSOC);

        // Fetch evaluations for this panel
        $stmtEval = $db->prepare("SELECT application_id, criteria_id, evaluator_id, marks, comments 
            FROM applicant_evaluations 
            WHERE panel_id = ?");
        $stmtEval->execute([$id]);
        $evaluations = $stmtEval->fetchAll(PDO::FETCH_ASSOC);

        Router::sendJson([
            'panel' => $panel,
            'criteria' => $criteria,
            'evaluations' => $evaluations,
            'current_user_id' => $user['userId']
        ]);
    }

    /**
     * PUT /api.php/panels/{id}
     */
    public function update(array $params): void {
        $id = (int)($params['id'] ?? 0);
        $user = AuthMiddleware::authenticate();
        if ($user['role'] !== 'coordinator' && $user['role'] !== 'core_member') {
            Router::sendJson(['error' => 'Only coordinators can update panels'], 403);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $name = trim($input['name'] ?? '');
        $location = trim($input['location'] ?? '');
        $memberIds = is_array($input['member_ids'] ?? null) ? $input['member_ids'] : null;
        $applicantIds = is_array($input['applicant_ids'] ?? null) ? $input['applicant_ids'] : null;

        $db = Database::getConnection();
        self::initTables($db);

        $stmt = $db->prepare("UPDATE panels SET name = ?, location = ? WHERE id = ?");
        $stmt->execute([$name, $location, $id]);

        if ($memberIds !== null) {
            $db->prepare("DELETE FROM panel_members WHERE panel_id = ?")->execute([$id]);
            $stmtMem = $db->prepare("INSERT INTO panel_members (panel_id, user_id) VALUES (?, ?)");
            foreach ($memberIds as $mId) {
                $stmtMem->execute([$id, (int)$mId]);
            }
        }

        if ($applicantIds !== null) {
            $db->prepare("DELETE FROM panel_applicants WHERE panel_id = ?")->execute([$id]);
            $stmtApp = $db->prepare("INSERT INTO panel_applicants (panel_id, application_id) VALUES (?, ?)");
            foreach ($applicantIds as $aId) {
                $stmtApp->execute([$id, (int)$aId]);
            }
        }

        Router::sendJson(['message' => 'Panel updated successfully']);
    }

    /**
     * DELETE /api.php/panels/{id}
     */
    public function delete(array $params): void {
        $id = (int)($params['id'] ?? 0);
        $user = AuthMiddleware::authenticate();
        if ($user['role'] !== 'coordinator') {
            Router::sendJson(['error' => 'Only coordinators can delete panels'], 403);
            return;
        }

        $db = Database::getConnection();
        $db->prepare("DELETE FROM panels WHERE id = ?")->execute([$id]);
        $db->prepare("DELETE FROM panel_members WHERE panel_id = ?")->execute([$id]);
        $db->prepare("DELETE FROM panel_applicants WHERE panel_id = ?")->execute([$id]);

        Router::sendJson(['message' => 'Panel deleted successfully']);
    }

    /**
     * GET /api.php/evaluation-criteria
     */
    public function getCriteria(): void {
        AuthMiddleware::authenticate();
        $db = Database::getConnection();
        self::initTables($db);

        $stmt = $db->query("SELECT * FROM evaluation_criteria ORDER BY display_order ASC, id ASC");
        Router::sendJson(['criteria' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    /**
     * POST /api.php/evaluation-criteria
     */
    public function saveCriteria(): void {
        $user = AuthMiddleware::authenticate();
        if ($user['role'] !== 'coordinator') {
            Router::sendJson(['error' => 'Only coordinators can modify global criteria'], 403);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $criteriaList = is_array($input['criteria'] ?? null) ? $input['criteria'] : [];

        $db = Database::getConnection();
        self::initTables($db);

        $db->exec("DELETE FROM evaluation_criteria WHERE campaign_id = 1");
        $stmtIns = $db->prepare("INSERT INTO evaluation_criteria (campaign_id, title, max_marks, display_order) VALUES (1, ?, ?, ?)");
        
        $order = 1;
        foreach ($criteriaList as $c) {
            $t = trim($c['title'] ?? '');
            $m = (int)($c['max_marks'] ?? 10);
            if (!empty($t)) {
                $stmtIns->execute([$t, $m, $order++]);
            }
        }

        Router::sendJson(['message' => 'Evaluation criteria updated successfully']);
    }

    /**
     * POST /api.php/panels/{id}/evaluate
     */
    public function submitEvaluation(array $params): void {
        $id = (int)($params['id'] ?? 0);
        $user = AuthMiddleware::authenticate();
        $evaluatorId = $user['userId'];

        $input = json_decode(file_get_contents('php://input'), true);
        $applicationId = (int)($input['application_id'] ?? 0);
        $scores = is_array($input['scores'] ?? null) ? $input['scores'] : [];
        $comments = trim($input['comments'] ?? '');

        if (!$applicationId) {
            Router::sendJson(['error' => 'Application ID is required'], 400);
            return;
        }

        $db = Database::getConnection();
        self::initTables($db);

        $stmtUpsert = $db->prepare("INSERT INTO applicant_evaluations 
            (panel_id, application_id, evaluator_id, criteria_id, marks, comments) 
            VALUES (?, ?, ?, ?, ?, ?) 
            ON DUPLICATE KEY UPDATE marks = VALUES(marks), comments = VALUES(comments)");

        foreach ($scores as $criteriaId => $marks) {
            $stmtUpsert->execute([$id, $applicationId, $evaluatorId, (int)$criteriaId, (float)$marks, $comments]);
        }

        Router::sendJson(['message' => 'Candidate evaluation saved successfully']);
    }

    /**
     * POST /api.php/panels/{id}/interview-status
     */
    public function updateInterviewStatus(array $params): void {
        $id = (int)($params['id'] ?? 0);
        AuthMiddleware::authenticate();

        $input = json_decode(file_get_contents('php://input'), true);
        $applicationId = (int)($input['application_id'] ?? 0);
        $status = trim($input['interview_status'] ?? 'waiting');

        if (!in_array($status, ['waiting', 'interviewing', 'interviewed'])) {
            $status = 'waiting';
        }

        $db = Database::getConnection();
        self::initTables($db);

        $stmt = $db->prepare("UPDATE panel_applicants SET interview_status = ? WHERE panel_id = ? AND application_id = ?");
        $stmt->execute([$status, $id, $applicationId]);

        Router::sendJson(['message' => 'Interview status updated successfully', 'interview_status' => $status]);
    }

    /**
     * POST /api.php/panels/{id}/attendance
     */
    public function updateAttendance(array $params): void {
        $id = (int)($params['id'] ?? 0);
        AuthMiddleware::authenticate();

        $input = json_decode(file_get_contents('php://input'), true);
        $applicationId = (int)($input['application_id'] ?? 0);
        $attendance = !empty($input['attendance']) ? 1 : 0;

        if (!$applicationId) {
            Router::sendJson(['error' => 'Application ID is required'], 400);
            return;
        }

        $db = Database::getConnection();
        self::initTables($db);

        $stmt = $db->prepare("UPDATE panel_applicants SET attendance = ? WHERE panel_id = ? AND application_id = ?");
        $stmt->execute([$attendance, $id, $applicationId]);

        // If marking absent, reset interview status to 'waiting'
        if (!$attendance) {
            $stmtReset = $db->prepare("UPDATE panel_applicants SET interview_status = 'waiting' WHERE panel_id = ? AND application_id = ?");
            $stmtReset->execute([$id, $applicationId]);
        }

        Router::sendJson(['message' => 'Attendance updated successfully', 'attendance' => $attendance]);
    }
}
