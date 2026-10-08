<?php
// src/Controllers/EventFormController.php
namespace App\Controllers;

use App\Database;
use App\Router;
use App\Middleware\AuthMiddleware;
use PDO;

/**
 * Manages the registration form structure for a specific event.
 * Reuses the exact same form_sections + form_fields + field_options tables
 * that the existing FormBuilderController uses, keyed by event_form_id instead of campaign_id.
 */
class EventFormController {

    /**
     * GET /api.php/events/{id}/registration-form
     * Returns the form metadata + full sections/fields tree for this event
     */
    public function getForm(array $params): void {
        AuthMiddleware::authenticate();
        $eventId = (int)$params['id'];

        $db = Database::getConnection();

        // Verify event exists
        $eventCheck = $db->prepare("SELECT id, name FROM events WHERE id = ?");
        $eventCheck->execute([$eventId]);
        if (!$eventCheck->fetch()) {
            Router::sendJson(['error' => 'Event not found'], 404);
            return;
        }

        // Fetch or create the form record for this event
        $formStmt = $db->prepare("SELECT * FROM event_registration_forms WHERE event_id = ?");
        $formStmt->execute([$eventId]);
        $form = $formStmt->fetch(PDO::FETCH_ASSOC);

        // Build sections tree (same logic as FormBuilderController::getForm)
        $formStructure = [];
        if ($form) {
            $stmtSec = $db->prepare(
                "SELECT * FROM form_sections WHERE event_form_id = ? ORDER BY display_order ASC"
            );
            $stmtSec->execute([$form['id']]);
            $sections = $stmtSec->fetchAll(PDO::FETCH_ASSOC);

            $stmtFields = $db->prepare(
                "SELECT * FROM form_fields WHERE section_id = ? ORDER BY display_order ASC"
            );
            $stmtOpts = $db->prepare(
                "SELECT * FROM field_options WHERE field_id = ? ORDER BY display_order ASC"
            );

            foreach ($sections as $sec) {
                $stmtFields->execute([$sec['id']]);
                $fields = $stmtFields->fetchAll(PDO::FETCH_ASSOC);
                $fieldsWithOpts = [];

                foreach ($fields as $field) {
                    $field['is_required']        = (bool)$field['is_required'];
                    $field['is_hidden']          = (bool)$field['is_hidden'];
                    $field['is_prn_verify_only'] = isset($field['is_prn_verify_only']) ? (bool)$field['is_prn_verify_only'] : false;
                    $field['show_in_analytics']  = isset($field['show_in_analytics']) ? (bool)$field['show_in_analytics'] : true;
                    $field['validation_rules']   = !empty($field['validation_rules']) ? json_decode($field['validation_rules'], true) : null;
                    $field['conditional_visibility'] = !empty($field['conditional_visibility']) ? json_decode($field['conditional_visibility'], true) : null;

                    $stmtOpts->execute([$field['id']]);
                    $field['options'] = $stmtOpts->fetchAll(PDO::FETCH_ASSOC);

                    $fieldsWithOpts[] = $field;
                }

                $sec['is_hidden'] = (bool)$sec['is_hidden'];
                $sec['fields']    = $fieldsWithOpts;
                $formStructure[]  = $sec;
            }
        }

        Router::sendJson([
            'form'     => $form,
            'sections' => $formStructure
        ]);
    }

