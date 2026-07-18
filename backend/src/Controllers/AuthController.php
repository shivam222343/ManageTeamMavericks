<?php
// src/Controllers/AuthController.php
namespace App\Controllers;

use App\Database;
use App\Router;
use App\Middleware\AuthMiddleware;
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

        // Generate JWT
        $issuedAt = time();
        // Set token expiration to 7 days if remember me is checked, otherwise 24 hours
        $expiry = $rememberMe ? ($issuedAt + (7 * 86400)) : ($issuedAt + JWT_EXPIRY);

        $payload = [
            'iss' => 'teammavericks_rms',
            'aud' => 'teammavericks_rms_client',
            'iat' => $issuedAt,
            'nbf' => $issuedAt,
            'exp' => $expiry,
            'userId' => $user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'role' => $user['role']
        ];

        $token = JWT::encode($payload, JWT_SECRET, 'HS256');

        Router::sendJson([
            'message' => 'Login successful',
            'token' => $token,
            'user' => [
                'id' => $user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'role' => $user['role']
            ]
        ]);
    }

    /**
     * GET /api.php/auth/me
     */
    public function me(): void {
        $user = AuthMiddleware::authenticate();
        Router::sendJson([
            'user' => [
                'id' => $user['userId'],
                'name' => $user['name'],
                'email' => $user['email'],
                'role' => $user['role']
            ]
        ]);
    }
}
