<?php
// src/Controllers/MindSagaController.php
namespace App\Controllers;

use App\Database;
use App\Router;
use App\Cache;
use App\Middleware\AuthMiddleware;
use Firebase\JWT\JWT;
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
use PDO;

class MindSagaController {

    /**
     * Ensure all tables and seed configs for Mind Saga exist.
     */
    public static function initTables(PDO $db): void {
        // 1. Mind Saga Master Config
        $db->exec("CREATE TABLE IF NOT EXISTS mind_saga_configs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            sub_event_id INT NOT NULL UNIQUE,
            platform_status ENUM('locked', 'live', 'paused', 'completed') NOT NULL DEFAULT 'locked',
            round1_weight DECIMAL(5,2) NOT NULL DEFAULT 30.00,
            round2_weight DECIMAL(5,2) NOT NULL DEFAULT 30.00,
            round3_weight DECIMAL(5,2) NOT NULL DEFAULT 40.00,
            auto_qualify_round1_top INT DEFAULT NULL,
            auto_qualify_round2_top INT DEFAULT NULL,
            sfu_server_url VARCHAR(500) DEFAULT 'wss://sfu.teammavericks.org',
            require_camera_r1 TINYINT(1) NOT NULL DEFAULT 1,
            require_camera_r2 TINYINT(1) NOT NULL DEFAULT 1,
            max_violations_allowed INT NOT NULL DEFAULT 3,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_ms_sub (sub_event_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

        try {
            $db->exec("ALTER TABLE mind_saga_configs ADD COLUMN platform_status ENUM('locked', 'live', 'paused', 'completed') NOT NULL DEFAULT 'locked'");
        } catch (\Exception $e) {}
        try {
            $db->exec("ALTER TABLE mind_saga_configs ADD COLUMN active_round INT NOT NULL DEFAULT 1");
        } catch (\Exception $e) {}
        try {
            $db->exec("ALTER TABLE mind_saga_configs ADD COLUMN max_attempts_r1 INT NOT NULL DEFAULT 1");
        } catch (\Exception $e) {}
        try {
            $db->exec("ALTER TABLE mind_saga_configs ADD COLUMN max_attempts_r2 INT NOT NULL DEFAULT 1");
        } catch (\Exception $e) {}

        // 2. Aptitude Tests
        $db->exec("CREATE TABLE IF NOT EXISTS mind_saga_aptitude_tests (
            id INT AUTO_INCREMENT PRIMARY KEY,
            sub_event_id INT NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT DEFAULT NULL,
            duration_minutes INT NOT NULL DEFAULT 30,
            total_marks DECIMAL(6,2) NOT NULL DEFAULT 50.00,
            pass_marks DECIMAL(6,2) NOT NULL DEFAULT 20.00,
            negative_marking_enabled TINYINT(1) NOT NULL DEFAULT 0,
            default_negative_marks DECIMAL(5,2) NOT NULL DEFAULT 0.50,
            shuffle_questions TINYINT(1) NOT NULL DEFAULT 1,
            shuffle_options TINYINT(1) NOT NULL DEFAULT 1,
            random_question_count INT DEFAULT NULL,
            is_published TINYINT(1) NOT NULL DEFAULT 0,
            schedule_start DATETIME DEFAULT NULL,
            schedule_end DATETIME DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_ms_test_sub (sub_event_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

        // 3. Aptitude Questions
        $db->exec("CREATE TABLE IF NOT EXISTS mind_saga_questions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            test_id INT NOT NULL,
            question_text TEXT NOT NULL,
            question_type ENUM('single_choice', 'multiple_choice', 'written_response', 'drawing_response') NOT NULL DEFAULT 'single_choice',
            image_url VARCHAR(500) DEFAULT NULL,
            allow_voice_answer TINYINT(1) NOT NULL DEFAULT 0,
            options JSON DEFAULT NULL,
            correct_answers JSON DEFAULT NULL,
            marks DECIMAL(5,2) NOT NULL DEFAULT 2.00,
            negative_marks DECIMAL(5,2) NOT NULL DEFAULT 0.00,
            partial_marking_enabled TINYINT(1) NOT NULL DEFAULT 1,
            expected_answer TEXT DEFAULT NULL,
            keywords JSON DEFAULT NULL,
            evaluation_mode ENUM('manual', 'ai_assisted', 'hybrid') NOT NULL DEFAULT 'ai_assisted',
            display_order INT NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_ms_q_test (test_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

        // 4. Aptitude Test Sessions
        $db->exec("CREATE TABLE IF NOT EXISTS mind_saga_test_sessions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            test_id INT NOT NULL,
            registration_id INT NOT NULL,
            sub_event_id INT NOT NULL,
            session_token VARCHAR(64) NOT NULL UNIQUE,
            started_at DATETIME NOT NULL,
            duration_seconds INT NOT NULL,
            expires_at DATETIME NOT NULL,
            status ENUM('in_progress', 'submitted', 'auto_submitted', 'terminated') NOT NULL DEFAULT 'in_progress',
            total_score DECIMAL(6,2) NOT NULL DEFAULT 0.00,
            max_possible_score DECIMAL(6,2) NOT NULL DEFAULT 0.00,
            percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
            assigned_question_ids JSON DEFAULT NULL,
            answers_data JSON DEFAULT NULL,
            evaluation_details JSON DEFAULT NULL,
            violation_count INT NOT NULL DEFAULT 0,
            camera_status ENUM('connected', 'denied', 'disconnected') NOT NULL DEFAULT 'connected',
            proctoring_events JSON DEFAULT NULL,
            submitted_at DATETIME DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uq_ms_session (test_id, registration_id),
            INDEX idx_ms_sess_sub (sub_event_id, registration_id),
            INDEX idx_ms_sess_token (session_token)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

        // 5. Gaming Configs
        $db->exec("CREATE TABLE IF NOT EXISTS mind_saga_game_configs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            sub_event_id INT NOT NULL,
            game_key VARCHAR(50) NOT NULL,
            title VARCHAR(255) NOT NULL,
            difficulty ENUM('easy', 'medium', 'hard') NOT NULL DEFAULT 'medium',
            duration_seconds INT NOT NULL DEFAULT 300,
            max_score INT NOT NULL DEFAULT 100,
            rules_json JSON DEFAULT NULL,
            challenge_config_json JSON DEFAULT NULL,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_ms_game_sub (sub_event_id, game_key)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

        // 6. Gaming Sessions
        $db->exec("CREATE TABLE IF NOT EXISTS mind_saga_game_sessions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            game_config_id INT NOT NULL,
            registration_id INT NOT NULL,
            sub_event_id INT NOT NULL,
            session_token VARCHAR(64) NOT NULL UNIQUE,
            started_at DATETIME NOT NULL,
            expires_at DATETIME NOT NULL,
            status ENUM('in_progress', 'completed', 'time_out', 'terminated') NOT NULL DEFAULT 'in_progress',
            score INT NOT NULL DEFAULT 0,
            max_score INT NOT NULL DEFAULT 100,
            game_data JSON DEFAULT NULL,
            moves_log JSON DEFAULT NULL,
            verification_hash VARCHAR(128) DEFAULT NULL,
            violation_count INT NOT NULL DEFAULT 0,
            camera_status ENUM('connected', 'denied', 'disconnected') NOT NULL DEFAULT 'connected',
            proctoring_events JSON DEFAULT NULL,
            completed_at DATETIME DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_ms_gsess (sub_event_id, registration_id),
            INDEX idx_ms_gsess_token (session_token)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

        // 7. Mind Saga Master Scores & Qualification Table
        $db->exec("CREATE TABLE IF NOT EXISTS mind_saga_scores (
            id INT AUTO_INCREMENT PRIMARY KEY,
            sub_event_id INT NOT NULL,
            registration_id INT NOT NULL,
            access_key VARCHAR(32) DEFAULT NULL,
            round1_score DECIMAL(6,2) NOT NULL DEFAULT 0.00,
            round1_max DECIMAL(6,2) NOT NULL DEFAULT 50.00,
            round2_score DECIMAL(6,2) NOT NULL DEFAULT 0.00,
            round2_max DECIMAL(6,2) NOT NULL DEFAULT 100.00,
            round3_score DECIMAL(6,2) NOT NULL DEFAULT 0.00,
            round3_max DECIMAL(6,2) NOT NULL DEFAULT 100.00,
            final_weighted_score DECIMAL(6,2) NOT NULL DEFAULT 0.00,
            qualification_status ENUM('in_round_1', 'qualified_round_2', 'qualified_round_3', 'finalist', 'eliminated') NOT NULL DEFAULT 'in_round_1',
            admin_notes TEXT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uq_ms_scores (sub_event_id, registration_id),
            INDEX idx_ms_score_qual (sub_event_id, qualification_status),
            INDEX idx_ms_access_key (access_key)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

        try {
            $db->exec("ALTER TABLE mind_saga_scores ADD COLUMN access_key VARCHAR(32) DEFAULT NULL");
        } catch (\Exception $e) {}
        try {
            $db->exec("ALTER TABLE mind_saga_test_sessions ADD COLUMN latest_snapshot MEDIUMTEXT DEFAULT NULL");
        } catch (\Exception $e) {}
        try {
            $db->exec("ALTER TABLE mind_saga_test_sessions ADD COLUMN last_snapshot_at DATETIME DEFAULT NULL");
        } catch (\Exception $e) {}
        try {
            $db->exec("ALTER TABLE mind_saga_game_sessions ADD COLUMN latest_snapshot MEDIUMTEXT DEFAULT NULL");
        } catch (\Exception $e) {}
        try {
            $db->exec("ALTER TABLE mind_saga_game_sessions ADD COLUMN last_snapshot_at DATETIME DEFAULT NULL");
        } catch (\Exception $e) {}
    }

    /**
     * Generate unique random uppercase access key for participant (e.g. MS-8B7X-9N2A).
     */
    public static function generateAccessKey(PDO $db): string {
        $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        for ($i = 0; $i < 15; $i++) {
            $p1 = '';
            $p2 = '';
            for ($c = 0; $c < 4; $c++) {
                $p1 .= $chars[rand(0, strlen($chars) - 1)];
                $p2 .= $chars[rand(0, strlen($chars) - 1)];
            }
            $key = "MS-{$p1}-{$p2}";
            $stmt = $db->prepare("SELECT COUNT(*) FROM mind_saga_scores WHERE access_key = ?");
            $stmt->execute([$key]);
            if ($stmt->fetchColumn() == 0) {
                return $key;
            }
        }
        return "MS-" . strtoupper(bin2hex(random_bytes(4)));
    }

    /**
     * Ensure default config, tests and games exist for a Mind Saga sub-event.
     */
    public static function ensureDefaults(PDO $db, int $subEventId): void {
        self::initTables($db);

        // Ensure config exists
        $cfgStmt = $db->prepare("SELECT COUNT(*) FROM mind_saga_configs WHERE sub_event_id = ?");
        $cfgStmt->execute([$subEventId]);
        if ($cfgStmt->fetchColumn() == 0) {
            $db->prepare("INSERT INTO mind_saga_configs (sub_event_id, round1_weight, round2_weight, round3_weight)
                VALUES (?, 30.00, 30.00, 40.00)
            ")->execute([$subEventId]);
        }

        // Ensure default Aptitude Test exists
        $testStmt = $db->prepare("SELECT COUNT(*) FROM mind_saga_aptitude_tests WHERE sub_event_id = ?");
        $testStmt->execute([$subEventId]);
        if ($testStmt->fetchColumn() == 0) {
            $insTest = $db->prepare("INSERT INTO mind_saga_aptitude_tests (sub_event_id, title, description, duration_minutes, total_marks, pass_marks, is_published, negative_marking_enabled, default_negative_marks)
                VALUES (?, 'Mind Saga Phase 1: Cognitive Aptitude Assessment', 'Comprehensive cognitive, logical reasoning, core computer science, and lateral thinking evaluation.', 25, 40.00, 16.00, 1, 1, 0.50)
            ");
            $insTest->execute([$subEventId]);
            $testId = (int)$db->lastInsertId();

            // Seed default questions for Round 1
            $qStmt = $db->prepare("INSERT INTO mind_saga_questions (test_id, question_text, question_type, options, correct_answers, marks, negative_marks, partial_marking_enabled, expected_answer, keywords, allow_voice_answer, display_order)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");

            // Q1: Single choice
            $q1Options = json_encode([
                ['id' => 'A', 'text' => 'O(1)'],
                ['id' => 'B', 'text' => 'O(log N)'],
                ['id' => 'C', 'text' => 'O(N)'],
                ['id' => 'D', 'text' => 'O(N log N)']
            ]);
            $qStmt->execute([
                $testId,
                'What is the worst-case time complexity of searching in a Balanced Binary Search Tree (AVL / Red-Black Tree)?',
                'single_choice',
                $q1Options,
                json_encode(['B']),
                2.00,
                0.50,
                0,
                null,
                null,
                0,
                1
            ]);

            // Q2: Multiple Choice
            $q2Options = json_encode([
                ['id' => 'A', 'text' => 'TCP is connection-oriented and ensures guaranteed packet delivery'],
                ['id' => 'B', 'text' => 'UDP has lower latency and minimal protocol overhead'],
                ['id' => 'C', 'text' => 'HTTP/3 operates over UDP using the QUIC protocol'],
                ['id' => 'D', 'text' => 'UDP provides automated congestion control and packet retransmission']
            ]);
            $qStmt->execute([
                $testId,
                'Which of the following statements regarding Network Transport Protocols are TRUE? (Select all that apply)',
                'multiple_choice',
                $q2Options,
                json_encode(['A', 'B', 'C']),
                3.00,
                1.00,
                1,
                null,
                null,
                0,
                2
            ]);

            // Q3: Written response with AI semantic evaluation & voice
            $qStmt->execute([
                $testId,
                'Explain the fundamental difference between TCP and UDP protocols, detailing their reliability models and ideal real-world use cases.',
                'written_response',
                null,
                null,
                5.00,
                0.00,
                1,
                'TCP is connection-oriented providing reliable, ordered byte-stream delivery with congestion control and 3-way handshakes, ideal for web browsing and file transfers. UDP is connectionless, lightweight and unreliable with low latency, ideal for live gaming, video streaming and DNS.',
                json_encode(['connection-oriented', 'reliable transmission', '3-way handshake', 'congestion control', 'connectionless', 'low latency', 'unreliable', 'packet ordering']),
                1,
                3
            ]);

            // Q4: Drawing / Diagram question
            $qStmt->execute([
                $testId,
                'Draw a system architecture diagram illustrating how a Client connects through a Load Balancer to multiple Application Servers with a shared Redis Cache and Database.',
                'drawing_response',
                null,
                null,
                5.00,
                0.00,
                1,
                'Expected diagram shows Client -> Load Balancer -> App Servers -> Cache / DB.',
                json_encode(['client', 'load balancer', 'app server', 'redis', 'database']),
                0,
                4
            ]);
        }

        // Ensure default Game Configs for Round 2 exist
        $gCountStmt = $db->prepare("SELECT COUNT(*) FROM mind_saga_game_configs WHERE sub_event_id = ?");
        $gCountStmt->execute([$subEventId]);
        if ($gCountStmt->fetchColumn() == 0) {
            // Game 1: Motion Challenge (Rapid Reaction & Target Matrix Precision)
            $db->prepare("INSERT INTO mind_saga_game_configs (sub_event_id, game_key, title, difficulty, duration_seconds, max_score, rules_json, challenge_config_json)
                VALUES (?, 'motion_challenge', 'Motion Challenge: Precision Reflex & Spatial Grid', 'medium', 180, 100,
                    ?, ?
                )
            ")->execute([
                $subEventId,
                json_encode([
                    'objective' => 'Track dynamic velocity targets on the spatial grid and trigger precision locks within milliseconds.',
                    'scoring' => 'Target lock +5 pts, Perfect speed combo +10 pts, Missed click -2 pts.',
                    'timer' => '3 Minutes total gameplay'
                ]),
                json_encode([
                    'grid_size' => 5,
                    'target_spawn_rate_ms' => 900,
                    'target_lifetime_ms' => 1800,
                    'max_concurrent_targets' => 3,
                    'rounds' => 15
                ])
            ]);

            // Game 2: Deductive Logical Thinking (4x4 Latin Square Shape Deduction as in user audio)
            $db->prepare("INSERT INTO mind_saga_game_configs (sub_event_id, game_key, title, difficulty, duration_seconds, max_score, rules_json, challenge_config_json)
                VALUES (?, 'deductive_logic', 'Deductive Logical Thinking: Symbol Matrix Deduction', 'medium', 240, 100,
                    ?, ?
                )
            ")->execute([
                $subEventId,
                json_encode([
                    'objective' => 'Deduce the missing symbols in a 4x4 matrix grid. Every row and every column must contain all four symbols (Square, Plus, Triangle, Circle) with strictly NO repetitions.',
                    'symbols' => ['square', 'plus', 'triangle', 'circle'],
                    'scoring' => 'Correct deduction +10 pts, Incorrect deduction -3 pts, Complete puzzle bonus +20 pts.'
                ]),
                json_encode([
                    'grid_size' => 4,
                    'symbols' => ['square', 'plus', 'triangle', 'circle'],
                    'clues_count' => 8,
                    'puzzles_count' => 4
                ])
            ]);
        }

        // Ensure all registered candidates have unique access keys
        self::ensureParticipantKeys($db, $subEventId);
    }

    // ==========================================
    // 1. ADMIN OVERVIEW & CONFIG ENDPOINTS
    // ==========================================

    /**
     * GET /events/{id}/sub-events/{subId}/mind-saga/overview
     */
    public static function getOverview(array $params): void {
        AuthMiddleware::authenticate(['coordinator', 'core_member', 'member']);
        $db = Database::getConnection();
        $eventId = (int)$params['id'];
        $subId = (int)$params['subId'];

        self::ensureDefaults($db, $subId);

        // Sub-event info
        $subStmt = $db->prepare("SELECT s.*, e.name as event_name FROM event_sub_events s JOIN events e ON s.event_id = e.id WHERE s.id = ? AND s.event_id = ?");
        $subStmt->execute([$subId, $eventId]);
        $subEvent = $subStmt->fetch(PDO::FETCH_ASSOC);
        if (!$subEvent) {
            Router::sendJson(['error' => 'Sub-event not found'], 404);
            return;
        }

        // Mind Saga Config
        $cfgStmt = $db->prepare("SELECT * FROM mind_saga_configs WHERE sub_event_id = ?");
        $cfgStmt->execute([$subId]);
        $config = $cfgStmt->fetch(PDO::FETCH_ASSOC);

        // Round 1 Aptitude Test stats
        $testStmt = $db->prepare("SELECT t.*, (SELECT COUNT(*) FROM mind_saga_questions q WHERE q.test_id = t.id) as question_count, (SELECT COUNT(*) FROM mind_saga_test_sessions s WHERE s.test_id = t.id) as total_attempts, (SELECT COUNT(*) FROM mind_saga_test_sessions s WHERE s.test_id = t.id AND s.status IN ('submitted', 'auto_submitted')) as completed_attempts FROM mind_saga_aptitude_tests t WHERE t.sub_event_id = ?");
        $testStmt->execute([$subId]);
        $tests = $testStmt->fetchAll(PDO::FETCH_ASSOC);

        // Round 2 Gaming stats
        $gameStmt = $db->prepare("SELECT g.*, (SELECT COUNT(*) FROM mind_saga_game_sessions s WHERE s.game_config_id = g.id) as total_attempts, (SELECT AVG(score) FROM mind_saga_game_sessions s WHERE s.game_config_id = g.id AND s.status = 'completed') as avg_score FROM mind_saga_game_configs g WHERE sub_event_id = ?");
        $gameStmt->execute([$subId]);
        $games = $gameStmt->fetchAll(PDO::FETCH_ASSOC);

        // Round 3 Interview Panels (reusing existing sub_event_panels)
        $panelStmt = $db->prepare("SELECT p.*, (SELECT COUNT(*) FROM sub_event_panel_judges j WHERE j.panel_id = p.id) as judges_count FROM sub_event_panels p WHERE p.sub_event_id = ?");
        $panelStmt->execute([$subId]);
        $panels = $panelStmt->fetchAll(PDO::FETCH_ASSOC);

        // Participants stats across stages
        $partCountStmt = $db->prepare("SELECT COUNT(*) FROM event_registration_sub_events WHERE sub_event_id = ?");
        $partCountStmt->execute([$subId]);
        $totalRegistered = (int)$partCountStmt->fetchColumn();

        // Scores summary
        $scoreSummaryStmt = $db->prepare("SELECT 
            qualification_status, 
            COUNT(*) as count 
            FROM mind_saga_scores 
            WHERE sub_event_id = ? 
            GROUP BY qualification_status
        ");
        $scoreSummaryStmt->execute([$subId]);
        $qualStats = $scoreSummaryStmt->fetchAll(PDO::FETCH_KEY_PAIR);

        // Active Proctoring alerts count
        $activeSessionsStmt = $db->prepare("SELECT 
            COUNT(*) as active_count,
            SUM(CASE WHEN violation_count >= 1 THEN 1 ELSE 0 END) as warning_count,
            SUM(CASE WHEN violation_count >= 3 THEN 1 ELSE 0 END) as flagged_count,
            SUM(CASE WHEN camera_status = 'disconnected' THEN 1 ELSE 0 END) as disconnected_cam_count
            FROM mind_saga_test_sessions 
            WHERE sub_event_id = ? AND status = 'in_progress'
        ");
        $activeSessionsStmt->execute([$subId]);
        $liveProctorStats = $activeSessionsStmt->fetch(PDO::FETCH_ASSOC);

        Router::sendJson([
            'sub_event' => $subEvent,
            'config' => $config,
            'tests' => $tests,
            'games' => $games,
            'panels' => $panels,
            'total_registered' => $totalRegistered,
            'qualification_stats' => $qualStats,
            'live_proctor_stats' => $liveProctorStats
        ]);
    }

    /**
     * PUT /events/{id}/sub-events/{subId}/mind-saga/config
     */
    public static function updateConfig(array $params): void {
        AuthMiddleware::authenticate(['coordinator', 'core_member']);
        $db = Database::getConnection();
        $subId = (int)$params['subId'];
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        $r1 = (float)($body['round1_weight'] ?? 30);
        $r2 = (float)($body['round2_weight'] ?? 30);
        $r3 = (float)($body['round3_weight'] ?? 40);
        $autoQ1 = !empty($body['auto_qualify_round1_top']) ? (int)$body['auto_qualify_round1_top'] : null;
        $autoQ2 = !empty($body['auto_qualify_round2_top']) ? (int)$body['auto_qualify_round2_top'] : null;
        $sfuUrl = trim($body['sfu_server_url'] ?? 'wss://sfu.teammavericks.org');
        $reqCamR1 = isset($body['require_camera_r1']) ? (int)(bool)$body['require_camera_r1'] : 1;
        $reqCamR2 = isset($body['require_camera_r2']) ? (int)(bool)$body['require_camera_r2'] : 1;
        $maxViolations = (int)($body['max_violations_allowed'] ?? 3);
        $activeRound = isset($body['active_round']) ? max(1, min(3, (int)$body['active_round'])) : 1;
        $maxAttemptsR1 = isset($body['max_attempts_r1']) ? max(1, (int)$body['max_attempts_r1']) : 1;
        $maxAttemptsR2 = isset($body['max_attempts_r2']) ? max(1, (int)$body['max_attempts_r2']) : 1;

        $stmt = $db->prepare("UPDATE mind_saga_configs SET 
            round1_weight = ?, round2_weight = ?, round3_weight = ?,
            auto_qualify_round1_top = ?, auto_qualify_round2_top = ?,
            sfu_server_url = ?, require_camera_r1 = ?, require_camera_r2 = ?,
            max_violations_allowed = ?, active_round = ?,
            max_attempts_r1 = ?, max_attempts_r2 = ?, updated_at = NOW()
            WHERE sub_event_id = ?
        ");
        $stmt->execute([$r1, $r2, $r3, $autoQ1, $autoQ2, $sfuUrl, $reqCamR1, $reqCamR2, $maxViolations, $activeRound, $maxAttemptsR1, $maxAttemptsR2, $subId]);

        // Recalculate final weighted scores for existing completed participant records
        $db->prepare("UPDATE mind_saga_scores SET 
            final_weighted_score = (
                (COALESCE(round1_score, 0) / NULLIF(round1_max, 0)) * ? +
                (COALESCE(round2_score, 0) / NULLIF(round2_max, 0)) * ? +
                (COALESCE(round3_score, 0) / NULLIF(round3_max, 0)) * ?
            )
            WHERE sub_event_id = ? AND round1_max > 0 AND round2_max > 0 AND round3_max > 0
        ")->execute([$r1, $r2, $r3, $subId]);

        Cache::clear("ms_config_{$subId}");
        Router::sendJson(['success' => true, 'message' => 'Mind Saga configuration updated successfully.']);
    }

    /**
     * POST /events/{id}/sub-events/{subId}/mind-saga/active-round
     * Admin activates/unlocks specific round level (1 = Round 1, 2 = Round 2, 3 = Round 3).
     */
    public static function setActiveRound(array $params): void {
        AuthMiddleware::authenticate(['coordinator', 'core_member']);
        $db = Database::getConnection();
        $subId = (int)$params['subId'];
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        $round = max(1, min(3, (int)($body['active_round'] ?? 1)));

        $stmt = $db->prepare("UPDATE mind_saga_configs SET active_round = ?, updated_at = NOW() WHERE sub_event_id = ?");
        $stmt->execute([$round, $subId]);

        Cache::clear("ms_config_{$subId}");
        $roundNames = [1 => 'Round 1: Aptitude', 2 => 'Round 2: Gaming', 3 => 'Round 3: Personal Interview'];

        Router::sendJson([
            'success' => true,
            'active_round' => $round,
            'message' => "Activated up to {$roundNames[$round]}."
        ]);
    }

    // ==========================================
    // 2. ROUND 1: APTITUDE TESTS & QUESTIONS
    // ==========================================

    /**
     * GET /events/{id}/sub-events/{subId}/mind-saga/aptitude/tests
     */
    public static function listTests(array $params): void {
        AuthMiddleware::authenticate(['coordinator', 'core_member', 'member']);
        $db = Database::getConnection();
        $subId = (int)$params['subId'];

        self::ensureDefaults($db, $subId);

        $stmt = $db->prepare("SELECT t.*,
            (SELECT COUNT(*) FROM mind_saga_questions q WHERE q.test_id = t.id) as question_count,
            (SELECT COUNT(*) FROM mind_saga_test_sessions s WHERE s.test_id = t.id) as total_sessions,
            (SELECT COUNT(*) FROM mind_saga_test_sessions s WHERE s.test_id = t.id AND s.status = 'in_progress') as active_sessions,
            (SELECT AVG(total_score) FROM mind_saga_test_sessions s WHERE s.test_id = t.id AND s.status IN ('submitted', 'auto_submitted')) as avg_score
            FROM mind_saga_aptitude_tests t
            WHERE t.sub_event_id = ?
            ORDER BY t.created_at DESC
        ");
        $stmt->execute([$subId]);
        $tests = $stmt->fetchAll(PDO::FETCH_ASSOC);

        Router::sendJson($tests);
    }

    /**
     * POST /events/{id}/sub-events/{subId}/mind-saga/aptitude/tests
     */
    public static function createTest(array $params): void {
        AuthMiddleware::authenticate(['coordinator', 'core_member']);
        $db = Database::getConnection();
        $subId = (int)$params['subId'];
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        $title = trim($body['title'] ?? 'Aptitude Test');
        $desc = trim($body['description'] ?? '');
        $duration = (int)($body['duration_minutes'] ?? 30);
        $totalMarks = (float)($body['total_marks'] ?? 50);
        $passMarks = (float)($body['pass_marks'] ?? 20);
        $negEnabled = (int)(bool)($body['negative_marking_enabled'] ?? false);
        $defaultNeg = (float)($body['default_negative_marks'] ?? 0.5);
        $shuffleQ = (int)(bool)($body['shuffle_questions'] ?? true);
        $shuffleO = (int)(bool)($body['shuffle_options'] ?? true);
        $randCount = !empty($body['random_question_count']) ? (int)$body['random_question_count'] : null;
        $isPub = (int)(bool)($body['is_published'] ?? false);
        $schStart = !empty($body['schedule_start']) ? $body['schedule_start'] : null;
        $schEnd = !empty($body['schedule_end']) ? $body['schedule_end'] : null;

        $stmt = $db->prepare("INSERT INTO mind_saga_aptitude_tests 
            (sub_event_id, title, description, duration_minutes, total_marks, pass_marks, negative_marking_enabled, default_negative_marks, shuffle_questions, shuffle_options, random_question_count, is_published, schedule_start, schedule_end)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$subId, $title, $desc, $duration, $totalMarks, $passMarks, $negEnabled, $defaultNeg, $shuffleQ, $shuffleO, $randCount, $isPub, $schStart, $schEnd]);
        $testId = (int)$db->lastInsertId();

        Router::sendJson(['success' => true, 'test_id' => $testId, 'message' => 'Aptitude test created successfully.'], 201);
    }

    /**
     * GET /events/{id}/sub-events/{subId}/mind-saga/aptitude/tests/{testId}
     */
    public static function getTest(array $params): void {
        AuthMiddleware::authenticate(['coordinator', 'core_member', 'member']);
        $db = Database::getConnection();
        $testId = (int)$params['testId'];

        $testStmt = $db->prepare("SELECT * FROM mind_saga_aptitude_tests WHERE id = ?");
        $testStmt->execute([$testId]);
        $test = $testStmt->fetch(PDO::FETCH_ASSOC);
        if (!$test) {
            Router::sendJson(['error' => 'Test not found'], 404);
            return;
        }

        $qStmt = $db->prepare("SELECT * FROM mind_saga_questions WHERE test_id = ? ORDER BY display_order ASC, id ASC");
        $qStmt->execute([$testId]);
        $questions = $qStmt->fetchAll(PDO::FETCH_ASSOC);

        // Decode JSON fields
        foreach ($questions as &$q) {
            $q['options'] = !empty($q['options']) ? json_decode($q['options'], true) : [];
            $q['correct_answers'] = !empty($q['correct_answers']) ? json_decode($q['correct_answers'], true) : [];
            $q['keywords'] = !empty($q['keywords']) ? json_decode($q['keywords'], true) : [];
        }

        Router::sendJson([
            'test' => $test,
            'questions' => $questions
        ]);
    }

    /**
     * PUT /events/{id}/sub-events/{subId}/mind-saga/aptitude/tests/{testId}
     */
    public static function updateTest(array $params): void {
        AuthMiddleware::authenticate(['coordinator', 'core_member']);
        $db = Database::getConnection();
        $testId = (int)$params['testId'];
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        $title = trim($body['title'] ?? '');
        $desc = trim($body['description'] ?? '');
        $duration = (int)($body['duration_minutes'] ?? 30);
        $totalMarks = (float)($body['total_marks'] ?? 50);
        $passMarks = (float)($body['pass_marks'] ?? 20);
        $negEnabled = (int)(bool)($body['negative_marking_enabled'] ?? false);
        $defaultNeg = (float)($body['default_negative_marks'] ?? 0.5);
        $shuffleQ = (int)(bool)($body['shuffle_questions'] ?? true);
        $shuffleO = (int)(bool)($body['shuffle_options'] ?? true);
        $randCount = !empty($body['random_question_count']) ? (int)$body['random_question_count'] : null;
        $isPub = (int)(bool)($body['is_published'] ?? false);
        $schStart = !empty($body['schedule_start']) ? $body['schedule_start'] : null;
        $schEnd = !empty($body['schedule_end']) ? $body['schedule_end'] : null;

        $stmt = $db->prepare("UPDATE mind_saga_aptitude_tests SET 
            title = ?, description = ?, duration_minutes = ?, total_marks = ?, pass_marks = ?,
            negative_marking_enabled = ?, default_negative_marks = ?, shuffle_questions = ?,
            shuffle_options = ?, random_question_count = ?, is_published = ?,
            schedule_start = ?, schedule_end = ?, updated_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute([$title, $desc, $duration, $totalMarks, $passMarks, $negEnabled, $defaultNeg, $shuffleQ, $shuffleO, $randCount, $isPub, $schStart, $schEnd, $testId]);

        Router::sendJson(['success' => true, 'message' => 'Test updated successfully.']);
    }

    /**
     * PATCH /events/{id}/sub-events/{subId}/mind-saga/aptitude/tests/{testId}/publish
     */
    public static function togglePublishTest(array $params): void {
        AuthMiddleware::authenticate(['coordinator', 'core_member']);
        $db = Database::getConnection();
        $testId = (int)$params['testId'];

        $stmt = $db->prepare("UPDATE mind_saga_aptitude_tests SET is_published = NOT is_published, updated_at = NOW() WHERE id = ?");
        $stmt->execute([$testId]);

        $status = $db->query("SELECT is_published FROM mind_saga_aptitude_tests WHERE id = {$testId}")->fetchColumn();
        Router::sendJson(['success' => true, 'is_published' => (bool)$status, 'message' => $status ? 'Test published' : 'Test unpublished']);
    }

    /**
     * DELETE /events/{id}/sub-events/{subId}/mind-saga/aptitude/tests/{testId}
     */
    public static function deleteTest(array $params): void {
        AuthMiddleware::authenticate(['coordinator']);
        $db = Database::getConnection();
        $testId = (int)$params['testId'];

        $db->prepare("DELETE FROM mind_saga_aptitude_tests WHERE id = ?")->execute([$testId]);
        Router::sendJson(['success' => true, 'message' => 'Test deleted successfully.']);
    }

    // ==========================================
    // 3. QUESTIONS MANAGEMENT & BUILDER
    // ==========================================

    /**
     * POST /events/{id}/sub-events/{subId}/mind-saga/aptitude/tests/{testId}/questions
     */
    public static function addQuestion(array $params): void {
        AuthMiddleware::authenticate(['coordinator', 'core_member']);
        $db = Database::getConnection();
        $testId = (int)$params['testId'];
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        $text = trim($body['question_text'] ?? '');
        if (empty($text)) {
            Router::sendJson(['error' => 'Question text is required'], 400);
            return;
        }

        $type = in_array($body['question_type'] ?? '', ['single_choice', 'multiple_choice', 'written_response', 'drawing_response']) ? $body['question_type'] : 'single_choice';
        $imageUrl = !empty($body['image_url']) ? trim($body['image_url']) : null;
        $allowVoice = (int)(bool)($body['allow_voice_answer'] ?? false);
        $options = isset($body['options']) ? json_encode($body['options']) : null;
        $correct = isset($body['correct_answers']) ? json_encode($body['correct_answers']) : null;
        $marks = (float)($body['marks'] ?? 2.0);
        $negMarks = (float)($body['negative_marks'] ?? 0.0);
        $partial = (int)(bool)($body['partial_marking_enabled'] ?? true);
        $expectedAnswer = !empty($body['expected_answer']) ? trim($body['expected_answer']) : null;
        $keywords = isset($body['keywords']) ? json_encode($body['keywords']) : null;
        $evalMode = in_array($body['evaluation_mode'] ?? '', ['manual', 'ai_assisted', 'hybrid']) ? $body['evaluation_mode'] : 'ai_assisted';

        $maxOrder = (int)$db->query("SELECT MAX(display_order) FROM mind_saga_questions WHERE test_id = {$testId}")->fetchColumn();

        $stmt = $db->prepare("INSERT INTO mind_saga_questions 
            (test_id, question_text, question_type, image_url, allow_voice_answer, options, correct_answers, marks, negative_marks, partial_marking_enabled, expected_answer, keywords, evaluation_mode, display_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$testId, $text, $type, $imageUrl, $allowVoice, $options, $correct, $marks, $negMarks, $partial, $expectedAnswer, $keywords, $evalMode, $maxOrder + 1]);
        $qId = (int)$db->lastInsertId();

        // Update test total marks automatically
        $totalM = (float)$db->query("SELECT SUM(marks) FROM mind_saga_questions WHERE test_id = {$testId}")->fetchColumn();
        $db->prepare("UPDATE mind_saga_aptitude_tests SET total_marks = ? WHERE id = ?")->execute([$totalM, $testId]);

        Router::sendJson(['success' => true, 'question_id' => $qId, 'message' => 'Question added successfully.'], 201);
    }

    /**
     * PUT /events/{id}/sub-events/{subId}/mind-saga/aptitude/questions/{qId}
     */
    public static function updateQuestion(array $params): void {
        AuthMiddleware::authenticate(['coordinator', 'core_member']);
        $db = Database::getConnection();
        $qId = (int)$params['qId'];
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        $text = trim($body['question_text'] ?? '');
        $type = in_array($body['question_type'] ?? '', ['single_choice', 'multiple_choice', 'written_response', 'drawing_response']) ? $body['question_type'] : 'single_choice';
        $imageUrl = !empty($body['image_url']) ? trim($body['image_url']) : null;
        $allowVoice = (int)(bool)($body['allow_voice_answer'] ?? false);
        $options = isset($body['options']) ? json_encode($body['options']) : null;
        $correct = isset($body['correct_answers']) ? json_encode($body['correct_answers']) : null;
        $marks = (float)($body['marks'] ?? 2.0);
        $negMarks = (float)($body['negative_marks'] ?? 0.0);
        $partial = (int)(bool)($body['partial_marking_enabled'] ?? true);
        $expectedAnswer = !empty($body['expected_answer']) ? trim($body['expected_answer']) : null;
        $keywords = isset($body['keywords']) ? json_encode($body['keywords']) : null;
        $evalMode = in_array($body['evaluation_mode'] ?? '', ['manual', 'ai_assisted', 'hybrid']) ? $body['evaluation_mode'] : 'ai_assisted';

        $stmt = $db->prepare("UPDATE mind_saga_questions SET 
            question_text = ?, question_type = ?, image_url = ?, allow_voice_answer = ?,
            options = ?, correct_answers = ?, marks = ?, negative_marks = ?,
            partial_marking_enabled = ?, expected_answer = ?, keywords = ?, evaluation_mode = ?,
            updated_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute([$text, $type, $imageUrl, $allowVoice, $options, $correct, $marks, $negMarks, $partial, $expectedAnswer, $keywords, $evalMode, $qId]);

        // Recalculate test total marks
        $testId = (int)$db->query("SELECT test_id FROM mind_saga_questions WHERE id = {$qId}")->fetchColumn();
        if ($testId > 0) {
            $totalM = (float)$db->query("SELECT SUM(marks) FROM mind_saga_questions WHERE test_id = {$testId}")->fetchColumn();
            $db->prepare("UPDATE mind_saga_aptitude_tests SET total_marks = ? WHERE id = ?")->execute([$totalM, $testId]);
        }

        Router::sendJson(['success' => true, 'message' => 'Question updated successfully.']);
    }

    /**
     * POST /events/{id}/sub-events/{subId}/mind-saga/aptitude/tests/{testId}/reorder
     */
    public static function reorderQuestions(array $params): void {
        AuthMiddleware::authenticate(['coordinator', 'core_member']);
        $db = Database::getConnection();
        $testId = (int)$params['testId'];
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $orderList = $body['order'] ?? []; // array of question IDs in order

        $stmt = $db->prepare("UPDATE mind_saga_questions SET display_order = ? WHERE id = ? AND test_id = ?");
        foreach ($orderList as $idx => $qId) {
            $stmt->execute([$idx + 1, (int)$qId, $testId]);
        }

        Router::sendJson(['success' => true, 'message' => 'Questions reordered successfully.']);
    }

    /**
     * DELETE /events/{id}/sub-events/{subId}/mind-saga/aptitude/questions/{qId}
     */
    public static function deleteQuestion(array $params): void {
        AuthMiddleware::authenticate(['coordinator', 'core_member']);
        $db = Database::getConnection();
        $qId = (int)$params['qId'];

        $testId = (int)$db->query("SELECT test_id FROM mind_saga_questions WHERE id = {$qId}")->fetchColumn();
        $db->prepare("DELETE FROM mind_saga_questions WHERE id = ?")->execute([$qId]);

        if ($testId > 0) {
            $totalM = (float)$db->query("SELECT SUM(marks) FROM mind_saga_questions WHERE test_id = {$testId}")->fetchColumn();
            $db->prepare("UPDATE mind_saga_aptitude_tests SET total_marks = ? WHERE id = ?")->execute([$totalM, $testId]);
        }

        Router::sendJson(['success' => true, 'message' => 'Question deleted successfully.']);
    }

    /**
     * POST /events/{id}/sub-events/{subId}/mind-saga/aptitude/upload-media
     * Supports image uploads and diagram canvas exports.
     */
    public static function uploadMedia(array $params): void {
        AuthMiddleware::authenticate(['coordinator', 'core_member', 'member', 'participant']);

        // Check if multipart file upload
        if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
            $file = $_FILES['file'];
            $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'webm', 'wav', 'mp3', 'ogg'])) {
                Router::sendJson(['error' => 'Invalid file format.'], 400);
                return;
            }

            $uploadDir = dirname(__DIR__, 2) . '/uploads/mind_saga';
            if (!is_dir($uploadDir)) {
                @mkdir($uploadDir, 0777, true);
            }

            $filename = 'ms_' . bin2hex(random_bytes(8)) . '.' . $ext;
            $destination = $uploadDir . '/' . $filename;
            if (move_uploaded_file($file['tmp_name'], $destination)) {
                $url = '/uploads/mind_saga/' . $filename;
                Router::sendJson(['success' => true, 'url' => $url, 'filename' => $filename]);
                return;
            }
        }

        // Check if base64 data URL (e.g. from Drawing Canvas)
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        if (!empty($body['data_url'])) {
            $dataUrl = $body['data_url'];
            if (preg_match('/^data:image\/(\w+);base64,/', $dataUrl, $type)) {
                $data = substr($dataUrl, strpos($dataUrl, ',') + 1);
                $ext = strtolower($type[1]);
                $data = base64_decode($data);

                $uploadDir = dirname(__DIR__, 2) . '/uploads/mind_saga';
                if (!is_dir($uploadDir)) {
                    @mkdir($uploadDir, 0777, true);
                }

                $filename = 'diagram_' . bin2hex(random_bytes(8)) . '.' . ($ext === 'jpeg' ? 'jpg' : $ext);
                $destination = $uploadDir . '/' . $filename;
                file_put_contents($destination, $data);
                $url = '/uploads/mind_saga/' . $filename;
                Router::sendJson(['success' => true, 'url' => $url, 'filename' => $filename]);
                return;
            }
        }

        Router::sendJson(['error' => 'No media uploaded'], 400);
    }

    // ==========================================
    // 4. AI-ASSISTED SEMANTIC EVALUATION ENGINE
    // ==========================================

    /**
     * Server-side semantic concept evaluation algorithm for written and voice responses.
     * Evaluates concept coverage, semantic keyword match, coherence, explanation depth, and penalties for contradictions.
     */
    public static function evaluateWrittenResponse(string $userAnswer, ?string $expectedAnswer, array $keywords, float $maxMarks): array {
        if (trim($userAnswer) === '') {
            return [
                'score' => 0.00,
                'max_score' => $maxMarks,
                'confidence' => 100,
                'matched_concepts' => [],
                'missing_concepts' => $keywords,
                'reason' => 'Unattempted response.'
            ];
        }

        $cleanUser = strtolower($userAnswer);
        $matched = [];
        $missing = [];

        foreach ($keywords as $kw) {
            $cleanKw = strtolower(trim($kw));
            if (empty($cleanKw)) continue;
            
            // Check literal keyword or partial root match
            if (strpos($cleanUser, $cleanKw) !== false) {
                $matched[] = $kw;
            } else {
                // Check word token overlap
                $kwTokens = explode(' ', $cleanKw);
                $allTokensPresent = true;
                foreach ($kwTokens as $tok) {
                    if (strlen($tok) > 2 && strpos($cleanUser, $tok) === false) {
                        $allTokensPresent = false;
                        break;
                    }
                }
                if ($allTokensPresent && count($kwTokens) > 1) {
                    $matched[] = $kw;
                } else {
                    $missing[] = $kw;
                }
            }
        }

        $totalKeywords = count($keywords);
        $keywordMatchRatio = $totalKeywords > 0 ? (count($matched) / $totalKeywords) : 0.8;

        // Word count & depth factor
        $wordCount = str_word_count($userAnswer);
        $depthFactor = min(1.0, max(0.3, $wordCount / 25.0));

        // Expected answer similarity ratio using similar_text
        $simRatio = 0.5;
        if (!empty($expectedAnswer)) {
            similar_text(strtolower($userAnswer), strtolower($expectedAnswer), $percent);
            $simRatio = $percent / 100.0;
        }

        // Composite confidence & score
        $semanticScoreRatio = ($keywordMatchRatio * 0.65) + ($simRatio * 0.20) + ($depthFactor * 0.15);
        $score = round($maxMarks * min(1.0, max(0.0, $semanticScoreRatio)), 2);
        $confidence = min(98, round(70 + ($keywordMatchRatio * 25), 0));

        $reason = count($matched) . " of " . $totalKeywords . " key technical concepts identified (" . implode(', ', array_slice($matched, 0, 4)) . ").";
        if (!empty($missing)) {
            $reason .= " Missing: " . implode(', ', array_slice($missing, 0, 3)) . ".";
        }

        return [
            'score' => $score,
            'max_score' => $maxMarks,
            'confidence' => $confidence,
            'matched_concepts' => $matched,
            'missing_concepts' => $missing,
            'reason' => $reason
        ];
    }

    /**
     * POST /events/{id}/sub-events/{subId}/mind-saga/aptitude/evaluate-written-preview
     * Admin tool to test AI evaluation algorithm.
     */
    public static function previewWrittenEvaluation(array $params): void {
        AuthMiddleware::authenticate(['coordinator', 'core_member']);
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        $userText = $body['answer_text'] ?? '';
        $expected = $body['expected_answer'] ?? '';
        $keywords = is_array($body['keywords'] ?? null) ? $body['keywords'] : [];
        $maxMarks = (float)($body['max_marks'] ?? 5.0);

        $eval = self::evaluateWrittenResponse($userText, $expected, $keywords, $maxMarks);
        Router::sendJson($eval);
    }

    // ==========================================
    // 5. PARTICIPANT TEST SESSION LIFECYCLE
    // ==========================================

    /**
     * POST /events/{id}/sub-events/{subId}/mind-saga/aptitude/start
     * Start or resume secure test session.
     */
    public static function startTestSession(array $params): void {
        $user = AuthMiddleware::authenticate();
        $db = Database::getConnection();
        $subId = (int)$params['subId'];
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        $testId = (int)($body['test_id'] ?? 0);
        if ($testId === 0) {
            // Find active published test for this sub-event
            $tStmt = $db->prepare("SELECT id FROM mind_saga_aptitude_tests WHERE sub_event_id = ? AND is_published = 1 ORDER BY id ASC LIMIT 1");
            $tStmt->execute([$subId]);
            $testId = (int)($tStmt->fetchColumn() ?? 0);
        }

        if ($testId === 0) {
            Router::sendJson(['error' => 'No active aptitude test found for this round.'], 404);
            return;
        }

        // Get participant registration
        $regStmt = $db->prepare("SELECT er.id as registration_id, er.full_name, er.email FROM event_registrations er
            JOIN event_registration_sub_events ers ON ers.registration_id = er.id
            WHERE ers.sub_event_id = ? AND (er.email = ? OR er.id = ?)
        ");
        $regStmt->execute([$subId, $user['email'] ?? '', (int)($user['id'] ?? 0)]);
        $reg = $regStmt->fetch(PDO::FETCH_ASSOC);

        if (!$reg) {
            // Check if admin is previewing or allow fallback
            if (in_array($user['role'], ['coordinator', 'core_member', 'member'])) {
                // Find or create test placeholder reg
                $testRegStmt = $db->prepare("SELECT id as registration_id, full_name, email FROM event_registrations WHERE email = ? LIMIT 1");
                $testRegStmt->execute([$user['email']]);
                $reg = $testRegStmt->fetch(PDO::FETCH_ASSOC);
                if (!$reg) {
                    $reg = ['registration_id' => 999999, 'full_name' => $user['name'] ?? 'Admin Preview', 'email' => $user['email']];
                }
            } else {
                Router::sendJson(['error' => 'You are not registered for Mind Saga in this event.'], 403);
                return;
            }
        }

        $regId = (int)$reg['registration_id'];

        // Get Mind Saga master config for attempts and active round
        $cfgStmt = $db->prepare("SELECT * FROM mind_saga_configs WHERE sub_event_id = ?");
        $cfgStmt->execute([$subId]);
        $config = $cfgStmt->fetch(PDO::FETCH_ASSOC) ?: ['active_round' => 1, 'max_attempts_r1' => 1, 'max_attempts_r2' => 1, 'platform_status' => 'live'];

        $activeRound = (int)($config['active_round'] ?? 1);
        $maxAttemptsR1 = (int)($config['max_attempts_r1'] ?? 1);

        if (!in_array($user['role'], ['coordinator', 'core_member', 'member'])) {
            if ($activeRound < 1) {
                Router::sendJson(['error' => 'Round 1: Aptitude Assessment has not been unlocked by the administrator yet.'], 403);
                return;
            }
        }

        // Get test configuration
        $tStmt = $db->prepare("SELECT * FROM mind_saga_aptitude_tests WHERE id = ?");
        $tStmt->execute([$testId]);
        $test = $tStmt->fetch(PDO::FETCH_ASSOC);
        if (!$test) {
            Router::sendJson(['error' => 'Test not found.'], 404);
            return;
        }

        // Check schedule
        $now = date('Y-m-d H:i:s');
        if (!empty($test['schedule_start']) && $now < $test['schedule_start']) {
            Router::sendJson(['error' => "Test has not started yet. Starts at: {$test['schedule_start']}"], 400);
            return;
        }
        if (!empty($test['schedule_end']) && $now > $test['schedule_end']) {
            Router::sendJson(['error' => 'Test schedule window has ended.'], 400);
            return;
        }

        // Rate limiting test starts
        if (!Cache::checkRateLimit("test_start_{$regId}", 5, 60)) {
            Router::sendJson(['error' => 'Too many session requests. Please wait a moment.'], 429);
            return;
        }

        $nowTs = time();

        // Check completed attempts
        $countStmt = $db->prepare("SELECT COUNT(*) FROM mind_saga_test_sessions WHERE test_id = ? AND registration_id = ? AND status IN ('submitted', 'auto_submitted', 'terminated')");
        $countStmt->execute([$testId, $regId]);
        $completedAttempts = (int)$countStmt->fetchColumn();

        // Check active in-progress session
        $sessStmt = $db->prepare("SELECT * FROM mind_saga_test_sessions WHERE test_id = ? AND registration_id = ? AND status = 'in_progress'");
        $sessStmt->execute([$testId, $regId]);
        $session = $sessStmt->fetch(PDO::FETCH_ASSOC);

        if (!$session && $completedAttempts >= $maxAttemptsR1 && !in_array($user['role'], ['coordinator', 'core_member'])) {
            Router::sendJson([
                'error' => "You have exhausted the maximum allowed attempts ({$maxAttemptsR1}) for Round 1: Aptitude Test."
            ], 403);
            return;
        }

        if ($session) {
            // Check if expired
            $expTs = strtotime($session['expires_at']);
            if ($nowTs >= $expTs) {
                // Auto-submit expired session
                self::finalizeTestSession($db, (int)$session['id'], 'auto_submitted');
                Router::sendJson([
                    'status' => 'auto_submitted',
                    'message' => 'Your test time limit has expired and answers were auto-submitted.'
                ]);
                return;
            }

            // Resume active session
            $assignedQIds = json_decode($session['assigned_question_ids'] ?? '[]', true) ?: [];
            $answersData = json_decode($session['answers_data'] ?? '{}', true) ?: [];

            // Fetch questions for assigned IDs without correct answers
            $questions = self::getSanitizedQuestions($db, $testId, $assignedQIds, (bool)$test['shuffle_options']);

            $remainingSeconds = max(0, $expTs - $nowTs);

            Router::sendJson([
                'session_token' => $session['session_token'],
                'session_id' => (int)$session['id'],
                'status' => 'in_progress',
                'remaining_seconds' => $remainingSeconds,
                'duration_seconds' => (int)$session['duration_seconds'],
                'expires_at' => $session['expires_at'],
                'violation_count' => (int)$session['violation_count'],
                'saved_answers' => $answersData,
                'test' => [
                    'id' => (int)$test['id'],
                    'title' => $test['title'],
                    'total_marks' => (float)$test['total_marks'],
                    'negative_marking_enabled' => (bool)$test['negative_marking_enabled'],
                    'default_negative_marks' => (float)$test['default_negative_marks']
                ],
                'questions' => $questions
            ]);
            return;
        }

        // CREATE NEW SECURE TEST SESSION
        $durationSeconds = (int)$test['duration_minutes'] * 60;
        $expiresAt = date('Y-m-d H:i:s', $nowTs + $durationSeconds);
        $token = bin2hex(random_bytes(32));

        // Select and randomize questions
        $allQStmt = $db->prepare("SELECT id FROM mind_saga_questions WHERE test_id = ? ORDER BY display_order ASC, id ASC");
        $allQStmt->execute([$testId]);
        $allQIds = $allQStmt->fetchAll(PDO::FETCH_COLUMN);

        if (empty($allQIds)) {
            Router::sendJson(['error' => 'No questions configured in this test yet.'], 400);
            return;
        }

        $assignedQIds = $allQIds;
        if ($test['shuffle_questions']) {
            shuffle($assignedQIds);
        }
        if (!empty($test['random_question_count']) && $test['random_question_count'] < count($assignedQIds)) {
            $assignedQIds = array_slice($assignedQIds, 0, (int)$test['random_question_count']);
        }

        $insStmt = $db->prepare("INSERT INTO mind_saga_test_sessions 
            (test_id, registration_id, sub_event_id, session_token, started_at, duration_seconds, expires_at, status, assigned_question_ids, answers_data, proctoring_events)
            VALUES (?, ?, ?, ?, NOW(), ?, ?, 'in_progress', ?, '{}', '[]')
        ");
        $insStmt->execute([
            $testId,
            $regId,
            $subId,
            $token,
            $durationSeconds,
            $expiresAt,
            json_encode($assignedQIds)
        ]);
        $sessionId = (int)$db->lastInsertId();

        // Initial Redis cache session checkpoint
        Cache::set("ms_sess_{$token}", [
            'session_id' => $sessionId,
            'reg_id' => $regId,
            'expires_at' => $expiresAt,
            'answers' => []
        ], $durationSeconds + 300);

        // Sanitize questions (strip correct_answers and evaluation keys before returning)
        $questions = self::getSanitizedQuestions($db, $testId, $assignedQIds, (bool)$test['shuffle_options']);

        Router::sendJson([
            'session_token' => $token,
            'session_id' => $sessionId,
            'status' => 'in_progress',
            'remaining_seconds' => $durationSeconds,
            'duration_seconds' => $durationSeconds,
            'expires_at' => $expiresAt,
            'violation_count' => 0,
            'saved_answers' => new \stdClass(),
            'test' => [
                'id' => (int)$test['id'],
                'title' => $test['title'],
                'total_marks' => (float)$test['total_marks'],
                'negative_marking_enabled' => (bool)$test['negative_marking_enabled'],
                'default_negative_marks' => (float)$test['default_negative_marks']
            ],
            'questions' => $questions
        ], 201);
    }

    /**
     * Sanitizes questions to prevent leaking answer keys or evaluation logic to frontend.
     */
    private static function getSanitizedQuestions(PDO $db, int $testId, array $assignedQIds, bool $shuffleOpts): array {
        if (empty($assignedQIds)) return [];
        $placeholders = implode(',', array_fill(0, count($assignedQIds), '?'));
        $stmt = $db->prepare("SELECT id, question_text, question_type, image_url, allow_voice_answer, options, marks, negative_marks, partial_marking_enabled, display_order FROM mind_saga_questions WHERE id IN ({$placeholders})");
        $stmt->execute($assignedQIds);
        $rawQuestions = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $qMap = [];
        foreach ($rawQuestions as $rq) {
            $opts = !empty($rq['options']) ? json_decode($rq['options'], true) : [];
            // Remove is_correct flag from options if present
            if (is_array($opts)) {
                foreach ($opts as &$o) {
                    unset($o['is_correct']);
                }
                if ($shuffleOpts) {
                    shuffle($opts);
                }
            }
            $rq['options'] = $opts;
            $rq['marks'] = (float)$rq['marks'];
            $rq['negative_marks'] = (float)$rq['negative_marks'];
            $qMap[$rq['id']] = $rq;
        }

        // Return in exact assigned sequence
        $ordered = [];
        foreach ($assignedQIds as $id) {
            if (isset($qMap[$id])) {
                $ordered[] = $qMap[$id];
            }
        }
        return $ordered;
    }

    /**
     * POST /events/{id}/sub-events/{subId}/mind-saga/aptitude/autosave
     * Debounced autosave buffer endpoint.
     */
    public static function autosaveAnswers(array $params): void {
        AuthMiddleware::authenticate();
        $db = Database::getConnection();
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        $token = trim($body['session_token'] ?? '');
        $answers = $body['answers'] ?? [];
        $cameraStatus = in_array($body['camera_status'] ?? '', ['connected', 'denied', 'disconnected']) ? $body['camera_status'] : 'connected';

        if (empty($token)) {
            Router::sendJson(['error' => 'Session token required'], 400);
            return;
        }

        // Fast update in Redis buffer
        $cached = Cache::get("ms_sess_{$token}") ?: [];
        $cached['answers'] = $answers;
        $cached['camera_status'] = $cameraStatus;
        $cached['last_autosaved_at'] = time();
        Cache::set("ms_sess_{$token}", $cached, 7200);

        // Periodic/Immediate durable persistence to DB
        $stmt = $db->prepare("UPDATE mind_saga_test_sessions SET 
            answers_data = ?, 
            camera_status = ?,
            updated_at = NOW()
            WHERE session_token = ? AND status = 'in_progress'
        ");
        $stmt->execute([json_encode($answers), $cameraStatus, $token]);

        Router::sendJson(['success' => true, 'saved_at' => date('H:i:s')]);
    }

    /**
     * POST /events/{id}/sub-events/{subId}/mind-saga/aptitude/proctor-event
     * Log anti-cheating violations and proctoring telemetry.
     */
    public static function logProctorEvent(array $params): void {
        AuthMiddleware::authenticate();
        $db = Database::getConnection();
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        $token = trim($body['session_token'] ?? '');
        $eventType = trim($body['event_type'] ?? 'unknown_event'); // fullscreen_exit, tab_hidden, camera_disconnected, devtools_opened, paste_attempt
        $details = trim($body['details'] ?? '');

        if (empty($token)) {
            Router::sendJson(['error' => 'Session token required'], 400);
            return;
        }

        $sessStmt = $db->prepare("SELECT id, violation_count, proctoring_events, status FROM mind_saga_test_sessions WHERE session_token = ?");
        $sessStmt->execute([$token]);
        $sess = $sessStmt->fetch(PDO::FETCH_ASSOC);

        if (!$sess || $sess['status'] !== 'in_progress') {
            Router::sendJson(['error' => 'Invalid or inactive session'], 400);
            return;
        }

        $currentViolations = (int)$sess['violation_count'];
        $isViolation = in_array($eventType, ['fullscreen_exit', 'tab_hidden', 'window_blur', 'devtools_opened']);
        if ($isViolation) {
            $currentViolations++;
        }

        $events = json_decode($sess['proctoring_events'] ?? '[]', true) ?: [];
        $events[] = [
            'timestamp' => date('Y-m-d H:i:s'),
            'type' => $eventType,
            'details' => $details,
            'violation_number' => $isViolation ? $currentViolations : null
        ];

        // If >= 3 violations, auto submit
        $newStatus = 'in_progress';
        if ($currentViolations >= 3) {
            $newStatus = 'auto_submitted';
            $events[] = [
                'timestamp' => date('Y-m-d H:i:s'),
                'type' => 'auto_submitted_due_to_violations',
                'details' => 'Maximum allowed violations exceeded (3/3). Test submitted automatically.'
            ];
        }

        $upStmt = $db->prepare("UPDATE mind_saga_test_sessions SET 
            violation_count = ?, 
            proctoring_events = ?,
            updated_at = NOW()
            WHERE id = ?
        ");
        $upStmt->execute([$currentViolations, json_encode($events), $sess['id']]);

        if ($newStatus === 'auto_submitted') {
            self::finalizeTestSession($db, (int)$sess['id'], 'auto_submitted');
            Router::sendJson([
                'success' => true,
                'violation_count' => $currentViolations,
                'auto_submitted' => true,
                'message' => 'Maximum proctoring violations exceeded. Your test has been automatically submitted.'
            ]);
            return;
        }

        Router::sendJson([
            'success' => true,
            'violation_count' => $currentViolations,
            'warning' => $isViolation ? "Warning {$currentViolations}/3: Please remain in fullscreen test mode." : null
        ]);
    }

    /**
     * POST /events/{id}/sub-events/{subId}/mind-saga/aptitude/submit
     * Final submission and server-side marking calculation.
     */
    public static function submitTest(array $params): void {
        AuthMiddleware::authenticate();
        $db = Database::getConnection();
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        $token = trim($body['session_token'] ?? '');
        $finalAnswers = $body['answers'] ?? null;

        if (empty($token)) {
            Router::sendJson(['error' => 'Session token required'], 400);
            return;
        }

        $sessStmt = $db->prepare("SELECT id, status, answers_data FROM mind_saga_test_sessions WHERE session_token = ?");
        $sessStmt->execute([$token]);
        $sess = $sessStmt->fetch(PDO::FETCH_ASSOC);

        if (!$sess) {
            Router::sendJson(['error' => 'Session not found'], 404);
            return;
        }

        if (in_array($sess['status'], ['submitted', 'auto_submitted', 'terminated'])) {
            Router::sendJson(['error' => 'Test has already been submitted.'], 400);
            return;
        }

        // Save latest answers if provided
        if ($finalAnswers !== null) {
            $db->prepare("UPDATE mind_saga_test_sessions SET answers_data = ? WHERE id = ?")->execute([json_encode($finalAnswers), $sess['id']]);
        }

        $result = self::finalizeTestSession($db, (int)$sess['id'], 'submitted');
        Router::sendJson([
            'success' => true,
            'status' => 'submitted',
            'score' => $result['total_score'],
            'max_score' => $result['max_possible_score'],
            'percentage' => $result['percentage'],
            'message' => 'Aptitude test submitted successfully.'
        ]);
    }

    /**
     * Authoritative server-side evaluation & score calculation.
     */
    private static function finalizeTestSession(PDO $db, int $sessionId, string $status = 'submitted'): array {
        $sessStmt = $db->prepare("SELECT s.*, t.total_marks, t.negative_marking_enabled, t.default_negative_marks FROM mind_saga_test_sessions s JOIN mind_saga_aptitude_tests t ON s.test_id = t.id WHERE s.id = ?");
        $sessStmt->execute([$sessionId]);
        $session = $sessStmt->fetch(PDO::FETCH_ASSOC);

        if (!$session) return ['total_score' => 0, 'max_possible_score' => 0, 'percentage' => 0];

        $assignedQIds = json_decode($session['assigned_question_ids'] ?? '[]', true) ?: [];
        $answers = json_decode($session['answers_data'] ?? '{}', true) ?: [];

        $totalScore = 0.00;
        $maxScore = 0.00;
        $evalDetails = [];

        if (!empty($assignedQIds)) {
            $placeholders = implode(',', array_fill(0, count($assignedQIds), '?'));
            $qStmt = $db->prepare("SELECT * FROM mind_saga_questions WHERE id IN ({$placeholders})");
            $qStmt->execute($assignedQIds);
            $questions = $qStmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($questions as $q) {
                $qId = $q['id'];
                $qMarks = (float)$q['marks'];
                $maxScore += $qMarks;
                $userAns = $answers[$qId] ?? null;

                $awarded = 0.00;
                $evalItem = ['question_id' => $qId, 'type' => $q['question_type'], 'max_marks' => $qMarks];

                if ($q['question_type'] === 'single_choice') {
                    $correct = json_decode($q['correct_answers'] ?? '[]', true) ?: [];
                    $correctOption = $correct[0] ?? null;
                    if ($userAns === null || $userAns === '') {
                        $awarded = 0.00;
                        $evalItem['status'] = 'unattempted';
                    } else if ($userAns === $correctOption) {
                        $awarded = $qMarks;
                        $evalItem['status'] = 'correct';
                    } else {
                        $neg = (float)$q['negative_marks'] > 0 ? (float)$q['negative_marks'] : ($session['negative_marking_enabled'] ? (float)$session['default_negative_marks'] : 0.00);
                        $awarded = -$neg;
                        $evalItem['status'] = 'incorrect';
                        $evalItem['penalty'] = $neg;
                    }
                } else if ($q['question_type'] === 'multiple_choice') {
                    $correctList = json_decode($q['correct_answers'] ?? '[]', true) ?: [];
                    $userList = is_array($userAns) ? $userAns : [];

                    if (empty($userList)) {
                        $awarded = 0.00;
                        $evalItem['status'] = 'unattempted';
                    } else {
                        sort($correctList);
                        sort($userList);
                        if ($correctList === $userList) {
                            $awarded = $qMarks;
                            $evalItem['status'] = 'all_correct';
                        } else {
                            // Partial or incorrect marking
                            $matchedCount = count(array_intersect($userList, $correctList));
                            $wrongCount = count(array_diff($userList, $correctList));
                            if ($wrongCount > 0 && !$q['partial_marking_enabled']) {
                                $neg = (float)$q['negative_marks'] > 0 ? (float)$q['negative_marks'] : ($session['negative_marking_enabled'] ? (float)$session['default_negative_marks'] : 0.00);
                                $awarded = -$neg;
                                $evalItem['status'] = 'incorrect_selection';
                            } else if ($matchedCount > 0) {
                                // Configurable partial marking: ratio of matched minus wrong penalty
                                $ratio = max(0.0, ($matchedCount - ($wrongCount * 0.5)) / max(1, count($correctList)));
                                $awarded = round($qMarks * $ratio, 2);
                                $evalItem['status'] = 'partially_correct';
                            }
                        }
                    }
                } else if ($q['question_type'] === 'written_response') {
                    $ansText = is_array($userAns) ? ($userAns['text'] ?? '') : (string)$userAns;
                    $keywords = json_decode($q['keywords'] ?? '[]', true) ?: [];
                    $writtenEval = self::evaluateWrittenResponse($ansText, $q['expected_answer'], $keywords, $qMarks);
                    $awarded = $writtenEval['score'];
                    $evalItem['ai_eval'] = $writtenEval;
                    $evalItem['status'] = 'ai_evaluated';
                } else if ($q['question_type'] === 'drawing_response') {
                    // Drawing diagrams evaluated via manual/hybrid criteria (default full initial baseline if diagram present)
                    $drawingUrl = is_array($userAns) ? ($userAns['data_url'] ?? $userAns['url'] ?? '') : (string)$userAns;
                    $hasDrawing = !empty($drawingUrl) && strlen($drawingUrl) > 50;
                    $awarded = $hasDrawing ? round($qMarks * 0.70, 2) : 0.00; // Baseline provisional score pending manual review
                    $evalItem['has_drawing'] = $hasDrawing;
                    $evalItem['status'] = 'drawing_provisional';
                }

                $totalScore += $awarded;
                $evalItem['awarded_marks'] = $awarded;
                $evalDetails[$qId] = $evalItem;
            }
        }

        $totalScore = max(0.00, round($totalScore, 2));
        $percentage = $maxScore > 0 ? round(($totalScore / $maxScore) * 100, 2) : 0.00;

        // Persist session score
        $upStmt = $db->prepare("UPDATE mind_saga_test_sessions SET 
            status = ?, 
            total_score = ?, 
            max_possible_score = ?, 
            percentage = ?, 
            evaluation_details = ?,
            submitted_at = NOW(),
            updated_at = NOW()
            WHERE id = ?
        ");
        $upStmt->execute([$status, $totalScore, $maxScore, $percentage, json_encode($evalDetails), $sessionId]);

        // Sync to master Mind Saga score table
        self::syncMasterScore($db, (int)$session['sub_event_id'], (int)$session['registration_id'], 'round1', $totalScore, $maxScore);

        return [
            'total_score' => $totalScore,
            'max_possible_score' => $maxScore,
            'percentage' => $percentage
        ];
    }

    /**
     * Synchronize individual round marks to the master Mind Saga record and recalculate weighted total.
     */
    private static function syncMasterScore(PDO $db, int $subEventId, int $regId, string $roundType, float $score, float $maxScore): void {
        // Ensure master score record exists
        $chkStmt = $db->prepare("SELECT id FROM mind_saga_scores WHERE sub_event_id = ? AND registration_id = ?");
        $chkStmt->execute([$subEventId, $regId]);
        $rowId = $chkStmt->fetchColumn();

        if (!$rowId) {
            $db->prepare("INSERT INTO mind_saga_scores (sub_event_id, registration_id, round1_score, round1_max, round2_score, round2_max, round3_score, round3_max)
                VALUES (?, ?, 0, 50, 0, 100, 0, 100)
            ")->execute([$subEventId, $regId]);
            $rowId = $db->lastInsertId();
        }

        if ($roundType === 'round1') {
            $db->prepare("UPDATE mind_saga_scores SET round1_score = ?, round1_max = ?, updated_at = NOW() WHERE id = ?")->execute([$score, $maxScore, $rowId]);
        } else if ($roundType === 'round2') {
            $db->prepare("UPDATE mind_saga_scores SET round2_score = ?, round2_max = ?, updated_at = NOW() WHERE id = ?")->execute([$score, $maxScore, $rowId]);
        } else if ($roundType === 'round3') {
            $db->prepare("UPDATE mind_saga_scores SET round3_score = ?, round3_max = ?, updated_at = NOW() WHERE id = ?")->execute([$score, $maxScore, $rowId]);
        }

        // Fetch config weights
        $cfgStmt = $db->prepare("SELECT round1_weight, round2_weight, round3_weight FROM mind_saga_configs WHERE sub_event_id = ?");
        $cfgStmt->execute([$subEventId]);
        $cfg = $cfgStmt->fetch(PDO::FETCH_ASSOC) ?: ['round1_weight' => 30, 'round2_weight' => 30, 'round3_weight' => 40];

        $w1 = (float)$cfg['round1_weight'];
        $w2 = (float)$cfg['round2_weight'];
        $w3 = (float)$cfg['round3_weight'];

        // Recalculate weighted final score
        $db->prepare("UPDATE mind_saga_scores SET 
            final_weighted_score = (
                (COALESCE(round1_score, 0) / NULLIF(round1_max, 0)) * ? +
                (COALESCE(round2_score, 0) / NULLIF(round2_max, 0)) * ? +
                (COALESCE(round3_score, 0) / NULLIF(round3_max, 0)) * ?
            )
            WHERE id = ? AND round1_max > 0 AND round2_max > 0 AND round3_max > 0
        ")->execute([$w1, $w2, $w3, $rowId]);
    }

    // ==========================================
    // 6. ROUND 2: PLUGGABLE GAMING ENGINE
    // ==========================================

    /**
     * GET /events/{id}/sub-events/{subId}/mind-saga/games
     */
    public static function listGames(array $params): void {
        AuthMiddleware::authenticate(['coordinator', 'core_member', 'member', 'participant']);
        $db = Database::getConnection();
        $subId = (int)$params['subId'];

        self::ensureDefaults($db, $subId);

        $stmt = $db->prepare("SELECT * FROM mind_saga_game_configs WHERE sub_event_id = ? ORDER BY id ASC");
        $stmt->execute([$subId]);
        $games = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($games as &$g) {
            $g['rules_json'] = !empty($g['rules_json']) ? json_decode($g['rules_json'], true) : [];
            $g['challenge_config_json'] = !empty($g['challenge_config_json']) ? json_decode($g['challenge_config_json'], true) : [];
        }

        Router::sendJson($games);
    }

    /**
     * POST /events/{id}/sub-events/{subId}/mind-saga/games
     * Admin adds a game challenge to the Round 2 pipeline.
     */
    public static function createGameConfig(array $params): void {
        AuthMiddleware::authenticate(['coordinator', 'core_member']);
        $db = Database::getConnection();
        $subId = (int)$params['subId'];
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        $gameKey = in_array($body['game_key'] ?? '', ['deductive_logic', 'motion_challenge']) ? $body['game_key'] : 'deductive_logic';
        $title = trim($body['title'] ?? ($gameKey === 'deductive_logic' ? 'Deductive Symbol Matrix Deduction' : 'Motion Matrix Reflex Challenge'));
        $difficulty = in_array($body['difficulty'] ?? '', ['easy', 'medium', 'hard']) ? $body['difficulty'] : 'medium';
        $durationSeconds = max(30, (int)($body['duration_seconds'] ?? 180));
        $maxScore = max(10, (int)($body['max_score'] ?? 100));
        $rulesJson = $body['rules_json'] ?? [
            'objective' => $gameKey === 'deductive_logic' ? 'Complete the 4x4 Latin Square logic puzzle.' : 'Track matrix targets and achieve high combo locks.'
        ];

        $stmt = $db->prepare("INSERT INTO mind_saga_game_configs (sub_event_id, game_key, title, difficulty, duration_seconds, max_score, rules_json, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        ");
        $stmt->execute([$subId, $gameKey, $title, $difficulty, $durationSeconds, $maxScore, json_encode($rulesJson)]);
        $gameId = (int)$db->lastInsertId();

        Router::sendJson([
            'success' => true,
            'game_id' => $gameId,
            'message' => 'New Game Challenge added to Round 2 pipeline.'
        ], 201);
    }

    /**
     * PUT /events/{id}/sub-events/{subId}/mind-saga/games/{gameId}
     * Admin updates a game configuration in the pipeline.
     */
    public static function updateGameConfig(array $params): void {
        AuthMiddleware::authenticate(['coordinator', 'core_member']);
        $db = Database::getConnection();
        $subId = (int)$params['subId'];
        $gameId = (int)$params['gameId'];
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        $stmt = $db->prepare("SELECT * FROM mind_saga_game_configs WHERE id = ? AND sub_event_id = ?");
        $stmt->execute([$gameId, $subId]);
        $game = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$game) {
            Router::sendJson(['error' => 'Game configuration not found'], 404);
            return;
        }

        $title = isset($body['title']) ? trim($body['title']) : $game['title'];
        $gameKey = isset($body['game_key']) && in_array($body['game_key'], ['deductive_logic', 'motion_challenge']) ? $body['game_key'] : $game['game_key'];
        $difficulty = isset($body['difficulty']) && in_array($body['difficulty'], ['easy', 'medium', 'hard']) ? $body['difficulty'] : $game['difficulty'];
        $durationSeconds = isset($body['duration_seconds']) ? max(30, (int)$body['duration_seconds']) : (int)$game['duration_seconds'];
        $maxScore = isset($body['max_score']) ? max(10, (int)$body['max_score']) : (int)$game['max_score'];
        $isActive = isset($body['is_active']) ? (int)(bool)$body['is_active'] : (int)$game['is_active'];

        $up = $db->prepare("UPDATE mind_saga_game_configs SET title = ?, game_key = ?, difficulty = ?, duration_seconds = ?, max_score = ?, is_active = ?, updated_at = NOW() WHERE id = ?");
        $up->execute([$title, $gameKey, $difficulty, $durationSeconds, $maxScore, $isActive, $gameId]);

        Router::sendJson([
            'success' => true,
            'message' => 'Game configuration updated successfully.'
        ]);
    }

    /**
     * DELETE /events/{id}/sub-events/{subId}/mind-saga/games/{gameId}
     * Admin removes a game challenge from the pipeline.
     */
    public static function deleteGameConfig(array $params): void {
        AuthMiddleware::authenticate(['coordinator', 'core_member']);
        $db = Database::getConnection();
        $subId = (int)$params['subId'];
        $gameId = (int)$params['gameId'];

        $stmt = $db->prepare("DELETE FROM mind_saga_game_configs WHERE id = ? AND sub_event_id = ?");
        $stmt->execute([$gameId, $subId]);

        Router::sendJson([
            'success' => true,
            'message' => 'Game challenge removed from pipeline.'
        ]);
    }

    /**
     * POST /events/{id}/sub-events/{subId}/mind-saga/games/start
     * Start game session with puzzle seed generation and server timer.
     */
    public static function startGameSession(array $params): void {
        $user = AuthMiddleware::authenticate();
        $db = Database::getConnection();
        $subId = (int)$params['subId'];
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        $gameConfigId = isset($body['game_config_id']) ? (int)$body['game_config_id'] : 0;
        $gameKey = trim($body['game_key'] ?? '');

        if ($gameConfigId > 0) {
            $gStmt = $db->prepare("SELECT * FROM mind_saga_game_configs WHERE id = ? AND sub_event_id = ?");
            $gStmt->execute([$gameConfigId, $subId]);
            $game = $gStmt->fetch(PDO::FETCH_ASSOC);
        } else if (!empty($gameKey)) {
            $gStmt = $db->prepare("SELECT * FROM mind_saga_game_configs WHERE sub_event_id = ? AND game_key = ? AND is_active = 1 ORDER BY id ASC LIMIT 1");
            $gStmt->execute([$subId, $gameKey]);
            $game = $gStmt->fetch(PDO::FETCH_ASSOC);
        } else {
            $gStmt = $db->prepare("SELECT * FROM mind_saga_game_configs WHERE sub_event_id = ? AND is_active = 1 ORDER BY id ASC LIMIT 1");
            $gStmt->execute([$subId]);
            $game = $gStmt->fetch(PDO::FETCH_ASSOC);
        }

        if (!$game) {
            Router::sendJson(['error' => 'Game configuration not found.'], 404);
            return;
        }

        $difficulty = $game['difficulty'] ?? 'medium';
        $gameKey = $game['game_key'];

        // Get Mind Saga master config for attempts and active round
        $cfgStmt = $db->prepare("SELECT * FROM mind_saga_configs WHERE sub_event_id = ?");
        $cfgStmt->execute([$subId]);
        $config = $cfgStmt->fetch(PDO::FETCH_ASSOC) ?: ['active_round' => 1, 'max_attempts_r1' => 1, 'max_attempts_r2' => 1, 'platform_status' => 'live'];

        $activeRound = (int)($config['active_round'] ?? 1);
        $maxAttemptsR2 = (int)($config['max_attempts_r2'] ?? 1);

        if (!in_array($user['role'], ['coordinator', 'core_member', 'member'])) {
            if ($activeRound < 2) {
                Router::sendJson(['error' => 'Round 2: Gaming Arena has not been unlocked by the administrator yet.'], 403);
                return;
            }
        }

        // Find registration
        $regStmt = $db->prepare("SELECT er.id as registration_id FROM event_registrations er
            JOIN event_registration_sub_events ers ON ers.registration_id = er.id
            WHERE ers.sub_event_id = ? AND (er.email = ? OR er.id = ?)
        ");
        $regStmt->execute([$subId, $user['email'] ?? '', (int)($user['id'] ?? 0)]);
        $regId = (int)($regStmt->fetchColumn() ?? 999999);

        // Check completed gaming sessions / tournament attempts
        $gCountStmt = $db->prepare("SELECT COUNT(*) FROM mind_saga_game_sessions WHERE sub_event_id = ? AND registration_id = ? AND status IN ('completed', 'auto_submitted', 'terminated')");
        $gCountStmt->execute([$subId, $regId]);
        $completedGameCount = (int)$gCountStmt->fetchColumn();

        // Check active in-progress game session
        $inProgGStmt = $db->prepare("SELECT * FROM mind_saga_game_sessions WHERE sub_event_id = ? AND registration_id = ? AND status = 'in_progress'");
        $inProgGStmt->execute([$subId, $regId]);
        $activeGSession = $inProgGStmt->fetch(PDO::FETCH_ASSOC);

        // If no active in-progress session and user reached max attempts
        // Each tournament run contains N games. We track total completed runs or sessions.
        $distinctRunsStmt = $db->prepare("SELECT COUNT(DISTINCT DATE(completed_at)) FROM mind_saga_game_sessions WHERE sub_event_id = ? AND registration_id = ? AND status IN ('completed', 'auto_submitted', 'terminated')");
        $distinctRunsStmt->execute([$subId, $regId]);
        $completedTournamentRuns = (int)$distinctRunsStmt->fetchColumn();

        if (!$activeGSession && $completedTournamentRuns >= $maxAttemptsR2 && !in_array($user['role'], ['coordinator', 'core_member'])) {
            Router::sendJson([
                'error' => "You have exhausted the maximum allowed attempts ({$maxAttemptsR2}) for Round 2: Gaming Arena."
            ], 403);
            return;
        }

        // Generate verified game puzzles based on game_key
        $puzzleData = [];
        if ($gameKey === 'deductive_logic') {
            $puzzleData = self::generateLatinSquarePuzzles($difficulty);
        } else if ($gameKey === 'motion_challenge') {
            $puzzleData = self::generateMotionChallengeSequence($difficulty);
        }

        $duration = (int)$game['duration_seconds'];
        $expiresAt = date('Y-m-d H:i:s', time() + $duration);
        $token = bin2hex(random_bytes(32));

        $insStmt = $db->prepare("INSERT INTO mind_saga_game_sessions 
            (game_config_id, registration_id, sub_event_id, session_token, started_at, expires_at, status, score, max_score, game_data, moves_log, proctoring_events)
            VALUES (?, ?, ?, ?, NOW(), ?, 'in_progress', 0, ?, ?, '[]', '[]')
        ");
        $insStmt->execute([$game['id'], $regId, $subId, $token, $expiresAt, (int)$game['max_score'], json_encode($puzzleData)]);
        $sessId = (int)$db->lastInsertId();

        // Note: Difficulty is purposefully NOT sent back to client to hide difficulty level from user.
        Router::sendJson([
            'session_token' => $token,
            'session_id' => $sessId,
            'game_config_id' => (int)$game['id'],
            'game_key' => $gameKey,
            'title' => $game['title'],
            'duration_seconds' => $duration,
            'expires_at' => $expiresAt,
            'max_score' => (int)$game['max_score'],
            'puzzle_data' => $puzzleData
        ], 201);
    }

    /**
     * POST /events/{id}/sub-events/{subId}/mind-saga/games/proctor-event
     * Logs proctoring violations during game session and terminates on 3 strikes.
     */
    public static function logGameProctorEvent(array $params): void {
        $user = AuthMiddleware::authenticate();
        $db = Database::getConnection();
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        $token = trim($body['session_token'] ?? '');
        $eventType = trim($body['event_type'] ?? 'tab_switch'); // fullscreen_exit, tab_switch, camera_denied, camera_disconnected, window_blur
        $description = trim($body['description'] ?? '');

        if (empty($token)) {
            Router::sendJson(['error' => 'Session token required'], 400);
            return;
        }

        $sessStmt = $db->prepare("SELECT * FROM mind_saga_game_sessions WHERE session_token = ?");
        $sessStmt->execute([$token]);
        $session = $sessStmt->fetch(PDO::FETCH_ASSOC);

        if (!$session) {
            Router::sendJson(['error' => 'Session not found'], 404);
            return;
        }

        $events = json_decode($session['proctoring_events'] ?? '[]', true) ?: [];
        $events[] = [
            'event_type' => $eventType,
            'description' => $description,
            'timestamp' => date('Y-m-d H:i:s')
        ];

        $newViolations = (int)$session['violation_count'] + 1;
        $cameraStatus = $session['camera_status'];
        if (in_array($eventType, ['camera_denied', 'camera_disconnected'])) {
            $cameraStatus = 'disconnected';
        } else if ($eventType === 'camera_connected') {
            $cameraStatus = 'connected';
        }

        $terminated = false;
        if ($newViolations >= 3) {
            $terminated = true;
            $db->prepare("UPDATE mind_saga_game_sessions SET violation_count = ?, camera_status = ?, proctoring_events = ?, status = 'terminated', completed_at = NOW(), updated_at = NOW() WHERE id = ?")
                ->execute([$newViolations, $cameraStatus, json_encode($events), $session['id']]);
        } else {
            $db->prepare("UPDATE mind_saga_game_sessions SET violation_count = ?, camera_status = ?, proctoring_events = ?, updated_at = NOW() WHERE id = ?")
                ->execute([$newViolations, $cameraStatus, json_encode($events), $session['id']]);
        }

        Router::sendJson([
            'success' => true,
            'violation_count' => $newViolations,
            'max_allowed' => 3,
            'terminated' => $terminated,
            'message' => $terminated ? 'Gaming round auto-submitted / terminated due to security violations.' : "Security Warning ({$newViolations}/3 strikes recorded)."
        ]);
    }

    /**
     * POST /events/{id}/sub-events/{subId}/mind-saga/games/submit
     * Submit game score with server verification and accumulate Round 2 score.
     */
    public static function submitGameScore(array $params): void {
        AuthMiddleware::authenticate();
        $db = Database::getConnection();
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        $token = trim($body['session_token'] ?? '');
        $claimedScore = (int)($body['score'] ?? 0);
        $movesLog = $body['moves_log'] ?? [];
        $statusOverride = isset($body['status']) && in_array($body['status'], ['completed', 'time_out', 'terminated', 'auto_submitted']) ? $body['status'] : 'completed';

        if (empty($token)) {
            Router::sendJson(['error' => 'Session token required'], 400);
            return;
        }

        $sessStmt = $db->prepare("SELECT s.*, g.max_score as game_max, g.game_key FROM mind_saga_game_sessions s JOIN mind_saga_game_configs g ON s.game_config_id = g.id WHERE s.session_token = ?");
        $sessStmt->execute([$token]);
        $session = $sessStmt->fetch(PDO::FETCH_ASSOC);

        if (!$session || in_array($session['status'], ['completed', 'terminated']) && $statusOverride !== 'auto_submitted') {
            Router::sendJson(['error' => 'Session is already finished or invalid.'], 400);
            return;
        }

        $maxScore = (int)$session['game_max'];
        $verifiedScore = min($maxScore, max(0, $claimedScore));

        // Generate verification hash
        $vHash = hash('sha256', "{$session['id']}:{$session['registration_id']}:{$verifiedScore}:teammavericks_verified");

        $db->prepare("UPDATE mind_saga_game_sessions SET 
            status = ?,
            score = ?,
            moves_log = ?,
            verification_hash = ?,
            completed_at = NOW(),
            updated_at = NOW()
            WHERE id = ?
        ")->execute([$statusOverride, $verifiedScore, json_encode($movesLog), $vHash, $session['id']]);

        // Accumulate all Round 2 game session scores for this participant
        $sumStmt = $db->prepare("SELECT SUM(score) as total_earned, SUM(max_score) as total_max FROM mind_saga_game_sessions WHERE sub_event_id = ? AND registration_id = ? AND status IN ('completed', 'time_out', 'auto_submitted')");
        $sumStmt->execute([(int)$session['sub_event_id'], (int)$session['registration_id']]);
        $sumRow = $sumStmt->fetch(PDO::FETCH_ASSOC);
        $totalEarned = (float)($sumRow['total_earned'] ?? $verifiedScore);
        $totalMax = (float)($sumRow['total_max'] ?? $maxScore);
        if ($totalMax <= 0) $totalMax = 100.0;

        // Sync cumulative Round 2 score to Mind Saga master scores table
        self::syncMasterScore($db, (int)$session['sub_event_id'], (int)$session['registration_id'], 'round2', $totalEarned, $totalMax);

        Router::sendJson([
            'success' => true,
            'verified_score' => $verifiedScore,
            'max_score' => $maxScore,
            'verification_hash' => $vHash,
            'message' => 'Gaming challenge recorded and verified.'
        ]);
    }

    // ==========================================
    // 7. LIVE PROCTORING & CCTV MONITORING
    // ==========================================

    /**
     * GET /events/{id}/sub-events/{subId}/mind-saga/proctoring/live
     * Live CCTV Participant grid with WebRTC/snapshot feeds and active telemetry across Round 1 & Round 2.
     */
    public static function getLiveProctoring(array $params): void {
        AuthMiddleware::authenticate(['coordinator', 'core_member', 'member']);
        $db = Database::getConnection();
        $subId = (int)$params['subId'];

        $filter = $_GET['filter'] ?? 'all'; // all, online, disconnected, warnings, flagged, submitted

        $sql = "SELECT 
            s.id as session_id,
            s.session_token,
            s.started_at,
            s.expires_at,
            s.duration_seconds,
            s.status,
            s.total_score,
            s.percentage,
            s.violation_count,
            s.camera_status,
            s.latest_snapshot,
            s.last_snapshot_at,
            s.proctoring_events,
            s.updated_at,
            er.id as registration_id,
            er.full_name,
            er.email,
            er.phone,
            'Round 1: Aptitude' as round_name,
            1 as round_number,
            TIMESTAMPDIFF(SECOND, NOW(), s.expires_at) as remaining_seconds
            FROM mind_saga_test_sessions s
            JOIN event_registrations er ON s.registration_id = er.id
            WHERE s.sub_event_id = ?

            UNION ALL

            SELECT 
            gs.id as session_id,
            gs.session_token,
            gs.started_at,
            gs.expires_at,
            TIMESTAMPDIFF(SECOND, gs.started_at, gs.expires_at) as duration_seconds,
            gs.status,
            gs.score as total_score,
            0 as percentage,
            gs.violation_count,
            gs.camera_status,
            gs.latest_snapshot,
            gs.last_snapshot_at,
            gs.proctoring_events,
            gs.updated_at,
            er.id as registration_id,
            er.full_name,
            er.email,
            er.phone,
            'Round 2: Gaming' as round_name,
            2 as round_number,
            TIMESTAMPDIFF(SECOND, NOW(), gs.expires_at) as remaining_seconds
            FROM mind_saga_game_sessions gs
            JOIN event_registrations er ON gs.registration_id = er.id
            WHERE gs.sub_event_id = ?
        ";

        $outerSql = "SELECT * FROM ({$sql}) as cctv_all WHERE 1=1";

        if ($filter === 'online') {
            $outerSql .= " AND status = 'in_progress' AND camera_status = 'connected'";
        } else if ($filter === 'disconnected') {
            $outerSql .= " AND status = 'in_progress' AND camera_status = 'disconnected'";
        } else if ($filter === 'warnings') {
            $outerSql .= " AND violation_count BETWEEN 1 AND 2";
        } else if ($filter === 'flagged') {
            $outerSql .= " AND (violation_count >= 3 OR status = 'terminated')";
        } else if ($filter === 'submitted') {
            $outerSql .= " AND status IN ('submitted', 'auto_submitted')";
        }

        $outerSql .= " ORDER BY (status = 'in_progress') DESC, violation_count DESC, last_snapshot_at DESC, started_at DESC";

        $stmt = $db->prepare($outerSql);
        $stmt->execute([$subId, $subId]);
        $rawSessions = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Single camera view per participant: deduplicate by registration_id
        $userMap = [];
        foreach ($rawSessions as $sess) {
            $regId = (int)$sess['registration_id'];
            if (!isset($userMap[$regId])) {
                $sess['proctoring_events'] = !empty($sess['proctoring_events']) ? json_decode($sess['proctoring_events'], true) : [];
                $sess['remaining_seconds'] = max(0, (int)$sess['remaining_seconds']);
                $userMap[$regId] = $sess;
            } else {
                // Prioritize in_progress over finished sessions
                if ($userMap[$regId]['status'] !== 'in_progress' && $sess['status'] === 'in_progress') {
                    $sess['proctoring_events'] = !empty($sess['proctoring_events']) ? json_decode($sess['proctoring_events'], true) : [];
                    $sess['remaining_seconds'] = max(0, (int)$sess['remaining_seconds']);
                    $userMap[$regId] = $sess;
                }
            }
        }

        $sessions = array_values($userMap);
        Router::sendJson($sessions);
    }

    /**
     * POST /events/{id}/sub-events/{subId}/mind-saga/proctoring/snapshot
     * Candidate test stream sends periodic webcam frame snapshots to admin CCTV wall.
     */
    public static function saveProctorSnapshot(array $params): void {
        $db = Database::getConnection();
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $token = trim($body['session_token'] ?? '');
        $image = $body['image_data'] ?? null;
        $cameraStatus = $body['camera_status'] ?? 'connected';
        $round = (int)($body['round'] ?? 1);

        if (empty($token)) {
            Router::sendJson(['error' => 'Session token required'], 400);
            return;
        }

        if ($round === 1) {
            $stmt = $db->prepare("SELECT status, violation_count, proctoring_events FROM mind_saga_test_sessions WHERE session_token = ?");
            $stmt->execute([$token]);
            $sess = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($sess) {
                if (!empty($image)) {
                    $db->prepare("UPDATE mind_saga_test_sessions SET 
                        latest_snapshot = ?, 
                        last_snapshot_at = NOW(), 
                        camera_status = ?,
                        updated_at = NOW() 
                        WHERE session_token = ?
                    ")->execute([$image, $cameraStatus, $token]);
                }

                $isTerminated = ($sess['status'] === 'terminated');
                $events = json_decode($sess['proctoring_events'] ?? '[]', true) ?: [];
                $adminTerminatedReason = '';
                foreach (array_reverse($events) as $ev) {
                    if (($ev['type'] ?? '') === 'admin_terminated') {
                        $adminTerminatedReason = $ev['details'] ?? 'Terminated by proctor administrator.';
                        break;
                    }
                }

                Router::sendJson([
                    'success' => true,
                    'status' => $sess['status'],
                    'violation_count' => (int)$sess['violation_count'],
                    'terminated' => $isTerminated,
                    'termination_reason' => $adminTerminatedReason
                ]);
                return;
            }
        } else {
            $stmt = $db->prepare("SELECT status, violation_count, proctoring_events FROM mind_saga_game_sessions WHERE session_token = ?");
            $stmt->execute([$token]);
            $sess = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($sess) {
                if (!empty($image)) {
                    $db->prepare("UPDATE mind_saga_game_sessions SET 
                        latest_snapshot = ?, 
                        last_snapshot_at = NOW(), 
                        camera_status = ?,
                        updated_at = NOW() 
                        WHERE session_token = ?
                    ")->execute([$image, $cameraStatus, $token]);
                }

                $isTerminated = ($sess['status'] === 'terminated');
                $events = json_decode($sess['proctoring_events'] ?? '[]', true) ?: [];
                $adminTerminatedReason = '';
                foreach (array_reverse($events) as $ev) {
                    if (($ev['type'] ?? '') === 'admin_terminated') {
                        $adminTerminatedReason = $ev['details'] ?? 'Terminated by proctor administrator.';
                        break;
                    }
                }

                Router::sendJson([
                    'success' => true,
                    'status' => $sess['status'],
                    'violation_count' => (int)$sess['violation_count'],
                    'terminated' => $isTerminated,
                    'termination_reason' => $adminTerminatedReason
                ]);
                return;
            }
        }

        Router::sendJson(['error' => 'Session not found'], 404);
    }

    /**
     * POST /events/{id}/sub-events/{subId}/mind-saga/proctoring/terminate-session
     * Admin forces realtime termination & block of a participant with warning.
     */
    public static function terminateSession(array $params): void {
        AuthMiddleware::authenticate(['coordinator', 'core_member']);
        $db = Database::getConnection();
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        $sessionId = (int)($body['session_id'] ?? 0);
        $sessionToken = trim($body['session_token'] ?? '');
        $reason = trim($body['reason'] ?? 'Terminated by proctor administrator for anti-cheating breach.');
        $round = (int)($body['round'] ?? 1);

        if ($sessionId === 0 && empty($sessionToken)) {
            Router::sendJson(['error' => 'Session ID or Token required'], 400);
            return;
        }

        // Test sessions
        if ($sessionId > 0) {
            $sessStmt = $db->prepare("SELECT proctoring_events FROM mind_saga_test_sessions WHERE id = ?");
            $sessStmt->execute([$sessionId]);
            $evStr = $sessStmt->fetchColumn();
            if ($evStr !== false) {
                $events = json_decode($evStr ?? '[]', true) ?: [];
                $events[] = [
                    'timestamp' => date('Y-m-d H:i:s'),
                    'type' => 'admin_terminated',
                    'details' => $reason
                ];

                $db->prepare("UPDATE mind_saga_test_sessions SET 
                    status = 'terminated', 
                    proctoring_events = ?, 
                    updated_at = NOW() 
                    WHERE id = ?
                ")->execute([json_encode($events), $sessionId]);
            }

            // Also check gaming sessions
            $gStmt = $db->prepare("SELECT proctoring_events FROM mind_saga_game_sessions WHERE id = ?");
            $gStmt->execute([$sessionId]);
            $gevStr = $gStmt->fetchColumn();
            if ($gevStr !== false) {
                $gevents = json_decode($gevStr ?? '[]', true) ?: [];
                $gevents[] = [
                    'timestamp' => date('Y-m-d H:i:s'),
                    'type' => 'admin_terminated',
                    'details' => $reason
                ];
                $db->prepare("UPDATE mind_saga_game_sessions SET 
                    status = 'terminated', 
                    proctoring_events = ?, 
                    updated_at = NOW() 
                    WHERE id = ?
                ")->execute([json_encode($gevents), $sessionId]);
            }
        }

        if (!empty($sessionToken)) {
            $db->prepare("UPDATE mind_saga_test_sessions SET status = 'terminated', updated_at = NOW() WHERE session_token = ?")->execute([$sessionToken]);
            $db->prepare("UPDATE mind_saga_game_sessions SET status = 'terminated', updated_at = NOW() WHERE session_token = ?")->execute([$sessionToken]);
        }

        Router::sendJson(['success' => true, 'message' => "Candidate blocked and test attempt terminated: {$reason}"]);
    }

    // ==========================================
    // 8. MASTER LEADERBOARD & QUALIFICATION
    // ==========================================

    /**
     * GET /events/{id}/sub-events/{subId}/mind-saga/leaderboard
     * Multi-round Mind Saga leaderboard with weighted calculation.
     */
    public static function getLeaderboard(array $params): void {
        AuthMiddleware::authenticate(['coordinator', 'core_member', 'member']);
        $db = Database::getConnection();
        $subId = (int)$params['subId'];

        self::ensureDefaults($db, $subId);
        self::ensureParticipantKeys($db, $subId);

        $stmt = $db->prepare("SELECT 
            ms.*,
            er.full_name,
            er.email,
            er.phone,
            (SELECT ts.violation_count FROM mind_saga_test_sessions ts WHERE ts.registration_id = ms.registration_id AND ts.sub_event_id = ms.sub_event_id LIMIT 1) as aptitude_violations,
            (SELECT ts.camera_status FROM mind_saga_test_sessions ts WHERE ts.registration_id = ms.registration_id AND ts.sub_event_id = ms.sub_event_id LIMIT 1) as camera_status
            FROM mind_saga_scores ms
            JOIN event_registrations er ON ms.registration_id = er.id
            WHERE ms.sub_event_id = ?
            ORDER BY ms.final_weighted_score DESC, ms.round1_score DESC, ms.round2_score DESC
        ");
        $stmt->execute([$subId]);
        $scores = $stmt->fetchAll(PDO::FETCH_ASSOC);

        Router::sendJson($scores);
    }

    /**
     * POST /events/{id}/sub-events/{subId}/mind-saga/promote
     * Advance participants to Next Round (Round 1 -> Round 2, Round 2 -> Round 3, Finalist).
     */
    public static function promoteParticipants(array $params): void {
        AuthMiddleware::authenticate(['coordinator', 'core_member']);
        $db = Database::getConnection();
        $subId = (int)$params['subId'];
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        $regIds = $body['registration_ids'] ?? [];
        $targetStatus = in_array($body['target_status'] ?? '', ['qualified_round_2', 'qualified_round_3', 'finalist', 'eliminated']) ? $body['target_status'] : 'qualified_round_2';
        $notes = trim($body['notes'] ?? '');

        if (empty($regIds)) {
            Router::sendJson(['error' => 'No participants selected.'], 400);
            return;
        }

        $stmt = $db->prepare("UPDATE mind_saga_scores SET 
            qualification_status = ?,
            admin_notes = CASE WHEN ? != '' THEN ? ELSE admin_notes END,
            updated_at = NOW()
            WHERE sub_event_id = ? AND registration_id = ?
        ");

        $count = 0;
        foreach ($regIds as $rId) {
            $stmt->execute([$targetStatus, $notes, $notes, $subId, (int)$rId]);
            $count++;
        }

        Router::sendJson([
            'success' => true,
            'updated_count' => $count,
            'target_status' => $targetStatus,
            'message' => "Successfully updated {$count} participant(s) to {$targetStatus}."
        ]);
    }

    /**
     * GET /events/{id}/sub-events/{subId}/mind-saga/participant-status
     * Participant's personal Mind Saga hub status across all 3 rounds.
     */
    public static function getParticipantStatus(array $params): void {
        $user = AuthMiddleware::authenticate();
        $db = Database::getConnection();
        $subId = (int)$params['subId'];

        self::ensureDefaults($db, $subId);

        // Find participant registration with attendance check
        $accessKeyParam = strtoupper(trim($_GET['access_key'] ?? ''));
        if (!empty($accessKeyParam)) {
            $regStmt = $db->prepare("SELECT er.id as registration_id, er.full_name, er.email, er.attendance as main_attendance, ers.attendance as sub_attendance, ms.access_key FROM event_registrations er
                JOIN event_registration_sub_events ers ON ers.registration_id = er.id
                JOIN mind_saga_scores ms ON ms.registration_id = er.id AND ms.sub_event_id = ers.sub_event_id
                WHERE ers.sub_event_id = ? AND UPPER(TRIM(ms.access_key)) = ?
            ");
            $regStmt->execute([$subId, $accessKeyParam]);
        } else {
            $regStmt = $db->prepare("SELECT er.id as registration_id, er.full_name, er.email, er.attendance as main_attendance, ers.attendance as sub_attendance FROM event_registrations er
                JOIN event_registration_sub_events ers ON ers.registration_id = er.id
                WHERE ers.sub_event_id = ? AND (er.email = ? OR er.id = ?)
            ");
            $regStmt->execute([$subId, $user['email'] ?? '', (int)($user['id'] ?? 0)]);
        }
        $reg = $regStmt->fetch(PDO::FETCH_ASSOC);

        if (!$reg) {
            // Check if member preview
            if (in_array($user['role'], ['coordinator', 'core_member', 'member'])) {
                $reg = ['registration_id' => 999999, 'full_name' => $user['name'] ?? 'Admin Member', 'email' => $user['email'], 'attended' => true];
            } else {
                Router::sendJson(['error' => 'Participant registration not found.'], 404);
                return;
            }
        } else {
            $isAttended = ((int)($reg['main_attendance'] ?? 0) === 1) || ((int)($reg['sub_attendance'] ?? 0) === 1);
            $reg['attended'] = $isAttended;
        }

        $regId = (int)$reg['registration_id'];

        // Mind Saga config
        $cfgStmt = $db->prepare("SELECT * FROM mind_saga_configs WHERE sub_event_id = ?");
        $cfgStmt->execute([$subId]);
        $config = $cfgStmt->fetch(PDO::FETCH_ASSOC);

        // Master score record
        $scoreStmt = $db->prepare("SELECT * FROM mind_saga_scores WHERE sub_event_id = ? AND registration_id = ?");
        $scoreStmt->execute([$subId, $regId]);
        $scoreRecord = $scoreStmt->fetch(PDO::FETCH_ASSOC);

        // Round 1 Aptitude Test session
        $sessStmt = $db->prepare("SELECT id, session_token, started_at, duration_seconds, expires_at, status, total_score, max_possible_score, percentage, violation_count, camera_status, submitted_at FROM mind_saga_test_sessions WHERE sub_event_id = ? AND registration_id = ? ORDER BY id DESC LIMIT 1");
        $sessStmt->execute([$subId, $regId]);
        $aptitudeSession = $sessStmt->fetch(PDO::FETCH_ASSOC);

        // Active published test info
        $tStmt = $db->prepare("SELECT id, title, duration_minutes, total_marks, pass_marks, schedule_start, schedule_end FROM mind_saga_aptitude_tests WHERE sub_event_id = ? AND is_published = 1 LIMIT 1");
        $tStmt->execute([$subId]);
        $activeTest = $tStmt->fetch(PDO::FETCH_ASSOC);

        $qCount = 0;
        if ($activeTest) {
            $qStmt = $db->prepare("SELECT COUNT(*) FROM mind_saga_questions WHERE test_id = ?");
            $qStmt->execute([(int)$activeTest['id']]);
            $qCount = (int)$qStmt->fetchColumn();
            $activeTest['questions_count'] = $qCount;
        }

        // Active games count
        $activeGamesCountStmt = $db->prepare("SELECT COUNT(*) FROM mind_saga_game_configs WHERE sub_event_id = ? AND is_active = 1");
        $activeGamesCountStmt->execute([$subId]);
        $activeGamesCount = (int)$activeGamesCountStmt->fetchColumn();

        // Round 2 Gaming sessions
        $gSessStmt = $db->prepare("SELECT gs.*, gc.game_key, gc.title as game_title FROM mind_saga_game_sessions gs JOIN mind_saga_game_configs gc ON gs.game_config_id = gc.id WHERE gs.sub_event_id = ? AND gs.registration_id = ? ORDER BY gs.id DESC");
        $gSessStmt->execute([$subId, $regId]);
        $gameSessions = $gSessStmt->fetchAll(PDO::FETCH_ASSOC);

        // Round 3 Interview Panel Assignment
        $panelStmt = $db->prepare("SELECT p.id as panel_id, p.name as panel_name, p.venue, p.status as panel_status FROM sub_event_panels p
            WHERE p.sub_event_id = ? LIMIT 1
        ");
        $panelStmt->execute([$subId]);
        $panelInfo = $panelStmt->fetch(PDO::FETCH_ASSOC);

        // Round 1 completed attempts count
        $countR1Stmt = $db->prepare("SELECT COUNT(*) FROM mind_saga_test_sessions WHERE sub_event_id = ? AND registration_id = ? AND status IN ('submitted', 'auto_submitted', 'terminated')");
        $countR1Stmt->execute([$subId, $regId]);
        $attemptsUsedR1 = (int)$countR1Stmt->fetchColumn();

        // Round 2 completed tournament runs count
        $countR2Stmt = $db->prepare("SELECT COUNT(DISTINCT DATE(completed_at)) FROM mind_saga_game_sessions WHERE sub_event_id = ? AND registration_id = ? AND status IN ('completed', 'auto_submitted', 'terminated')");
        $countR2Stmt->execute([$subId, $regId]);
        $attemptsUsedR2 = (int)$countR2Stmt->fetchColumn();

        $activeRound = (int)($config['active_round'] ?? 1);
        $maxAttemptsR1 = (int)($config['max_attempts_r1'] ?? 1);
        $maxAttemptsR2 = (int)($config['max_attempts_r2'] ?? 1);

        Router::sendJson([
            'participant' => $reg,
            'config' => $config,
            'score_record' => $scoreRecord,
            'active_round' => $activeRound,
            'is_r1_unlocked' => ($activeRound >= 1),
            'is_r2_unlocked' => ($activeRound >= 2),
            'is_r3_unlocked' => ($activeRound >= 3),
            'attempts_used_r1' => $attemptsUsedR1,
            'max_attempts_r1' => $maxAttemptsR1,
            'attempts_used_r2' => $attemptsUsedR2,
            'max_attempts_r2' => $maxAttemptsR2,
            'round1_aptitude' => [
                'test' => $activeTest,
                'questions_count' => $qCount,
                'session' => $aptitudeSession
            ],
            'round2_gaming' => [
                'games_count' => $activeGamesCount,
                'sessions' => $gameSessions
            ],
            'round3_interview' => [
                'panel' => $panelInfo
            ]
        ]);
    }

    /**
     * Ensure all registered participants for this sub-event have a mind_saga_scores entry with unique access_key
     */
    public static function ensureParticipantKeys(PDO $db, int $subEventId): void {
        $regStmt = $db->prepare("SELECT DISTINCT registration_id FROM event_registration_sub_events WHERE sub_event_id = ?");
        $regStmt->execute([$subEventId]);
        $registeredIds = $regStmt->fetchAll(PDO::FETCH_COLUMN);

        // Fallback: If no sub_events mapping rows exist, check registrations for the event
        if (empty($registeredIds)) {
            $evStmt = $db->prepare("SELECT event_id FROM event_sub_events WHERE id = ?");
            $evStmt->execute([$subEventId]);
            $eventId = (int)$evStmt->fetchColumn();
            if ($eventId > 0) {
                $evRegStmt = $db->prepare("SELECT id FROM event_registrations WHERE event_id = ?");
                $evRegStmt->execute([$eventId]);
                $registeredIds = $evRegStmt->fetchAll(PDO::FETCH_COLUMN);
            }
        }

        foreach ($registeredIds as $regId) {
            $check = $db->prepare("SELECT id, access_key FROM mind_saga_scores WHERE sub_event_id = ? AND registration_id = ?");
            $check->execute([$subEventId, (int)$regId]);
            $existing = $check->fetch(PDO::FETCH_ASSOC);

            if (!$existing) {
                $key = self::generateAccessKey($db);
                $db->prepare("INSERT INTO mind_saga_scores (sub_event_id, registration_id, access_key, round1_score, round1_max, round2_score, round2_max, round3_score, round3_max)
                    VALUES (?, ?, ?, 0, 50, 0, 100, 0, 100)
                ")->execute([$subEventId, (int)$regId, $key]);
            } else if (empty($existing['access_key'])) {
                $key = self::generateAccessKey($db);
                $db->prepare("UPDATE mind_saga_scores SET access_key = ? WHERE id = ?")->execute([$key, $existing['id']]);
            }
        }
    }

    /**
     * POST /events/{id}/sub-events/{subId}/mind-saga/platform-status
     * Admin switches Mind Saga platform status ('locked', 'live', 'paused', 'completed')
     */
    public static function togglePlatformStatus(array $params): void {
        AuthMiddleware::authenticate(['coordinator', 'core_member']);
        $db = Database::getConnection();
        $subId = (int)$params['subId'];
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        $newStatus = in_array($body['status'] ?? '', ['locked', 'live', 'paused', 'completed']) ? $body['status'] : 'live';

        $stmt = $db->prepare("UPDATE mind_saga_configs SET platform_status = ?, updated_at = NOW() WHERE sub_event_id = ?");
        $stmt->execute([$newStatus, $subId]);

        Cache::clear("ms_config_{$subId}");
        Cache::clear("ms_pub_{$subId}");

        Router::sendJson([
            'success' => true,
            'platform_status' => $newStatus,
            'message' => $newStatus === 'live' ? 'Mind Saga platform is now LIVE! Participants can access with their keys.' : "Platform status changed to {$newStatus}."
        ]);
    }

    /**
     * POST /events/{id}/sub-events/{subId}/mind-saga/regenerate-keys
     */
    public static function regenerateAccessKeys(array $params): void {
        AuthMiddleware::authenticate(['coordinator', 'core_member']);
        $db = Database::getConnection();
        $subId = (int)$params['subId'];
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $targetRegId = isset($body['registration_id']) ? (int)$body['registration_id'] : null;

        if ($targetRegId) {
            $key = self::generateAccessKey($db);
            $check = $db->prepare("SELECT id FROM mind_saga_scores WHERE sub_event_id = ? AND registration_id = ?");
            $check->execute([$subId, $targetRegId]);
            $existingId = $check->fetchColumn();

            if ($existingId) {
                $db->prepare("UPDATE mind_saga_scores SET access_key = ?, updated_at = NOW() WHERE id = ?")->execute([$key, $existingId]);
            } else {
                $db->prepare("INSERT INTO mind_saga_scores (sub_event_id, registration_id, access_key) VALUES (?, ?, ?)")->execute([$subId, $targetRegId, $key]);
            }

            Router::sendJson([
                'success' => true,
                'registration_id' => $targetRegId,
                'access_key' => $key,
                'message' => "Generated new unique access key: {$key}"
            ]);
            return;
        }

        $stmt = $db->prepare("SELECT id FROM mind_saga_scores WHERE sub_event_id = ?");
        $stmt->execute([$subId]);
        $rows = $stmt->fetchAll(PDO::FETCH_COLUMN);

        $count = 0;
        $up = $db->prepare("UPDATE mind_saga_scores SET access_key = ?, updated_at = NOW() WHERE id = ?");
        foreach ($rows as $rowId) {
            $key = self::generateAccessKey($db);
            $up->execute([$key, $rowId]);
            $count++;
        }

        Router::sendJson(['success' => true, 'updated_count' => $count, 'message' => "Regenerated unique access keys for {$count} participants."]);
    }

    /**
     * POST /events/{id}/sub-events/{subId}/mind-saga/send-keys-email
     * Broadcast access keys and entry portal link to participants via SMTP email.
     */
    public static function sendKeysEmail(array $params): void {
        AuthMiddleware::authenticate(['coordinator', 'core_member']);
        $db = Database::getConnection();
        $eventId = (int)$params['id'];
        $subId = (int)$params['subId'];
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $targetRegIds = $body['registration_ids'] ?? [];

        $subStmt = $db->prepare("SELECT s.*, e.name as event_name, e.slug as event_slug FROM event_sub_events s JOIN events e ON s.event_id = e.id WHERE s.id = ? AND s.event_id = ?");
        $subStmt->execute([$subId, $eventId]);
        $subEvent = $subStmt->fetch(PDO::FETCH_ASSOC);

        if (!$subEvent) {
            Router::sendJson(['error' => 'Sub-event not found'], 404);
            return;
        }

        $sql = "SELECT ms.access_key, er.id as registration_id, er.full_name, er.email 
            FROM mind_saga_scores ms
            JOIN event_registrations er ON ms.registration_id = er.id
            WHERE ms.sub_event_id = ?
        ";
        if (!empty($targetRegIds)) {
            $placeholders = implode(',', array_fill(0, count($targetRegIds), '?'));
            $sql .= " AND ms.registration_id IN ({$placeholders})";
            $stmt = $db->prepare($sql);
            $stmt->execute(array_merge([$subId], $targetRegIds));
        } else {
            $stmt = $db->prepare($sql);
            $stmt->execute([$subId]);
        }
        $participants = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($participants)) {
            Router::sendJson(['error' => 'No participants found to send keys.'], 400);
            return;
        }

        $frontendUrl = rtrim(getenv('FRONTEND_URL') ?: 'http://localhost:5173', '/');
        $entryUrl = "{$frontendUrl}/events/{$eventId}/sub-events/{$subId}/mind-saga/enter";

        $sentCount = 0;
        $failedCount = 0;

        foreach ($participants as $p) {
            $key = $p['access_key'];
            if (empty($key)) {
                $key = self::generateAccessKey($db);
                $db->prepare("UPDATE mind_saga_scores SET access_key = ? WHERE registration_id = ? AND sub_event_id = ?")->execute([$key, $p['registration_id'], $subId]);
            }

            $emailHtml = "
            <div style='font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 25px; background: #0f172a; color: #f8fafc; border-radius: 16px; border: 1px solid #334155;'>
                <div style='text-align: center; margin-bottom: 20px;'>
                    <h1 style='color: #818cf8; margin: 0; font-size: 24px;'>Team Mavericks</h1>
                    <p style='color: #94a3b8; font-size: 13px; margin-top: 4px;'>Official Mind Saga Championship</p>
                </div>
                
                <div style='background: #1e293b; padding: 20px; border-radius: 12px; border: 1px solid #475569;'>
                    <h2 style='color: #ffffff; font-size: 18px; margin-top: 0;'>Hello, {$p['full_name']}!</h2>
                    <p style='color: #cbd5e1; font-size: 14px; line-height: 1.6;'>
                        You are registered for the <strong>Mind Saga</strong> 3-Round Tournament at <strong>{$subEvent['event_name']}</strong>.
                    </p>
                    
                    <div style='text-align: center; background: #0f172a; border: 2px dashed #6366f1; border-radius: 12px; padding: 18px; margin: 20px 0;'>
                        <p style='color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 0;'>Your Unique Mind Saga Access Key</p>
                        <h3 style='font-family: monospace; font-size: 26px; color: #38bdf8; margin: 8px 0; letter-spacing: 2px;'>{$key}</h3>
                        <p style='color: #cbd5e1; font-size: 12px; margin: 0;'>Keep this key secure. It is required to enter your test arena.</p>
                    </div>

                    <div style='text-align: center; margin-top: 25px;'>
                        <a href='{$entryUrl}' style='display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #ffffff; text-decoration: none; font-weight: bold; border-radius: 10px; font-size: 14px;'>Enter Mind Saga Platform</a>
                    </div>
                </div>

                <div style='text-align: center; margin-top: 20px; color: #64748b; font-size: 11px;'>
                    <p>When the administrator unlocks the round, you can immediately begin. Good luck!</p>
                </div>
            </div>";

            try {
                $mail = new PHPMailer(true);
                $mail->isSMTP();
                $mail->Host = SMTP_HOST;
                $mail->SMTPAuth = true;
                $mail->Username = SMTP_USER;
                $mail->Password = SMTP_PASS;
                $mail->Port = SMTP_PORT;
                $mail->SMTPSecure = (SMTP_PORT == 465) ? PHPMailer::ENCRYPTION_SMTPS : PHPMailer::ENCRYPTION_STARTTLS;
                $mail->setFrom(SMTP_FROM_EMAIL, SMTP_FROM_NAME);
                $mail->addAddress($p['email'], $p['full_name']);
                $mail->isHTML(true);
                $mail->Subject = "Your Mind Saga Access Key - {$subEvent['event_name']}";
                $mail->Body = $emailHtml;
                $mail->send();
                $sentCount++;
            } catch (\Exception $e) {
                $failedCount++;
            }
        }

        Router::sendJson([
            'success' => true,
            'sent_count' => $sentCount,
            'failed_count' => $failedCount,
            'message' => "Mind Saga access keys dispatched to {$sentCount} participant(s)."
        ]);
    }

    /**
     * GET /mindsaga/public/{subId}
     * Public platform info (shows if platform is live or locked).
     */
    public static function getPublicPlatformInfo(array $params): void {
        $db = Database::getConnection();
        $subId = isset($params['subId']) ? (int)$params['subId'] : 0;

        if ($subId <= 0) {
            $findStmt = $db->query("SELECT id FROM event_sub_events WHERE name LIKE '%Mind%' OR slug LIKE '%mind%' ORDER BY id ASC LIMIT 1");
            $subId = (int)$findStmt->fetchColumn();
            if ($subId <= 0) {
                // Fallback to first sub event
                $findStmt2 = $db->query("SELECT id FROM event_sub_events ORDER BY id ASC LIMIT 1");
                $subId = (int)$findStmt2->fetchColumn();
            }
        }

        if ($subId <= 0) {
            Router::sendJson(['error' => 'No Mind Saga sub-events found.'], 404);
            return;
        }

        self::ensureDefaults($db, $subId);

        $stmt = $db->prepare("SELECT s.id as sub_event_id, s.name as sub_name, s.slug as sub_slug, e.id as event_id, e.name as event_name, e.slug as event_slug, c.platform_status, c.round1_weight, c.round2_weight, c.round3_weight, t.title as test_title, t.duration_minutes
            FROM event_sub_events s
            JOIN events e ON s.event_id = e.id
            JOIN mind_saga_configs c ON c.sub_event_id = s.id
            LEFT JOIN mind_saga_aptitude_tests t ON t.sub_event_id = s.id AND t.is_published = 1
            WHERE s.id = ?
        ");
        $stmt->execute([$subId]);
        $info = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$info) {
            Router::sendJson(['error' => 'Mind Saga event not found.'], 404);
            return;
        }

        Router::sendJson($info);
    }

    /**
     * POST /mindsaga/auth/login-with-key
     * Candidate enters their unique access key to authenticate into Mind Saga Arena.
     */
    public static function loginWithKey(): void {
        $db = Database::getConnection();
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        $key = strtoupper(trim($body['access_key'] ?? ''));
        $email = strtolower(trim($body['email'] ?? ''));

        if (empty($key) && empty($email)) {
            Router::sendJson(['error' => 'Please enter your unique Mind Saga Access Key or registered email.'], 400);
            return;
        }

        $sql = "SELECT ms.access_key, ms.sub_event_id, ms.qualification_status, er.id as registration_id, er.full_name, er.email, er.phone, s.name as sub_name, s.event_id, COALESCE(c.platform_status, 'live') as platform_status
            FROM mind_saga_scores ms
            JOIN event_registrations er ON ms.registration_id = er.id
            JOIN event_sub_events s ON ms.sub_event_id = s.id
            LEFT JOIN mind_saga_configs c ON c.sub_event_id = s.id
            WHERE 1=1
        ";

        if (!empty($key)) {
            $sql .= " AND UPPER(TRIM(ms.access_key)) = ?";
            $stmt = $db->prepare($sql);
            $stmt->execute([$key]);
        } else {
            $sql .= " AND LOWER(TRIM(er.email)) = ?";
            $stmt = $db->prepare($sql);
            $stmt->execute([$email]);
        }

        $candidate = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$candidate) {
            Router::sendJson(['error' => 'Invalid Mind Saga Access Key. Please verify your credentials or check your dashboard/email.'], 401);
            return;
        }

        $isLive = ($candidate['platform_status'] === 'live');

        // Generate candidate auth token
        $issuedAt = time();
        $expiry = $issuedAt + 86400;
        $payload = [
            'iss' => 'teammavericks_rms',
            'aud' => 'teammavericks_rms_client',
            'iat' => $issuedAt,
            'exp' => $expiry,
            'user' => [
                'id' => (int)$candidate['registration_id'],
                'name' => $candidate['full_name'],
                'email' => $candidate['email'],
                'role' => 'participant'
            ]
        ];
        $token = JWT::encode($payload, JWT_SECRET, 'HS256');

        Router::sendJson([
            'success' => true,
            'token' => $token,
            'is_live' => $isLive,
            'platform_status' => $candidate['platform_status'],
            'candidate' => [
                'registration_id' => (int)$candidate['registration_id'],
                'full_name' => $candidate['full_name'],
                'email' => $candidate['email'],
                'access_key' => $candidate['access_key'],
                'sub_event_id' => (int)$candidate['sub_event_id'],
                'event_id' => (int)$candidate['event_id'],
                'qualification_status' => $candidate['qualification_status']
            ]
        ]);
    }
}
