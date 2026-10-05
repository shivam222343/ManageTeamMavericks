<?php
// src/Controllers/EventRegistrationController.php
namespace App\Controllers;

use App\Database;
use App\Router;
use App\Middleware\AuthMiddleware;
use PDO;

class EventRegistrationController {

    /**
     * GET /api.php/events/{id}/registrations
     * Admin: list all registrations for an event
     */
    public function listForEvent(array $params): void {
        AuthMiddleware::authenticate();
        $eventId = (int)$params['id'];

        $db = Database::getConnection();

        // Verify event
        $evCheck = $db->prepare("SELECT id FROM events WHERE id = ?");
        $evCheck->execute([$eventId]);
        if (!$evCheck->fetch()) {
            Router::sendJson(['error' => 'Event not found'], 404);
            return;
        }

        $search  = trim($_GET['search'] ?? '');
        $status  = trim($_GET['status'] ?? '');
        $payment = trim($_GET['payment_status'] ?? '');

        $query  = "SELECT er.*, ef.form_name FROM event_registrations er
                   JOIN event_registration_forms ef ON er.event_form_id = ef.id
                   WHERE er.event_id = :event_id";
        $bind   = [':event_id' => $eventId];

        if ($search !== '') {
            $query .= " AND (er.full_name LIKE :search OR er.email LIKE :search OR er.phone LIKE :search)";
            $bind[':search'] = '%' . $search . '%';
        }
        if ($status !== '') {
            $query .= " AND er.status = :status";
            $bind[':status'] = $status;
        }
        if ($payment !== '') {
            $query .= " AND er.payment_status = :payment";
            $bind[':payment'] = $payment;
        }

        $query .= " ORDER BY er.registered_at DESC";

        $stmt = $db->prepare($query);
        $stmt->execute($bind);
        $registrations = $stmt->fetchAll(PDO::FETCH_ASSOC);

        Router::sendJson($registrations);
    }

