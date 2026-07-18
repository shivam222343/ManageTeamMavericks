<?php
// src/Controllers/FormBuilderController.php
namespace App\Controllers;

use App\Database;
use App\Router;
use App\Middleware\AuthMiddleware;
use PDO;

class FormBuilderController {
    /**
     * GET /api.php/campaigns/{id}/form
     */
    public function getForm(array $params): void {
        AuthMiddleware::authenticate();
        $campaignId = (int)$params['id'];

        $db = Database::getConnection();
        
        // Fetch sections
        $stmtSec = $db->prepare("SELECT * FROM form_sections WHERE campaign_id = ? ORDER BY display_order ASC");
        $stmtSec->execute([$campaignId]);
        $sections = $stmtSec->fetchAll();

        $formStructure = [];
        $stmtFields = $db->prepare("SELECT * FROM form_fields WHERE section_id = ? ORDER BY display_order ASC");
        $stmtOpts = $db->prepare("SELECT * FROM field_options WHERE field_id = ? ORDER BY display_order ASC");

        foreach ($sections as $sec) {
            $stmtFields->execute([$sec['id']]);
            $fields = $stmtFields->fetchAll();
            $fieldsWithOpts = [];

            foreach ($fields as $field) {
                $field['is_required'] = (bool)$field['is_required'];
                $field['is_hidden'] = (bool)$field['is_hidden'];
                $field['validation_rules'] = !empty($field['validation_rules']) ? json_decode($field['validation_rules'], true) : null;
                $field['conditional_visibility'] = !empty($field['conditional_visibility']) ? json_decode($field['conditional_visibility'], true) : null;

                $stmtOpts->execute([$field['id']]);
                $field['options'] = $stmtOpts->fetchAll();

                $fieldsWithOpts[] = $field;
            }

            $sec['is_hidden'] = (bool)$sec['is_hidden'];
            $sec['fields'] = $fieldsWithOpts;
            $formStructure[] = $sec;
        }

        Router::sendJson($formStructure);
    }

