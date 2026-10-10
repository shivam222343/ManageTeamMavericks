<?php
// src/Controllers/NotificationController.php
namespace App\Controllers;

use App\Database;
use App\Router;
use App\Middleware\AuthMiddleware;
use PDO;

class NotificationController {
    
    /**
     * Ensure the notifications table exists
     */
    public static function ensureTable(): void {
        try {
            $db = Database::getConnection();
            $db->exec("CREATE TABLE IF NOT EXISTS notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NULL,
                target_role VARCHAR(50) DEFAULT 'all',
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                type VARCHAR(50) NOT NULL DEFAULT 'info',
                link VARCHAR(255) NULL,
                metadata JSON NULL,
                is_read TINYINT(1) NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_user_read (user_id, is_read),
                INDEX idx_target_role (target_role)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        } catch (\Exception $e) {
            // Silently ignore if table already exists
        }
    }

    /**
     * Helper to broadcast notification to Node/WebSocket server
     */
    public static function broadcastSocket(array $payload): void {
        try {
            $wsBroadcastUrl = 'http://127.0.0.1:8085/broadcast';
            $ch = curl_init($wsBroadcastUrl);
            curl_setopt($ch, CURLOPT_POST, 1);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT_MS, 500); // Super fast non-blocking timeout
            curl_setopt($ch, CURLOPT_NOSIGNAL, 1);
            @curl_exec($ch);
            @curl_close($ch);
        } catch (\Exception $e) {
            // Non-critical if socket server isn't running
        }
    }

