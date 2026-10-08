<?php
// src/Controllers/EventAttendanceController.php
namespace App\Controllers;

use App\Database;
use App\Router;
use App\Middleware\AuthMiddleware;
use PDO;

class EventAttendanceController {

    private static function ensureMigration(): void {
        EventSubEventController::ensureMigration();
    }

    /**
     * GET /api.php/events/{id}/attendance
     * Admin: List main event attendance for all participants
     */
    public function listEventAttendance(array $params): void {
        AuthMiddleware::authenticate();
        self::ensureMigration();
        $eventId = (int)$params['id'];
        $db = Database::getConnection();

        // Get Event details
        $evtStmt = $db->prepare("SELECT id, name, slug, start_date, location, payment_required, registration_fee, combo_fee FROM events WHERE id = ?");
        $evtStmt->execute([$eventId]);
        $event = $evtStmt->fetch(PDO::FETCH_ASSOC);

        if (!$event) {
            Router::sendJson(['error' => 'Event not found'], 404);
            return;
        }

        // Get all registrations with attendance status
        $stmt = $db->prepare("
            SELECT er.id, er.event_id, er.full_name, er.email, er.phone, er.status,
                   er.payment_status, er.payment_amount, er.registration_token,
                   er.attendance, er.attendance_marked_at, er.attendance_marked_by,
                   er.registered_at,
                   u.name as marked_by_name
            FROM event_registrations er
            LEFT JOIN users u ON er.attendance_marked_by = u.id
            WHERE er.event_id = ? AND er.status != 'cancelled'
            ORDER BY er.attendance DESC, er.registered_at ASC
        ");
        $stmt->execute([$eventId]);
        $participants = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch sub-events registered for each participant
        $subStmt = $db->prepare("
            SELECT ers.registration_id, ers.sub_event_id, ers.attendance as sub_attendance,
                   ers.team_name, ers.team_members,
                   es.name as sub_event_name, es.type as sub_event_type, es.fee as sub_event_fee
            FROM event_registration_sub_events ers
            JOIN event_sub_events es ON ers.sub_event_id = es.id
            JOIN event_registrations er ON ers.registration_id = er.id
            WHERE er.event_id = ?
        ");
        $subStmt->execute([$eventId]);
        $allSubRegs = $subStmt->fetchAll(PDO::FETCH_ASSOC);

        $subByReg = [];
        foreach ($allSubRegs as $sr) {
            $regId = $sr['registration_id'];
            if (!isset($subByReg[$regId])) {
                $subByReg[$regId] = [];
            }
            if (is_string($sr['team_members'])) {
                $sr['team_members'] = json_decode($sr['team_members'], true);
            }
            $subByReg[$regId][] = $sr;
        }

        foreach ($participants as &$p) {
            $p['attendance'] = (int)($p['attendance'] ?? 0);
            $p['sub_events'] = $subByReg[$p['id']] ?? [];
        }

        // Fetch event's sub-events list for navigation
        $subListStmt = $db->prepare("SELECT id, name, slug, type, fee FROM event_sub_events WHERE event_id = ? ORDER BY display_order ASC");
        $subListStmt->execute([$eventId]);
        $subEventsList = $subListStmt->fetchAll(PDO::FETCH_ASSOC);

        $totalCount = count($participants);
        $presentCount = count(array_filter($participants, fn($p) => $p['attendance'] == 1));
        $absentCount = $totalCount - $presentCount;

        Router::sendJson([
            'event' => $event,
            'sub_events' => $subEventsList,
            'stats' => [
                'total' => $totalCount,
                'present' => $presentCount,
                'absent' => $absentCount,
                'rate' => $totalCount > 0 ? round(($presentCount / $totalCount) * 100, 1) : 0
            ],
            'participants' => $participants
        ]);
    }

    /**
     * POST /api.php/events/{id}/attendance/mark
     * Admin: Mark main event attendance for a single participant
     */
    public function markEventAttendance(array $params): void {
        $authUser = AuthMiddleware::authenticate();
        self::ensureMigration();
        $eventId = (int)$params['id'];
        $db = Database::getConnection();

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $registrationId = (int)($input['registration_id'] ?? 0);
        $attendance = !empty($input['attendance']) ? 1 : 0;

        if (!$registrationId) {
            Router::sendJson(['error' => 'Registration ID is required'], 400);
            return;
        }

        $checkStmt = $db->prepare("SELECT id, full_name, email FROM event_registrations WHERE id = ? AND event_id = ?");
        $checkStmt->execute([$registrationId, $eventId]);
        $reg = $checkStmt->fetch(PDO::FETCH_ASSOC);

        if (!$reg) {
            Router::sendJson(['error' => 'Registration not found for this event'], 404);
            return;
        }

        $userId = $authUser['userId'] ?? $authUser['sub'] ?? null;

        $db->beginTransaction();
        try {
            if ($attendance === 1) {
                $upd = $db->prepare("
                    UPDATE event_registrations 
                    SET attendance = 1, attendance_marked_at = NOW(), attendance_marked_by = ? 
                    WHERE id = ?
                ");
                $upd->execute([$userId, $registrationId]);

                $updSub = $db->prepare("
                    UPDATE event_registration_sub_events 
                    SET attendance = 1, attendance_marked_at = NOW(), attendance_marked_by = ? 
                    WHERE registration_id = ?
                ");
                $updSub->execute([$userId, $registrationId]);
            } else {
                // If marked absent in main event, also reset sub-event attendance to absent
                $upd = $db->prepare("
                    UPDATE event_registrations 
                    SET attendance = 0, attendance_marked_at = NULL, attendance_marked_by = ? 
                    WHERE id = ?
                ");
                $upd->execute([$userId, $registrationId]);

                $updSub = $db->prepare("
                    UPDATE event_registration_sub_events 
                    SET attendance = 0, attendance_marked_at = NULL, attendance_marked_by = ? 
                    WHERE registration_id = ?
                ");
                $updSub->execute([$userId, $registrationId]);
            }
            $db->commit();

            Router::sendJson([
                'message' => $attendance === 1 ? "Attendance marked PRESENT for {$reg['full_name']}" : "Attendance marked ABSENT for {$reg['full_name']}",
                'registration_id' => $registrationId,
                'attendance' => $attendance
            ]);
        } catch (\Exception $e) {
            $db->rollBack();
            Router::sendJson(['error' => 'Failed to update attendance: ' . $e->getMessage()], 500);
        }
    }

    /**
     * POST /api.php/events/{id}/attendance/bulk-mark
     * Admin: Bulk mark attendance for multiple participants
     */
    public function bulkMarkEventAttendance(array $params): void {
        $authUser = AuthMiddleware::authenticate();
        self::ensureMigration();
        $eventId = (int)$params['id'];
        $db = Database::getConnection();

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $registrationIds = $input['registration_ids'] ?? [];
        $attendance = !empty($input['attendance']) ? 1 : 0;

        if (empty($registrationIds) || !is_array($registrationIds)) {
            Router::sendJson(['error' => 'No participants selected'], 400);
            return;
        }

        $userId = $authUser['userId'] ?? $authUser['sub'] ?? null;
        $inPlaceholders = implode(',', array_fill(0, count($registrationIds), '?'));

        $db->beginTransaction();
        try {
            if ($attendance === 1) {
                $stmt = $db->prepare("
                    UPDATE event_registrations 
                    SET attendance = 1, attendance_marked_at = NOW(), attendance_marked_by = ? 
                    WHERE event_id = ? AND id IN ($inPlaceholders)
                ");
                $stmt->execute(array_merge([$userId, $eventId], $registrationIds));

                $subStmt = $db->prepare("
                    UPDATE event_registration_sub_events 
                    SET attendance = 1, attendance_marked_at = NOW(), attendance_marked_by = ? 
                    WHERE registration_id IN ($inPlaceholders)
                ");
                $subStmt->execute(array_merge([$userId], $registrationIds));
            } else {
                $stmt = $db->prepare("
                    UPDATE event_registrations 
                    SET attendance = 0, attendance_marked_at = NULL, attendance_marked_by = ? 
                    WHERE event_id = ? AND id IN ($inPlaceholders)
                ");
                $stmt->execute(array_merge([$userId, $eventId], $registrationIds));

                $subStmt = $db->prepare("
                    UPDATE event_registration_sub_events 
                    SET attendance = 0, attendance_marked_at = NULL, attendance_marked_by = ? 
                    WHERE registration_id IN ($inPlaceholders)
                ");
                $subStmt->execute(array_merge([$userId], $registrationIds));
            }
            $db->commit();

            Router::sendJson([
                'message' => "Updated attendance for " . count($registrationIds) . " participants",
                'attendance' => $attendance
            ]);
        } catch (\Exception $e) {
            $db->rollBack();
            Router::sendJson(['error' => 'Bulk attendance update failed: ' . $e->getMessage()], 500);
        }
    }

    /**
     * GET /api.php/events/{id}/sub-events/{subEventId}/attendance
     * Admin: List sub-event attendance (with can_mark_present verification)
     */
    public function listSubEventAttendance(array $params): void {
        AuthMiddleware::authenticate();
        self::ensureMigration();
        $eventId = (int)$params['id'];
        $subEventId = (int)$params['subEventId'];
        $db = Database::getConnection();

        // Get Event & Sub-event details
        $evtStmt = $db->prepare("SELECT id, name, slug FROM events WHERE id = ?");
        $evtStmt->execute([$eventId]);
        $event = $evtStmt->fetch(PDO::FETCH_ASSOC);

        $subStmt = $db->prepare("SELECT * FROM event_sub_events WHERE id = ? AND event_id = ?");
        $subStmt->execute([$subEventId, $eventId]);
        $subEvent = $subStmt->fetch(PDO::FETCH_ASSOC);

        if (!$event || !$subEvent) {
            Router::sendJson(['error' => 'Event or Sub-event not found'], 404);
            return;
        }

        $stmt = $db->prepare("
            SELECT ers.id as sub_reg_id, ers.registration_id, ers.sub_event_id,
                   ers.team_name, ers.team_members, ers.fee as sub_event_fee,
                   ers.attendance as sub_attendance, ers.attendance_marked_at as sub_attendance_marked_at,
                   er.full_name, er.email, er.phone, er.registration_token, er.payment_status,
                   er.attendance as main_attendance, er.attendance_marked_at as main_attendance_marked_at,
                   u.name as marked_by_name
            FROM event_registration_sub_events ers
            JOIN event_registrations er ON ers.registration_id = er.id
            LEFT JOIN users u ON ers.attendance_marked_by = u.id
            WHERE ers.sub_event_id = ? AND er.event_id = ? AND er.status != 'cancelled'
            ORDER BY ers.attendance DESC, er.registered_at ASC
        ");
        $stmt->execute([$subEventId, $eventId]);
        $participants = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($participants as &$p) {
            $p['sub_attendance'] = (int)($p['sub_attendance'] ?? 0);
            $p['main_attendance'] = (int)($p['main_attendance'] ?? 0);
            // ONLY allowed to mark present if already marked present in main event!
            $p['can_mark_present'] = ($p['main_attendance'] === 1);
            if (is_string($p['team_members'])) {
                $p['team_members'] = json_decode($p['team_members'], true);
            }
        }

        $totalCount = count($participants);
        $presentCount = count(array_filter($participants, fn($p) => $p['sub_attendance'] == 1));
        $absentCount = $totalCount - $presentCount;
        $mainEligibleCount = count(array_filter($participants, fn($p) => $p['main_attendance'] == 1));

        Router::sendJson([
            'event' => $event,
            'sub_event' => $subEvent,
            'stats' => [
                'total' => $totalCount,
                'present' => $presentCount,
                'absent' => $absentCount,
                'main_eligible' => $mainEligibleCount,
                'rate' => $totalCount > 0 ? round(($presentCount / $totalCount) * 100, 1) : 0
            ],
            'participants' => $participants
        ]);
    }

    /**
     * POST /api.php/events/{id}/sub-events/{subEventId}/attendance/mark
     * Admin: Mark sub-event attendance with Main-Event Present validation
     */
    public function markSubEventAttendance(array $params): void {
        $authUser = AuthMiddleware::authenticate();
        self::ensureMigration();
        $eventId = (int)$params['id'];
        $subEventId = (int)$params['subEventId'];
        $db = Database::getConnection();

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $registrationId = (int)($input['registration_id'] ?? 0);
        $attendance = !empty($input['attendance']) ? 1 : 0;

        if (!$registrationId) {
            Router::sendJson(['error' => 'Registration ID is required'], 400);
            return;
        }

        // Check registration and main event attendance
        $checkStmt = $db->prepare("
            SELECT er.id, er.full_name, er.attendance as main_attendance, es.name as sub_name
            FROM event_registrations er
            JOIN event_registration_sub_events ers ON ers.registration_id = er.id
            JOIN event_sub_events es ON ers.sub_event_id = es.id
            WHERE er.id = ? AND er.event_id = ? AND ers.sub_event_id = ?
        ");
        $checkStmt->execute([$registrationId, $eventId, $subEventId]);
        $record = $checkStmt->fetch(PDO::FETCH_ASSOC);

        if (!$record) {
            Router::sendJson(['error' => 'Participant registration not found for this sub-event'], 404);
            return;
        }

        // CRUCIAL GATING RULE:
        // Must be marked present in main event attendance before marking present in sub-event!
        if ($attendance === 1 && (int)$record['main_attendance'] !== 1) {
            Router::sendJson([
                'error' => "Cannot mark present in '{$record['sub_name']}': Participant must first be marked PRESENT in the main event attendance."
            ], 400);
            return;
        }

        $userId = $authUser['userId'] ?? $authUser['sub'] ?? null;

        $upd = $db->prepare("
            UPDATE event_registration_sub_events 
            SET attendance = ?, 
                attendance_marked_at = IF(? = 1, NOW(), NULL), 
                attendance_marked_by = ? 
            WHERE registration_id = ? AND sub_event_id = ?
        ");
        $upd->execute([$attendance, $attendance, $userId, $registrationId, $subEventId]);

        Router::sendJson([
            'message' => $attendance === 1 
                ? "Sub-event attendance marked PRESENT for {$record['full_name']}" 
                : "Sub-event attendance marked ABSENT for {$record['full_name']}",
            'registration_id' => $registrationId,
            'sub_event_id' => $subEventId,
            'attendance' => $attendance
        ]);
    }

    /**
     * GET /api.php/events/{id}/attendance/qr-code
     * Generate or fetch attendance QR token for Event or Sub-Event
     */
    public function getAttendanceQr(array $params): void {
        AuthMiddleware::authenticate();
        self::ensureMigration();
        $eventId = (int)$params['id'];
        $subEventId = isset($_GET['sub_event_id']) && !empty($_GET['sub_event_id']) ? (int)$_GET['sub_event_id'] : null;
        $db = Database::getConnection();

        $evtStmt = $db->prepare("SELECT id, name, slug FROM events WHERE id = ?");
        $evtStmt->execute([$eventId]);
        $event = $evtStmt->fetch(PDO::FETCH_ASSOC);

        if (!$event) {
            Router::sendJson(['error' => 'Event not found'], 404);
            return;
        }

        $subEvent = null;
        if ($subEventId) {
            $sStmt = $db->prepare("SELECT id, name, type FROM event_sub_events WHERE id = ? AND event_id = ?");
            $sStmt->execute([$subEventId, $eventId]);
            $subEvent = $sStmt->fetch(PDO::FETCH_ASSOC);
            if (!$subEvent) {
                Router::sendJson(['error' => 'Sub-event not found'], 404);
                return;
            }
        }

        // Check if existing token exists
        if ($subEventId) {
            $tokStmt = $db->prepare("SELECT * FROM event_attendance_qr_tokens WHERE event_id = ? AND sub_event_id = ? LIMIT 1");
            $tokStmt->execute([$eventId, $subEventId]);
        } else {
            $tokStmt = $db->prepare("SELECT * FROM event_attendance_qr_tokens WHERE event_id = ? AND sub_event_id IS NULL LIMIT 1");
            $tokStmt->execute([$eventId]);
        }
        $qrRecord = $tokStmt->fetch(PDO::FETCH_ASSOC);

        if (!$qrRecord) {
            $token = 'ATT-' . strtoupper(substr(md5(uniqid((string)$eventId, true)), 0, 16));
            $title = $subEvent ? "{$event['name']} - {$subEvent['name']} Attendance" : "{$event['name']} Main Attendance";
            
            $ins = $db->prepare("
                INSERT INTO event_attendance_qr_tokens (event_id, sub_event_id, token, title)
                VALUES (?, ?, ?, ?)
            ");
            $ins->execute([$eventId, $subEventId, $token, $title]);

            $qrRecord = [
                'token' => $token,
                'title' => $title,
                'event_id' => $eventId,
                'sub_event_id' => $subEventId,
                'created_at' => date('Y-m-d H:i:s')
            ];
        }

        // Construct QR payload JSON string
        $qrPayload = json_encode([
            'type' => 'MAVERICKS_EVENT_ATTENDANCE',
            'token' => $qrRecord['token'],
            'event_id' => $eventId,
            'sub_event_id' => $subEventId,
            'event_name' => $event['name'],
            'sub_event_name' => $subEvent ? $subEvent['name'] : null
        ]);

        Router::sendJson([
            'token' => $qrRecord['token'],
            'title' => $qrRecord['title'],
            'event' => $event,
            'sub_event' => $subEvent,
            'qr_payload' => $qrPayload
        ]);
    }

    /**
     * POST /api.php/events/attendance/scan
     * Participant or Admin scans Attendance QR code
     */
    public function scanAttendance(): void {
        $authUser = AuthMiddleware::authenticate();
        self::ensureMigration();
        $db = Database::getConnection();

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $rawCode = trim($input['qr_code'] ?? $input['token'] ?? '');

        if (empty($rawCode)) {
            Router::sendJson(['error' => 'No QR code or token provided'], 400);
            return;
        }

        // Handle JSON payload or raw token string
        $token = $rawCode;
        if (str_starts_with($rawCode, '{') && str_ends_with($rawCode, '}')) {
            $parsed = json_decode($rawCode, true);
            if (!empty($parsed['token'])) {
                $token = $parsed['token'];
            }
        }

        // Find token record
        $tokStmt = $db->prepare("
            SELECT t.*, e.name as event_name, e.slug as event_slug,
                   es.name as sub_event_name
            FROM event_attendance_qr_tokens t
            JOIN events e ON t.event_id = e.id
            LEFT JOIN event_sub_events es ON t.sub_event_id = es.id
            WHERE t.token = ?
        ");
        $tokStmt->execute([$token]);
        $qrToken = $tokStmt->fetch(PDO::FETCH_ASSOC);

        if (!$qrToken) {
            Router::sendJson(['error' => 'Invalid or expired Attendance QR code'], 400);
            return;
        }

        $eventId = (int)$qrToken['event_id'];
        $subEventId = !empty($qrToken['sub_event_id']) ? (int)$qrToken['sub_event_id'] : null;
        $userId = $authUser['userId'] ?? $authUser['sub'] ?? null;
        $userEmail = $authUser['email'] ?? '';

        // Find participant registration
        $regStmt = $db->prepare("
            SELECT er.* 
            FROM event_registrations er
            WHERE er.event_id = ? AND (er.user_id = ? OR er.email = ?) AND er.status != 'cancelled'
            LIMIT 1
        ");
        $regStmt->execute([$eventId, $userId, $userEmail]);
        $registration = $regStmt->fetch(PDO::FETCH_ASSOC);

        if (!$registration) {
            Router::sendJson([
                'error' => "You are not registered for {$qrToken['event_name']} with account '{$userEmail}'."
            ], 403);
            return;
        }

        // If scanning main event attendance
        if (!$subEventId) {
            if ((int)$registration['attendance'] === 1) {
                Router::sendJson([
                    'already_marked' => true,
                    'message' => "You are already marked present for {$qrToken['event_name']}!",
                    'event_name' => $qrToken['event_name'],
                    'participant_name' => $registration['full_name'],
                    'marked_at' => $registration['attendance_marked_at']
                ]);
                return;
            }

            $db->prepare("
                UPDATE event_registrations 
                SET attendance = 1, attendance_marked_at = NOW(), attendance_marked_by = ? 
                WHERE id = ?
            ")->execute([$userId, $registration['id']]);

            Router::sendJson([
                'success' => true,
                'message' => "Attendance marked PRESENT for {$qrToken['event_name']}!",
                'event_name' => $qrToken['event_name'],
                'participant_name' => $registration['full_name'],
                'timestamp' => date('d M Y, h:i A')
            ]);
            return;
        }

        // If scanning sub-event attendance:
        // 1. Verify participant registered for this sub-event
        $subRegStmt = $db->prepare("
            SELECT ers.* 
            FROM event_registration_sub_events ers
            WHERE ers.registration_id = ? AND ers.sub_event_id = ?
        ");
        $subRegStmt->execute([$registration['id'], $subEventId]);
        $subReg = $subRegStmt->fetch(PDO::FETCH_ASSOC);

        if (!$subReg) {
            Router::sendJson([
                'error' => "You are not registered for the sub-event '{$qrToken['sub_event_name']}'."
            ], 403);
            return;
        }

        // 2. CRUCIAL RULE: Must be marked present in main event attendance first!
        if ((int)$registration['attendance'] !== 1) {
            Router::sendJson([
                'error' => "Cannot mark attendance for '{$qrToken['sub_event_name']}': You must first scan the Main Event Attendance QR or get marked present in the main event by a coordinator."
            ], 400);
            return;
        }

        if ((int)$subReg['attendance'] === 1) {
            Router::sendJson([
                'already_marked' => true,
                'message' => "You are already marked present for {$qrToken['sub_event_name']}!",
                'event_name' => $qrToken['event_name'],
                'sub_event_name' => $qrToken['sub_event_name'],
                'participant_name' => $registration['full_name'],
                'marked_at' => $subReg['attendance_marked_at']
            ]);
            return;
        }

        $db->prepare("
            UPDATE event_registration_sub_events 
            SET attendance = 1, attendance_marked_at = NOW(), attendance_marked_by = ? 
            WHERE id = ?
        ")->execute([$userId, $subReg['id']]);

        Router::sendJson([
            'success' => true,
            'message' => "Sub-event attendance marked PRESENT for {$qrToken['sub_event_name']}!",
            'event_name' => $qrToken['event_name'],
            'sub_event_name' => $qrToken['sub_event_name'],
            'participant_name' => $registration['full_name'],
            'timestamp' => date('d M Y, h:i A')
        ]);
    }
}