    /**
     * PUT /api.php/campaigns/{id}/form
     * Smart sync for sections & fields (retains IDs to preserve application references)
     */
    public function saveForm(array $params): void {
        AuthMiddleware::requireCore();
        $campaignId = (int)$params['id'];
        $input = json_decode(file_get_contents('php://input'), true);
        $sections = $input['sections'] ?? [];

        $db = Database::getConnection();
        $db->beginTransaction();

        try {
            // Keep track of active section and field IDs to delete orphans later
            $activeSectionIds = [];
            $activeFieldIds = [];

            $stmtSecInsert = $db->prepare("INSERT INTO form_sections (campaign_id, name, description, display_order, is_hidden) VALUES (?, ?, ?, ?, ?)");
            $stmtSecUpdate = $db->prepare("UPDATE form_sections SET name = ?, description = ?, display_order = ?, is_hidden = ? WHERE id = ?");

            $stmtFieldInsert = $db->prepare("INSERT INTO form_fields (section_id, label, placeholder, field_type, is_required, description, validation_rules, default_value, help_text, conditional_visibility, display_order, is_hidden) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmtFieldUpdate = $db->prepare("UPDATE form_fields SET section_id = ?, label = ?, placeholder = ?, field_type = ?, is_required = ?, description = ?, validation_rules = ?, default_value = ?, help_text = ?, conditional_visibility = ?, display_order = ?, is_hidden = ? WHERE id = ?");

            $stmtOptDelete = $db->prepare("DELETE FROM field_options WHERE field_id = ?");
            $stmtOptInsert = $db->prepare("INSERT INTO field_options (field_id, option_value, option_label, display_order) VALUES (?, ?, ?, ?)");

            foreach ($sections as $sIdx => $sec) {
                $secId = isset($sec['id']) && !empty($sec['id']) ? (int)$sec['id'] : null;
                $secName = trim($sec['name'] ?? '');
                $secDesc = trim($sec['description'] ?? '');
                $secHidden = $sec['is_hidden'] ?? false;

                if ($secId) {
                    $stmtSecUpdate->execute([$secName, $secDesc, $sIdx, $secHidden, $secId]);
                    $activeSectionIds[] = $secId;
                } else {
                    $stmtSecInsert->execute([$campaignId, $secName, $secDesc, $sIdx, $secHidden]);
                    $secId = (int)$db->lastInsertId();
                    $activeSectionIds[] = $secId;
                }

                $fields = $sec['fields'] ?? [];
                foreach ($fields as $fIdx => $field) {
                    $fieldId = isset($field['id']) && !empty($field['id']) ? (int)$field['id'] : null;
                    $label = trim($field['label'] ?? '');
                    $placeholder = trim($field['placeholder'] ?? '');
                    $fieldType = $field['field_type'] ?? 'text';
                    $isRequired = $field['is_required'] ?? false;
                    $fieldDesc = trim($field['description'] ?? '');
                    $validationRules = isset($field['validation_rules']) ? json_encode($field['validation_rules']) : null;
                    $defaultValue = trim($field['default_value'] ?? '');
                    $helpText = trim($field['help_text'] ?? '');
                    $conditionalVis = isset($field['conditional_visibility']) ? json_encode($field['conditional_visibility']) : null;
                    $fieldHidden = $field['is_hidden'] ?? false;

                    if ($fieldId) {
                        $stmtFieldUpdate->execute([
                            $secId, $label, $placeholder, $fieldType, $isRequired, $fieldDesc, 
                            $validationRules, $defaultValue, $helpText, $conditionalVis, $fIdx, $fieldHidden, $fieldId
                        ]);
                        $activeFieldIds[] = $fieldId;
                    } else {
                        $stmtFieldInsert->execute([
                            $secId, $label, $placeholder, $fieldType, $isRequired, $fieldDesc, 
                            $validationRules, $defaultValue, $helpText, $conditionalVis, $fIdx, $fieldHidden
                        ]);
                        $fieldId = (int)$db->lastInsertId();
                        $activeFieldIds[] = $fieldId;
                    }

                    // Options Sync (safely rebuild options list for dropdown/radio/checkbox)
                    $stmtOptDelete->execute([$fieldId]);
                    $options = $field['options'] ?? [];
                    foreach ($options as $oIdx => $opt) {
                        $optVal = trim($opt['option_value'] ?? '');
                        $optLbl = trim($opt['option_label'] ?? '');
                        if ($optVal !== '') {
                            $stmtOptInsert->execute([$fieldId, $optVal, $optLbl, $oIdx]);
                        }
                    }
                }
            }

            // Remove deleted fields
            if (!empty($activeFieldIds)) {
                // Fetch fields under current campaign sections to delete safely
                $inClauseFields = implode(',', $activeFieldIds);
                $stmtDelFields = $db->prepare("DELETE FROM form_fields WHERE section_id IN (SELECT id FROM form_sections WHERE campaign_id = ?) AND id NOT IN ($inClauseFields)");
                $stmtDelFields->execute([$campaignId]);
            } else {
                $stmtDelFields = $db->prepare("DELETE FROM form_fields WHERE section_id IN (SELECT id FROM form_sections WHERE campaign_id = ?)");
                $stmtDelFields->execute([$campaignId]);
            }

            // Remove deleted sections
            if (!empty($activeSectionIds)) {
                $inClauseSections = implode(',', $activeSectionIds);
                $stmtDelSecs = $db->prepare("DELETE FROM form_sections WHERE campaign_id = ? AND id NOT IN ($inClauseSections)");
                $stmtDelSecs->execute([$campaignId]);
            } else {
                $stmtDelSecs = $db->prepare("DELETE FROM form_sections WHERE campaign_id = ?");
                $stmtDelSecs->execute([$campaignId]);
            }

            \App\Cache::clearAll();
            $db->commit();
            Router::sendJson(['message' => 'Form structure synced successfully']);
        } catch (\Exception $e) {
            $db->rollBack();
            Router::sendJson(['error' => $e->getMessage()], 500);
        }
    }
}