    /**
     * POST /api.php/events/{id}/registration-form
     * Create a new registration form for an event (idempotent — updates if already exists)
     */
    public function createForm(array $params): void {
        AuthMiddleware::requireCore();
        $eventId = (int)$params['id'];

        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $db = Database::getConnection();

        // Verify event exists
        $eventCheck = $db->prepare("SELECT id, name FROM events WHERE id = ?");
        $eventCheck->execute([$eventId]);
        $event = $eventCheck->fetch(PDO::FETCH_ASSOC);
        if (!$event) {
            Router::sendJson(['error' => 'Event not found'], 404);
            return;
        }

        // Check if form already exists
        $existing = $db->prepare("SELECT id FROM event_registration_forms WHERE event_id = ?");
        $existing->execute([$eventId]);
        $existingForm = $existing->fetch();

        $formName      = trim($input['form_name'] ?? ($event['name'] . ' Registration'));
        $description   = trim($input['description'] ?? '');
        $successMsg    = trim($input['success_message'] ?? 'Thank you for registering! We will be in touch soon.');
        $closedMsg     = trim($input['closed_message'] ?? 'Registration for this event is currently closed.');

        if ($existingForm) {
            // Update existing form metadata
            $stmt = $db->prepare(
                "UPDATE event_registration_forms SET form_name=?, description=?, success_message=?, closed_message=? WHERE event_id=?"
            );
            $stmt->execute([$formName, $description, $successMsg, $closedMsg, $eventId]);
            $formId = $existingForm['id'];
        } else {
            $stmt = $db->prepare(
                "INSERT INTO event_registration_forms (event_id, form_name, description, success_message, closed_message) VALUES (?,?,?,?,?)"
            );
            $stmt->execute([$eventId, $formName, $description, $successMsg, $closedMsg]);
            $formId = (int)$db->lastInsertId();
        }

        $formStmt = $db->prepare("SELECT * FROM event_registration_forms WHERE id = ?");
        $formStmt->execute([$formId]);
        Router::sendJson($formStmt->fetch(PDO::FETCH_ASSOC), 201);
    }

