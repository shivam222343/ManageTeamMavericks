<?php
namespace App\Controllers\Events\Verbafest;

use App\Database;
use App\Router;
use App\Services\Events\Verbafest\VerbafestAuth;
use PDO;

class RoomController {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    /**
     * GET /events/verbafest/rooms
     * List rooms with optional filters.
     */
    public function list(): void {
        VerbafestAuth::requireUser();

        $where = [];
        $params = [];

        if (!empty($_GET['room_type'])) {
            $where[] = "r.room_type = ?";
            $params[] = trim($_GET['room_type']);
        }

        if (!empty($_GET['search']) || !empty($_GET['q'])) {
            $s = trim($_GET['search'] ?? $_GET['q']);
            $where[] = "(r.room_code LIKE ? OR r.name LIKE ? OR r.location_details LIKE ?)";
            $wildcard = "%{$s}%";
            array_push($params, $wildcard, $wildcard, $wildcard);
        }

        if (isset($_GET['available_only']) && filter_var($_GET['available_only'], FILTER_VALIDATE_BOOLEAN)) {
            $where[] = "r.current_occupancy < r.capacity";
        }

        $whereSql = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";

        $sql = "
            SELECT 
                r.id, r.room_code, r.name, r.room_type, r.capacity, r.current_occupancy, r.location_details, r.created_at,
                (r.capacity - r.current_occupancy) AS available_capacity,
                COUNT(p.id) AS assigned_panel_count
            FROM vf_rooms r
            LEFT JOIN vf_panels p ON p.room_id = r.id
            {$whereSql}
            GROUP BY r.id
            ORDER BY r.room_type ASC, r.room_code ASC
        ";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $rooms = $stmt->fetchAll(PDO::FETCH_ASSOC);

        Router::sendJson(['data' => $rooms]);
    }

    /**
     * GET /events/verbafest/rooms/{id}
     * Get single room details.
     */
    public function get(array $params): void {
        VerbafestAuth::requireUser();
        $id = (int)($params['id'] ?? 0);

        $stmt = $this->db->prepare("SELECT * FROM vf_rooms WHERE id = ?");
        $stmt->execute([$id]);
        $room = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$room) {
            Router::sendJson(['error' => 'Room not found.'], 404);
        }

        // Fetch assigned panels
        $panelStmt = $this->db->prepare("SELECT id, panel_code, event_type, name, status, capacity FROM vf_panels WHERE room_id = ?");
        $panelStmt->execute([$id]);
        $room['panels'] = $panelStmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch schedule slots
        $slotStmt = $this->db->prepare("
            SELECT s.id, s.slot_code, s.event_type, s.start_time, s.end_time, s.slot_label, p.panel_code
            FROM vf_schedule_slots s
            LEFT JOIN vf_panels p ON s.panel_id = p.id
            WHERE s.room_id = ? OR p.room_id = ?
            ORDER BY s.start_time ASC
        ");
        $slotStmt->execute([$id, $id]);
        $room['slots'] = $slotStmt->fetchAll(PDO::FETCH_ASSOC);

        Router::sendJson(['data' => $room]);
    }

    /**
     * POST /events/verbafest/rooms
     * Create a new room.
     */
    public function create(): void {
        VerbafestAuth::requireManager();

        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            Router::sendJson(['error' => 'Invalid JSON payload.'], 400);
        }

        $code = trim($input['room_code'] ?? '');
        $name = trim($input['name'] ?? '');
        $type = trim($input['room_type'] ?? '');
        $capacity = isset($input['capacity']) ? (int)$input['capacity'] : 30;
        $occupancy = isset($input['current_occupancy']) ? (int)$input['current_occupancy'] : 0;
        $location = !empty($input['location_details']) ? trim($input['location_details']) : null;

        $validTypes = ['gd_panel', 'debate_panel', 'mindsaga_lab', 'waiting_room', 'control_room'];

        if (empty($code) || empty($name)) {
            Router::sendJson(['error' => 'room_code and name are required.'], 400);
        }
        if (!in_array($type, $validTypes, true)) {
            Router::sendJson(['error' => 'Invalid room_type. Must be one of: ' . implode(', ', $validTypes)], 400);
        }
        if ($capacity <= 0) {
            Router::sendJson(['error' => 'capacity must be a positive integer.'], 400);
        }
        if ($occupancy < 0 || $occupancy > $capacity) {
            Router::sendJson(['error' => "current_occupancy must be between 0 and room capacity ({$capacity})."], 400);
        }

        $chk = $this->db->prepare("SELECT id FROM vf_rooms WHERE room_code = ?");
        $chk->execute([$code]);
        if ($chk->fetch()) {
            Router::sendJson(['error' => "Room with code '{$code}' already exists."], 409);
        }

