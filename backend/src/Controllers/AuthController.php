<?php
// src/Controllers/AuthController.php
namespace App\Controllers;

use App\Database;
use App\Router;
use App\Middleware\AuthMiddleware;
use App\Controllers\MemberController;
use Firebase\JWT\JWT;
use PDO;

class AuthController {
    /**
     * POST /api.php/auth/login
     */
    public function login(): void {
        $input = json_decode(file_get_contents('php://input'), true);
        $email = trim($input['email'] ?? '');
        $password = $input['password'] ?? '';
        $rememberMe = $input['rememberMe'] ?? false;

        if (empty($email) || empty($password)) {
            Router::sendJson(['error' => 'Email and password are required'], 400);
        }

        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            Router::sendJson(['error' => 'Invalid email or password'], 401);
        }

        $mustChangePassword = (bool)($user['must_change_password'] ?? false);

        // Generate JWT
        $issuedAt = time();
        $expiry = $rememberMe ? ($issuedAt + (7 * 86400)) : ($issuedAt + JWT_EXPIRY);

        // Parse user permissions
        $userPerms = null;
        if (!empty($user['permissions'])) {
            $userPerms = is_string($user['permissions']) ? json_decode($user['permissions'], true) : $user['permissions'];
        }
        if (!$userPerms || !is_array($userPerms)) {
            $isCoord = ($user['role'] === 'coordinator');
            $userPerms = [
                'campaigns' => true,
                'forms' => true,
                'applicants' => true,
                'communicate' => $isCoord ? true : false,
                'analytics' => true
            ];
        }

        $payload = [
            'iss' => 'teammavericks_rms',
            'aud' => 'teammavericks_rms_client',
            'iat' => $issuedAt,
            'nbf' => $issuedAt,
            'exp' => $expiry,
            'userId' => $user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'role' => $user['role'],
            'mustChangePassword' => $mustChangePassword,
            'permissions' => $userPerms
        ];

        $token = JWT::encode($payload, JWT_SECRET, 'HS256');

