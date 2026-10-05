<?php
// src/Controllers/EventRegistrationController.php
namespace App\Controllers;

use App\Database;
use App\Router;
use App\Middleware\AuthMiddleware;
use App\EmailTemplate;
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
use PDO;

class EventRegistrationController {

    /**
     * Ensure database columns for participants exist
     */
    private function ensureMigration(): void {
        $db = Database::getConnection();
        try {
            $db->exec("ALTER TABLE users MODIFY COLUMN role VARCHAR(50) NOT NULL DEFAULT 'member'");
        } catch (\Exception $e) { /* ignore */ }
        try {
            $db->exec("ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS user_id INT DEFAULT NULL");
        } catch (\Exception $e) { /* ignore */ }
        try {
            $db->exec("ALTER TABLE event_registration_files MODIFY COLUMN field_id INT DEFAULT NULL");
        } catch (\Exception $e) { /* ignore */ }
        try {
            $db->exec("ALTER TABLE event_registration_answers MODIFY COLUMN field_id INT DEFAULT NULL");
        } catch (\Exception $e) { /* ignore */ }
    }

    /**
     * Helper to generate clean random password for participants
     */
    private function generateParticipantPassword(int $length = 8): string {
        $prefix = 'Mav#';
        $chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
        $res = '';
        for ($i = 0; $i < ($length - 4); $i++) {
            $res .= $chars[random_int(0, strlen($chars) - 1)];
        }
        return $prefix . $res;
    }

    /**
     * Dispatch official confirmation and credentials email
     */
    private function sendRegistrationConfirmationEmail(
        string $email,
        string $fullName,
        string $eventName,
        string $token,
        string $eventDate,
        string $location,
        string $tempPassword
    ): bool {
        try {
            $mail = new PHPMailer(true);
            $mail->isSMTP();
            $mail->Host       = SMTP_HOST;
            $mail->SMTPAuth   = true;
            $mail->Username   = SMTP_USER;
            $mail->Password   = SMTP_PASS;
            $mail->SMTPSecure = (SMTP_PORT == 465) ? PHPMailer::ENCRYPTION_SMTPS : PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port       = SMTP_PORT;
            $mail->SMTPOptions = [
                'ssl' => [
                    'verify_peer'       => false,
                    'verify_peer_name'  => false,
                    'allow_self_signed' => true,
                ],
            ];

            $mail->setFrom(SMTP_FROM_EMAIL, SMTP_FROM_NAME);
            $mail->addAddress($email, $fullName);
            $mail->isHTML(true);
            $mail->Subject = "Registration Confirmed: {$eventName} - Your Entry Pass & Portal Login";

            $loginUrl = "http://localhost:5173/user-login?email=" . urlencode($email);

            $bodyHtml = "
                <p style='margin: 0 0 12px 0; font-size: 14px; color: #334155;'>Hello <strong>{$fullName}</strong>,</p>
                <p style='margin: 0 0 16px 0; font-size: 14px; color: #334155;'>Congratulations! Your registration for <strong>{$eventName}</strong> with Team Mavericks has been successfully confirmed.</p>
                
                <!-- Event Pass Summary -->
                <table border='0' cellpadding='10' cellspacing='0' width='100%' style='border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 8px; margin: 16px 0; background-color: #ffffff;'>
                    <tr style='background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;'>
                        <td width='35%' style='font-weight: bold; color: #475569; font-size: 13px; padding: 12px 16px;'>Event Name:</td>
                        <td style='color: #0f172a; font-size: 13px; font-weight: 700; padding: 12px 16px;'>{$eventName}</td>
                    </tr>
                    <tr style='border-bottom: 1px solid #e2e8f0;'>
                        <td width='35%' style='font-weight: bold; color: #475569; font-size: 13px; padding: 12px 16px;'>Registration Token:</td>
                        <td style='color: #2563eb; font-size: 14px; font-family: monospace; font-weight: 800; padding: 12px 16px;'>{$token}</td>
                    </tr>
                    <tr style='border-bottom: 1px solid #e2e8f0;'>
                        <td width='35%' style='font-weight: bold; color: #475569; font-size: 13px; padding: 12px 16px;'>Date:</td>
                        <td style='color: #0f172a; font-size: 13px; padding: 12px 16px;'>{$eventDate}</td>
                    </tr>
                    <tr>
                        <td width='35%' style='font-weight: bold; color: #475569; font-size: 13px; padding: 12px 16px;'>Venue:</td>
                        <td style='color: #0f172a; font-size: 13px; padding: 12px 16px;'>{$location}</td>
                    </tr>
                </table>

                <!-- Participant Portal Login Credentials -->
                <div style='margin-top: 24px; padding: 16px; background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px;'>
                    <h3 style='margin: 0 0 10px 0; font-size: 14px; color: #1e40af; font-weight: 800; text-transform: uppercase;'>Your Participant Portal Account</h3>
                    <p style='margin: 0 0 12px 0; font-size: 12px; color: #1e3a8a;'>Use the credentials below to log in to your participant dashboard, download entry tickets, and track all your event registrations:</p>
                    <table border='0' cellpadding='6' cellspacing='0' width='100%' style='border-collapse: collapse; font-size: 13px;'>
                        <tr>
                            <td width='35%' style='font-weight: bold; color: #1e40af;'>Login Email:</td>
                            <td style='color: #0f172a; font-weight: 600;'>{$email}</td>
                        </tr>
                        <tr>
                            <td width='35%' style='font-weight: bold; color: #1e40af;'>Password:</td>
                            <td style='color: #2563eb; font-family: monospace; font-weight: 800; font-size: 14px;'>{$tempPassword}</td>
                        </tr>
                    </table>
                </div>

                <p style='margin: 20px 0 0 0; font-size: 13px; color: #475569;'>Click the button below to sign in and view your digital entry pass:</p>
            ";

            $fullHtml = EmailTemplate::getHtml(
                "Registration Confirmed - {$eventName}",
                $bodyHtml,
                "Log In to Participant Portal",
                $loginUrl,
                'outline_blue'
            );

            $mail->Body = $fullHtml;
            return $mail->send();
        } catch (\Exception $e) {
            error_log("Failed to send event confirmation email to {$email}: " . $e->getMessage());
            return false;
        }
    }

