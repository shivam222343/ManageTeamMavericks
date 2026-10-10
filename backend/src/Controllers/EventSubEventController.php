<?php
// src/Controllers/EventSubEventController.php
namespace App\Controllers;

use App\Database;
use App\Router;
use App\Middleware\AuthMiddleware;
use PDO;

class EventSubEventController {
    private static bool $migrated = false;

    public static function ensureMigration(): void {
        if (self::$migrated) {
            return;
        }
        self::$migrated = true;
        $db = Database::getConnection();
        try {
            // Ensure events table has combo_fee and allow_sub_events
            try {
                $db->exec("ALTER TABLE events ADD COLUMN IF NOT EXISTS combo_fee DECIMAL(10,2) DEFAULT NULL");
            } catch (\Exception $e) {}
            try {
                $db->exec("ALTER TABLE events ADD COLUMN IF NOT EXISTS allow_sub_events TINYINT(1) NOT NULL DEFAULT 1");
            } catch (\Exception $e) {}

            // Ensure event_sub_events table
            $db->exec("CREATE TABLE IF NOT EXISTS event_sub_events (
                id INT AUTO_INCREMENT PRIMARY KEY,
                event_id INT NOT NULL,
                name VARCHAR(255) NOT NULL,
                slug VARCHAR(255) NOT NULL,
                type ENUM('individual', 'group') NOT NULL DEFAULT 'individual',
                min_team_size INT NOT NULL DEFAULT 1,
                max_team_size INT NOT NULL DEFAULT 1,
                fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                max_participants INT DEFAULT NULL,
                registration_status ENUM('open', 'closed') NOT NULL DEFAULT 'open',
                description TEXT DEFAULT NULL,
                rules TEXT DEFAULT NULL,
                display_order INT NOT NULL DEFAULT 0,
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

            try {
                $db->exec("ALTER TABLE event_sub_events ADD COLUMN IF NOT EXISTS max_participants INT DEFAULT NULL");
            } catch (\Exception $e) {}
            try {
                $db->exec("ALTER TABLE event_sub_events ADD COLUMN IF NOT EXISTS registration_status ENUM('open', 'closed') NOT NULL DEFAULT 'open'");
            } catch (\Exception $e) {}

            // Ensure event_registration_sub_events table
            $db->exec("CREATE TABLE IF NOT EXISTS event_registration_sub_events (
                id INT AUTO_INCREMENT PRIMARY KEY,
                registration_id INT NOT NULL,
                sub_event_id INT NOT NULL,
                team_name VARCHAR(255) DEFAULT NULL,
                team_members JSON DEFAULT NULL,
                fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                attendance TINYINT(1) NOT NULL DEFAULT 0,
                attendance_marked_at DATETIME DEFAULT NULL,
                attendance_marked_by INT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (registration_id) REFERENCES event_registrations(id) ON DELETE CASCADE,
                FOREIGN KEY (sub_event_id) REFERENCES event_sub_events(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

            // Ensure event_registrations attendance columns
            try {
                $db->exec("ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS attendance TINYINT(1) NOT NULL DEFAULT 0");
            } catch (\Exception $e) {}
            try {
                $db->exec("ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS attendance_marked_at DATETIME DEFAULT NULL");
            } catch (\Exception $e) {}
            try {
                $db->exec("ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS attendance_marked_by INT DEFAULT NULL");
            } catch (\Exception $e) {}
            try {
                $db->exec("ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS selected_sub_event_ids JSON DEFAULT NULL");
            } catch (\Exception $e) {}

            // Ensure event_attendance_qr_tokens
            $db->exec("CREATE TABLE IF NOT EXISTS event_attendance_qr_tokens (
                id INT AUTO_INCREMENT PRIMARY KEY,
                event_id INT NOT NULL,
                sub_event_id INT DEFAULT NULL,
                token VARCHAR(64) UNIQUE NOT NULL,
                title VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

            // Seed default Verbafest subevents if none exist
            $verbaStmt = $db->query("SELECT id FROM events WHERE slug IN ('varba-fest', 'verbafest') OR name LIKE '%verbafest%' OR name LIKE '%varba%' LIMIT 1");
            $verbaEvent = $verbaStmt->fetch(PDO::FETCH_ASSOC);
            if ($verbaEvent) {
                $vId = (int)$verbaEvent['id'];
                // Set combo_fee for Verbafest if null
                $db->prepare("UPDATE events SET combo_fee = 200.00, payment_required = 1, registration_fee = 200.00 WHERE id = ? AND (combo_fee IS NULL OR combo_fee = 0)")->execute([$vId]);

                $subCount = $db->query("SELECT COUNT(*) FROM event_sub_events WHERE event_id = {$vId}")->fetchColumn();
                if ($subCount == 0) {
                    $insertSub = $db->prepare("
                        INSERT INTO event_sub_events (event_id, name, slug, type, min_team_size, max_team_size, fee, max_participants, registration_status, description, display_order)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ");
                    $insertSub->execute([
                        $vId,
                        'MindSaga (Individual)',
                        'mindsaga',
                        'individual',
                        1,
                        1,
                        50.00,
                        NULL,
                        'open',
                        'Individual cognitive round featuring aptitude, lateral thinking, and technical puzzle solving.',
                        1
                    ]);
                    $insertSub->execute([
                        $vId,
                        'GD (Group)',
                        'gd',
                        'group',
                        3,
                        5,
                        100.00,
                        NULL,
                        'open',
                        'Group Discussion round assessing corporate communication, logical articulation, and leadership poise.',
                        2
                    ]);
                    $insertSub->execute([
                        $vId,
                        'Debate (Group)',
                        'debate',
                        'group',
                        2,
                        4,
                        100.00,
                        NULL,
                        'open',
                        'Parliamentary debate competition testing argumentative structure, counter-arguments, and persuasive speaking.',
                        3
                    ]);
                }
            }
        } catch (\Exception $e) {
            error_log('Event sub-events migration error: ' . $e->getMessage());
        }
    }

    /**
     * GET /api.php/events/{id}/sub-events
     * List all sub-events for an event
     */
    public function list(array $params): void {
        self::ensureMigration();
        $eventId = (int)$params['id'];
        $db = Database::getConnection();

        $stmt = $db->prepare("
            SELECT s.*,
                   (SELECT COUNT(*) FROM event_registration_sub_events ers WHERE ers.sub_event_id = s.id) as total_registrations,
                   (SELECT COUNT(*) FROM event_registration_sub_events ers WHERE ers.sub_event_id = s.id AND ers.attendance = 1) as attended_count
            FROM event_sub_events s
            WHERE s.event_id = ?
            ORDER BY s.display_order ASC, s.id ASC
        ");
        $stmt->execute([$eventId]);
        $subEvents = $stmt->fetchAll(PDO::FETCH_ASSOC);

        Router::sendJson($subEvents);
    }

    /**
     * POST /api.php/events/{id}/sub-events
     * Create a new sub-event
     */
    public function create(array $params): void {
        AuthMiddleware::requireCore();
        self::ensureMigration();
        $eventId = (int)$params['id'];

        $db = Database::getConnection();
        $check = $db->prepare("SELECT id FROM events WHERE id = ?");
        $check->execute([$eventId]);
        if (!$check->fetch()) {
            Router::sendJson(['error' => 'Event not found'], 404);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $name = trim($input['name'] ?? '');
        $type = in_array($input['type'] ?? '', ['individual', 'group']) ? $input['type'] : 'individual';
        $fee  = isset($input['fee']) ? (float)$input['fee'] : 0.00;
        $minTeamSize = ($type === 'group') ? max(1, (int)($input['min_team_size'] ?? 2)) : 1;
        $maxTeamSize = ($type === 'group') ? max($minTeamSize, (int)($input['max_team_size'] ?? 4)) : 1;
        $maxParticipants = isset($input['max_participants']) && $input['max_participants'] !== '' && $input['max_participants'] !== null ? max(1, (int)$input['max_participants']) : null;
        $regStatus = in_array($input['registration_status'] ?? '', ['open', 'closed']) ? $input['registration_status'] : 'open';

        $slug = trim($input['slug'] ?? '');
        if (empty($slug)) {
            $slug = strtolower(preg_replace('/[^a-zA-Z0-9]+/', '-', $name));
        }

        if (empty($name)) {
            Router::sendJson(['error' => 'Sub-event name is required'], 400);
            return;
        }

        $stmt = $db->prepare("
            INSERT INTO event_sub_events 
                (event_id, name, slug, type, min_team_size, max_team_size, fee, max_participants, registration_status, description, rules, display_order, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $eventId,
            $name,
            $slug,
            $type,
            $minTeamSize,
            $maxTeamSize,
            $fee,
            $maxParticipants,
            $regStatus,
            trim($input['description'] ?? ''),
            trim($input['rules'] ?? ''),
            (int)($input['display_order'] ?? 0),
            isset($input['is_active']) ? (!empty($input['is_active']) ? 1 : 0) : 1
        ]);

        $subEventId = (int)$db->lastInsertId();
        $resStmt = $db->prepare("
            SELECT s.*,
                   (SELECT COUNT(*) FROM event_registration_sub_events ers WHERE ers.sub_event_id = s.id) as total_registrations
            FROM event_sub_events s WHERE s.id = ?
        ");
        $resStmt->execute([$subEventId]);
        $subEvent = $resStmt->fetch(PDO::FETCH_ASSOC);

        Router::sendJson(['message' => 'Sub-event created successfully', 'sub_event' => $subEvent], 201);
    }

    /**
     * PUT /api.php/events/{id}/sub-events/{subEventId}
     * Update a sub-event
     */
    public function update(array $params): void {
        AuthMiddleware::requireCore();
        self::ensureMigration();
        $eventId = (int)$params['id'];
        $subEventId = (int)$params['subEventId'];

        $db = Database::getConnection();
        $check = $db->prepare("SELECT id FROM event_sub_events WHERE id = ? AND event_id = ?");
        $check->execute([$subEventId, $eventId]);
        if (!$check->fetch()) {
            Router::sendJson(['error' => 'Sub-event not found'], 404);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $name = trim($input['name'] ?? '');
        $type = in_array($input['type'] ?? '', ['individual', 'group']) ? $input['type'] : 'individual';
        $fee  = isset($input['fee']) ? (float)$input['fee'] : 0.00;
        $minTeamSize = ($type === 'group') ? max(1, (int)($input['min_team_size'] ?? 2)) : 1;
        $maxTeamSize = ($type === 'group') ? max($minTeamSize, (int)($input['max_team_size'] ?? 4)) : 1;
        $maxParticipants = isset($input['max_participants']) && $input['max_participants'] !== '' && $input['max_participants'] !== null ? max(1, (int)$input['max_participants']) : null;
        $regStatus = in_array($input['registration_status'] ?? '', ['open', 'closed']) ? $input['registration_status'] : 'open';

        if (empty($name)) {
            Router::sendJson(['error' => 'Sub-event name cannot be empty'], 400);
            return;
        }

        $stmt = $db->prepare("
            UPDATE event_sub_events SET
                name = ?,
                type = ?,
                min_team_size = ?,
                max_team_size = ?,
                fee = ?,
                max_participants = ?,
                registration_status = ?,
                description = ?,
                rules = ?,
                display_order = ?,
                is_active = ?,
                updated_at = NOW()
            WHERE id = ? AND event_id = ?
        ");
        $stmt->execute([
            $name,
            $type,
            $minTeamSize,
            $maxTeamSize,
            $fee,
            $maxParticipants,
            $regStatus,
            trim($input['description'] ?? ''),
            trim($input['rules'] ?? ''),
            (int)($input['display_order'] ?? 0),
            isset($input['is_active']) ? (!empty($input['is_active']) ? 1 : 0) : 1,
            $subEventId,
            $eventId
        ]);

        $resStmt = $db->prepare("
            SELECT s.*,
                   (SELECT COUNT(*) FROM event_registration_sub_events ers WHERE ers.sub_event_id = s.id) as total_registrations
            FROM event_sub_events s WHERE s.id = ?
        ");
        $resStmt->execute([$subEventId]);
        $subEvent = $resStmt->fetch(PDO::FETCH_ASSOC);

        Router::sendJson(['message' => 'Sub-event updated successfully', 'sub_event' => $subEvent]);
    }

    /**
     * PATCH /api.php/events/{id}/sub-events/{subEventId}/status
     * Quickly toggle or set sub-event registration status ('open' | 'closed')
     */
    public function patchStatus(array $params): void {
        AuthMiddleware::requireCore();
        self::ensureMigration();
        $eventId = (int)$params['id'];
        $subEventId = (int)$params['subEventId'];

        $db = Database::getConnection();
        $check = $db->prepare("SELECT id, registration_status FROM event_sub_events WHERE id = ? AND event_id = ?");
        $check->execute([$subEventId, $eventId]);
        $sub = $check->fetch(PDO::FETCH_ASSOC);
        if (!$sub) {
            Router::sendJson(['error' => 'Sub-event not found'], 404);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $status = $input['registration_status'] ?? ($sub['registration_status'] === 'open' ? 'closed' : 'open');
        if (!in_array($status, ['open', 'closed'])) {
            $status = 'open';
        }

        $stmt = $db->prepare("UPDATE event_sub_events SET registration_status = ?, updated_at = NOW() WHERE id = ? AND event_id = ?");
        $stmt->execute([$status, $subEventId, $eventId]);

        $resStmt = $db->prepare("
            SELECT s.*,
                   (SELECT COUNT(*) FROM event_registration_sub_events ers WHERE ers.sub_event_id = s.id) as total_registrations
            FROM event_sub_events s WHERE s.id = ?
        ");
        $resStmt->execute([$subEventId]);
        $subEvent = $resStmt->fetch(PDO::FETCH_ASSOC);

        Router::sendJson(['message' => "Sub-event registration status updated to {$status}", 'sub_event' => $subEvent]);
    }

    /**
     * DELETE /api.php/events/{id}/sub-events/{subEventId}
     */
    public function delete(array $params): void {
        AuthMiddleware::requireCore();
        self::ensureMigration();
        $eventId = (int)$params['id'];
        $subEventId = (int)$params['subEventId'];

        $db = Database::getConnection();
        $stmt = $db->prepare("DELETE FROM event_sub_events WHERE id = ? AND event_id = ?");
        $stmt->execute([$subEventId, $eventId]);

        if ($stmt->rowCount() === 0) {
            Router::sendJson(['error' => 'Sub-event not found'], 404);
            return;
        }

        Router::sendJson(['message' => 'Sub-event deleted successfully']);
    }
}