    /**
     * PUT /api.php/events/{id}/registration-form/sections
     * Smart sync of sections + fields (mirrors FormBuilderController::saveForm exactly)
     */
    public function saveFormSections(array $params): void {
        AuthMiddleware::requireCore();
        $eventId = (int)$params['id'];

        $input    = json_decode(file_get_contents('php://input'), true) ?? [];
        $sections = $input['sections'] ?? [];

        $db = Database::getConnection();

        // Get the form for this event
        $formStmt = $db->prepare("SELECT * FROM event_registration_forms WHERE event_id = ?");
        $formStmt->execute([$eventId]);
        $form = $formStmt->fetch(PDO::FETCH_ASSOC);

        if (!$form) {
            Router::sendJson(['error' => 'Registration form not found for this event. Create the form first.'], 404);
            return;
        }

        $formId = (int)$form['id'];

        $db->beginTransaction();
        try {
            $activeSectionIds = [];
            $activeFieldIds   = [];

            $stmtSecInsert = $db->prepare(
                "INSERT INTO form_sections (event_form_id, name, description, display_order, is_hidden) VALUES (?,?,?,?,?)"
            );
            $stmtSecUpdate = $db->prepare(
                "UPDATE form_sections SET name=?, description=?, display_order=?, is_hidden=? WHERE id=?"
            );

            // Ensure is_prn_verify_only column exists
            try {
                $db->exec("ALTER TABLE form_fields ADD COLUMN is_prn_verify_only BOOLEAN NOT NULL DEFAULT FALSE");
            } catch (\Exception $e) { /* already exists */ }

            $stmtFieldInsert = $db->prepare(
                "INSERT INTO form_fields (section_id, label, placeholder, field_type, is_required, description, validation_rules, default_value, help_text, conditional_visibility, display_order, is_hidden, show_in_analytics, is_prn_verify_only)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
            );
            $stmtFieldUpdate = $db->prepare(
                "UPDATE form_fields SET section_id=?, label=?, placeholder=?, field_type=?, is_required=?, description=?, validation_rules=?, default_value=?, help_text=?, conditional_visibility=?, display_order=?, is_hidden=?, show_in_analytics=?, is_prn_verify_only=? WHERE id=?"
            );
            $stmtOptDelete = $db->prepare("DELETE FROM field_options WHERE field_id = ?");
            $stmtOptInsert = $db->prepare(
                "INSERT INTO field_options (field_id, option_value, option_label, display_order) VALUES (?,?,?,?)"
            );

            foreach ($sections as $sIdx => $sec) {
                $secId   = isset($sec['id']) && !empty($sec['id']) ? (int)$sec['id'] : null;
                $secName = trim($sec['name'] ?? '');
                $secDesc = trim($sec['description'] ?? '');
                $secHidden = $sec['is_hidden'] ?? false;

                if ($secId) {
                    $stmtSecUpdate->execute([$secName, $secDesc, $sIdx, $secHidden, $secId]);
                    $activeSectionIds[] = $secId;
                } else {
                    $stmtSecInsert->execute([$formId, $secName, $secDesc, $sIdx, $secHidden]);
                    $secId = (int)$db->lastInsertId();
                    $activeSectionIds[] = $secId;
                }

                $fields = $sec['fields'] ?? [];
                foreach ($fields as $fIdx => $field) {
                    $fieldId = isset($field['id']) && !empty($field['id']) ? (int)$field['id'] : null;
                    $label      = trim($field['label'] ?? '');
                    $placeholder = trim($field['placeholder'] ?? '');
                    $fieldType  = $field['field_type'] ?? 'text';
                    $isRequired = $field['is_required'] ?? false;
                    $fieldDesc  = trim($field['description'] ?? '');
                    $validationRules = isset($field['validation_rules']) ? json_encode($field['validation_rules']) : null;
                    $defaultValue = trim($field['default_value'] ?? '');
                    $helpText   = trim($field['help_text'] ?? '');
                    $conditionalVis = isset($field['conditional_visibility']) ? json_encode($field['conditional_visibility']) : null;
                    $fieldHidden = $field['is_hidden'] ?? false;
                    $showInAnalytics = isset($field['show_in_analytics']) ? ($field['show_in_analytics'] ? 1 : 0) : 1;
                    $isPrnVerifyOnly = isset($field['is_prn_verify_only']) ? ($field['is_prn_verify_only'] ? 1 : 0) : 0;

                    if ($fieldId) {
                        $stmtFieldUpdate->execute([
                            $secId, $label, $placeholder, $fieldType, $isRequired, $fieldDesc,
                            $validationRules, $defaultValue, $helpText, $conditionalVis,
                            $fIdx, $fieldHidden, $showInAnalytics, $isPrnVerifyOnly, $fieldId
                        ]);
                        $activeFieldIds[] = $fieldId;
                    } else {
                        $stmtFieldInsert->execute([
                            $secId, $label, $placeholder, $fieldType, $isRequired, $fieldDesc,
                            $validationRules, $defaultValue, $helpText, $conditionalVis,
                            $fIdx, $fieldHidden, $showInAnalytics, $isPrnVerifyOnly
                        ]);
                        $fieldId = (int)$db->lastInsertId();
                        $activeFieldIds[] = $fieldId;
                    }

                    // Sync options
                    $stmtOptDelete->execute([$fieldId]);
                    foreach (($field['options'] ?? []) as $oIdx => $opt) {
                        $optVal = trim($opt['option_value'] ?? '');
                        $optLbl = trim($opt['option_label'] ?? '');
                        if ($optVal !== '') {
                            $stmtOptInsert->execute([$fieldId, $optVal, $optLbl, $oIdx]);
                        }
                    }
                }
            }

            // Remove orphaned fields
            if (!empty($activeFieldIds)) {
                $inClauseFields = implode(',', array_map('intval', $activeFieldIds));
                $db->prepare(
                    "DELETE FROM form_fields WHERE section_id IN (SELECT id FROM form_sections WHERE event_form_id = ?) AND id NOT IN ($inClauseFields)"
                )->execute([$formId]);
            } else {
                $db->prepare(
                    "DELETE FROM form_fields WHERE section_id IN (SELECT id FROM form_sections WHERE event_form_id = ?)"
                )->execute([$formId]);
            }

            // Remove orphaned sections
            if (!empty($activeSectionIds)) {
                $inClauseSections = implode(',', array_map('intval', $activeSectionIds));
                $db->prepare(
                    "DELETE FROM form_sections WHERE event_form_id = ? AND id NOT IN ($inClauseSections)"
                )->execute([$formId]);
            } else {
                $db->prepare("DELETE FROM form_sections WHERE event_form_id = ?")->execute([$formId]);
            }

            \App\Cache::clearAll();
            $db->commit();
            Router::sendJson(['message' => 'Event registration form saved successfully']);
        } catch (\Exception $e) {
            $db->rollBack();
            Router::sendJson(['error' => $e->getMessage()], 500);
        }
    }
}
