<?php
// src/Controllers/CampaignController.php
namespace App\Controllers;

use App\Database;
use App\Router;
use App\Middleware\AuthMiddleware;
use PDO;

class CampaignController {
    /**
     * GET /api.php/campaigns
     */
    public function list(): void {
        AuthMiddleware::requireCore(); // Admin access
        
        $db = Database::getConnection();
        $stmt = $db->query("SELECT c.*, 
            (SELECT COUNT(*) FROM applications a WHERE a.campaign_id = c.id) as total_applications,
            (SELECT COUNT(*) FROM applications a WHERE a.campaign_id = c.id AND DATE(a.applied_at) = CURRENT_DATE) as today_applications
            FROM campaigns c ORDER BY c.created_at DESC");
        $campaigns = $stmt->fetchAll();

        Router::sendJson($campaigns);
    }

    /**
     * GET /api.php/campaigns/{id}
     */
    public function get(array $params): void {
        AuthMiddleware::authenticate();
        $id = (int)$params['id'];

        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT * FROM campaigns WHERE id = ?");
        $stmt->execute([$id]);
        $campaign = $stmt->fetch();

        if (!$campaign) {
            Router::sendJson(['error' => 'Campaign not found'], 404);
        }

        Router::sendJson($campaign);
    }

    /**
     * POST /api.php/campaigns
     */
    public function create(): void {
        AuthMiddleware::requireCoordinator();
        
        $input = json_decode(file_get_contents('php://input'), true);
        $name = trim($input['name'] ?? '');
        $slug = trim($input['slug'] ?? '');
        $description = trim($input['description'] ?? '');
        $opening_date = $input['opening_date'] ?? null;
        $deadline = $input['deadline'] ?? null;
        $status = $input['status'] ?? 'draft';
        $visibility = $input['visibility'] ?? 'public';
        $max_applications = isset($input['max_applications']) && $input['max_applications'] !== '' ? (int)$input['max_applications'] : null;

        if (empty($name) || empty($slug)) {
            Router::sendJson(['error' => 'Name and slug are required'], 400);
        }

        // Validate slug uniqueness
        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT id FROM campaigns WHERE slug = ?");
        $stmt->execute([$slug]);
        if ($stmt->fetch()) {
            Router::sendJson(['error' => 'Slug already in use'], 400);
        }

        $stmt = $db->prepare("INSERT INTO campaigns (name, slug, description, opening_date, deadline, status, visibility, max_applications, banner_url, logo_url, thank_you_message, closed_message) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $name, 
            $slug, 
            $description, 
            $opening_date, 
            $deadline, 
            $status, 
            $visibility, 
            $max_applications,
            $input['banner_url'] ?? 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200',
            $input['logo_url'] ?? 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=150',
            $input['thank_you_message'] ?? 'Thank you for applying!',
            $input['closed_message'] ?? 'This recruitment is currently closed.'
        ]);
        $campaignId = $db->lastInsertId();

        // Seed default sections
        $sections = [
            ['Personal Details', 'Basic communication and identification info.', 0],
            ['Academic Information', 'College credentials.', 1],
            ['Domain Preference & Portfolio', 'Which team you wish to join.', 2],
            ['Questionnaire', 'Self-evaluation queries.', 3],
            ['Documents Upload', 'Upload verification files.', 4],
            ['Consent & Declaration', 'Acceptance declarations.', 5]
        ];
        $stmtSec = $db->prepare("INSERT INTO form_sections (campaign_id, name, description, display_order) VALUES (?, ?, ?, ?)");
        foreach ($sections as $sec) {
            $stmtSec->execute([$campaignId, $sec[0], $sec[1], $sec[2]]);
        }

        // Seed default templates
        $templates = [
            ['applied', 'Application Received', '<p>Thank you {full_name} for applying. ID: {app_id}</p>'],
            ['shortlisted', 'You have been Shortlisted!', '<p>Dear {full_name}, you have been shortlisted for interviews.</p>'],
            ['interview_scheduled', 'Interview Details', '<p>Dear {full_name}, your interview is scheduled at {interview_datetime}.</p>'],
            ['selected', 'Welcome to Team Mavericks!', '<p>Dear {full_name}, welcome to the club!</p>'],
            ['rejected', 'Application Status Update', '<p>Dear {full_name}, thank you for your time. Unfortunately we cannot proceed.</p>']
        ];
        $stmtTemp = $db->prepare("INSERT INTO email_templates (campaign_id, trigger_event, subject, body_html) VALUES (?, ?, ?, ?)");
        foreach ($templates as $temp) {
            $stmtTemp->execute([$campaignId, $temp[0], $temp[1], $temp[2]]);
        }

        Router::sendJson(['message' => 'Campaign created successfully', 'id' => $campaignId], 201);
    }

