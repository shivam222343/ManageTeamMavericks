<?php
// src/Controllers/MemberController.php
namespace App\Controllers;

use App\Database;
use App\Router;
use App\Middleware\AuthMiddleware;
use App\EmailTemplate;
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
use PDO;

class MemberController {

    /**
     * Helper to generate a random readable password
     */
    private function generatePassword($length = 10): string {
        $chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$';
        $password = 'Mav';
        for ($i = 0; $i < $length - 3; $i++) {
            $password .= $chars[random_int(0, strlen($chars) - 1)];
        }
        return $password;
    }

    /**
     * Helper method to send real emails via PHPMailer SMTP
     */
    public function sendMail(string $toEmail, string $toName, string $subject, string $bodyHtml, ?string $buttonText = null, ?string $buttonUrl = null, string $buttonStyle = 'primary'): bool {
        $mail = new PHPMailer(true);
        try {
            $mail->isSMTP();
            $mail->Host       = SMTP_HOST;
            $mail->SMTPAuth   = true;
            $mail->Username   = SMTP_USER;
            $mail->Password   = SMTP_PASS;
            if (SMTP_PORT == 465) {
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
            } else {
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            }
            $mail->Port       = SMTP_PORT;
            $mail->SMTPOptions = [
                'ssl' => [
                    'verify_peer'       => false,
                    'verify_peer_name'  => false,
                    'allow_self_signed' => true,
                ],
            ];

            $mail->setFrom(SMTP_FROM_EMAIL, SMTP_FROM_NAME);
            $mail->addAddress($toEmail, $toName);

            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body    = EmailTemplate::getHtml($subject, $bodyHtml, $buttonText, $buttonUrl, $buttonStyle);

            $mail->send();
            return true;
        } catch (\Exception $e) {
            $logMsg = "[" . date('Y-m-d H:i:s') . "] Failed to send member email to {$toEmail}: " . $mail->ErrorInfo . "\n";
            file_put_contents(__DIR__ . '/../../uploads/mail_errors.log', $logMsg, FILE_APPEND);
            return false;
        }
    }