        $stmt = $this->db->prepare("
            INSERT INTO vf_rooms (room_code, name, room_type, capacity, current_occupancy, location_details)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$code, $name, $type, $capacity, $occupancy, $location]);
        $newId = (int)$this->db->lastInsertId();

        Router::sendJson([
            'message' => 'Room created successfully.',
            'data' => [
                'id' => $newId,
                'room_code' => $code,
                'name' => $name,
                'room_type' => $type,
                'capacity' => $capacity,
                'current_occupancy' => $occupancy,
                'location_details' => $location
            ]
        ], 201);
    }

    /**
     * PUT /events/verbafest/rooms/{id}
     * Update room details.
     */
    public function update(array $params): void {
        VerbafestAuth::requireManager();
        $id = (int)($params['id'] ?? 0);

        $stmt = $this->db->prepare("SELECT * FROM vf_rooms WHERE id = ?");
        $stmt->execute([$id]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$existing) {
            Router::sendJson(['error' => 'Room not found.'], 404);
        }

        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            Router::sendJson(['error' => 'Invalid JSON payload.'], 400);
        }

        $code = trim($input['room_code'] ?? $existing['room_code']);
        $name = trim($input['name'] ?? $existing['name']);
        $type = trim($input['room_type'] ?? $existing['room_type']);
        $capacity = isset($input['capacity']) ? (int)$input['capacity'] : (int)$existing['capacity'];
        $occupancy = isset($input['current_occupancy']) ? (int)$input['current_occupancy'] : (int)$existing['current_occupancy'];
        $location = array_key_exists('location_details', $input) ? (empty($input['location_details']) ? null : trim($input['location_details'])) : $existing['location_details'];

        $validTypes = ['gd_panel', 'debate_panel', 'mindsaga_lab', 'waiting_room', 'control_room'];

        if (empty($code) || empty($name)) {
            Router::sendJson(['error' => 'room_code and name cannot be empty.'], 400);
        }
        if (!in_array($type, $validTypes, true)) {
            Router::sendJson(['error' => 'Invalid room_type. Must be one of: ' . implode(', ', $validTypes)], 400);
        }
        if ($capacity <= 0) {
            Router::sendJson(['error' => 'capacity must be a positive integer.'], 400);
        }
        if ($occupancy < 0) {
            Router::sendJson(['error' => 'current_occupancy cannot be negative.'], 400);
        }
        if ($occupancy > $capacity) {
            Router::sendJson(['error' => "current_occupancy ({$occupancy}) cannot exceed capacity ({$capacity})."], 400);
        }

        if ($code !== $existing['room_code']) {
            $chk = $this->db->prepare("SELECT id FROM vf_rooms WHERE room_code = ? AND id != ?");
            $chk->execute([$code, $id]);
            if ($chk->fetch()) {
                Router::sendJson(['error' => "Room with code '{$code}' already exists."], 409);
            }
        }

        $upd = $this->db->prepare("
            UPDATE vf_rooms SET
                room_code = ?,
                name = ?,
                room_type = ?,
                capacity = ?,
                current_occupancy = ?,
                location_details = ?
            WHERE id = ?
        ");
        $upd->execute([$code, $name, $type, $capacity, $occupancy, $location, $id]);

        Router::sendJson(['message' => 'Room updated successfully.']);
    }

    /**
     * PATCH /events/verbafest/rooms/{id}/occupancy
     * Update room current occupancy safely.
     */
    public function updateOccupancy(array $params): void {
        VerbafestAuth::requireUser();
        $id = (int)($params['id'] ?? 0);

        $stmt = $this->db->prepare("SELECT id, capacity, current_occupancy FROM vf_rooms WHERE id = ?");
        $stmt->execute([$id]);
        $room = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$room) {
            Router::sendJson(['error' => 'Room not found.'], 404);
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $capacity = (int)$room['capacity'];
        $current = (int)$room['current_occupancy'];

        if (isset($input['current_occupancy'])) {
            $newOccupancy = (int)$input['current_occupancy'];
        } elseif (isset($input['delta'])) {
            $newOccupancy = $current + (int)$input['delta'];
        } else {
            Router::sendJson(['error' => 'Either current_occupancy or delta is required.'], 400);
            return;
        }

        if ($newOccupancy < 0) {
            Router::sendJson(['error' => 'Room occupancy cannot be negative.'], 400);
        }
        if ($newOccupancy > $capacity) {
            Router::sendJson(['error' => "Room occupancy ({$newOccupancy}) exceeds room capacity ({$capacity})."], 400);
        }

        $upd = $this->db->prepare("UPDATE vf_rooms SET current_occupancy = ? WHERE id = ?");
        $upd->execute([$newOccupancy, $id]);

        Router::sendJson([
            'message' => 'Room occupancy updated successfully.',
            'current_occupancy' => $newOccupancy,
            'capacity' => $capacity,
            'available_capacity' => $capacity - $newOccupancy
        ]);
    }

    /**
     * GET /events/verbafest/rooms/{id}/schedule
     * Get complete schedule for a room.
     */
    public function getSchedule(array $params): void {
        VerbafestAuth::requireUser();
        $id = (int)($params['id'] ?? 0);

        $stmt = $this->db->prepare("SELECT * FROM vf_rooms WHERE id = ?");
        $stmt->execute([$id]);
        $room = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$room) {
            Router::sendJson(['error' => 'Room not found.'], 404);
        }

        $sql = "
            SELECT 
                s.id AS slot_id,
                s.slot_code,
                s.event_type,
                s.start_time,
                s.end_time,
                s.slot_label,
                p.id AS panel_id,
                p.panel_code,
                p.name AS panel_name,
                COUNT(ga.id) AS participant_count
            FROM vf_schedule_slots s
            LEFT JOIN vf_panels p ON s.panel_id = p.id
            LEFT JOIN vf_group_allocations ga ON ga.slot_id = s.id
            WHERE s.room_id = ? OR p.room_id = ?
            GROUP BY s.id
            ORDER BY s.start_time ASC
        ";
        $schedStmt = $this->db->prepare($sql);
        $schedStmt->execute([$id, $id]);
        $slots = $schedStmt->fetchAll(PDO::FETCH_ASSOC);

        Router::sendJson([
            'room' => $room,
            'schedule' => $slots
        ]);
    }
}
