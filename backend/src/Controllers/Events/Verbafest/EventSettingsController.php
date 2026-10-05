<?php
namespace App\Controllers\Events\Verbafest;

use App\Database;
use App\Router;
use App\Services\Events\Verbafest\VerbafestAuth;
use App\Services\Events\Verbafest\EventSettingsService;
use InvalidArgumentException;
use PDO;

class EventSettingsController {
    private PDO $db;
    private EventSettingsService $settingsService;

    public function __construct() {
        $this->db = Database::getConnection();
        $this->settingsService = new EventSettingsService($this->db);
    }

    /**
     * GET /events/verbafest/settings
     */
    public function getAll(): void {
        VerbafestAuth::requireUser();
        $res = $this->settingsService->getAll();
        Router::sendJson($res);
    }

    /**
     * GET /events/verbafest/settings/{key}
     */
    public function get(array $params): void {
        VerbafestAuth::requireUser();
        $key = trim($params['key'] ?? '');

        if (empty($key)) {
            Router::sendJson(['error' => 'Setting key is required.'], 400);
        }

        $stmt = $this->db->prepare("SELECT setting_key, setting_value, description, updated_at FROM vf_event_settings WHERE setting_key = ?");
        $stmt->execute([$key]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            Router::sendJson(['error' => "Setting '{$key}' not found."], 404);
        }

        Router::sendJson(['data' => $row]);
    }

    /**
     * PUT /events/verbafest/settings/{key}
     * Update single setting.
     */
    public function update(array $params): void {
        VerbafestAuth::requireManager();
        $key = trim($params['key'] ?? '');

        if (empty($key)) {
            Router::sendJson(['error' => 'Setting key is required.'], 400);
        }

        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input || !isset($input['setting_value'])) {
            Router::sendJson(['error' => 'setting_value is required.'], 400);
        }

        $value = (string)$input['setting_value'];
        $desc = isset($input['description']) ? (string)$input['description'] : null;

        try {
            $this->settingsService->set($key, $value, $desc);
            Router::sendJson([
                'message' => "Setting '{$key}' updated successfully.",
                'key' => $key,
                'value' => $value
            ]);
        } catch (InvalidArgumentException $e) {
            Router::sendJson(['error' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Router::sendJson(['error' => 'Failed to update setting: ' . $e->getMessage()], 500);
        }
    }

    /**
     * PUT /events/verbafest/settings
     * Bulk update settings.
     */
    public function updateAll(): void {
        VerbafestAuth::requireManager();

        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input || empty($input['settings']) || !is_array($input['settings'])) {
            Router::sendJson(['error' => 'Payload must contain a "settings" object mapping keys to values.'], 400);
        }

        $settings = $input['settings'];

        try {
            $this->settingsService->setMany($settings);
            Router::sendJson([
                'message' => 'Settings updated successfully.',
                'updated_keys' => array_keys($settings)
            ]);
        } catch (InvalidArgumentException $e) {
            Router::sendJson(['error' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Router::sendJson(['error' => 'Failed to update settings: ' . $e->getMessage()], 500);
        }
    }
}
