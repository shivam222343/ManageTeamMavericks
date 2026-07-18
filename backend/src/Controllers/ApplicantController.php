<?php
// src/Controllers/ApplicantController.php
namespace App\Controllers;

use App\Database;
use App\Router;
use App\Middleware\AuthMiddleware;
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
use PDO;

class ApplicantController {
    /**
     * GET /api.php/applicants
     */
    public function list(): void {
        AuthMiddleware::authenticate();

        $campaignId = isset($_GET['campaign_id']) ? (int)$_GET['campaign_id'] : 1;
        $search = trim($_GET['search'] ?? '');
        $status = trim($_GET['status'] ?? '');
        $domainId = isset($_GET['domain_id']) ? (int)$_GET['domain_id'] : null;
        $sortBy = trim($_GET['sort_by'] ?? 'applied_at');
        $sortOrder = strtoupper(trim($_GET['sort_order'] ?? 'DESC')) === 'ASC' ? 'ASC' : 'DESC';

        $db = Database::getConnection();

        $query = "SELECT a.*, 
            (SELECT GROUP_CONCAT(d.name SEPARATOR ', ') FROM application_domains ad JOIN domains d ON ad.domain_id = d.id WHERE ad.application_id = a.id) as domains,
            (SELECT ans.answer_text FROM application_answers ans JOIN form_fields f ON ans.field_id = f.id WHERE ans.application_id = a.id AND f.field_type = 'dropdown' AND f.label LIKE '%Department%' LIMIT 1) as department
            FROM applications a 
            WHERE a.campaign_id = :campaign_id";

        $params = [':campaign_id' => $campaignId];

        if ($search !== '') {
            $query .= " AND (a.full_name LIKE :search OR a.prn LIKE :search OR a.email LIKE :search OR a.phone LIKE :search)";
            $params[':search'] = '%' . $search . '%';
        }

        if ($status !== '') {
            $query .= " AND a.status = :status";
            $params[':status'] = $status;
        }

        if ($domainId) {
            $query .= " AND a.id IN (SELECT ad.application_id FROM application_domains ad WHERE ad.domain_id = :domain_id)";
            $params[':domain_id'] = $domainId;
        }

        $allowedSortColumns = ['applied_at', 'full_name', 'status', 'prn'];
        if (!in_array($sortBy, $allowedSortColumns)) {
            $sortBy = 'applied_at';
        }

        $query .= " ORDER BY a.$sortBy $sortOrder";

        $stmt = $db->prepare($query);
        $stmt->execute($params);
        $applicants = $stmt->fetchAll();

        Router::sendJson($applicants);
    }

