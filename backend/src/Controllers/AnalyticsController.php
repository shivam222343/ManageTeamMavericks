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

        // 7. Dynamic Field Analytics for ALL dynamic questionnaire form fields
        $stmtFields = $db->prepare("SELECT f.id, f.label, f.field_type 
            FROM form_fields f 
            JOIN form_sections s ON f.section_id = s.id 
            WHERE s.campaign_id = ? AND f.field_type NOT IN ('file', 'image', 'resume', 'pdf', 'id_card')
            ORDER BY s.display_order ASC, f.display_order ASC");
        $stmtFields->execute([$campaignId]);
        $formFields = $stmtFields->fetchAll(PDO::FETCH_ASSOC);

        $fieldAnalytics = [];

        foreach ($formFields as $field) {
            $fId = $field['id'];
            $label = $field['label'];
            $fType = $field['field_type'];

            // Skip primary personal details if redundant
            $lblLower = strtolower($label);
            if (in_array($lblLower, ['full name', 'permanent registration number (prn)', 'email address', 'phone number', 'email', 'prn', 'contact number', 'name'])) {
                continue;
            }

            $stmtAns = $db->prepare("SELECT ans.answer_text, COUNT(*) as count 
                FROM application_answers ans 
                JOIN applications a ON ans.application_id = a.id
                WHERE a.campaign_id = ? AND ans.field_id = ? AND ans.answer_text IS NOT NULL AND ans.answer_text != ''
                GROUP BY ans.answer_text");
            $stmtAns->execute([$campaignId, $fId]);
            $rawAnswers = $stmtAns->fetchAll(PDO::FETCH_ASSOC);

            $countsMap = [];
            foreach ($rawAnswers as $ra) {
                $rawText = trim($ra['answer_text']);
                $cnt = (int)$ra['count'];

                $parsed = [];
                if (str_starts_with($rawText, '[') && str_ends_with($rawText, ']')) {
                    $jsonArr = json_decode($rawText, true);
                    if (is_array($jsonArr)) {
                        $parsed = $jsonArr;
                    } else {
                        $parsed = [$rawText];
                    }
                } elseif (str_contains($rawText, ',') && !str_contains($rawText, "\n")) {
                    $parsed = explode(',', $rawText);
                } else {
                    $parsed = [$rawText];
                }

                foreach ($parsed as $item) {
                    $itemClean = trim(str_replace('_', ' ', $item));
                    if (empty($itemClean)) continue;

                    // Clean acronyms or write-ins
                    if (str_starts_with(strtolower($itemClean), 'other:')) {
                        $key = 'Other Write-ins';
                    } else {
                        $key = ucwords(strtolower($itemClean));
                        if (strtolower($key) === 'cse') $key = 'CSE';
                        if (strtolower($key) === 'ece') $key = 'ECE';
                        if (strtolower($key) === 'sy') $key = 'SY (Second Year)';
                        if (strtolower($key) === 'fy') $key = 'FY (First Year)';
                        if (strtolower($key) === 'ty') $key = 'TY (Third Year)';
                    }

                    if (!isset($countsMap[$key])) {
                        $countsMap[$key] = 0;
                    }
                    $countsMap[$key] += $cnt;
                }
            }

            $breakdown = [];
            foreach ($countsMap as $opt => $cnt) {
                $breakdown[] = [
                    'option' => $opt,
                    'count' => $cnt
                ];
            }

            usort($breakdown, fn($a, $b) => $b['count'] <=> $a['count']);

            if (!empty($breakdown)) {
                $fieldAnalytics[] = [
                    'field_id' => $fId,
                    'label' => $label,
                    'field_type' => $fType,
                    'breakdown' => array_slice($breakdown, 0, 10)
                ];
            }
        }

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
            'applicationTrend' => $trend,
            'fieldAnalytics' => $fieldAnalytics
        ]);
    }
}