    /**
     * GET /api.php/members
     */
    public function list(): void {
        AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->query("
            SELECT u.id, u.name, u.email, u.role, u.permissions, u.created_at, u.updated_at,
                   mi.temp_password, mi.status as invitation_status
            FROM users u
            LEFT JOIN member_invitations mi ON u.email = mi.email
            ORDER BY u.id ASC
        ");
        $members = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($members as &$m) {
            if (isset($m['permissions']) && is_string($m['permissions'])) {
                $m['permissions'] = json_decode($m['permissions'], true);
            }
        }

        Router::sendJson($members);
    }

    /**
     * GET /api.php/members/{id}
     */
    public function get(array $params): void {
        $currentUser = AuthMiddleware::authenticate();
        $id = (int)($params['id'] ?? 0);
        $db = Database::getConnection();

        $stmt = $db->prepare("
            SELECT u.id, u.name, u.email, u.role, u.permissions, u.created_at, u.updated_at,
                   mi.temp_password, mi.status as invitation_status
            FROM users u
            LEFT JOIN member_invitations mi ON u.email = mi.email
            WHERE u.id = ?
        ");
        $stmt->execute([$id]);
        $member = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$member) {
            Router::sendJson(['error' => 'Member not found'], 404);
            return;
        }

        if (isset($member['permissions']) && is_string($member['permissions'])) {
            $member['permissions'] = json_decode($member['permissions'], true);
        }

        // Sent email logs are strictly for coordinators
        if ($currentUser['role'] === 'coordinator') {
            $logStmt = $db->prepare("
                SELECT * FROM member_email_logs
                WHERE recipient_email = ?
                ORDER BY sent_at DESC
            ");
            $logStmt->execute([$member['email']]);
            $member['email_logs'] = $logStmt->fetchAll(PDO::FETCH_ASSOC);
        } else {
            $member['email_logs'] = [];
        }

        Router::sendJson($member);
    }

    /**
     * PUT /api.php/members/{id}/role
     * Coordinator only
     */
    public function updateRole(array $params): void {
        AuthMiddleware::authenticate(['coordinator']);
        $id = (int)($params['id'] ?? 0);
        $input = json_decode(file_get_contents('php://input'), true);
        $newRole = $input['role'] ?? '';

        if (!in_array($newRole, ['coordinator', 'core_member', 'member'])) {
            Router::sendJson(['error' => 'Invalid role specified.'], 400);
            return;
        }

        $db = Database::getConnection();
        $stmt = $db->prepare("UPDATE users SET role = ?, updated_at = NOW() WHERE id = ?");
        $stmt->execute([$newRole, $id]);

        // Also update role in invitations if exists
        $invStmt = $db->prepare("UPDATE member_invitations SET role = ? WHERE email = (SELECT email FROM users WHERE id = ?)");
        $invStmt->execute([$newRole, $id]);

        Router::sendJson(['message' => 'Member role updated successfully.']);
    }

    /**
     * POST /api.php/members/invite
     * Coordinator only
     */
    public function invite(): void {
        $user = AuthMiddleware::authenticate(['coordinator']);
        $input = json_decode(file_get_contents('php://input'), true);

        $rawEmails = $input['emails'] ?? '';
        $assignedRole = $input['role'] ?? 'member';

        if (!in_array($assignedRole, ['coordinator', 'core_member', 'member'])) {
            $assignedRole = 'member';
        }

        if (is_string($rawEmails)) {
            $emailList = preg_split('/[\s,;]+/', $rawEmails, -1, PREG_SPLIT_NO_EMPTY);
        } else if (is_array($rawEmails)) {
            $emailList = $rawEmails;
        } else {
            $emailList = [];
        }

        $validEmails = [];
        foreach ($emailList as $e) {
            $e = trim(strtolower($e));
            if (filter_var($e, FILTER_VALIDATE_EMAIL)) {
                $validEmails[] = $e;
            }
        }
        $validEmails = array_unique($validEmails);

        if (empty($validEmails)) {
            Router::sendJson(['error' => 'No valid email addresses provided.'], 400);
            return;
        }

        $db = Database::getConnection();
        $results = [];

        foreach ($validEmails as $email) {
            $tempPassword = $this->generatePassword(10);
            $hash = password_hash($tempPassword, PASSWORD_DEFAULT);

            $emailParts = explode('@', $email);
            $rawName = str_replace(['.', '_', '-'], ' ', $emailParts[0]);
            $derivedName = ucwords($rawName);

            $userStmt = $db->prepare("SELECT id, name FROM users WHERE email = ?");
            $userStmt->execute([$email]);
            $existingUser = $userStmt->fetch(PDO::FETCH_ASSOC);

            if ($existingUser) {
                $upd = $db->prepare("UPDATE users SET password_hash = ?, role = ?, must_change_password = 1, updated_at = NOW() WHERE id = ?");
                $upd->execute([$hash, $assignedRole, $existingUser['id']]);
                $userId = $existingUser['id'];
                $displayName = $existingUser['name'];
            } else {
                $ins = $db->prepare("INSERT INTO users (name, email, password_hash, role, must_change_password) VALUES (?, ?, ?, ?, 1)");
                $ins->execute([$derivedName, $email, $hash, $assignedRole]);
                $userId = $db->lastInsertId();
                $displayName = $derivedName;
            }

            $invStmt = $db->prepare("
                INSERT INTO member_invitations (email, role, temp_password, status, sent_by)
                VALUES (?, ?, ?, 'sent', ?)
                ON DUPLICATE KEY UPDATE role = VALUES(role), temp_password = VALUES(temp_password), status = 'sent', sent_by = VALUES(sent_by), updated_at = NOW()
            ");
            $invStmt->execute([$email, $assignedRole, $tempPassword, $user['userId']]);

            // Dispatch real email via SMTP
            $subject = "Welcome to Team Mavericks - Your Portal Credentials";
            $bodyHtml = "<p style='margin: 0 0 12px 0; font-size: 14px; color: #334155;'>Hello <strong>{$displayName}</strong>,</p><p style='margin: 0 0 12px 0; font-size: 14px; color: #334155;'>You have been invited to join the official Team Mavericks Portal as a <strong>" . strtoupper(str_replace('_', ' ', $assignedRole)) . "</strong>.</p><p style='margin: 0 0 16px 0; font-size: 14px; color: #334155;'>Below are your account login credentials to access the portal:</p><table border='0' cellpadding='10' cellspacing='0' width='100%' style='border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 8px; margin: 16px 0; background-color: #ffffff;'><tr style='background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;'><td width='35%' style='font-weight: bold; color: #475569; font-size: 13px; padding: 12px 16px;'>Login Email:</td><td style='color: #0f172a; font-size: 13px; font-weight: 600; padding: 12px 16px;'>{$email}</td></tr><tr style='background-color: #ffffff;'><td width='35%' style='font-weight: bold; color: #475569; font-size: 13px; padding: 12px 16px;'>Temporary Password:</td><td style='color: #2563eb; font-size: 14px; font-family: monospace; font-weight: 800; padding: 12px 16px;'>{$tempPassword}</td></tr></table><p style='margin: 16px 0 0 0; font-size: 13px; color: #475569;'>Please click the button below to log in. You will be prompted to change your password upon your first sign in.</p>";

            $isSent = $this->sendMail(
                $email,
                $displayName,
                $subject,
                $bodyHtml,
                'Log In to Portal',
                'https://manage.teammavericks.org/login',
                'outline_blue'
            );
            $mailStatus = $isSent ? 'sent' : 'failed';

            $logStmt = $db->prepare("
                INSERT INTO member_email_logs (recipient_email, recipient_name, sender_id, subject, body_html, status)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $logStmt->execute([$email, $displayName, $user['userId'], $subject, $bodyHtml, $mailStatus]);

            $results[] = [
                'email' => $email,
                'name' => $displayName,
                'role' => $assignedRole,
                'temp_password' => $tempPassword,
                'status' => $mailStatus
            ];
        }

        Router::sendJson([
            'message' => 'Invitations processed and emails dispatched.',
            'count' => count($results),
            'invited' => $results
        ]);
    }

    /**
     * GET /api.php/members/invitations
     */
    public function listInvitations(): void {
        AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->query("
            SELECT mi.id, mi.email, mi.role, mi.temp_password, mi.status, mi.created_at, mi.updated_at,
                   u.name as recipient_name, sender.name as sent_by_name
            FROM member_invitations mi
            LEFT JOIN users u ON mi.email = u.email
            LEFT JOIN users sender ON mi.sent_by = sender.id
            ORDER BY mi.created_at DESC
        ");
        $invitations = $stmt->fetchAll(PDO::FETCH_ASSOC);

        Router::sendJson($invitations);
    }

    /**
     * POST /api.php/members/invitations/{id}/resend
     */
    public function resendInvitation(array $params): void {
        $user = AuthMiddleware::authenticate(['coordinator']);
        $id = (int)($params['id'] ?? 0);
        $db = Database::getConnection();

        $stmt = $db->prepare("SELECT * FROM member_invitations WHERE id = ?");
        $stmt->execute([$id]);
        $invitation = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$invitation) {
            Router::sendJson(['error' => 'Invitation record not found'], 404);
            return;
        }

        $email = $invitation['email'];
        $tempPassword = $invitation['temp_password'];
        $assignedRole = $invitation['role'];

        $uStmt = $db->prepare("SELECT name FROM users WHERE email = ?");
        $uStmt->execute([$email]);
        $userData = $uStmt->fetch(PDO::FETCH_ASSOC);
        $displayName = $userData['name'] ?? $email;

        $subject = "Reminder: Team Mavericks Portal Credentials";
        $bodyHtml = "<p style='margin: 0 0 12px 0; font-size: 14px; color: #334155;'>Hello <strong>{$displayName}</strong>,</p><p style='margin: 0 0 12px 0; font-size: 14px; color: #334155;'>Here is a reminder of your account login credentials for the Team Mavericks portal as a <strong>" . strtoupper(str_replace('_', ' ', $assignedRole)) . "</strong>.</p><table border='0' cellpadding='10' cellspacing='0' width='100%' style='border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 8px; margin: 16px 0; background-color: #ffffff;'><tr style='background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;'><td width='35%' style='font-weight: bold; color: #475569; font-size: 13px; padding: 12px 16px;'>Login Email:</td><td style='color: #0f172a; font-size: 13px; font-weight: 600; padding: 12px 16px;'>{$email}</td></tr><tr style='background-color: #ffffff;'><td width='35%' style='font-weight: bold; color: #475569; font-size: 13px; padding: 12px 16px;'>Temporary Password:</td><td style='color: #2563eb; font-size: 14px; font-family: monospace; font-weight: 800; padding: 12px 16px;'>{$tempPassword}</td></tr></table><p style='margin: 16px 0 0 0; font-size: 13px; color: #475569;'>Please click the button below to log in to your account.</p>";

        $isSent = $this->sendMail(
            $email,
            $displayName,
            $subject,
            $bodyHtml,
            'Log In to Portal',
            'https://manage.teammavericks.org/login',
            'outline_blue'
        );
        $mailStatus = $isSent ? 'sent' : 'failed';

        $logStmt = $db->prepare("
            INSERT INTO member_email_logs (recipient_email, recipient_name, sender_id, subject, body_html, status)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $logStmt->execute([$email, $displayName, $user['userId'], $subject, $bodyHtml, $mailStatus]);

        $upd = $db->prepare("UPDATE member_invitations SET updated_at = NOW(), status = ? WHERE id = ?");
        $upd->execute([$mailStatus, $id]);

        Router::sendJson(['message' => 'Invitation email resent successfully.']);
    }

    /**
     * GET /api.php/members/templates
     */
    public function getTemplates(): void {
        AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->query("SELECT * FROM member_templates ORDER BY id ASC");
        $templates = $stmt->fetchAll(PDO::FETCH_ASSOC);

        Router::sendJson($templates);
    }

    /**
     * POST /api.php/members/templates
     */
    public function saveTemplate(): void {
        AuthMiddleware::authenticate(['coordinator', 'core_member']);
        $input = json_decode(file_get_contents('php://input'), true);

        $id = $input['id'] ?? null;
        $name = trim($input['name'] ?? '');
        $subject = trim($input['subject'] ?? '');
        $bodyHtml = trim($input['body_html'] ?? '');

        if (empty($name) || empty($subject) || empty($bodyHtml)) {
            Router::sendJson(['error' => 'Template name, subject, and body are required.'], 400);
            return;
        }

        $db = Database::getConnection();

        if ($id) {
            $stmt = $db->prepare("UPDATE member_templates SET name = ?, subject = ?, body_html = ?, updated_at = NOW() WHERE id = ?");
            $stmt->execute([$name, $subject, $bodyHtml, $id]);
        } else {
            $stmt = $db->prepare("INSERT INTO member_templates (name, subject, body_html) VALUES (?, ?, ?)");
            $stmt->execute([$name, $subject, $bodyHtml]);
            $id = $db->lastInsertId();
        }

        Router::sendJson(['message' => 'Template saved successfully.', 'id' => (int)$id]);
    }

    /**
     * DELETE /api.php/members/templates/{id}
     */
    public function deleteTemplate(array $params): void {
        AuthMiddleware::authenticate(['coordinator', 'core_member']);
        $id = (int)($params['id'] ?? 0);
        $db = Database::getConnection();

        $stmt = $db->prepare("DELETE FROM member_templates WHERE id = ?");
        $stmt->execute([$id]);

        Router::sendJson(['message' => 'Template deleted successfully.']);
    }

    /**
     * POST /api.php/members/communicate
     */
    public function communicate(): void {
        $user = AuthMiddleware::authenticate();
        $input = json_decode(file_get_contents('php://input'), true);

        $recipientEmails = $input['recipient_emails'] ?? [];
        $subject = trim($input['subject'] ?? '');
        $bodyHtml = trim($input['body_html'] ?? '');

        if (empty($recipientEmails) || !is_array($recipientEmails) || empty($subject) || empty($bodyHtml)) {
            Router::sendJson(['error' => 'Recipient emails, subject, and email body are required.'], 400);
            return;
        }

        $db = Database::getConnection();
        $sentCount = 0;

        foreach ($recipientEmails as $email) {
            $email = trim(strtolower($email));
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) continue;

            $uStmt = $db->prepare("SELECT name, role FROM users WHERE email = ?");
            $uStmt->execute([$email]);
            $recUser = $uStmt->fetch(PDO::FETCH_ASSOC);

            $recName = $recUser['name'] ?? $email;
            $recRole = $recUser['role'] ?? 'member';

            $personalizedSubject = str_replace(
                ['{name}', '{email}', '{role}'],
                [$recName, $email, strtoupper(str_replace('_', ' ', $recRole))],
                $subject
            );

            $personalizedBody = str_replace(
                ['{name}', '{email}', '{role}'],
                [$recName, $email, strtoupper(str_replace('_', ' ', $recRole))],
                $bodyHtml
            );

            $isSent = $this->sendMail($email, $recName, $personalizedSubject, $personalizedBody);
            $mailStatus = $isSent ? 'sent' : 'failed';

            $logStmt = $db->prepare("
                INSERT INTO member_email_logs (recipient_email, recipient_name, sender_id, subject, body_html, status)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $logStmt->execute([$email, $recName, $user['userId'], $personalizedSubject, $personalizedBody, $mailStatus]);
            if ($isSent) $sentCount++;
        }

        Router::sendJson([
            'message' => "Successfully dispatched real email to {$sentCount} member(s).",
            'count' => $sentCount
        ]);
    }

    /**
     * GET /api.php/members/permissions
     * Coordinator only
     */
    public function getPermissions(): void {
        AuthMiddleware::authenticate(['coordinator']);
        $db = Database::getConnection();

        $stmt = $db->query("SELECT id, name, email, role, permissions FROM users ORDER BY id ASC");
        $members = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($members as &$m) {
            if (isset($m['permissions']) && is_string($m['permissions'])) {
                $m['permissions'] = json_decode($m['permissions'], true);
            } else {
                $isCoord = ($m['role'] === 'coordinator');
                $m['permissions'] = [
                    'campaigns' => true,
                    'forms' => true,
                    'applicants' => true,
                    'communicate' => $isCoord ? true : false,
                    'analytics' => true
                ];
            }
        }

        Router::sendJson($members);
    }

    /**
     * PUT /api.php/members/{id}/permissions
     * Coordinator only
     */
    public function updatePermissions(array $params): void {
        AuthMiddleware::authenticate(['coordinator']);
        $id = (int)($params['id'] ?? 0);
        $input = json_decode(file_get_contents('php://input'), true);

        $permissions = $input['permissions'] ?? [];
        $jsonPerms = json_encode($permissions);

        $db = Database::getConnection();
        $stmt = $db->prepare("UPDATE users SET permissions = ?, updated_at = NOW() WHERE id = ?");
        $stmt->execute([$jsonPerms, $id]);

        Router::sendJson(['message' => 'Member permissions updated successfully.']);
    }

    /**
     * DELETE /api.php/members/{id}
     * Coordinator only
     */
    public function deleteMember(array $params): void {
        $currentUser = AuthMiddleware::authenticate(['coordinator']);
        $id = (int)($params['id'] ?? 0);

        if ($id === (int)$currentUser['userId']) {
            Router::sendJson(['error' => 'You cannot delete your own coordinator account.'], 400);
            return;
        }

        $db = Database::getConnection();

        $stmt = $db->prepare("SELECT email, name FROM users WHERE id = ?");
        $stmt->execute([$id]);
        $targetUser = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$targetUser) {
            Router::sendJson(['error' => 'Member not found'], 404);
            return;
        }

        $db->prepare("DELETE FROM member_invitations WHERE email = ?")->execute([$targetUser['email']]);
        $db->prepare("DELETE FROM member_email_logs WHERE recipient_email = ?")->execute([$targetUser['email']]);

        $delStmt = $db->prepare("DELETE FROM users WHERE id = ?");
        $delStmt->execute([$id]);

        Router::sendJson(['message' => "Member {$targetUser['name']} deleted successfully."]);
    }
}
