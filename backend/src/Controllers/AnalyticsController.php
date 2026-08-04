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
        try {
            $db->exec("ALTER TABLE form_fields ADD COLUMN show_in_analytics TINYINT(1) NOT NULL DEFAULT 1");
        } catch (\Exception $ex) {}

        $stmtFields = $db->prepare("SELECT f.id, f.label, f.field_type 
            FROM form_fields f 
            JOIN form_sections s ON f.section_id = s.id 
            WHERE s.campaign_id = ? 
              AND (f.show_in_analytics IS NULL OR f.show_in_analytics = 1)
              AND f.field_type NOT IN ('file', 'image', 'resume', 'pdf', 'id_card')
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

            $stmtTotalResp = $db->prepare("SELECT COUNT(DISTINCT ans.application_id) 
                FROM application_answers ans 
                JOIN applications a ON ans.application_id = a.id
                WHERE a.campaign_id = ? AND ans.field_id = ? AND ans.answer_text IS NOT NULL AND ans.answer_text != ''");
            $stmtTotalResp->execute([$campaignId, $fId]);
            $totalRespondents = (int)$stmtTotalResp->fetchColumn();

            // Fetch configured options for this field to accurately map write-ins
            $stmtOpts = $db->prepare("SELECT option_label, option_value FROM field_options WHERE field_id = ? ORDER BY display_order ASC");
            $stmtOpts->execute([$fId]);
            $configuredOpts = $stmtOpts->fetchAll(PDO::FETCH_ASSOC);

            $allowedLabelsMap = [];
            foreach ($configuredOpts as $co) {
                $lbl = trim($co['option_label'] ?? '');
                $val = trim($co['option_value'] ?? '');
                if ($lbl !== '') $allowedLabelsMap[strtolower($lbl)] = $lbl;
                if ($val !== '') $allowedLabelsMap[strtolower($val)] = $lbl ?: $val;
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
                // Only split by JSON array or commas if the field is explicitly a choice group (checkbox / multiselect)
                if (in_array($fType, ['checkbox', 'multiselect'])) {
                    if (str_starts_with($rawText, '[') && str_ends_with($rawText, ']')) {
                        $jsonArr = json_decode($rawText, true);
                        $parsed = is_array($jsonArr) ? $jsonArr : [$rawText];
                    } else if (str_contains($rawText, ',')) {
                        $parsed = explode(',', $rawText);
                    } else {
                        $parsed = [$rawText];
                    }
                } else if (str_starts_with($rawText, '[') && str_ends_with($rawText, ']')) {
                    $jsonArr = json_decode($rawText, true);
                    $parsed = is_array($jsonArr) ? $jsonArr : [$rawText];
                } else {
                    $parsed = [$rawText];
                }

                foreach ($parsed as $item) {
                    $itemClean = trim(str_replace('_', ' ', $item));
                    if (empty($itemClean)) continue;

                    $lowerItem = strtolower($itemClean);
                    if (str_starts_with($lowerItem, 'other:') || $lowerItem === 'other') {
                        $key = 'Other';
                    } elseif (isset($allowedLabelsMap[$lowerItem])) {
                        $key = $allowedLabelsMap[$lowerItem];
                    } else {
                        // Acronyms check
                        if ($lowerItem === 'cse') $key = 'CSE';
                        elseif ($lowerItem === 'ece') $key = 'ECE';
                        elseif ($lowerItem === 'mech') $key = 'Mechanical';
                        elseif ($lowerItem === 'civil') $key = 'Civil';
                        elseif ($lowerItem === 'entc') $key = 'E&TC';
                        elseif ($lowerItem === 'aiml' || $lowerItem === 'ai & ml') $key = 'AIML';
                        elseif ($lowerItem === 'sy') $key = 'SY (Second Year)';
                        elseif ($lowerItem === 'fy') $key = 'FY (First Year)';
                        elseif ($lowerItem === 'ty') $key = 'TY (Third Year)';
                        elseif (strlen($itemClean) > 28 || (str_contains($itemClean, ' ') && count($configuredOpts) > 0)) {
                            // Map unconfigured long write-in sentences to 'Other'
                            $key = 'Other';
                        } else {
                            $key = $itemClean;
                        }
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
                    'total_respondents' => $totalRespondents,
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
