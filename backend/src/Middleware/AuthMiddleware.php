<?php
// src/Middleware/AuthMiddleware.php
namespace App\Middleware;

use App\Router;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Exception;

class AuthMiddleware {
    /**
     * Authenticate the JWT token and return decoded payload
     */
    public static function authenticate(): array {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

        if (empty($authHeader) && isset($_GET['token'])) {
            $authHeader = 'Bearer ' . $_GET['token'];
        }

        if (empty($authHeader)) {
            Router::sendJson(['error' => 'Authorization token is required'], 401);
        }

        $parts = explode(' ', $authHeader);
        if (count($parts) !== 2 || strtolower($parts[0]) !== 'bearer') {
            Router::sendJson(['error' => 'Invalid Authorization header format'], 401);
        }

        $token = $parts[1];

        try {
            $decoded = JWT::decode($token, new Key(JWT_SECRET, 'HS256'));
            return (array) $decoded;
        } catch (Exception $e) {
            Router::sendJson(['error' => 'Unauthorized: ' . $e->getMessage()], 401);
        }
    }

    /**
     * Check if user has the required roles
     */
    public static function requireRoles(array $allowedRoles): array {
        $user = self::authenticate();
        if (!in_array($user['role'], $allowedRoles)) {
            Router::sendJson(['error' => 'Forbidden: You do not have permission for this action'], 403);
        }
        return $user;
    }

    /**
     * Short hand for coordinator only
     */
    public static function requireCoordinator(): array {
        return self::requireRoles(['coordinator']);
    }

    /**
     * Short hand for coordinator or core member
     */
    public static function requireCore(): array {
        return self::requireRoles(['coordinator', 'core_member']);
    }
}