    /**
     * PUT /api.php/campaigns/{id}
     */
    public function update(array $params): void {
        AuthMiddleware::requireCoordinator();
        $id = (int)$params['id'];

        $input = json_decode(file_get_contents('php://input'), true);
        $name = trim($input['name'] ?? '');
        $slug = trim($input['slug'] ?? '');
        $description = trim($input['description'] ?? '');
        $opening_date = !empty($input['opening_date']) ? $input['opening_date'] : '2026-01-01 00:00:00';
        $deadline     = !empty($input['deadline'])      ? $input['deadline']      : '2026-12-31 23:59:59';
        $status = $input['status'] ?? 'draft';
        $visibility = $input['visibility'] ?? 'public';
        $max_applications = isset($input['max_applications']) && $input['max_applications'] !== '' ? (int)$input['max_applications'] : null;

        if (empty($name) || empty($slug)) {
            Router::sendJson(['error' => 'Name and slug are required'], 400);
        }

        $db = Database::getConnection();
        // Check slug uniqueness
        $stmt = $db->prepare("SELECT id FROM campaigns WHERE slug = ? AND id != ?");
        $stmt->execute([$slug, $id]);
        if ($stmt->fetch()) {
            Router::sendJson(['error' => 'Slug already in use'], 400);
        }

        $stmt = $db->prepare("UPDATE campaigns SET name = ?, slug = ?, description = ?, opening_date = ?, deadline = ?, status = ?, visibility = ?, max_applications = ?, banner_url = ?, logo_url = ?, thank_you_message = ?, closed_message = ? WHERE id = ?");
        $stmt->execute([
            $name,
            $slug,
            $description,
            $opening_date,
            $deadline,
            $status,
            $visibility,
            $max_applications,
            $input['banner_url'] ?? null,
            $input['logo_url'] ?? null,
            $input['thank_you_message'] ?? null,
            $input['closed_message'] ?? null,
            $id
        ]);

        \App\Cache::clearAll();
        Router::sendJson(['message' => 'Campaign updated successfully']);
    }

    /**
     * PATCH /api.php/campaigns/{id}/status
     * Lightweight status-only update — does not require all campaign fields.
     */
    public function patchStatus(array $params): void {
        AuthMiddleware::requireCoordinator();
        $id = (int)$params['id'];

        $input = json_decode(file_get_contents('php://input'), true);
        $status = trim($input['status'] ?? '');

        $allowed = ['open', 'closed', 'draft'];
        if (!in_array($status, $allowed)) {
            Router::sendJson(['error' => 'Invalid status. Allowed: open, closed, draft'], 400);
        }

        $db = Database::getConnection();
        $stmt = $db->prepare("UPDATE campaigns SET status = ? WHERE id = ?");
        $stmt->execute([$status, $id]);

        // Return updated campaign
        $stmt2 = $db->prepare("SELECT * FROM campaigns WHERE id = ?");
        $stmt2->execute([$id]);
        $campaign = $stmt2->fetch();

        \App\Cache::clearAll();
        Router::sendJson(['message' => 'Status updated', 'campaign' => $campaign]);
    }

    /**
     * DELETE /api.php/campaigns/{id}
     */
    public function delete(array $params): void {
        AuthMiddleware::requireCoordinator();
        $id = (int)$params['id'];

        $db = Database::getConnection();
        $stmt = $db->prepare("DELETE FROM campaigns WHERE id = ?");
        $stmt->execute([$id]);

        Router::sendJson(['message' => 'Campaign deleted successfully']);
    }

    /**
     * GET /api.php/campaigns/public/{slug}
     */
    public function getPublic(array $params): void {
        $slug = trim($params['slug'] ?? '');
        $cacheKey = "campaign_public_" . $slug;
        $cached = \App\Cache::get($cacheKey);
        if ($cached !== null) {
            Router::sendJson($cached);
            return;
        }

        $db = Database::getConnection();

        // 1. Fetch Campaign
        $stmt = $db->prepare("SELECT * FROM campaigns WHERE slug = ?");
        $stmt->execute([$slug]);
        $campaign = $stmt->fetch();

        if (!$campaign) {
            Router::sendJson(['error' => 'Campaign not found'], 404);
        }

        // Draft campaigns are not publicly visible
        if ($campaign['status'] === 'draft') {
            Router::sendJson(['error' => 'Campaign is not published yet'], 403);
        }

        // If closed, return minimal info so frontend shows the closed page
        if ($campaign['status'] === 'closed') {
            $resData = [
                'campaign' => $campaign,
                'domains' => [],
                'formStructure' => []
            ];
            \App\Cache::set($cacheKey, $resData, 300);
            Router::sendJson($resData);
            return;
        }

        // 2. Fetch Domains
        $stmtDom = $db->prepare("SELECT * FROM domains WHERE campaign_id = ? AND status = 'open' ORDER BY display_order ASC");
        $stmtDom->execute([$campaign['id']]);
        $domains = $stmtDom->fetchAll();

        // 3. Fetch Form Sections & Fields
        $stmtSec = $db->prepare("SELECT * FROM form_sections WHERE campaign_id = ? AND is_hidden = 0 ORDER BY display_order ASC");
        $stmtSec->execute([$campaign['id']]);
        $sections = $stmtSec->fetchAll();

        $formStructure = [];
        $stmtFields = $db->prepare("SELECT * FROM form_fields WHERE section_id = ? AND is_hidden = 0 ORDER BY display_order ASC");
        $stmtOpts = $db->prepare("SELECT * FROM field_options WHERE field_id = ? ORDER BY display_order ASC");

        foreach ($sections as $sec) {
            $stmtFields->execute([$sec['id']]);
            $fields = $stmtFields->fetchAll();
            $fieldsWithOpts = [];

            foreach ($fields as $field) {
                $field['validation_rules'] = !empty($field['validation_rules']) ? json_decode($field['validation_rules'], true) : null;
                $field['conditional_visibility'] = !empty($field['conditional_visibility']) ? json_decode($field['conditional_visibility'], true) : null;
                
                // Fetch options if field type supports them
                $stmtOpts->execute([$field['id']]);
                $field['options'] = $stmtOpts->fetchAll();
                
                $fieldsWithOpts[] = $field;
            }

            $sec['fields'] = $fieldsWithOpts;
            $formStructure[] = $sec;
        }

        // 4. Fetch OTP setting (safely — table may not exist yet)
        $otpRequired = 'true';
        try {
            $stmtSet = $db->query("SELECT setting_value FROM settings WHERE setting_key = 'otp_required' LIMIT 1");
            $otpRow = $stmtSet ? $stmtSet->fetch() : null;
            if ($otpRow) $otpRequired = $otpRow['setting_value'];
        } catch (\Throwable $e) {
            // table doesn't exist yet — default to enabled
        }

        $resData = [
            'campaign' => $campaign,
            'domains' => $domains,
            'formStructure' => $formStructure,
            'otp_required' => $otpRequired
        ];
        \App\Cache::set($cacheKey, $resData, 300);
        Router::sendJson($resData);
    }

