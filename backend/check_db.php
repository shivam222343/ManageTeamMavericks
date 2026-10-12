<?php
require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/config/database.php';

$db = App\Database::getConnection();

echo "=== SESSIONS ASSIGNED QUESTIONS ===\n";
$sess = $db->query("SELECT id, test_id, registration_id, status, assigned_question_ids, answers_data FROM mind_saga_test_sessions ORDER BY id DESC LIMIT 5")->fetchAll(PDO::FETCH_ASSOC);
print_r($sess);
