<?php
// src/Controllers/AnalyticsController.php
namespace App\Controllers;

use App\Database;
use App\Router;
use App\Middleware\AuthMiddleware;
use PDO;

class AnalyticsController {
    /**
     * GET /api.php/analytics
     */
    public function getStats(): void {
        AuthMiddleware::authenticate();
        
        $campaignId = isset($_GET['campaign_id']) ? (int)$_GET['campaign_id'] : 1;
        $db = Database::getConnection();

        // 1. Core Summary Metrics
        $stmtTotal = $db->prepare("SELECT COUNT(*) FROM applications WHERE campaign_id = ?");
        $stmtTotal->execute([$campaignId]);
        $total = (int)$stmtTotal->fetchColumn();

        $stmtToday = $db->prepare("SELECT COUNT(*) FROM applications WHERE campaign_id = ? AND DATE(applied_at) = CURRENT_DATE");
        $stmtToday->execute([$campaignId]);
        $today = (int)$stmtToday->fetchColumn();

        $stmtSelected = $db->prepare("SELECT COUNT(*) FROM applications WHERE campaign_id = ? AND status = 'selected'");
        $stmtSelected->execute([$campaignId]);
        $selected = (int)$stmtSelected->fetchColumn();

        $selectionRate = $total > 0 ? round(($selected / $total) * 100, 1) : 0;

        $stmtCampaign = $db->prepare("SELECT deadline, status FROM campaigns WHERE id = ?");
        $stmtCampaign->execute([$campaignId]);
        $camp = $stmtCampaign->fetch();
        $deadline = $camp ? $camp['deadline'] : null;

        // 2. Status Distribution
        $stmtStatus = $db->prepare("SELECT status, COUNT(*) as count FROM applications WHERE campaign_id = ? GROUP BY status");
        $stmtStatus->execute([$campaignId]);
        $statusDb = $stmtStatus->fetchAll();
        $statusDistribution = [
            'applied' => 0, 'under_review' => 0, 'shortlisted' => 0, 
            'interview' => 0, 'selected' => 0, 'rejected' => 0
        ];
        foreach ($statusDb as $s) {
            $statusDistribution[$s['status']] = (int)$s['count'];
        }

        // 3. Department Distribution
        $stmtDept = $db->prepare("SELECT ans.answer_text as dept, COUNT(*) as count 
            FROM application_answers ans 
            JOIN form_fields f ON ans.field_id = f.id 
            JOIN applications a ON ans.application_id = a.id
            WHERE a.campaign_id = ? AND f.label LIKE '%Department%' AND ans.answer_text IS NOT NULL AND ans.answer_text != ''
            GROUP BY ans.answer_text");
        $stmtDept->execute([$campaignId]);
        $depts = $stmtDept->fetchAll();

        // 4. Domains Distribution
        $stmtDom = $db->prepare("SELECT d.name as domain_name, COUNT(ad.application_id) as count 
            FROM domains d 
            LEFT JOIN application_domains ad ON d.id = ad.domain_id 
            WHERE d.campaign_id = ?
            GROUP BY d.id 
            ORDER BY count DESC");
        $stmtDom->execute([$campaignId]);
        $domains = $stmtDom->fetchAll();

        // 5. Gender Ratio
        $stmtGender = $db->prepare("SELECT ans.answer_text as gender, COUNT(*) as count 
            FROM application_answers ans 
            JOIN form_fields f ON ans.field_id = f.id 
            JOIN applications a ON ans.application_id = a.id
            WHERE a.campaign_id = ? AND f.label LIKE '%Gender%' AND ans.answer_text IS NOT NULL AND ans.answer_text != ''
            GROUP BY ans.answer_text");
        $stmtGender->execute([$campaignId]);
        $gender = $stmtGender->fetchAll();

        // 6. Application Daily Trend (Last 15 days)
        $stmtTrend = $db->prepare("SELECT DATE(applied_at) as date, COUNT(*) as count 
            FROM applications 
            WHERE campaign_id = ? AND applied_at >= DATE_SUB(CURRENT_DATE, INTERVAL 15 DAY)
            GROUP BY DATE(applied_at) 
            ORDER BY date ASC");
        $stmtTrend->execute([$campaignId]);
        $trend = $stmtTrend->fetchAll();

        Router::sendJson([
            'summary' => [
                'total_applications' => $total,
                'today_applications' => $today,
                'selection_rate' => $selectionRate,
                'deadline' => $deadline,
                'status' => $camp['status'] ?? 'draft'
            ],
            'statusDistribution' => $statusDistribution,
            'departments' => $depts,
            'domains' => $domains,
            'genderRatio' => $gender,
            'applicationTrend' => $trend
        ]);
    }
}