    /**
     * GET /api.php/campaigns/{id}/domains
     */
    public function getDomains(array $params): void {
        AuthMiddleware::authenticate();
        $campaignId = (int)$params['id'];

        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT * FROM domains WHERE campaign_id = ? ORDER BY display_order ASC");
        $stmt->execute([$campaignId]);
        Router::sendJson($stmt->fetchAll());
    }

    /**
     * POST /api.php/campaigns/{id}/domains
     * Expects full array of domains to batch replace/update
     */
    public function saveDomains(array $params): void {
        AuthMiddleware::requireCore();
        $campaignId = (int)$params['id'];
        $input = json_decode(file_get_contents('php://input'), true);
        $domains = $input['domains'] ?? [];

        $db = Database::getConnection();
        $db->beginTransaction();

        try {
            // Delete existing domains
            $stmtDel = $db->prepare("DELETE FROM domains WHERE campaign_id = ?");
            $stmtDel->execute([$campaignId]);

            // Re-insert
            $stmtIns = $db->prepare("INSERT INTO domains (campaign_id, name, description, color, icon, max_intake, status, display_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            foreach ($domains as $index => $dom) {
                $stmtIns->execute([
                    $campaignId,
                    trim($dom['name']),
                    trim($dom['description'] ?? ''),
                    $dom['color'] ?? '#3B82F6',
                    $dom['icon'] ?? 'Terminal',
                    isset($dom['max_intake']) && $dom['max_intake'] !== '' ? (int)$dom['max_intake'] : null,
                    $dom['status'] ?? 'open',
                    $index
                ]);
            }

            \App\Cache::clearAll();
            $db->commit();
            Router::sendJson(['message' => 'Domains updated successfully']);
        } catch (\Exception $e) {
            $db->rollBack();
            Router::sendJson(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /api.php/campaigns/{id}/email-templates
     */
    public function getEmailTemplates(array $params): void {
        AuthMiddleware::requireCore();
        $campaignId = (int)$params['id'];

        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT * FROM email_templates WHERE campaign_id = ?");
        $stmt->execute([$campaignId]);
        Router::sendJson($stmt->fetchAll());
    }

    /**
     * PUT /api.php/campaigns/{id}/email-templates
     */
    public function saveEmailTemplates(array $params): void {
        AuthMiddleware::requireCoordinator();
        $campaignId = (int)$params['id'];
        $input = json_decode(file_get_contents('php://input'), true);
        $templates = $input['templates'] ?? []; // Array of {trigger_event, subject, body_html}

        $db = Database::getConnection();
        $db->beginTransaction();

        try {
            $stmtUpsert = $db->prepare("INSERT INTO email_templates (campaign_id, trigger_event, subject, body_html) 
                VALUES (?, ?, ?, ?) 
                ON DUPLICATE KEY UPDATE subject = VALUES(subject), body_html = VALUES(body_html)");
            
            foreach ($templates as $temp) {
                $stmtUpsert->execute([
                    $campaignId,
                    $temp['trigger_event'],
                    trim($temp['subject']),
                    trim($temp['body_html'])
                ]);
            }

            $db->commit();
            Router::sendJson(['message' => 'Email templates updated successfully']);
        } catch (\Exception $e) {
            $db->rollBack();
            Router::sendJson(['error' => $e->getMessage()], 500);
        }
    }
}
