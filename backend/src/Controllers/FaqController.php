<?php
// src/Controllers/FaqController.php
namespace App\Controllers;

use App\Database;
use App\Router;
use App\Middleware\AuthMiddleware;
use PDO;

class FaqController {
    /**
     * GET /api.php/campaigns/{id}/faqs
     */
    public function getFaqs(array $params): void {
        $campaignId = (int)$params['id'];
        $db = Database::getConnection();
        
        $stmt = $db->prepare("SELECT * FROM campaign_faqs WHERE campaign_id = ? ORDER BY display_order ASC");
        $stmt->execute([$campaignId]);
        $faqs = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        Router::sendJson($faqs);
    }

    /**
     * PUT /api.php/campaigns/{id}/faqs
     */
    public function saveFaqs(array $params): void {
        AuthMiddleware::requireCore();
        $campaignId = (int)$params['id'];
        
        $input = json_decode(file_get_contents('php://input'), true);
        $faqs = $input['faqs'] ?? [];
        
        $db = Database::getConnection();
        $db->beginTransaction();
        
        try {
            $activeIds = [];
            
            $stmtInsert = $db->prepare("INSERT INTO campaign_faqs (campaign_id, question, answer, display_order) VALUES (?, ?, ?, ?)");
            $stmtUpdate = $db->prepare("UPDATE campaign_faqs SET question = ?, answer = ?, display_order = ? WHERE id = ?");
            
            foreach ($faqs as $idx => $faq) {
                $id = isset($faq['id']) && !empty($faq['id']) ? (int)$faq['id'] : null;
                $question = trim($faq['question'] ?? $faq['q'] ?? '');
                $answer = trim($faq['answer'] ?? $faq['a'] ?? '');
                
                if (empty($question) || empty($answer)) {
                    continue;
                }
                
                if ($id) {
                    $stmtUpdate->execute([$question, $answer, $idx, $id]);
                    $activeIds[] = $id;
                } else {
                    $stmtInsert->execute([$campaignId, $question, $answer, $idx]);
                    $activeIds[] = (int)$db->lastInsertId();
                }
            }
            
            // Delete orphans
            if (!empty($activeIds)) {
                $inClause = implode(',', $activeIds);
                $stmtDel = $db->prepare("DELETE FROM campaign_faqs WHERE campaign_id = ? AND id NOT IN ($inClause)");
                $stmtDel->execute([$campaignId]);
            } else {
                $stmtDel = $db->prepare("DELETE FROM campaign_faqs WHERE campaign_id = ?");
                $stmtDel->execute([$campaignId]);
            }
            
            $db->commit();
            Router::sendJson(['message' => 'FAQs updated successfully']);
        } catch (\Exception $e) {
            $db->rollBack();
            Router::sendJson(['error' => $e->getMessage()], 500);
        }
    }
}