    /**
     * GET /api.php/event-registrations/{id}
     * Admin: get single registration with full dynamic form answers
     */
    public function get(array $params): void {
        AuthMiddleware::authenticate();
        $regId = (int)$params['id'];

        $db = Database::getConnection();

        $stmt = $db->prepare("
            SELECT er.*, e.name as event_name, e.slug as event_slug, ef.form_name
            FROM event_registrations er
            JOIN events e ON er.event_id = e.id
            JOIN event_registration_forms ef ON er.event_form_id = ef.id
            WHERE er.id = ?
        ");
        $stmt->execute([$regId]);
        $reg = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$reg) {
            Router::sendJson(['error' => 'Registration not found'], 404);
            return;
        }

        // Fetch dynamic answers
        $ansStmt = $db->prepare("
            SELECT era.field_id, era.answer_text, ff.label, ff.field_type
            FROM event_registration_answers era
            JOIN form_fields ff ON era.field_id = ff.id
            WHERE era.registration_id = ?
            ORDER BY ff.display_order ASC
        ");
        $ansStmt->execute([$regId]);
        $reg['answers'] = $ansStmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch uploaded files
        $fileStmt = $db->prepare("
            SELECT erf.field_id, erf.file_name, erf.file_path, erf.file_type, erf.file_size, ff.label
            FROM event_registration_files erf
            JOIN form_fields ff ON erf.field_id = ff.id
            WHERE erf.registration_id = ?
        ");
        $fileStmt->execute([$regId]);
        $reg['files'] = $fileStmt->fetchAll(PDO::FETCH_ASSOC);

        Router::sendJson($reg);
    }

    /**
     * POST /api.php/events/{id}/register
     * Public: submit event registration
     */
    public function register(array $params): void {
        $eventId = (int)$params['id'];

        $db = Database::getConnection();

        // --- Validate event exists and is accepting registrations ---
        $evStmt = $db->prepare("SELECT * FROM events WHERE id = ?");
        $evStmt->execute([$eventId]);
        $event = $evStmt->fetch(PDO::FETCH_ASSOC);

        if (!$event) {
            Router::sendJson(['error' => 'Event not found'], 404);
            return;
        }

        if (!in_array($event['event_status'], ['published', 'ongoing'])) {
            Router::sendJson(['error' => 'This event is not currently active'], 400);
            return;
        }

        if ($event['registration_status'] !== 'open') {
            Router::sendJson(['error' => 'Registration for this event is not open'], 400);
            return;
        }

        // Check registration window
        $now = new \DateTime();
        if (!empty($event['registration_end_date'])) {
            $endDate = new \DateTime($event['registration_end_date']);
            if ($now > $endDate) {
                Router::sendJson(['error' => 'Registration deadline has passed'], 400);
                return;
            }
        }
        if (!empty($event['registration_start_date'])) {
            $startDate = new \DateTime($event['registration_start_date']);
            if ($now < $startDate) {
                Router::sendJson(['error' => 'Registration has not started yet'], 400);
                return;
            }
        }

        // Get form
        $formStmt = $db->prepare("SELECT * FROM event_registration_forms WHERE event_id = ?");
        $formStmt->execute([$eventId]);
        $form = $formStmt->fetch(PDO::FETCH_ASSOC);

        if (!$form) {
            Router::sendJson(['error' => 'Registration form not configured for this event'], 400);
            return;
        }

        if (!$form['is_active']) {
            Router::sendJson(['error' => 'Registration form is not active'], 400);
            return;
        }

        // --- Check max participants ---
        if (!empty($event['max_participants'])) {
            $countStmt = $db->prepare("SELECT COUNT(*) FROM event_registrations WHERE event_id = ? AND status != 'cancelled'");
            $countStmt->execute([$eventId]);
            $currentCount = (int)$countStmt->fetchColumn();
            if ($currentCount >= (int)$event['max_participants']) {
                Router::sendJson(['error' => 'Sorry, registrations are full for this event'], 400);
                return;
            }
        }

        // Parse input
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        // Extract core fields (server-side validated — never trust client)
        $fullName = trim($input['full_name'] ?? '');
        $email    = trim($input['email'] ?? '');
        $phone    = trim($input['phone'] ?? '');
        $answers  = $input['answers'] ?? []; // [field_id => answer_text]

        if (empty($fullName) || empty($email)) {
            Router::sendJson(['error' => 'Full name and email are required'], 400);
            return;
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Router::sendJson(['error' => 'Invalid email address'], 400);
            return;
        }

        // Duplicate registration check
        $dupCheck = $db->prepare("SELECT id FROM event_registrations WHERE event_id = ? AND email = ?");
        $dupCheck->execute([$eventId, $email]);
        if ($dupCheck->fetch()) {
            Router::sendJson(['error' => 'An registration with this email already exists for this event'], 409);
            return;
        }

        // Determine initial payment status
        $paymentStatus = $event['payment_required'] ? 'pending' : 'not_required';
        $paymentAmount = $event['payment_required'] ? (float)$event['registration_fee'] : 0.00;

        // Generate unique registration token
        $token = bin2hex(random_bytes(32));

        $db->beginTransaction();
        try {
            $regStmt = $db->prepare("
                INSERT INTO event_registrations
                    (event_id, event_form_id, full_name, email, phone,
                     status, payment_status, payment_amount, registration_token)
                VALUES (?,?,?,?,?,?,?,?,?)
            ");
            $regStmt->execute([
                $eventId,
                $form['id'],
                $fullName,
                $email,
                $phone,
                'pending',
                $paymentStatus,
                $paymentAmount,
                $token
            ]);
            $regId = (int)$db->lastInsertId();

            // Store dynamic form answers
            $ansStmt = $db->prepare(
                "INSERT INTO event_registration_answers (registration_id, field_id, answer_text) VALUES (?,?,?)"
            );
            foreach ($answers as $fieldId => $answerText) {
                $fieldId = (int)$fieldId;
                if ($fieldId > 0 && $answerText !== null && $answerText !== '') {
                    $ansStmt->execute([$regId, $fieldId, is_array($answerText) ? json_encode($answerText) : (string)$answerText]);
                }
            }

            $db->commit();

            $stmt2 = $db->prepare("SELECT * FROM event_registrations WHERE id = ?");
            $stmt2->execute([$regId]);
            $registration = $stmt2->fetch(PDO::FETCH_ASSOC);

            Router::sendJson([
                'message'          => $form['success_message'] ?? 'Registration successful!',
                'registration_id'  => $regId,
                'registration_token' => $token,
                'payment_required' => (bool)$event['payment_required'],
                'payment_amount'   => $paymentAmount,
                'registration'     => $registration
            ], 201);
        } catch (\Exception $e) {
            $db->rollBack();
            Router::sendJson(['error' => 'Registration failed: ' . $e->getMessage()], 500);
        }
    }

    /**
     * PATCH /api.php/event-registrations/{id}/status
     * Admin: update registration status
     */
    public function updateStatus(array $params): void {
        AuthMiddleware::requireCore();
        $regId = (int)$params['id'];

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $db    = Database::getConnection();

        $check = $db->prepare("SELECT id FROM event_registrations WHERE id = ?");
        $check->execute([$regId]);
        if (!$check->fetch()) {
            Router::sendJson(['error' => 'Registration not found'], 404);
            return;
        }

        $validStatuses = ['pending', 'confirmed', 'cancelled', 'waitlisted'];
        $validPayments = ['not_required', 'pending', 'paid', 'failed', 'refunded'];

        $updates = [];
        $values  = [];

        if (isset($input['status']) && in_array($input['status'], $validStatuses)) {
            $updates[] = 'status = ?';
            $values[]  = $input['status'];
        }
        if (isset($input['payment_status']) && in_array($input['payment_status'], $validPayments)) {
            $updates[] = 'payment_status = ?';
            $values[]  = $input['payment_status'];
        }
        if (isset($input['transaction_id'])) {
            $updates[] = 'transaction_id = ?';
            $values[]  = $input['transaction_id'];
        }

        if (empty($updates)) {
            Router::sendJson(['error' => 'No valid fields to update'], 400);
            return;
        }

        $values[] = $regId;
        $stmt = $db->prepare("UPDATE event_registrations SET " . implode(', ', $updates) . " WHERE id = ?");
        $stmt->execute($values);

        $stmt2 = $db->prepare("SELECT * FROM event_registrations WHERE id = ?");
        $stmt2->execute([$regId]);
        Router::sendJson($stmt2->fetch(PDO::FETCH_ASSOC));
    }

    /**
     * GET /api.php/events/slug/{slug}/form
     * Public: get the form structure for a public event (by slug)
     * Only works if event is published + registration is open
     */
    public function getPublicForm(array $params): void {
        $slug = $params['slug'] ?? '';

        $db = Database::getConnection();
        $evStmt = $db->prepare("SELECT * FROM events WHERE slug = ?");
        $evStmt->execute([$slug]);
        $event = $evStmt->fetch(PDO::FETCH_ASSOC);

        if (!$event) {
            Router::sendJson(['error' => 'Event not found'], 404);
            return;
        }

        // Validate event is publicly accessible
        if (!in_array($event['event_status'], ['published', 'ongoing'])) {
            Router::sendJson(['error' => 'Event is not currently active', 'event_status' => $event['event_status']], 400);
            return;
        }

        $formStmt = $db->prepare("SELECT * FROM event_registration_forms WHERE event_id = ?");
        $formStmt->execute([$event['id']]);
        $form = $formStmt->fetch(PDO::FETCH_ASSOC);

        if (!$form) {
            Router::sendJson(['event' => $event, 'form' => null, 'sections' => []]);
            return;
        }

        // Fetch sections and fields
        $stmtSec = $db->prepare(
            "SELECT * FROM form_sections WHERE event_form_id = ? AND (is_hidden = 0 OR is_hidden IS NULL) ORDER BY display_order ASC"
        );
        $stmtSec->execute([$form['id']]);
        $sections = $stmtSec->fetchAll(PDO::FETCH_ASSOC);

        $stmtFields = $db->prepare(
            "SELECT * FROM form_fields WHERE section_id = ? AND (is_hidden = 0 OR is_hidden IS NULL) ORDER BY display_order ASC"
        );
        $stmtOpts = $db->prepare(
            "SELECT * FROM field_options WHERE field_id = ? ORDER BY display_order ASC"
        );

        $formStructure = [];
        foreach ($sections as $sec) {
            $stmtFields->execute([$sec['id']]);
            $fields = $stmtFields->fetchAll(PDO::FETCH_ASSOC);
            $fieldsWithOpts = [];

            foreach ($fields as $field) {
                $field['is_required']        = (bool)$field['is_required'];
                $field['validation_rules']   = !empty($field['validation_rules']) ? json_decode($field['validation_rules'], true) : null;
                $stmtOpts->execute([$field['id']]);
                $field['options']            = $stmtOpts->fetchAll(PDO::FETCH_ASSOC);
                $fieldsWithOpts[]            = $field;
            }

            $sec['fields']   = $fieldsWithOpts;
            $formStructure[] = $sec;
        }

        Router::sendJson([
            'event'            => $event,
            'form'             => $form,
            'sections'         => $formStructure,
            'registration_open' => $event['registration_status'] === 'open'
        ]);
    }
}