    /**
     * GET /api.php/events/{id}/registrations
     * Admin: list all registrations for an event
     */
    public function listForEvent(array $params): void {
        AuthMiddleware::authenticate();
        $this->ensureMigration();
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
        $this->ensureMigration();
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
     * GET/POST /api.php/events/{id}/check-email
     * Public endpoint to check if an email is already registered for this event
     */
    public function checkEmail(array $params): void {
        $this->ensureMigration();
        $eventId = (int)$params['id'];

        $input = !empty($_POST) ? $_POST : (json_decode(file_get_contents('php://input'), true) ?? []);
        $email = trim($_GET['email'] ?? $input['email'] ?? '');

        if (empty($email)) {
            Router::sendJson(['is_registered' => false]);
            return;
        }

        $db = Database::getConnection();
        $stmt = $db->prepare("
            SELECT id, full_name, email, registration_token, status, payment_status 
            FROM event_registrations 
            WHERE event_id = ? AND email = ? AND status != 'cancelled'
            LIMIT 1
        ");
        $stmt->execute([$eventId, $email]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($existing) {
            Router::sendJson([
                'is_registered' => true,
                'registration' => [
                    'id' => (int)$existing['id'],
                    'full_name' => $existing['full_name'],
                    'email' => $existing['email'],
                    'token' => $existing['registration_token'],
                    'status' => $existing['status']
                ]
            ]);
        } else {
            Router::sendJson(['is_registered' => false]);
        }
    }

    /**
     * POST /api.php/events/{id}/register
     * Public: submit event registration + auto-provision participant account & send credentials email
     */
    public function register(array $params): void {
        $this->ensureMigration();
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

        // Auto-provision form if not exists
        $formStmt = $db->prepare("SELECT * FROM event_registration_forms WHERE event_id = ?");
        $formStmt->execute([$eventId]);
        $form = $formStmt->fetch(PDO::FETCH_ASSOC);

        if (!$form) {
            $createForm = $db->prepare("INSERT INTO event_registration_forms (event_id, form_name, description, is_active) VALUES (?, ?, ?, 1)");
            $createForm->execute([$eventId, $event['name'] . ' Registration Form', 'Default registration form for ' . $event['name']]);
            $formId = (int)$db->lastInsertId();
            $form = ['id' => $formId, 'event_id' => $eventId, 'is_active' => 1, 'success_message' => 'Registration successful!'];
        }

        // Check max participants
        if (!empty($event['max_participants']) && (int)$event['max_participants'] > 0) {
            $countStmt = $db->prepare("SELECT COUNT(*) FROM event_registrations WHERE event_id = ? AND status != 'cancelled'");
            $countStmt->execute([$eventId]);
            $currentCount = (int)$countStmt->fetchColumn();
            if ($currentCount >= (int)$event['max_participants']) {
                Router::sendJson(['error' => 'Sorry, registrations are full for this event'], 400);
                return;
            }
        }

        // Parse input — handle both multipart/form-data ($_POST) and application/json (php://input)
        $input = !empty($_POST) ? $_POST : (json_decode(file_get_contents('php://input'), true) ?? []);

        // Extract core fields
        $fullName       = trim($input['full_name'] ?? '');
        $email          = trim($input['email'] ?? '');
        $phone          = trim($input['phone'] ?? '');
        $transactionId  = trim($input['transaction_id'] ?? '');
        $paymentGateway = trim($input['payment_gateway'] ?? 'Manual/UPI');
        
        $answersRaw = $input['answers'] ?? [];
        if (is_string($answersRaw)) {
            $answers = json_decode($answersRaw, true) ?? [];
        } else {
            $answers = is_array($answersRaw) ? $answersRaw : [];
        }

        // If core identifiers are missing from top level, scan dynamic answers & form field labels
        if (empty($fullName) || empty($email) || empty($phone)) {
            $fieldsStmt = $db->prepare("
                SELECT ff.id, ff.label, ff.field_type
                FROM form_fields ff
                JOIN form_sections fs ON ff.section_id = fs.id
                WHERE fs.event_form_id = ?
            ");
            $fieldsStmt->execute([$form['id']]);
            $formFields = $fieldsStmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($formFields as $f) {
                $val = $input['field_' . $f['id']] ?? $answers[$f['id']] ?? $answers[(string)$f['id']] ?? null;
                if ($val && is_string($val)) {
                    $lbl = strtolower($f['label']);
                    if (empty($fullName) && (str_contains($lbl, 'name') || $f['field_type'] === 'text')) {
                        $fullName = trim($val);
                    }
                    if (empty($email) && ($f['field_type'] === 'email' || str_contains($lbl, 'email'))) {
                        $email = trim($val);
                    }
                    if (empty($phone) && ($f['field_type'] === 'tel' || $f['field_type'] === 'phone' || str_contains($lbl, 'phone') || str_contains($lbl, 'contact') || str_contains($lbl, 'mobile') || str_contains($lbl, 'whatsapp'))) {
                        $phone = trim($val);
                    }
                }
            }
        }

        // Fallbacks if no name was detected in a custom-built form
        if (empty($fullName)) {
            $fullName = !empty($email) ? explode('@', $email)[0] : 'Participant';
        }

        if (empty($email)) {
            Router::sendJson(['error' => 'Please provide a valid email address in the form'], 400);
            return;
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Router::sendJson(['error' => 'Invalid email address provided'], 400);
            return;
        }

        // Duplicate registration check for this specific event
        $dupCheck = $db->prepare("SELECT id FROM event_registrations WHERE event_id = ? AND email = ?");
        $dupCheck->execute([$eventId, $email]);
        if ($dupCheck->fetch()) {
            Router::sendJson(['error' => 'A registration with this email already exists for this event'], 409);
            return;
        }

        // Determine initial payment status
        $paymentRequired = !empty($event['payment_required']) && (float)($event['registration_fee'] ?? 0) > 0;
        $paymentStatus   = $paymentRequired ? (!empty($transactionId) ? 'pending' : 'pending') : 'not_required';
        $paymentAmount   = $paymentRequired ? (float)$event['registration_fee'] : 0.00;

        // Generate unique registration token
        $token = 'EVT-' . strtoupper(substr(md5(uniqid((string)$eventId, true)), 0, 10));

        // Generate plain participant password
        $tempPassword = $this->generateParticipantPassword(8);
        $passwordHash = password_hash($tempPassword, PASSWORD_DEFAULT);

        $db->beginTransaction();
        try {
            // 1. Create or link user account in `users` table
            $userCheck = $db->prepare("SELECT id, role FROM users WHERE email = ?");
            $userCheck->execute([$email]);
            $existingUser = $userCheck->fetch(PDO::FETCH_ASSOC);

            if ($existingUser) {
                $userId = (int)$existingUser['id'];
                // If existing role is participant, refresh password so they can login with newly generated credentials
                if ($existingUser['role'] === 'participant') {
                    $updUser = $db->prepare("UPDATE users SET name = ?, password_hash = ?, updated_at = NOW() WHERE id = ?");
                    $updUser->execute([$fullName, $passwordHash, $userId]);
                }
            } else {
                $insUser = $db->prepare("
                    INSERT INTO users (name, email, password_hash, role, must_change_password)
                    VALUES (?, ?, ?, 'participant', 0)
                ");
                $insUser->execute([$fullName, $email, $passwordHash]);
                $userId = (int)$db->lastInsertId();
            }

            // 2. Insert into event_registrations
            $regStmt = $db->prepare("
                INSERT INTO event_registrations
                    (event_id, event_form_id, user_id, full_name, email, phone,
                     status, payment_status, payment_amount, transaction_id, payment_gateway, registration_token)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
            ");
            $regStmt->execute([
                $eventId,
                $form['id'],
                $userId,
                $fullName,
                $email,
                $phone,
                $paymentRequired ? 'pending' : 'confirmed',
                $paymentStatus,
                $paymentAmount,
                $transactionId ?: null,
                $paymentGateway ?: null,
                $token
            ]);
            $regId = (int)$db->lastInsertId();

            // 3. Store dynamic form answers
            $ansStmt = $db->prepare(
                "INSERT INTO event_registration_answers (registration_id, field_id, answer_text) VALUES (?,?,?)"
            );
            foreach ($answers as $fieldId => $answerText) {
                $fieldId = (int)$fieldId;
                if ($fieldId > 0 && $answerText !== null && $answerText !== '') {
                    $ansStmt->execute([$regId, $fieldId, is_array($answerText) ? json_encode($answerText) : (string)$answerText]);
                }
            }

            // 4. Handle file uploads and payment screenshot
            $paymentScreenshotUrl = null;
            if (!empty($_FILES)) {
                $uploadDir = __DIR__ . '/../../uploads/events/' . $eventId . '/' . $regId . '/';
                if (!is_dir($uploadDir)) {
                    mkdir($uploadDir, 0777, true);
                }

                $fileStmt = $db->prepare("
                    INSERT INTO event_registration_files (registration_id, field_id, file_name, file_path, file_type, file_size)
                    VALUES (?, ?, ?, ?, ?, ?)
                ");

                foreach ($_FILES as $key => $file) {
                    if ($file['error'] === UPLOAD_ERR_OK) {
                        $originalName = basename($file['name']);
                        $ext = pathinfo($originalName, PATHINFO_EXTENSION);
                        $safeName = uniqid('file_', true) . ($ext ? '.' . $ext : '');
                        $targetPath = $uploadDir . $safeName;
                        $relativePath = '/uploads/events/' . $eventId . '/' . $regId . '/' . $safeName;

                        if (move_uploaded_file($file['tmp_name'], $targetPath)) {
                            if ($key === 'payment_screenshot') {
                                $paymentScreenshotUrl = $relativePath;
                            } elseif (preg_match('/^file_(\d+)$/', $key, $m)) {
                                $fieldId = (int)$m[1];
                                if ($fieldId > 0) {
                                    try {
                                        $fileStmt->execute([
                                            $regId,
                                            $fieldId,
                                            $originalName,
                                            $relativePath,
                                            $file['type'] ?? 'application/octet-stream',
                                            (int)$file['size']
                                        ]);
                                    } catch (\Exception $fe) {
                                        error_log("Failed to insert registration file record: " . $fe->getMessage());
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if ($paymentScreenshotUrl) {
                $db->prepare("UPDATE event_registrations SET payment_screenshot_url = ? WHERE id = ?")->execute([$paymentScreenshotUrl, $regId]);
            }

            $db->commit();

            // 5. Send confirmation email if enabled for this event
            $sendEmail = !isset($event['send_confirmation_email']) || (bool)$event['send_confirmation_email'];
            $emailSent = false;

            if ($sendEmail) {
                $eventDateFormatted = !empty($event['start_date']) ? date('d F Y, h:i A', strtotime($event['start_date'])) : 'To Be Announced';
                $eventLocation = $event['location'] ?: "KIT's College of Engineering, Kolhapur";

                $emailSent = $this->sendRegistrationConfirmationEmail(
                    $email,
                    $fullName,
                    $event['name'],
                    $token,
                    $eventDateFormatted,
                    $eventLocation,
                    $tempPassword
                );
            }

            $stmt2 = $db->prepare("SELECT * FROM event_registrations WHERE id = ?");
            $stmt2->execute([$regId]);
            $registration = $stmt2->fetch(PDO::FETCH_ASSOC);

            Router::sendJson([
                'message'                 => $form['success_message'] ?? 'Registration successful!',
                'registration_id'         => $regId,
                'registration_token'      => $token,
                'token'                   => $token,
                'status'                  => $registration['status'] ?? 'confirmed',
                'payment_required'        => $paymentRequired,
                'payment_amount'          => $paymentAmount,
                'send_confirmation_email' => $sendEmail,
                'email_sent'              => $emailSent,
                'registration'            => $registration,
                'credentials'             => [
                    'email'    => $email,
                    'password' => $tempPassword,
                    'name'     => $fullName,
                ],
                'login_url'               => "/user-login?email=" . urlencode($email)
            ], 201);
        } catch (\Exception $e) {
            $db->rollBack();
            Router::sendJson(['error' => 'Registration failed: ' . $e->getMessage()], 500);
        }
    }

    /**
     * GET /api.php/participant/dashboard
     * Participant portal: get participant profile and all event passes
     */
    public function getParticipantDashboard(): void {
        $user = AuthMiddleware::authenticate();
        $this->ensureMigration();

        $db = Database::getConnection();
        $email = $user['email'];
        $userId = $user['userId'];

        // Get user details
        $uStmt = $db->prepare("SELECT id, name, email, role, created_at FROM users WHERE id = ?");
        $uStmt->execute([$userId]);
        $profile = $uStmt->fetch(PDO::FETCH_ASSOC);

        // Fetch all registrations for this participant
        $regStmt = $db->prepare("
            SELECT er.*, e.name as event_name, e.slug as event_slug, e.description as event_description,
                   e.banner_url, e.cover_image_url, e.start_date, e.end_date, e.location, e.mode,
                   e.registration_fee, ef.form_name
            FROM event_registrations er
            JOIN events e ON er.event_id = e.id
            JOIN event_registration_forms ef ON er.event_form_id = ef.id
            WHERE er.email = ? OR er.user_id = ?
            ORDER BY er.registered_at DESC
        ");
        $regStmt->execute([$email, $userId]);
        $registrations = $regStmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch dynamic answers for each registration
        foreach ($registrations as &$reg) {
            $ansStmt = $db->prepare("
                SELECT era.field_id, era.answer_text, ff.label, ff.field_type
                FROM event_registration_answers era
                JOIN form_fields ff ON era.field_id = ff.id
                WHERE era.registration_id = ?
                ORDER BY ff.display_order ASC
            ");
            $ansStmt->execute([$reg['id']]);
            $reg['answers'] = $ansStmt->fetchAll(PDO::FETCH_ASSOC);
        }

        Router::sendJson([
            'user'          => $profile,
            'registrations' => $registrations,
            'stats'         => [
                'total_events'     => count($registrations),
                'confirmed_passes' => count(array_filter($registrations, fn($r) => in_array($r['status'], ['confirmed', 'approved']))),
            ]
        ]);
    }

    /**
     * PUT /api.php/participant/profile
     * Participant portal: update profile and password
     */
    public function updateParticipantProfile(): void {
        $user = AuthMiddleware::authenticate();
        $this->ensureMigration();

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $name = trim($input['name'] ?? '');
        $currentPassword = $input['current_password'] ?? '';
        $newPassword = $input['new_password'] ?? '';

        $db = Database::getConnection();

        if (!empty($name)) {
            $stmt = $db->prepare("UPDATE users SET name = ?, updated_at = NOW() WHERE id = ?");
            $stmt->execute([$name, $user['userId']]);
        }

        if (!empty($newPassword)) {
            $uCheck = $db->prepare("SELECT password_hash FROM users WHERE id = ?");
            $uCheck->execute([$user['userId']]);
            $hash = $uCheck->fetchColumn();

            if (!empty($currentPassword) && !password_verify($currentPassword, $hash)) {
                Router::sendJson(['error' => 'Current password does not match.'], 400);
                return;
            }

            if (strlen($newPassword) < 6) {
                Router::sendJson(['error' => 'New password must be at least 6 characters.'], 400);
                return;
            }

            $newHash = password_hash($newPassword, PASSWORD_DEFAULT);
            $stmt = $db->prepare("UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?");
            $stmt->execute([$newHash, $user['userId']]);
        }

        $stmt2 = $db->prepare("SELECT id, name, email, role FROM users WHERE id = ?");
        $stmt2->execute([$user['userId']]);
        Router::sendJson([
            'message' => 'Profile updated successfully',
            'user'    => $stmt2->fetch(PDO::FETCH_ASSOC)
        ]);
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
     * DELETE /api.php/event-registrations/{id}
     * Admin: Delete a participant registration and clean up files
     */
    public function delete(array $params): void {
        AuthMiddleware::requireAuth();
        $regId = (int)($params['id'] ?? 0);

        if (!$regId) {
            Router::sendJson(['error' => 'Invalid registration ID'], 400);
            return;
        }

        $db = Database::getConnection();

        $stmt = $db->prepare("SELECT * FROM event_registrations WHERE id = ?");
        $stmt->execute([$regId]);
        $reg = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$reg) {
            Router::sendJson(['error' => 'Participant registration not found'], 404);
            return;
        }

        // Clean up any uploaded files from filesystem
        try {
            $fileStmt = $db->prepare("SELECT file_path FROM event_registration_files WHERE registration_id = ?");
            $fileStmt->execute([$regId]);
            $files = $fileStmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($files as $f) {
                if (!empty($f['file_path'])) {
                    $uploadDir = dirname(__DIR__, 2) . '/uploads';
                    $cleaned = ltrim(str_replace('/uploads/', '', $f['file_path']), '/');
                    $fullPath = $uploadDir . '/' . $cleaned;
                    if (file_exists($fullPath) && is_file($fullPath)) {
                        @unlink($fullPath);
                    }
                }
            }
        } catch (\Exception $e) {
            // Ignore file lookup failure
        }

        // Delete from associated tables
        try {
            $db->prepare("DELETE FROM event_registration_files WHERE registration_id = ?")->execute([$regId]);
            $db->prepare("DELETE FROM event_registration_answers WHERE registration_id = ?")->execute([$regId]);
        } catch (\Exception $e) {}

        // Delete primary registration record
        $delStmt = $db->prepare("DELETE FROM event_registrations WHERE id = ?");
        $delStmt->execute([$regId]);

        // Clean up participant user account if role is participant and has no other registrations left
        try {
            $userEmail = $reg['email'] ?? '';
            $userId    = $reg['user_id'] ?? null;
            if ($userId || $userEmail) {
                $uStmt = $db->prepare("SELECT id, role FROM users WHERE id = ? OR email = ?");
                $uStmt->execute([$userId ?: 0, $userEmail]);
                $u = $uStmt->fetch(PDO::FETCH_ASSOC);

                if ($u && $u['role'] === 'participant') {
                    $remStmt = $db->prepare("SELECT COUNT(*) FROM event_registrations WHERE (user_id = ? OR email = ?) AND id != ?");
                    $remStmt->execute([$u['id'], $userEmail, $regId]);
                    if ((int)$remStmt->fetchColumn() === 0) {
                        $db->prepare("DELETE FROM users WHERE id = ?")->execute([$u['id']]);
                    }
                }
            }
        } catch (\Exception $e) {}

        Router::sendJson([
            'message'    => 'Participant registration deleted successfully',
            'deleted_id' => $regId
        ]);
    }

    /**
     * GET /api.php/events/slug/{slug}/form
     * Public: get the form structure for a public event (by slug)
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

        $formStmt = $db->prepare("SELECT * FROM event_registration_forms WHERE event_id = ?");
        $formStmt->execute([$event['id']]);
        $form = $formStmt->fetch(PDO::FETCH_ASSOC);

        if (!$form) {
            Router::sendJson([
                'event'             => $event,
                'form'              => null,
                'sections'          => [],
                'registration_open' => $event['registration_status'] === 'open'
            ]);
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
            'event'             => $event,
            'form'              => $form,
            'sections'          => $formStructure,
            'registration_open' => $event['registration_status'] === 'open'
        ]);
    }
}