    /**
     * GET /api.php/applicants/{id}
     */
    public function get(array $params): void {
        AuthMiddleware::authenticate();
        $id = (int)$params['id'];

        $db = Database::getConnection();

        // 1. Fetch Application Core
        $stmt = $db->prepare("SELECT a.*, c.name as campaign_name FROM applications a JOIN campaigns c ON a.campaign_id = c.id WHERE a.id = ?");
        $stmt->execute([$id]);
        $app = $stmt->fetch();

        if (!$app) {
            Router::sendJson(['error' => 'Applicant not found'], 404);
        }

        // 2. Fetch Selected Domains
        $stmtDom = $db->prepare("SELECT d.* FROM application_domains ad JOIN domains d ON ad.domain_id = d.id WHERE ad.application_id = ?");
        $stmtDom->execute([$id]);
        $app['selected_domains'] = $stmtDom->fetchAll();

        // 3. Fetch Answers and Fields info
        $stmtAnswers = $db->prepare("SELECT f.label, f.field_type, s.name as section_name, ans.answer_text, ans.field_id
            FROM application_answers ans 
            JOIN form_fields f ON ans.field_id = f.id 
            JOIN form_sections s ON f.section_id = s.id
            WHERE ans.application_id = ?
            ORDER BY s.display_order ASC, f.display_order ASC");
        $stmtAnswers->execute([$id]);
        $app['answers'] = $stmtAnswers->fetchAll();

        // 4. Fetch Files
        $stmtFiles = $db->prepare("SELECT f.label, fl.id as file_id, fl.file_name, fl.file_path, fl.file_type, fl.file_size 
            FROM application_files fl
            JOIN form_fields f ON fl.field_id = f.id
            WHERE fl.application_id = ?");
        $stmtFiles->execute([$id]);
        $app['files'] = $stmtFiles->fetchAll();

        // 5. Fetch Internal Notes
        $stmtNotes = $db->prepare("SELECT n.*, u.name as author_name 
            FROM application_notes n 
            JOIN users u ON n.user_id = u.id 
            WHERE n.application_id = ? 
            ORDER BY n.created_at DESC");
        $stmtNotes->execute([$id]);
        $app['notes'] = $stmtNotes->fetchAll();

        // 6. Fetch Timeline history
        $stmtHist = $db->prepare("SELECT h.*, u.name as changer_name 
            FROM application_status_history h 
            JOIN users u ON h.changed_by = u.id 
            WHERE h.application_id = ? 
            ORDER BY h.changed_at DESC");
        $stmtHist->execute([$id]);
        $app['timeline'] = $stmtHist->fetchAll();

        Router::sendJson($app);
    }

    /**
     * POST /api.php/applicants/apply
     * Public application submission
     */
    public function apply(): void {
        $campaignId = isset($_POST['campaign_id']) ? (int)$_POST['campaign_id'] : 1;
        $prn = strtoupper(trim($_POST['prn'] ?? ''));
        $email = strtolower(trim($_POST['email'] ?? ''));
        $phone = trim($_POST['phone'] ?? '');
        $full_name = trim($_POST['full_name'] ?? '');

        $db = Database::getConnection();

        // 1. Fetch form fields config first to see what's actually required
        $stmtFields = $db->prepare("SELECT f.* FROM form_fields f 
            JOIN form_sections s ON f.section_id = s.id 
            WHERE s.campaign_id = ? AND f.is_hidden = 0");
        $stmtFields->execute([$campaignId]);
        $fields = $stmtFields->fetchAll();

        // Dynamically discover required basic fields
        $isNameRequired = false;
        $isPrnRequired = false;
        $isEmailRequired = false;
        $isPhoneRequired = false;

        foreach ($fields as $field) {
            $type = $field['field_type'];
            $lbl = strtolower($field['label']);
            $req = (bool)$field['is_required'];

            if ($req) {
                if ($type === 'text' && strpos($lbl, 'name') !== false) {
                    $isNameRequired = true;
                } elseif ($type === 'prn') {
                    $isPrnRequired = true;
                } elseif ($type === 'email') {
                    $isEmailRequired = true;
                } elseif ($type === 'phone') {
                    $isPhoneRequired = true;
                }
            }
        }

        // Validate only if configured as required in the form
        if ($isNameRequired && empty($full_name)) {
            Router::sendJson(['error' => 'Full Name is required'], 400);
        }
        if ($isPrnRequired && empty($prn)) {
            Router::sendJson(['error' => 'PRN is required'], 400);
        }
        if ($isEmailRequired && empty($email)) {
            Router::sendJson(['error' => 'Email is required'], 400);
        }
        if ($isPhoneRequired && empty($phone)) {
            Router::sendJson(['error' => 'Phone number is required'], 400);
        }

        // Check if Campaign is active
        $stmtC = $db->prepare("SELECT status, deadline, max_applications FROM campaigns WHERE id = ?");
        $stmtC->execute([$campaignId]);
        $campaign = $stmtC->fetch();

        if (!$campaign) {
            Router::sendJson(['error' => 'Campaign not found'], 404);
        }
        if ($campaign['status'] !== 'open') {
            Router::sendJson(['error' => 'Recruitment drive is not active'], 400);
        }
        if (strtotime($campaign['deadline']) < time()) {
            Router::sendJson(['error' => 'Recruitment deadline has passed'], 400);
        }

        // Limit check
        if ($campaign['max_applications'] !== null) {
            $stmtCount = $db->prepare("SELECT COUNT(*) FROM applications WHERE campaign_id = ?");
            $stmtCount->execute([$campaignId]);
            $count = $stmtCount->fetchColumn();
            if ($count >= $campaign['max_applications']) {
                Router::sendJson(['error' => 'Maximum application capacity reached for this campaign'], 400);
            }
        }

        // Check Duplicates only for non-empty unique keys
        if (!empty($prn) || !empty($email) || !empty($phone)) {
            $checkQuery = "SELECT prn, email, phone FROM applications WHERE campaign_id = ? AND (1=0";
            $checkParams = [$campaignId];
            if (!empty($prn)) {
                $checkQuery .= " OR prn = ?";
                $checkParams[] = $prn;
            }
            if (!empty($email)) {
                $checkQuery .= " OR email = ?";
                $checkParams[] = $email;
            }
            if (!empty($phone)) {
                $checkQuery .= " OR phone = ?";
                $checkParams[] = $phone;
            }
            $checkQuery .= ")";

            $stmtCheck = $db->prepare($checkQuery);
            $stmtCheck->execute($checkParams);
            $duplicate = $stmtCheck->fetch();

            if ($duplicate) {
                if (!empty($prn) && $duplicate['prn'] === $prn) {
                    Router::sendJson(['error' => 'An application has already been submitted with this PRN.'], 400);
                }
                if (!empty($email) && $duplicate['email'] === $email) {
                    Router::sendJson(['error' => 'An application has already been submitted with this Email.'], 400);
                }
                if (!empty($phone) && $duplicate['phone'] === $phone) {
                    Router::sendJson(['error' => 'An application has already been submitted with this Phone number.'], 400);
                }
            }
        }

        // Validate dynamic fields based on configuration
        $stmtFields = $db->prepare("SELECT f.* FROM form_fields f 
            JOIN form_sections s ON f.section_id = s.id 
            WHERE s.campaign_id = ? AND f.is_hidden = 0");
        $stmtFields->execute([$campaignId]);
        $fields = $stmtFields->fetchAll();

        $answers = [];
        $filesToUpload = [];

        foreach ($fields as $field) {
            $fieldId = $field['id'];
            $label = $field['label'];
            $type = $field['field_type'];
            $rules = !empty($field['validation_rules']) ? json_decode($field['validation_rules'], true) : [];

            // Skip primary values (name, email, phone, prn, domains) as we handle them directly
            if ($type === 'prn' || $type === 'email' || $type === 'phone' || $type === 'checkbox' && $label === 'Preferred Domains') {
                continue;
            }

            // File Uploads
            if (in_array($type, ['file', 'image', 'resume', 'pdf', 'id_card'])) {
                $fileKey = 'field_' . $fieldId;
                $hasFile = isset($_FILES[$fileKey]) && $_FILES[$fileKey]['error'] !== UPLOAD_ERR_NO_FILE;

                if ($field['is_required'] && !$hasFile) {
                    Router::sendJson(['error' => "File upload '$label' is required"], 400);
                }

                if ($hasFile) {
                    $file = $_FILES[$fileKey];
                    if ($file['error'] !== UPLOAD_ERR_OK) {
                        Router::sendJson(['error' => "Upload error in '$label' file"], 400);
                    }

                    // Check size limit (default 5MB if not configured)
                    $maxSize = $rules['max_size'] ?? 5242880;
                    if ($file['size'] > $maxSize) {
                        Router::sendJson(['error' => "File '$label' exceeds maximum allowed size of " . ($maxSize / 1024 / 1024) . "MB"], 400);
                    }

                    // Check file types
                    $allowedTypes = $rules['types'] ?? [];
                    if (!empty($allowedTypes) && !in_array($file['type'], $allowedTypes)) {
                        Router::sendJson(['error' => "File '$label' has invalid type. Allowed: " . implode(', ', $allowedTypes)], 400);
                    }

                    $filesToUpload[$fieldId] = $file;
                }
            } else {
                // Standard Inputs
                $val = $_POST['field_' . $fieldId] ?? '';
                if ($field['is_required'] && trim($val) === '') {
                    Router::sendJson(['error' => "'$label' is a required field"], 400);
                }

                // Min/Max Length Validation
                if (trim($val) !== '') {
                    if (isset($rules['min']) && strlen($val) < $rules['min']) {
                        Router::sendJson(['error' => "'$label' must be at least {$rules['min']} characters"], 400);
                    }
                    if (isset($rules['max']) && strlen($val) > $rules['max']) {
                        Router::sendJson(['error' => "'$label' cannot exceed {$rules['max']} characters"], 400);
                    }
                    if (isset($rules['regex']) && !preg_match('#' . $rules['regex'] . '#', $val)) {
                        Router::sendJson(['error' => "'$label' has an invalid format"], 400);
                    }
                }

                $answers[$fieldId] = $val;
            }
        }

        // Parse domains
        $domainIds = $_POST['domains'] ?? [];
        if (is_string($domainIds)) {
            $domainIds = json_decode($domainIds, true) ?: [];
        }

        // Start Transaction
        $db->beginTransaction();

        try {
            // 1. Insert Application with a random registration_id
            $registrationId = 'TM-26-' . strtoupper(substr(md5(uniqid()), 0, 4));
            
            $stmtInsApp = $db->prepare("INSERT INTO applications (campaign_id, prn, email, phone, full_name, status, registration_id) VALUES (?, ?, ?, ?, ?, 'applied', ?)");
            $stmtInsApp->execute([$campaignId, $prn, $email, $phone, $full_name, $registrationId]);
            $applicationId = (int)$db->lastInsertId();

            // 2. Associate Domains
            $stmtInsDom = $db->prepare("INSERT INTO application_domains (application_id, domain_id) VALUES (?, ?)");
            foreach ($domainIds as $dId) {
                $stmtInsDom->execute([$applicationId, (int)$dId]);
            }

            // 3. Store Answers
            $stmtInsAns = $db->prepare("INSERT INTO application_answers (application_id, field_id, answer_text) VALUES (?, ?, ?)");
            foreach ($answers as $fId => $ansText) {
                $stmtInsAns->execute([$applicationId, $fId, $ansText]);
            }

            // Write also primary form fields mapping to answers for easy visualization
            // Fetch default fields to match
            $prnField = array_filter($fields, fn($f) => $f['field_type'] === 'prn')[0] ?? null;
            if ($prnField) { $stmtInsAns->execute([$applicationId, $prnField['id'], $prn]); }

            $emailField = array_filter($fields, fn($f) => $f['field_type'] === 'email')[0] ?? null;
            if ($emailField) { $stmtInsAns->execute([$applicationId, $emailField['id'], $email]); }

            $phoneField = array_filter($fields, fn($f) => $f['field_type'] === 'phone')[0] ?? null;
            if ($phoneField) { $stmtInsAns->execute([$applicationId, $phoneField['id'], $phone]); }

            $domainsField = array_filter($fields, fn($f) => $f['field_type'] === 'checkbox' && $f['label'] === 'Preferred Domains')[0] ?? null;
            if ($domainsField) { 
                $stmtInsAns->execute([$applicationId, $domainsField['id'], implode(', ', $domainIds)]); 
            }

            // 4. Handle File Uploads
            $uploadDir = __DIR__ . '/../../uploads/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
                // Create .htaccess file to secure directory
                file_put_contents($uploadDir . '.htaccess', "Engine off\nOptions -ExecCGI\nAddHandler cgi-script .php .pl .py .jsp .asp .htm .html .shtml");
            }

            // Sanitise candidate name (e.g. "Shiva Kumar" -> "shiva_kumar")
            $sanitizedName = preg_replace('/[^a-z0-9]/', '_', strtolower($full_name));
            $sanitizedName = preg_replace('/_+/', '_', trim($sanitizedName, '_'));

            $stmtInsFile = $db->prepare("INSERT INTO application_files (application_id, field_id, file_name, file_path, file_type, file_size) VALUES (?, ?, ?, ?, ?, ?)");
            foreach ($filesToUpload as $fId => $file) {
                $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
                
                // Find matching field label
                $fieldLabel = 'file';
                foreach ($fields as $fld) {
                    if ($fld['id'] == $fId) {
                        $fieldLabel = $fld['label'];
                        break;
                    }
                }
                
                // Sanitise label (e.g. "Resume (PDF)" -> "resume")
                $cleanLabel = preg_replace('/\(.*?\)/', '', $fieldLabel);
                $sanitizedLabel = preg_replace('/[^a-z0-9]/', '_', strtolower($cleanLabel));
                $sanitizedLabel = preg_replace('/_+/', '_', trim($sanitizedLabel, '_'));
                if (empty($sanitizedLabel)) {
                    $sanitizedLabel = 'file';
                }

                $uniqueName = $sanitizedName . '_' . $sanitizedLabel . '_' . uniqid() . '.' . $ext;
                $targetPath = $uploadDir . $uniqueName;

                if (move_uploaded_file($file['tmp_name'], $targetPath)) {
                    $stmtInsFile->execute([
                        $applicationId,
                        $fId,
                        $file['name'],
                        'uploads/' . $uniqueName,
                        $file['type'],
                        $file['size']
                    ]);
                } else {
                    throw new \Exception("Failed to save file for field ID: " . $fId);
                }
            }

            // 5. Insert Log history
            $stmtHist = $db->prepare("INSERT INTO application_status_history (application_id, old_status, new_status, changed_by, notes) VALUES (?, 'none', 'applied', 1, 'Application submitted online')");
            $stmtHist->execute([$applicationId]);

            $db->commit();

            // Trigger Email (asynchronously or capture errors so user response completes)
            $this->sendTriggerEmail($applicationId, 'applied');

            Router::sendJson([
                'message' => 'Application submitted successfully!',
                'application_id' => $registrationId
            ], 201);

        } catch (\Exception $e) {
            $db->rollBack();
            Router::sendJson(['error' => 'Failed to save application: ' . $e->getMessage()], 500);
        }
    }

    /**
     * PUT /api.php/applicants/{id}/status
     * Update application status and trigger templates
     */
    public function updateStatus(array $params): void {
        $user = AuthMiddleware::requireCore();
        $id = (int)$params['id'];

        $input = json_decode(file_get_contents('php://input'), true);
        $newStatus = $input['status'] ?? '';
        $notes = trim($input['notes'] ?? '');
        $interviewDatetime = $input['interview_datetime'] ?? null;
        $interviewVenue = $input['interview_venue'] ?? null;

        $allowedStatuses = ['applied', 'under_review', 'shortlisted', 'interview', 'selected', 'rejected'];
        if (!in_array($newStatus, $allowedStatuses)) {
            Router::sendJson(['error' => 'Invalid status option'], 400);
        }

        $db = Database::getConnection();
        $db->beginTransaction();

        try {
            // Get current status
            $stmtCur = $db->prepare("SELECT status, full_name, email, prn FROM applications WHERE id = ?");
            $stmtCur->execute([$id]);
            $applicant = $stmtCur->fetch();

            if (!$applicant) {
                Router::sendJson(['error' => 'Applicant not found'], 404);
            }

            $oldStatus = $applicant['status'];

            // Update status
            $stmtUp = $db->prepare("UPDATE applications SET status = ? WHERE id = ?");
            $stmtUp->execute([$newStatus, $id]);

            // Save history
            $stmtHist = $db->prepare("INSERT INTO application_status_history (application_id, old_status, new_status, changed_by, notes) VALUES (?, ?, ?, ?, ?)");
            $stmtHist->execute([$id, $oldStatus, $newStatus, $user['userId'], $notes ?: "Status changed from $oldStatus to $newStatus"]);

            $db->commit();

            // Trigger corresponding emails
            $emailContext = [];
            if ($newStatus === 'interview') {
                $emailContext = [
                    'interview_datetime' => $interviewDatetime ? date('d M Y, h:i A', strtotime($interviewDatetime)) : 'TBD',
                    'interview_venue' => $interviewVenue ?: 'TBD'
                ];
                $this->sendTriggerEmail($id, 'interview_scheduled', $emailContext);
            } else if ($newStatus === 'shortlisted') {
                $this->sendTriggerEmail($id, 'shortlisted');
            } else if ($newStatus === 'selected') {
                $this->sendTriggerEmail($id, 'selected');
            } else if ($newStatus === 'rejected') {
                $this->sendTriggerEmail($id, 'rejected');
            }

            Router::sendJson(['message' => 'Status updated successfully']);
        } catch (\Exception $e) {
            $db->rollBack();
            Router::sendJson(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /api.php/applicants/{id}/notes
     */
    public function addNote(array $params): void {
        $user = AuthMiddleware::requireCore();
        $id = (int)$params['id'];
        $input = json_decode(file_get_contents('php://input'), true);
        $noteText = trim($input['note_text'] ?? '');

        if (empty($noteText)) {
            Router::sendJson(['error' => 'Note content cannot be empty'], 400);
        }

        $db = Database::getConnection();
        $stmt = $db->prepare("INSERT INTO application_notes (application_id, user_id, note_text) VALUES (?, ?, ?)");
        $stmt->execute([$id, $user['userId'], $noteText]);

        Router::sendJson(['message' => 'Note added successfully', 'note_id' => $db->lastInsertId()]);
    }

    /**
     * DELETE /api.php/applicants/{id}/notes/{noteId}
     */
    public function deleteNote(array $params): void {
        $user = AuthMiddleware::requireCore();
        $noteId = (int)$params['noteId'];

        $db = Database::getConnection();
        // Check author
        $stmt = $db->prepare("SELECT user_id FROM application_notes WHERE id = ?");
        $stmt->execute([$noteId]);
        $note = $stmt->fetch();

        if (!$note) {
            Router::sendJson(['error' => 'Note not found'], 404);
        }

        if ($note['user_id'] !== $user['userId'] && $user['role'] !== 'coordinator') {
            Router::sendJson(['error' => 'Forbidden: You cannot delete notes authored by others'], 403);
        }

        $stmtDel = $db->prepare("DELETE FROM application_notes WHERE id = ?");
        $stmtDel->execute([$noteId]);

        Router::sendJson(['message' => 'Note deleted successfully']);
    }

    /**
     * GET /api.php/applicants/export
     * CSV Exporter
     */
    public function export(): void {
        AuthMiddleware::requireCore();
        $campaignId = isset($_GET['campaign_id']) ? (int)$_GET['campaign_id'] : 1;

        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT a.id, a.registration_id, a.full_name, a.prn, a.email, a.phone, a.status, a.applied_at,
            (SELECT GROUP_CONCAT(d.name SEPARATOR ', ') FROM application_domains ad JOIN domains d ON ad.domain_id = d.id WHERE ad.application_id = a.id) as domains
            FROM applications a 
            WHERE a.campaign_id = ? 
            ORDER BY a.applied_at DESC");
        $stmt->execute([$campaignId]);
        $applicants = $stmt->fetchAll();

        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename=teammavericks_applicants_' . date('Y-m-d') . '.csv');

        $output = fopen('php://output', 'w');
        fputcsv($output, ['Application ID', 'Full Name', 'PRN', 'Email', 'Phone', 'Selected Domains', 'Status', 'Applied Date']);

        foreach ($applicants as $app) {
            fputcsv($output, [
                $app['registration_id'] ?: ('TM-26-' . str_pad($app['id'], 4, '0', STR_PAD_LEFT)),
                $app['full_name'],
                $app['prn'],
                $app['email'],
                $app['phone'],
                $app['domains'],
                ucfirst(str_replace('_', ' ', $app['status'])),
                $app['applied_at']
            ]);
        }
        fclose($output);
        exit;
    }

    /**
     * Private Email Delivery helper using PHPMailer
     */
    private function sendTriggerEmail(int $applicationId, string $triggerEvent, array $context = []): bool {
        $db = Database::getConnection();

        // 1. Fetch Template
        $stmt = $db->prepare("SELECT t.* FROM email_templates t 
            JOIN applications a ON t.campaign_id = a.campaign_id 
            WHERE a.id = ? AND t.trigger_event = ?");
        $stmt->execute([$applicationId, $triggerEvent]);
        $template = $stmt->fetch();

        if (!$template) {
            return false; // No email template configured for this action
        }

        // 2. Fetch Applicant Details
        $stmtApp = $db->prepare("SELECT * FROM applications WHERE id = ?");
        $stmtApp->execute([$applicationId]);
        $applicant = $stmtApp->fetch();

        // 3. Fetch Selected Domains
        $stmtDom = $db->prepare("SELECT GROUP_CONCAT(d.name SEPARATOR ', ') as domains_str FROM application_domains ad JOIN domains d ON ad.domain_id = d.id WHERE ad.application_id = ?");
        $stmtDom->execute([$applicationId]);
        $domains = $stmtDom->fetchColumn() ?: 'None';

        // 4. Set template keys
        $replace = [
            '{full_name}' => $applicant['full_name'],
            '{prn}' => $applicant['prn'],
            '{app_id}' => $applicant['registration_id'] ?: str_pad($applicant['id'], 4, '0', STR_PAD_LEFT),
            '{domains}' => $domains,
            '{interview_datetime}' => $context['interview_datetime'] ?? 'TBD',
            '{interview_venue}' => $context['interview_venue'] ?? 'TBD'
        ];

        $subject = str_replace(array_keys($replace), array_values($replace), $template['subject']);
        $body = str_replace(array_keys($replace), array_values($replace), $template['body_html']);

        // 5. Send Mail using PHPMailer
        $mail = new PHPMailer(true);
        try {
            // Server settings
            $mail->isSMTP();
            $mail->Host       = SMTP_HOST;
            $mail->SMTPAuth   = true;
            $mail->Username   = SMTP_USER;
            $mail->Password   = SMTP_PASS;
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port       = SMTP_PORT;

            // Recipients
            $mail->setFrom(SMTP_FROM_EMAIL, SMTP_FROM_NAME);
            $mail->addAddress($applicant['email'], $applicant['full_name']);

            // Content
            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body    = $body;

            $mail->send();
            return true;
        } catch (\Exception $e) {
            // Log failure to a file so we can debug SMTP configurations, but do not interrupt API responses.
            $logMsg = "[" . date('Y-m-d H:i:s') . "] Failed to send email to {$applicant['email']} for trigger '$triggerEvent': " . $mail->ErrorInfo . "\n";
            file_put_contents(__DIR__ . '/../../uploads/mail_errors.log', $logMsg, FILE_APPEND);
            return false;
        }
    }

    /**
     * DELETE /api.php/applicants/{id}
     * Delete applicant record and associated physical files
     */
    public function delete(array $params): void {
        AuthMiddleware::requireCore();
        $id = (int)$params['id'];

        $db = Database::getConnection();

        // 1. Find and delete physical uploaded files
        $stmtFiles = $db->prepare("SELECT file_path FROM application_files WHERE application_id = ?");
        $stmtFiles->execute([$id]);
        $files = $stmtFiles->fetchAll();

        foreach ($files as $file) {
            $fullPath = __DIR__ . '/../../' . $file['file_path'];
            if (is_file($fullPath)) {
                unlink($fullPath);
            }
        }

        // 2. Delete database entry (cascade foreign key takes care of table dependencies)
        $stmtDel = $db->prepare("DELETE FROM applications WHERE id = ?");
        $stmtDel->execute([$id]);

        Router::sendJson(['message' => 'Applicant deleted successfully']);
    }
}
