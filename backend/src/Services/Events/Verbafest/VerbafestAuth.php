<?php
namespace App\Services\Events\Verbafest;

use App\Middleware\AuthMiddleware;
use App\Router;

class VerbafestAuth {
    /**
     * Authenticate and authorize a user for Verbafest operations.
     * Allowed roles: coordinator, core_member (or user with 'events_coordinator' / 'verbafest' permission).
     */
    public static function requireManager(): array {
        $user = AuthMiddleware::authenticate();
        $role = $user['role'] ?? '';
        $permissions = $user['permissions'] ?? [];
        if (is_string($permissions)) {
            $permissions = json_decode($permissions, true) ?: [];
        }

        $hasRole = in_array($role, ['coordinator', 'core_member']);
        $hasPerm = !empty($permissions['verbafest']) || !empty($permissions['events_coordinator']);

        if (!$hasRole && !$hasPerm) {
            Router::sendJson([
                'error' => 'Forbidden: You do not have permission to manage VERBAFEST.'
            ], 403);
        }

        return $user;
    }

    /**
     * Authenticate any valid user (e.g. for viewing or volunteer tasks).
     */
    public static function requireUser(): array {
        return AuthMiddleware::authenticate();
    }
}