    /**
     * Static helper for PHP controllers to push a single notification
     */
    public static function pushNotification(
        string $title,
        string $message,
        string $type = 'info',
        ?int $userId = null,
        string $targetRole = 'all',
        ?string $link = null,
        ?array $metadata = null
    ): int {
        self::ensureTable();
        $db = Database::getConnection();

        $metaJson = $metadata ? json_encode($metadata) : null;
        $stmt = $db->prepare("
            INSERT INTO notifications (user_id, target_role, title, message, type, link, metadata, is_read, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW())
        ");
        $stmt->execute([$userId, $targetRole, $title, $message, $type, $link, $metaJson]);
        $newId = (int)$db->lastInsertId();

        $payload = [
            'type' => 'notification',
            'data' => [
                'id' => $newId,
                'user_id' => $userId,
                'target_role' => $targetRole,
                'title' => $title,
                'message' => $message,
                'type' => $type,
                'link' => $link,
                'metadata' => $metadata,
                'is_read' => 0,
                'created_at' => date('c')
            ]
        ];

        self::broadcastSocket($payload);
        return $newId;
    }

    /**
     * Static helper to push notification to multiple user IDs simultaneously
     */
    public static function pushMultiNotifications(
        array $userIds,
        string $title,
        string $message,
        string $type = 'info',
        ?string $link = null,
        ?array $metadata = null
    ): int {
        if (empty($userIds)) return 0;
        self::ensureTable();
        $db = Database::getConnection();

        $metaJson = $metadata ? json_encode($metadata) : null;
        $stmt = $db->prepare("
            INSERT INTO notifications (user_id, target_role, title, message, type, link, metadata, is_read, created_at)
            VALUES (?, 'all', ?, ?, ?, ?, ?, 0, NOW())
        ");

        $sentCount = 0;
        $uniqueIds = array_unique(array_filter(array_map('intval', $userIds)));
        foreach ($uniqueIds as $uId) {
            if ($uId > 0) {
                $stmt->execute([$uId, $title, $message, $type, $link, $metaJson]);
                $sentCount++;
            }
        }

        // Broadcast multi-target payload
        $payload = [
            'type' => 'notification',
            'data' => [
                'id' => time(),
                'user_ids' => array_values($uniqueIds),
                'target_role' => 'all',
                'title' => $title,
                'message' => $message,
                'type' => $type,
                'link' => $link,
                'metadata' => $metadata,
                'is_read' => 0,
                'created_at' => date('c')
            ]
        ];
        self::broadcastSocket($payload);

        return $sentCount;
    }

    /**
     * Resolve User ID by Email if user_id is null on registration
     */
    public static function resolveUserId(?int $userId, ?string $email): ?int {
        if ($userId && $userId > 0) return $userId;
        if (empty($email)) return null;

        try {
            $db = Database::getConnection();
            $stmt = $db->prepare("SELECT id FROM users WHERE email = ? LIMIT 1");
            $stmt->execute([$email]);
            $found = $stmt->fetchColumn();
            return $found ? (int)$found : null;
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Automated Hook: Attendance marked present
     */
    public static function notifyAttendanceMarked(?int $userId, ?string $email, string $fullName, string $eventName, bool $isSubEvent = false, ?string $subEventName = null): void {
        $resolvedId = self::resolveUserId($userId, $email);
        if (!$resolvedId) return;

        $title = $isSubEvent 
            ? "✅ Sub-Event Attendance Verified" 
            : "✅ Attendance Confirmed: {$eventName}";

        $message = $isSubEvent
            ? "Hello {$fullName}, your attendance for '{$subEventName}' is marked PRESENT! Your arena launcher and live access are now active."
            : "Hello {$fullName}, your pass attendance for '{$eventName}' has been successfully verified at the venue gate!";

        self::pushNotification(
            $title,
            $message,
            'attendance',
            $resolvedId,
            'all',
            '/user/dashboard',
            ['event' => $eventName, 'sub_event' => $subEventName, 'status' => 'present']
        );
    }

    /**
     * Automated Hook: Shortlisted / Promoted for round
     */
    public static function notifyCandidateShortlisted(?int $userId, ?string $email, string $fullName, string $roundName, string $subEventName): void {
        $resolvedId = self::resolveUserId($userId, $email);
        if (!$resolvedId) return;

        $title = "🌟 Congratulations! Shortlisted for {$roundName}";
        $message = "Great news {$fullName}! You have qualified and been shortlisted for {$roundName} in '{$subEventName}'. Check your event progression section for key details.";

        self::pushNotification(
            $title,
            $message,
            'mindsaga',
            $resolvedId,
            'all',
            '/user/dashboard',
            ['sub_event' => $subEventName, 'round' => $roundName, 'status' => 'shortlisted']
        );
    }

    /**
     * Automated Hook: Recruitment application status update
     */
    public static function notifyApplicationStatusUpdated(?string $email, string $fullName, string $newStatus): void {
        $resolvedId = self::resolveUserId(null, $email);
        if (!$resolvedId) return;

        $statusTitles = [
            'shortlisted' => '🎉 Application Shortlisted!',
            'interview'   => '🎙️ Interview Scheduled',
            'selected'    => '🏆 Welcome to Team Mavericks!',
            'under_review'=> '📋 Application Under Review'
        ];

        $title = $statusTitles[$newStatus] ?? "Application Status Updated: " . ucfirst(str_replace('_', ' ', $newStatus));
        $message = "Hello {$fullName}, your application status has been updated to '" . ucfirst(str_replace('_', ' ', $newStatus)) . "'. Log in to view details.";

        self::pushNotification(
            $title,
            $message,
            $newStatus === 'shortlisted' ? 'mindsaga' : 'announcement',
            $resolvedId,
            'all',
            '/user/dashboard',
            ['status' => $newStatus]
        );
    }

    /**
     * GET /api.php/notifications
     * Retrieve notifications for the current authenticated user + global broadcasts
     */
    public function list(): void {
        self::ensureTable();
        $db = Database::getConnection();

        $user = AuthMiddleware::optionalAuth();
        $userId = $user['userId'] ?? null;
        $userRole = $user['role'] ?? 'guest';

        // Auto-seed welcome / sample notifications if table is empty
        $countStmt = $db->query("SELECT COUNT(*) FROM notifications");
        if ((int)$countStmt->fetchColumn() === 0) {
            $this->seedInitialNotifications();
        }

        if ($userId) {
            $isStaff = in_array($userRole, ['coordinator', 'core_member', 'member', 'admin']) ? 1 : 0;
            $stmt = $db->prepare("
                SELECT * FROM notifications 
                WHERE (user_id = ? OR user_id IS NULL) 
                  AND (target_role = 'all' OR target_role = ? OR (? = 1 AND target_role = 'staff'))
                ORDER BY created_at DESC 
                LIMIT 60
            ");
            $stmt->execute([$userId, $userRole, $isStaff]);
        } else {
            $stmt = $db->prepare("
                SELECT * FROM notifications 
                WHERE user_id IS NULL AND target_role IN ('all', 'guest')
                ORDER BY created_at DESC 
                LIMIT 30
            ");
            $stmt->execute();
        }

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $unreadCount = 0;
        foreach ($rows as &$item) {
            $item['id'] = (int)$item['id'];
            $item['is_read'] = (int)$item['is_read'];
            if ($item['is_read'] === 0) {
                $unreadCount++;
            }
            if (!empty($item['metadata']) && is_string($item['metadata'])) {
                $item['metadata'] = json_decode($item['metadata'], true);
            }
        }

        Router::sendJson([
            'notifications' => $rows,
            'unread_count'  => $unreadCount,
            'total'         => count($rows)
        ]);
    }

    /**
     * POST /api.php/notifications/mark-read
     * Mark single notification or all as read
     */
    public function markRead(): void {
        self::ensureTable();
        $user = AuthMiddleware::authenticate();
        $userId = $user['userId'];

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $notificationId = $input['id'] ?? null; // null means 'mark all as read'

        $db = Database::getConnection();

        if ($notificationId) {
            $stmt = $db->prepare("UPDATE notifications SET is_read = 1 WHERE id = ? AND (user_id = ? OR user_id IS NULL)");
            $stmt->execute([$notificationId, $userId]);
        } else {
            $stmt = $db->prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ? OR user_id IS NULL");
            $stmt->execute([$userId]);
        }

        Router::sendJson([
            'success' => true,
            'message' => 'Notifications marked as read'
        ]);
    }

    /**
     * GET /api.php/notifications/recipients
     * Fetch user list for admin target selection (with event / search filters)
     */
    public function getRecipients(): void {
        AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $eventId = isset($_GET['event_id']) && !empty($_GET['event_id']) ? (int)$_GET['event_id'] : null;
        $search = trim($_GET['search'] ?? '');

        if ($eventId) {
            // Fetch participants registered for this event + map to user accounts
            $sql = "
                SELECT 
                    er.id as registration_id,
                    er.user_id,
                    er.full_name as name,
                    er.email,
                    er.phone,
                    er.attendance as main_attendance,
                    er.status as reg_status,
                    u.id as account_user_id,
                    u.role as user_role,
                    COALESCE(u.id, er.user_id) as target_user_id,
                    (SELECT COUNT(*) FROM event_registration_sub_events ers WHERE ers.registration_id = er.id) as sub_events_count,
                    (SELECT COUNT(*) FROM event_registration_sub_events ers WHERE ers.registration_id = er.id AND ers.attendance = 1) as sub_attended_count
                FROM event_registrations er
                LEFT JOIN users u ON er.user_id = u.id OR er.email = u.email
                WHERE er.event_id = ? AND er.status != 'cancelled'
            ";
            $params = [$eventId];

            if (!empty($search)) {
                $sql .= " AND (er.full_name LIKE ? OR er.email LIKE ? OR er.phone LIKE ?)";
                $wildcard = "%{$search}%";
                $params[] = $wildcard;
                $params[] = $wildcard;
                $params[] = $wildcard;
            }

            $sql .= " ORDER BY er.attendance DESC, er.full_name ASC LIMIT 200";
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            $recipients = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($recipients as &$r) {
                $r['target_user_id'] = $r['target_user_id'] ? (int)$r['target_user_id'] : null;
                $r['main_attendance'] = (int)($r['main_attendance'] ?? 0);
                $r['sub_events_count'] = (int)($r['sub_events_count'] ?? 0);
                $r['sub_attended_count'] = (int)($r['sub_attended_count'] ?? 0);
            }

            Router::sendJson([
                'event_id' => $eventId,
                'recipients' => $recipients,
                'total' => count($recipients)
            ]);
            return;
        }

        // Global list: fetch all users from users table + registered participants
        $sql = "
            SELECT 
                u.id as target_user_id,
                u.id as account_user_id,
                u.name,
                u.email,
                u.role as user_role,
                NULL as phone,
                0 as main_attendance
            FROM users u
        ";
        $params = [];

        if (!empty($search)) {
            $sql .= " WHERE u.name LIKE ? OR u.email LIKE ?";
            $wildcard = "%{$search}%";
            $params[] = $wildcard;
            $params[] = $wildcard;
        }

        $sql .= " ORDER BY u.role DESC, u.name ASC LIMIT 200";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

        Router::sendJson([
            'recipients' => $users,
            'total' => count($users)
        ]);
    }

    /**
     * POST /api.php/notifications/send
     * Broadcast or targeted notification dispatch (Coordinator / Core Member)
     */
    public function send(): void {
        self::ensureTable();
        $user = AuthMiddleware::authenticate();
        
        $clubRoles = ['coordinator', 'core_member'];
        if (!in_array($user['role'], $clubRoles)) {
            Router::sendJson(['error' => 'Unauthorized. Only coordinators and core members can send notifications.'], 403);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $title = trim($input['title'] ?? '');
        $message = trim($input['message'] ?? '');
        $type = $input['type'] ?? 'announcement'; // 'announcement', 'event', 'attendance', 'mindsaga', 'alert', 'info'
        $target = $input['target'] ?? 'all'; // 'all', 'selected', 'event_all', 'role'
        $targetRole = $input['target_role'] ?? 'all';
        $userId = !empty($input['user_id']) ? (int)$input['user_id'] : null;
        $userIds = !empty($input['user_ids']) && is_array($input['user_ids']) ? $input['user_ids'] : [];
        $eventId = !empty($input['event_id']) ? (int)$input['event_id'] : null;
        $link = !empty($input['link']) ? trim($input['link']) : null;
        $metadata = $input['metadata'] ?? null;

        if (empty($title) || empty($message)) {
            Router::sendJson(['error' => 'Title and message are required.'], 400);
            return;
        }

        $db = Database::getConnection();
        $sentCount = 0;

        // Case 1: Send to Selected Multiple Users
        if ($target === 'selected' || (!empty($userIds) && count($userIds) > 0)) {
            $effectiveUserIds = array_map('intval', $userIds);
            if ($userId && !in_array($userId, $effectiveUserIds)) {
                $effectiveUserIds[] = $userId;
            }
            $sentCount = self::pushMultiNotifications($effectiveUserIds, $title, $message, $type, $link, $metadata);
            Router::sendJson([
                'success' => true,
                'message' => "Notification dispatched successfully to {$sentCount} selected recipient(s).",
                'delivered_to' => $sentCount
            ]);
            return;
        }

        // Case 2: Send to All Users in an Event
        if ($target === 'event_all' && $eventId) {
            $evtStmt = $db->prepare("
                SELECT DISTINCT COALESCE(u.id, er.user_id) as uid
                FROM event_registrations er
                LEFT JOIN users u ON er.user_id = u.id OR er.email = u.email
                WHERE er.event_id = ? AND er.status != 'cancelled'
            ");
            $evtStmt->execute([$eventId]);
            $uids = array_filter($evtStmt->fetchAll(PDO::FETCH_COLUMN));

            if (!empty($uids)) {
                $sentCount = self::pushMultiNotifications($uids, $title, $message, $type, $link, $metadata);
            }

            Router::sendJson([
                'success' => true,
                'message' => "Notification dispatched to all {$sentCount} registered participant(s) for the event.",
                'delivered_to' => $sentCount
            ]);
            return;
        }

        // Case 3: Send to Single User
        if ($userId) {
            self::pushNotification($title, $message, $type, $userId, 'all', $link, $metadata);
            Router::sendJson([
                'success' => true,
                'message' => 'User-specific notification dispatched successfully.',
                'delivered_to' => 1
            ]);
            return;
        }

        // Case 4: Global Broadcast (All users)
        self::pushNotification($title, $message, $type, null, $targetRole, $link, $metadata);
        Router::sendJson([
            'success' => true,
            'message' => 'Global notification broadcasted to all users successfully.',
            'delivered_to' => 'all'
        ]);
    }

    /**
     * POST /api.php/events/{id}/broadcast
     * Event-scoped broadcast handler
     */
    public function broadcastEventNotification(array $params): void {
        $_POST_DATA = json_decode(file_get_contents('php://input'), true) ?? [];
        $_POST_DATA['event_id'] = (int)$params['id'];
        $this->send();
    }

    /**
     * DELETE /api.php/notifications/{id}
     */
    public function delete(int $id): void {
        self::ensureTable();
        $user = AuthMiddleware::authenticate();
        $userId = $user['userId'];

        $db = Database::getConnection();
        $stmt = $db->prepare("DELETE FROM notifications WHERE id = ? AND (user_id = ? OR ? = 'coordinator')");
        $stmt->execute([$id, $userId, $user['role']]);

        Router::sendJson([
            'success' => true,
            'message' => 'Notification deleted'
        ]);
    }

    /**
     * Seed initial notifications
     */
    private function seedInitialNotifications(): void {
        $db = Database::getConnection();
        $initials = [
            [
                'title' => 'Welcome to Team Mavericks Portal',
                'message' => 'Explore active symposiums, track live sub-event progress, and scan your pass QR at venue gates.',
                'type' => 'info',
                'target_role' => 'all',
                'link' => '/user/dashboard'
            ],
            [
                'title' => 'Mind Saga 2026 Live Arena',
                'message' => 'Check your access keys and round qualification status in your registered event dashboard.',
                'type' => 'mindsaga',
                'target_role' => 'all',
                'link' => '/mindsaga'
            ],
            [
                'title' => 'Attendance Check-In Active',
                'message' => 'QR scanner is active for all sub-events. Keep your 3D digital pass ready at the entry desk.',
                'type' => 'attendance',
                'target_role' => 'all',
                'link' => '/user/dashboard'
            ]
        ];

        $stmt = $db->prepare("
            INSERT INTO notifications (title, message, type, target_role, link, is_read, created_at)
            VALUES (?, ?, ?, ?, ?, 0, NOW() - INTERVAL ? MINUTE)
        ");

        foreach ($initials as $idx => $n) {
            $stmt->execute([$n['title'], $n['message'], $n['type'], $n['target_role'], $n['link'], ($idx * 15)]);
        }
    }
}