        Router::sendJson([
            'message' => 'Login successful',
            'token' => $token,
            'user' => [
                'id' => $user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'role' => $user['role'],
                'mustChangePassword' => $mustChangePassword,
                'permissions' => $userPerms
            ]
        ]);
    }

    /**
     * GET /api.php/auth/me
     */
    public function me(): void {
        $user = AuthMiddleware::authenticate();
        
        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT role, permissions, must_change_password FROM users WHERE id = ?");
        $stmt->execute([$user['userId']]);
        $row = $stmt->fetch();
        
        $mustChange = (bool)($row['must_change_password'] ?? false);
        $role = $row['role'] ?? $user['role'];
        $dbPerms = $row['permissions'] ?? null;

        $userPerms = null;
        if (!empty($dbPerms)) {
            $userPerms = is_string($dbPerms) ? json_decode($dbPerms, true) : $dbPerms;
        }
        if (!$userPerms || !is_array($userPerms)) {
            $isCoord = ($role === 'coordinator');
            $userPerms = [
                'campaigns' => true,
                'forms' => true,
                'applicants' => true,
                'communicate' => $isCoord ? true : false,
                'analytics' => true
            ];
        }

        Router::sendJson([
            'user' => [
                'id' => $user['userId'],
                'name' => $user['name'],
                'email' => $user['email'],
                'role' => $role,
                'mustChangePassword' => $mustChange,
                'permissions' => $userPerms
            ]
        ]);
    }

    /**
     * POST /api.php/auth/forgot-password
     */
    public function forgotPassword(): void {
        $input = json_decode(file_get_contents('php://input'), true);
        $email = trim($input['email'] ?? '');

        if (empty($email)) {
            Router::sendJson(['error' => 'Registered email address is required'], 400);
            return;
        }

        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT id, name FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            Router::sendJson(['message' => 'If your email is registered, a password reset link has been sent.']);
            return;
        }

        $token = bin2hex(random_bytes(16));
        $expiresAt = date('Y-m-d H:i:s', time() + 3600); // 1 hour

        $del = $db->prepare("DELETE FROM password_resets WHERE email = ?");
        $del->execute([$email]);

        $ins = $db->prepare("INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)");
        $ins->execute([$email, $token, $expiresAt]);

        $resetUrl = "https://manage.teammavericks.org/reset-password?token={$token}&email=" . urlencode($email);

        $subject = "Reset Your Password - Team Mavericks";
        $bodyHtml = "
            <p>Hello <strong>{$user['name']}</strong>,</p>
            <p>We received a request to reset your password for your Team Mavericks account.</p>
            <p>Please click the button below to set a new password for your account. This reset link is valid for <strong>1 hour</strong>.</p>
            <p style='color: #64748b; font-size: 12px; margin-top: 16px;'>If you did not request a password reset, you can safely ignore this email.</p>
        ";

        $memberController = new MemberController();
        $memberController->sendMail(
            $email,
            $user['name'],
            $subject,
            $bodyHtml,
            'Reset Password',
            $resetUrl,
            'outline_blue'
        );

        Router::sendJson(['message' => 'If your email is registered, a password reset link has been sent.']);
    }

    /**
     * POST /api.php/auth/reset-password
     */
    public function resetPassword(): void {
        $input = json_decode(file_get_contents('php://input'), true);
        $email = trim($input['email'] ?? '');
        $token = trim($input['token'] ?? '');
        $newPassword = $input['newPassword'] ?? '';

        if (empty($email) || empty($token) || empty($newPassword)) {
            Router::sendJson(['error' => 'Email, token, and new password are required'], 400);
            return;
        }

        if (strlen($newPassword) < 6) {
            Router::sendJson(['error' => 'Password must be at least 6 characters long'], 400);
            return;
        }

        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT * FROM password_resets WHERE email = ? AND token = ? AND expires_at > NOW()");
        $stmt->execute([$email, $token]);
        $resetRecord = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$resetRecord) {
            Router::sendJson(['error' => 'Invalid or expired password reset link'], 400);
            return;
        }

        $hash = password_hash($newPassword, PASSWORD_BCRYPT);
        $upd = $db->prepare("UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = NOW() WHERE email = ?");
        $upd->execute([$hash, $email]);

        $del = $db->prepare("DELETE FROM password_resets WHERE email = ?");
        $del->execute([$email]);

        Router::sendJson(['message' => 'Password has been reset successfully. You can now log in.']);
    }

    /**
     * POST /api.php/auth/change-password
     * Authenticated
     */
    public function changePassword(): void {
        $authUser = AuthMiddleware::authenticate();
        $input = json_decode(file_get_contents('php://input'), true);
        $currentPassword = $input['currentPassword'] ?? '';
        $newPassword = $input['newPassword'] ?? '';

        if (empty($newPassword) || strlen($newPassword) < 6) {
            Router::sendJson(['error' => 'New password must be at least 6 characters long'], 400);
            return;
        }

        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT password_hash, must_change_password FROM users WHERE id = ?");
        $stmt->execute([$authUser['userId']]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            Router::sendJson(['error' => 'User not found'], 404);
            return;
        }

        // If must_change_password is true, currentPassword is optional; otherwise verify current password
        $mustChange = (bool)$user['must_change_password'];
        if (!$mustChange && !empty($currentPassword) && !password_verify($currentPassword, $user['password_hash'])) {
            Router::sendJson(['error' => 'Current password is incorrect'], 400);
            return;
        }

        $hash = password_hash($newPassword, PASSWORD_BCRYPT);
        $upd = $db->prepare("UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = NOW() WHERE id = ?");
        $upd->execute([$hash, $authUser['userId']]);

        Router::sendJson(['message' => 'Password updated successfully.']);
    }
}
