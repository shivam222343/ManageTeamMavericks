<?php
namespace App\Services\Events\Verbafest;

use App\Database;
use PDO;
use InvalidArgumentException;

class EventSettingsService {
    private PDO $db;

    public function __construct(?PDO $db = null) {
        $this->db = $db ?? Database::getConnection();
    }

    /**
     * Get all event settings.
     * Returns an associative array of key => value and raw rows.
     */
    public function getAll(): array {
        $stmt = $this->db->query("SELECT setting_key, setting_value, description, updated_at FROM vf_event_settings ORDER BY setting_key ASC");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $kv = [];
        foreach ($rows as $row) {
            $kv[$row['setting_key']] = $row['setting_value'];
        }

        return [
            'settings' => $kv,
            'items' => $rows
        ];
    }

    /**
     * Get a single setting by key.
     */
    public function get(string $key, ?string $default = null): ?string {
        $stmt = $this->db->prepare("SELECT setting_value FROM vf_event_settings WHERE setting_key = ?");
        $stmt->execute([$key]);
        $val = $stmt->fetchColumn();
        return ($val !== false) ? (string)$val : $default;
    }

    /**
     * Get an integer setting value with fallback.
     */
    public function getInt(string $key, int $default = 0): int {
        $val = $this->get($key);
        if ($val === null || !is_numeric($val)) {
            return $default;
        }
        return (int)$val;
    }

    /**
     * Set a single setting value.
     */
    public function set(string $key, string $value, ?string $description = null): bool {
        $error = $this->validateSetting($key, $value);
        if ($error !== null) {
            throw new InvalidArgumentException($error);
        }

        if ($description !== null) {
            $stmt = $this->db->prepare("
                INSERT INTO vf_event_settings (setting_key, setting_value, description)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), description = VALUES(description), updated_at = NOW()
            ");
            return $stmt->execute([$key, $value, $description]);
        } else {
            $stmt = $this->db->prepare("
                INSERT INTO vf_event_settings (setting_key, setting_value)
                VALUES (?, ?)
                ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()
            ");
            return $stmt->execute([$key, $value]);
        }
    }

    /**
     * Set multiple settings transactionally.
     */
    public function setMany(array $settings): bool {
        // First validate all settings before mutating database
        foreach ($settings as $key => $value) {
            $error = $this->validateSetting((string)$key, $value);
            if ($error !== null) {
                throw new InvalidArgumentException($error);
            }
        }

        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare("
                INSERT INTO vf_event_settings (setting_key, setting_value)
                VALUES (?, ?)
                ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()
            ");
            foreach ($settings as $key => $value) {
                $stmt->execute([(string)$key, (string)$value]);
            }
            $this->db->commit();
            return true;
        } catch (\Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    /**
     * Validate setting value based on key.
     * Returns null if valid, or an error string if invalid.
     */
    public function validateSetting(string $key, mixed $value): ?string {
        $strValue = trim((string)$value);

        switch ($key) {
            case 'transition_buffer_minutes':
            case 'waiting_room_buffer':
                if (!ctype_digit($strValue) || (int)$strValue < 0) {
                    return "Setting '{$key}' must be a non-negative integer.";
                }
                break;

            case 'gd_duration_minutes':
            case 'debate_duration_minutes':
            case 'mindsaga_duration_minutes':
            case 'gd_panel_count':
            case 'debate_panel_count':
            case 'gd_group_size':
            case 'debate_group_size':
                if (!ctype_digit($strValue) || (int)$strValue <= 0) {
                    return "Setting '{$key}' must be a positive integer greater than 0.";
                }
                break;

            case 'registration_open':
                if (!in_array($strValue, ['0', '1'], true)) {
                    return "Setting 'registration_open' must be '0' or '1'.";
                }
                break;

            case 'event_status':
                $allowed = ['scheduled', 'live', 'paused', 'completed'];
                if (!in_array($strValue, $allowed, true)) {
                    return "Setting 'event_status' must be one of: " . implode(', ', $allowed) . ".";
                }
                break;

            case 'event_date':
                if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $strValue)) {
                    return "Setting 'event_date' must be in YYYY-MM-DD format.";
                }
                break;

            case 'registration_close':
                if (!strtotime($strValue)) {
                    return "Setting 'registration_close' must be a valid datetime string.";
                }
                break;
        }

        return null;
    }
}
