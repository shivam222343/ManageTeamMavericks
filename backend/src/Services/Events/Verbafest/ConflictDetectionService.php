<?php
namespace App\Services\Events\Verbafest;

use App\Database;
use PDO;

class ConflictDetectionService {
    private PDO $db;
    private EventSettingsService $settingsService;

    public function __construct(?PDO $db = null, ?EventSettingsService $settingsService = null) {
        $this->db = $db ?? Database::getConnection();
        $this->settingsService = $settingsService ?? new EventSettingsService($this->db);
    }

    /**
     * Check if assigning a participant to a specific schedule slot causes a conflict.
     *
     * @param int $participantId
     * @param int $slotId The requested schedule slot ID
     * @param int|null $ignoreAllocationId Optional allocation ID to ignore (used when updating an allocation)
     * @param int|null $customBufferMinutes Optional override for transition buffer minutes
     * @return array Structured conflict report
     */
    public function checkParticipantConflict(
        int $participantId,
        int $slotId,
        ?int $ignoreAllocationId = null,
        ?int $customBufferMinutes = null
    ): array {
        // Fetch requested slot details
        $stmtSlot = $this->db->prepare("
            SELECT id, slot_code, event_type, start_time, end_time, panel_id, room_id, slot_label
            FROM vf_schedule_slots
            WHERE id = ?
        ");
        $stmtSlot->execute([$slotId]);
        $requestedSlot = $stmtSlot->fetch(PDO::FETCH_ASSOC);

        if (!$requestedSlot) {
            return [
                'has_conflict' => true,
                'conflict_type' => 'invalid_slot',
                'buffer_minutes' => 0,
                'conflicting_event' => null,
                'conflicting_slot' => null,
                'requested_slot' => null,
                'reason' => "Requested slot with ID {$slotId} does not exist."
            ];
        }

        return $this->checkParticipantSlotTimesConflict(
            $participantId,
            $requestedSlot['start_time'],
            $requestedSlot['end_time'],
            $requestedSlot['event_type'],
            $requestedSlot,
            $ignoreAllocationId,
            $customBufferMinutes
        );
    }

    /**
     * Check conflict against given start and end times for a participant.
     */
    public function checkParticipantSlotTimesConflict(
        int $participantId,
        string $startTime,
        string $endTime,
        string $eventType,
        ?array $requestedSlotInfo = null,
        ?int $ignoreAllocationId = null,
        ?int $customBufferMinutes = null
    ): array {
        $bufferMinutes = ($customBufferMinutes !== null)
            ? $customBufferMinutes
            : $this->settingsService->getInt('transition_buffer_minutes', 15);

        $bufferSeconds = $bufferMinutes * 60;
        $reqStart = strtotime($startTime);
        $reqEnd = strtotime($endTime);

        if ($reqStart === false || $reqEnd === false || $reqStart >= $reqEnd) {
            return [
                'has_conflict' => true,
                'conflict_type' => 'invalid_times',
                'buffer_minutes' => $bufferMinutes,
                'conflicting_event' => null,
                'conflicting_slot' => null,
                'requested_slot' => $requestedSlotInfo,
                'reason' => 'Invalid schedule slot times: start_time must precede end_time.'
            ];
        }

        // Fetch all existing allocations for the participant with their slots
        $existingAllocations = $this->getParticipantAllocatedSlots($participantId, $ignoreAllocationId);

        foreach ($existingAllocations as $existing) {
            $existStart = strtotime($existing['start_time']);
            $existEnd = strtotime($existing['end_time']);

            // 1. Direct Overlap Check:
            // Two intervals [A, B] and [C, D] overlap if max(A, C) < min(B, D)
            if (max($reqStart, $existStart) < min($reqEnd, $existEnd)) {
                return [
                    'has_conflict' => true,
                    'conflict_type' => 'overlap',
                    'buffer_minutes' => $bufferMinutes,
                    'conflicting_event' => $existing['event_type'],
                    'conflicting_slot' => [
                        'id' => (int)$existing['slot_id'],
                        'allocation_id' => (int)$existing['allocation_id'],
                        'group_code' => $existing['group_code'],
                        'slot_code' => $existing['slot_code'],
                        'event_type' => $existing['event_type'],
                        'start_time' => $existing['start_time'],
                        'end_time' => $existing['end_time'],
                        'slot_label' => $existing['slot_label']
                    ],
                    'requested_slot' => $requestedSlotInfo ?? [
                        'event_type' => $eventType,
                        'start_time' => $startTime,
                        'end_time' => $endTime
                    ],
                    'reason' => sprintf(
                        "Schedule collision: Requested '%s' slot (%s to %s) overlaps with existing '%s' slot [%s] (%s to %s).",
                        strtoupper($eventType),
                        date('H:i', $reqStart),
                        date('H:i', $reqEnd),
                        strtoupper($existing['event_type']),
                        $existing['slot_code'],
                        date('H:i', $existStart),
                        date('H:i', $existEnd)
                    )
                ];
            }

            // 2. Transition Buffer Check (if bufferMinutes > 0):
            if ($bufferMinutes > 0) {
                // Requested slot starts after existing slot ends
                if ($reqStart >= $existEnd) {
                    $gapSeconds = $reqStart - $existEnd;
                    if ($gapSeconds < $bufferSeconds) {
                        $gapMin = round($gapSeconds / 60);
                        return [
                            'has_conflict' => true,
                            'conflict_type' => 'buffer_violation',
                            'buffer_minutes' => $bufferMinutes,
                            'conflicting_event' => $existing['event_type'],
                            'conflicting_slot' => [
                                'id' => (int)$existing['slot_id'],
                                'allocation_id' => (int)$existing['allocation_id'],
                                'group_code' => $existing['group_code'],
                                'slot_code' => $existing['slot_code'],
                                'event_type' => $existing['event_type'],
                                'start_time' => $existing['start_time'],
                                'end_time' => $existing['end_time'],
                                'slot_label' => $existing['slot_label']
                            ],
                            'requested_slot' => $requestedSlotInfo ?? [
                                'event_type' => $eventType,
                                'start_time' => $startTime,
                                'end_time' => $endTime
                            ],
                            'reason' => sprintf(
                                "Insufficient transition buffer: Participant needs at least %d minutes between activities. Only %d minute(s) between existing '%s' slot (ends %s) and requested '%s' slot (starts %s).",
                                $bufferMinutes,
                                $gapMin,
                                strtoupper($existing['event_type']),
                                date('H:i', $existEnd),
                                strtoupper($eventType),
                                date('H:i', $reqStart)
                            )
                        ];
                    }
                }
                // Requested slot ends before existing slot starts
                elseif ($reqEnd <= $existStart) {
                    $gapSeconds = $existStart - $reqEnd;
                    if ($gapSeconds < $bufferSeconds) {
                        $gapMin = round($gapSeconds / 60);
                        return [
                            'has_conflict' => true,
                            'conflict_type' => 'buffer_violation',
                            'buffer_minutes' => $bufferMinutes,
                            'conflicting_event' => $existing['event_type'],
                            'conflicting_slot' => [
                                'id' => (int)$existing['slot_id'],
                                'allocation_id' => (int)$existing['allocation_id'],
                                'group_code' => $existing['group_code'],
                                'slot_code' => $existing['slot_code'],
                                'event_type' => $existing['event_type'],
                                'start_time' => $existing['start_time'],
                                'end_time' => $existing['end_time'],
                                'slot_label' => $existing['slot_label']
                            ],
                            'requested_slot' => $requestedSlotInfo ?? [
                                'event_type' => $eventType,
                                'start_time' => $startTime,
                                'end_time' => $endTime
                            ],
                            'reason' => sprintf(
                                "Insufficient transition buffer: Participant needs at least %d minutes between activities. Only %d minute(s) between requested '%s' slot (ends %s) and subsequent '%s' slot (starts %s).",
                                $bufferMinutes,
                                $gapMin,
                                strtoupper($eventType),
                                date('H:i', $reqEnd),
                                strtoupper($existing['event_type']),
                                date('H:i', $existStart)
                            )
                        ];
                    }
                }
            }
        }

        return [
            'has_conflict' => false,
            'conflict_type' => 'none',
            'buffer_minutes' => $bufferMinutes,
            'conflicting_event' => null,
            'conflicting_slot' => null,
            'requested_slot' => $requestedSlotInfo ?? [
                'event_type' => $eventType,
                'start_time' => $startTime,
                'end_time' => $endTime
            ],
            'reason' => null
        ];
    }

    /**
     * Fetch all allocated slots for a participant.
     */
    public function getParticipantAllocatedSlots(int $participantId, ?int $ignoreAllocationId = null): array {
        $sql = "
            SELECT 
                ga.id AS allocation_id,
                ga.group_code,
                ga.event_type,
                ga.slot_id,
                ga.panel_id,
                ga.attendance_status,
                s.slot_code,
                s.start_time,
                s.end_time,
                s.slot_label
            FROM vf_group_allocations ga
            JOIN vf_schedule_slots s ON ga.slot_id = s.id
            WHERE ga.participant_id = ?
        ";

        $params = [$participantId];
        if ($ignoreAllocationId !== null) {
            $sql .= " AND ga.id != ?";
            $params[] = $ignoreAllocationId;
        }

        $sql .= " ORDER BY s.start_time ASC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
