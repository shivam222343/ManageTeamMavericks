<?php
// src/Controllers/EventController.php
namespace App\Controllers;

use App\Database;
use App\Router;
use App\Middleware\AuthMiddleware;
use PDO;

class EventController {

    private static bool $migrated = false;

    /**
     * Ensure the events table migration has been applied.
     */
    private function ensureMigration(): void {
        if (self::$migrated) {
            return;
        }
        self::$migrated = true;
        $db = Database::getConnection();
        try {
            // Create events table
            $db->exec("CREATE TABLE IF NOT EXISTS events (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                slug VARCHAR(255) UNIQUE NOT NULL,
                description TEXT,
                banner_url VARCHAR(500),
                cover_image_url VARCHAR(500),
                start_date DATETIME DEFAULT NULL,
                end_date DATETIME DEFAULT NULL,
                location VARCHAR(255),
                mode ENUM('online','offline','hybrid') NOT NULL DEFAULT 'offline',
                event_status ENUM('draft','published','ongoing','completed','archived') NOT NULL DEFAULT 'draft',
                registration_status ENUM('open','closed','scheduled') NOT NULL DEFAULT 'closed',
                registration_start_date DATETIME DEFAULT NULL,
                registration_end_date DATETIME DEFAULT NULL,
                max_participants INT DEFAULT NULL,
                payment_required BOOLEAN NOT NULL DEFAULT FALSE,
                registration_fee DECIMAL(10,2) DEFAULT 0.00,
                tags VARCHAR(500) DEFAULT NULL,
                organizer_name VARCHAR(255) DEFAULT NULL,
                contact_email VARCHAR(255) DEFAULT NULL,
                created_by INT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

            $db->exec("CREATE TABLE IF NOT EXISTS event_registration_forms (
                id INT AUTO_INCREMENT PRIMARY KEY,
                event_id INT NOT NULL UNIQUE,
                form_name VARCHAR(255) NOT NULL,
                description TEXT,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                success_message TEXT,
                closed_message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

            // Add event_form_id to form_sections if not exists
            try {
                $db->exec("ALTER TABLE form_sections ADD COLUMN IF NOT EXISTS event_form_id INT DEFAULT NULL");
            } catch (\Exception $e) { /* column already exists */ }
            try {
                $db->exec("ALTER TABLE form_sections MODIFY COLUMN campaign_id INT DEFAULT NULL");
            } catch (\Exception $e) { /* already nullable */ }

            $db->exec("CREATE TABLE IF NOT EXISTS event_registrations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                event_id INT NOT NULL,
                event_form_id INT NOT NULL,
                full_name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                phone VARCHAR(50),
                status ENUM('pending','confirmed','cancelled','waitlisted') NOT NULL DEFAULT 'pending',
                payment_status ENUM('not_required','pending','paid','failed','refunded') NOT NULL DEFAULT 'not_required',
                payment_amount DECIMAL(10,2) DEFAULT 0.00,
                transaction_id VARCHAR(255) DEFAULT NULL,
                payment_gateway VARCHAR(100) DEFAULT NULL,
                payment_meta JSON DEFAULT NULL,
                registration_token VARCHAR(64) UNIQUE NOT NULL,
                registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
                FOREIGN KEY (event_form_id) REFERENCES event_registration_forms(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

            $db->exec("CREATE TABLE IF NOT EXISTS event_registration_answers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                registration_id INT NOT NULL,
                field_id INT NOT NULL,
                answer_text TEXT,
                FOREIGN KEY (registration_id) REFERENCES event_registrations(id) ON DELETE CASCADE,
                FOREIGN KEY (field_id) REFERENCES form_fields(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

            $db->exec("CREATE TABLE IF NOT EXISTS event_registration_files (
                id INT AUTO_INCREMENT PRIMARY KEY,
                registration_id INT NOT NULL,
                field_id INT NOT NULL,
                file_name VARCHAR(255) NOT NULL,
                file_path VARCHAR(500) NOT NULL,
                file_type VARCHAR(100) NOT NULL,
                file_size INT NOT NULL,
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (registration_id) REFERENCES event_registrations(id) ON DELETE CASCADE,
                FOREIGN KEY (field_id) REFERENCES form_fields(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

            try {
                $db->exec("ALTER TABLE events ADD COLUMN qr_code_url VARCHAR(255) DEFAULT NULL");
            } catch (\Exception $e) {}
            try {
                $db->exec("ALTER TABLE events ADD COLUMN payment_instructions TEXT DEFAULT NULL");
            } catch (\Exception $e) {}
            try {
                $db->exec("ALTER TABLE events ADD COLUMN require_payment_screenshot TINYINT(1) NOT NULL DEFAULT 0");
            } catch (\Exception $e) {}
            try {
                $db->exec("ALTER TABLE events ADD COLUMN payment_method VARCHAR(50) NOT NULL DEFAULT 'manual_upi'");
            } catch (\Exception $e) {}
            try {
                $db->exec("ALTER TABLE events ADD COLUMN send_confirmation_email TINYINT(1) NOT NULL DEFAULT 1");
            } catch (\Exception $e) {}
            try {
                $db->exec("ALTER TABLE event_registrations ADD COLUMN payment_screenshot_url VARCHAR(255) DEFAULT NULL");
            } catch (\Exception $e) {}

            // Seed default events if none exist
            $count = $db->query("SELECT COUNT(*) FROM events")->fetchColumn();
            if ($count == 0) {
                $db->exec("INSERT INTO events (name, slug, description, event_status, registration_status, mode, payment_required) VALUES
                    ('Varba Fest', 'varba-fest', 'Annual cultural and technical festival of KIT College of Engineering.', 'draft', 'closed', 'offline', FALSE),
                    ('Bodhantra', 'bodhantra', 'Technical symposium and project exhibition by engineering students.', 'draft', 'closed', 'offline', FALSE),
                    ('Invicta', 'invicta', 'Flagship intercollegiate competition with technical and non-technical events.', 'draft', 'closed', 'offline', FALSE),
                    ('School Visit', 'school-visit', 'Community outreach program visiting local schools.', 'draft', 'closed', 'offline', FALSE)");
            }
        } catch (\Exception $e) {
            // Log but don't fail — migration issues should not block reads
            error_log('Events migration error: ' . $e->getMessage());
        }
    }

    /**
     * POST /api.php/events/upload-qr
     * Coordinator/Core: Upload QR code image for payment step
     */
    public function uploadQr(): void {
        AuthMiddleware::requireCore();

        if (empty($_FILES['qr_image'])) {
            Router::sendJson(['error' => 'No QR image file uploaded'], 400);
            return;
        }

        $file = $_FILES['qr_image'];
        if ($file['error'] !== UPLOAD_ERR_OK) {
            Router::sendJson(['error' => 'File upload error occurred'], 400);
            return;
        }

        $allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'svg'];
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($ext, $allowedExts)) {
            Router::sendJson(['error' => 'Only image files (JPG, PNG, WEBP, SVG) are allowed for QR code'], 400);
            return;
        }

        $uploadDir = dirname(__DIR__, 2) . '/uploads/qr_codes';
        if (!is_dir($uploadDir)) {
            @mkdir($uploadDir, 0777, true);
        }

        $filename = 'qr_' . uniqid() . '.' . $ext;
        $targetPath = $uploadDir . '/' . $filename;

        if (move_uploaded_file($file['tmp_name'], $targetPath)) {
            Router::sendJson([
                'qr_code_url' => '/uploads/qr_codes/' . $filename,
                'message'     => 'QR code uploaded successfully'
            ]);
        } else {
            Router::sendJson(['error' => 'Failed to save uploaded QR code image'], 500);
        }
    }

    /**
     * GET /api.php/events
     * List all events (admin view — all statuses)
     */
    public function list(): void {
        AuthMiddleware::authenticate();
        $this->ensureMigration();

        $db = Database::getConnection();
        $stmt = $db->query("
            SELECT e.*,
                (SELECT COUNT(*) FROM event_registrations er WHERE er.event_id = e.id) as total_registrations,
                (SELECT COUNT(*) FROM event_registrations er WHERE er.event_id = e.id AND er.payment_status = 'paid') as paid_registrations,
                (SELECT id FROM event_registration_forms erf WHERE erf.event_id = e.id LIMIT 1) as form_id
            FROM events e
            ORDER BY e.created_at DESC
        ");
        $events = $stmt->fetchAll(PDO::FETCH_ASSOC);
        Router::sendJson($events);
    }

    /**
     * GET /api.php/events/public
     * List publicly visible events (published + registration open)
     */
    public function listPublic(): void {
        $this->ensureMigration();

        $db = Database::getConnection();
        $now = date('Y-m-d H:i:s');
        $stmt = $db->prepare("
            SELECT e.id, e.name, e.slug, e.description, e.banner_url, e.cover_image_url,
                   e.start_date, e.end_date, e.location, e.mode,
                   e.event_status, e.registration_status,
                   e.registration_start_date, e.registration_end_date,
                   e.max_participants, e.payment_required, e.registration_fee,
                   e.organizer_name, e.contact_email,
                   (SELECT COUNT(*) FROM event_registrations er WHERE er.event_id = e.id) as total_registrations
            FROM events e
            WHERE e.event_status IN ('published', 'ongoing')
              AND e.registration_status = 'open'
              AND (e.registration_end_date IS NULL OR e.registration_end_date >= ?)
            ORDER BY e.start_date ASC
        ");
        $stmt->execute([$now]);
        $events = $stmt->fetchAll(PDO::FETCH_ASSOC);
        Router::sendJson($events);
    }

    /**
     * GET /api.php/events/{id}
     */
    public function get(array $params): void {
        AuthMiddleware::authenticate();
        $this->ensureMigration();

        $id = (int)$params['id'];
        $db = Database::getConnection();
        $stmt = $db->prepare("
            SELECT e.*,
                (SELECT COUNT(*) FROM event_registrations er WHERE er.event_id = e.id) as total_registrations,
                (SELECT COUNT(*) FROM event_registrations er WHERE er.event_id = e.id AND er.payment_status = 'paid') as paid_registrations,
                (SELECT COUNT(*) FROM event_registrations er WHERE er.event_id = e.id AND er.payment_status = 'pending') as pending_payments,
                (SELECT COUNT(*) FROM event_registrations er WHERE er.event_id = e.id AND er.status = 'cancelled') as cancelled_registrations,
                (SELECT id FROM event_registration_forms erf WHERE erf.event_id = e.id LIMIT 1) as form_id,
                (SELECT erf.form_name FROM event_registration_forms erf WHERE erf.event_id = e.id LIMIT 1) as form_name
            FROM events e
            WHERE e.id = ?
        ");
        $stmt->execute([$id]);
        $event = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$event) {
            Router::sendJson(['error' => 'Event not found'], 404);
            return;
        }

        Router::sendJson($event);
    }

    /**
     * GET /api.php/events/slug/{slug}
     * Public endpoint — get event by slug (validates it's publicly visible)
     */
    public function getBySlug(array $params): void {
        $this->ensureMigration();

        $slug = $params['slug'] ?? '';
        $db = Database::getConnection();
        $stmt = $db->prepare("
            SELECT e.*,
                (SELECT COUNT(*) FROM event_registrations er WHERE er.event_id = e.id AND er.status != 'cancelled') as total_registrations
            FROM events e
            WHERE slug = ?
        ");
        $stmt->execute([$slug]);
        $event = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$event) {
            Router::sendJson(['error' => 'Event not found'], 404);
            return;
        }

        Router::sendJson($event);
    }

    /**
     * POST /api.php/events
     * Create new event (coordinator + core_member)
     */
    public function create(): void {
        AuthMiddleware::requireCore();
        $this->ensureMigration();

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $name = trim($input['name'] ?? '');
        $slug = trim($input['slug'] ?? '');

        if (empty($name)) {
            Router::sendJson(['error' => 'Event name is required'], 400);
            return;
        }

        // Auto-generate slug if not provided
        if (empty($slug)) {
            $slug = strtolower(preg_replace('/[^a-zA-Z0-9]+/', '-', $name));
            $slug = trim($slug, '-');
        }

        $db = Database::getConnection();

        // Validate slug uniqueness
        $check = $db->prepare("SELECT id FROM events WHERE slug = ?");
        $check->execute([$slug]);
        if ($check->fetch()) {
            // Append timestamp suffix to make unique
            $slug = $slug . '-' . time();
        }

        $stmt = $db->prepare("
            INSERT INTO events (
                name, slug, description, banner_url, cover_image_url,
                start_date, end_date, location, mode,
                event_status, registration_status,
                registration_start_date, registration_end_date,
                max_participants, payment_required, registration_fee,
                qr_code_url, payment_instructions, require_payment_screenshot, payment_method,
                send_confirmation_email,
                tags, organizer_name, contact_email, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        $user = AuthMiddleware::authenticate();

        $stmt->execute([
            $name,
            $slug,
            trim($input['description'] ?? ''),
            $input['banner_url'] ?? null,
            $input['cover_image_url'] ?? null,
            $input['start_date'] ?? null,
            $input['end_date'] ?? null,
            trim($input['location'] ?? ''),
            $input['mode'] ?? 'offline',
            $input['event_status'] ?? 'draft',
            $input['registration_status'] ?? 'closed',
            $input['registration_start_date'] ?? null,
            $input['registration_end_date'] ?? null,
            isset($input['max_participants']) && $input['max_participants'] !== '' ? (int)$input['max_participants'] : null,
            !empty($input['payment_required']) ? 1 : 0,
            isset($input['registration_fee']) ? (float)$input['registration_fee'] : 0.00,
            $input['qr_code_url'] ?? null,
            $input['payment_instructions'] ?? null,
            !empty($input['require_payment_screenshot']) ? 1 : 0,
            $input['payment_method'] ?? 'manual_upi',
            isset($input['send_confirmation_email']) ? (!empty($input['send_confirmation_email']) ? 1 : 0) : 1,
            $input['tags'] ?? null,
            trim($input['organizer_name'] ?? ''),
            trim($input['contact_email'] ?? ''),
            $user['userId'] ?? $user['sub'] ?? null
        ]);

        $eventId = (int)$db->lastInsertId();

        $stmt2 = $db->prepare("SELECT * FROM events WHERE id = ?");
        $stmt2->execute([$eventId]);
        $event = $stmt2->fetch(PDO::FETCH_ASSOC);

        Router::sendJson($event, 201);
    }

    /**
     * PUT /api.php/events/{id}
     * Update event details
     */
    public function update(array $params): void {
        AuthMiddleware::requireCore();
        $this->ensureMigration();
        $id = (int)$params['id'];

        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $db = Database::getConnection();
        $check = $db->prepare("SELECT id FROM events WHERE id = ?");
        $check->execute([$id]);
        if (!$check->fetch()) {
            Router::sendJson(['error' => 'Event not found'], 404);
            return;
        }

        $stmt = $db->prepare("
            UPDATE events SET
                name = ?,
                description = ?,
                banner_url = ?,
                cover_image_url = ?,
                start_date = ?,
                end_date = ?,
                location = ?,
                mode = ?,
                event_status = ?,
                registration_status = ?,
                registration_start_date = ?,
                registration_end_date = ?,
                max_participants = ?,
                payment_required = ?,
                registration_fee = ?,
                qr_code_url = ?,
                payment_instructions = ?,
                require_payment_screenshot = ?,
                payment_method = ?,
                send_confirmation_email = ?,
                tags = ?,
                organizer_name = ?,
                contact_email = ?
            WHERE id = ?
        ");

        $stmt->execute([
            trim($input['name'] ?? ''),
            trim($input['description'] ?? ''),
            $input['banner_url'] ?? null,
            $input['cover_image_url'] ?? null,
            $input['start_date'] ?? null,
            $input['end_date'] ?? null,
            trim($input['location'] ?? ''),
            $input['mode'] ?? 'offline',
            $input['event_status'] ?? 'draft',
            $input['registration_status'] ?? 'closed',
            $input['registration_start_date'] ?? null,
            $input['registration_end_date'] ?? null,
            isset($input['max_participants']) && $input['max_participants'] !== '' ? (int)$input['max_participants'] : null,
            !empty($input['payment_required']) ? 1 : 0,
            isset($input['registration_fee']) ? (float)$input['registration_fee'] : 0.00,
            $input['qr_code_url'] ?? null,
            $input['payment_instructions'] ?? null,
            !empty($input['require_payment_screenshot']) ? 1 : 0,
            $input['payment_method'] ?? 'manual_upi',
            isset($input['send_confirmation_email']) ? (!empty($input['send_confirmation_email']) ? 1 : 0) : 1,
            $input['tags'] ?? null,
            trim($input['organizer_name'] ?? ''),
            trim($input['contact_email'] ?? ''),
            $id
        ]);

        $stmt2 = $db->prepare("SELECT * FROM events WHERE id = ?");
        $stmt2->execute([$id]);
        Router::sendJson($stmt2->fetch(PDO::FETCH_ASSOC));
    }

    /**
     * PATCH /api.php/events/{id}/status
     * Toggle event_status or registration_status independently
     */
    public function patchStatus(array $params): void {
        AuthMiddleware::requireCore();
        $id = (int)$params['id'];

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $db = Database::getConnection();

        $check = $db->prepare("SELECT id FROM events WHERE id = ?");
        $check->execute([$id]);
        if (!$check->fetch()) {
            Router::sendJson(['error' => 'Event not found'], 404);
            return;
        }

        $validEventStatuses = ['draft', 'published', 'ongoing', 'completed', 'archived'];
        $validRegStatuses   = ['open', 'closed', 'scheduled'];

        $updates = [];
        $values  = [];

        if (isset($input['event_status']) && in_array($input['event_status'], $validEventStatuses)) {
            $updates[] = 'event_status = ?';
            $values[]  = $input['event_status'];
        }
        if (isset($input['registration_status']) && in_array($input['registration_status'], $validRegStatuses)) {
            $updates[] = 'registration_status = ?';
            $values[]  = $input['registration_status'];
        }

        if (empty($updates)) {
            Router::sendJson(['error' => 'No valid status fields provided'], 400);
            return;
        }

        $values[] = $id;
        $stmt = $db->prepare("UPDATE events SET " . implode(', ', $updates) . " WHERE id = ?");
        $stmt->execute($values);

        $stmt2 = $db->prepare("SELECT * FROM events WHERE id = ?");
        $stmt2->execute([$id]);
        Router::sendJson(['event' => $stmt2->fetch(PDO::FETCH_ASSOC)]);
    }

    /**
     * DELETE /api.php/events/{id}
     */
    public function delete(array $params): void {
        AuthMiddleware::requireCoordinator();
        $id = (int)$params['id'];

        $db = Database::getConnection();
        $check = $db->prepare("SELECT id FROM events WHERE id = ?");
        $check->execute([$id]);
        if (!$check->fetch()) {
            Router::sendJson(['error' => 'Event not found'], 404);
            return;
        }

        $stmt = $db->prepare("DELETE FROM events WHERE id = ?");
        $stmt->execute([$id]);

        Router::sendJson(['message' => 'Event deleted successfully']);
    }
}
