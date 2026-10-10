<?php
require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/config/database.php';

$db = App\Database::getConnection();
echo "--- GAME SESSIONS latest_snapshot column ---\n";
$cols = $db->query("SHOW COLUMNS FROM mind_saga_game_sessions LIKE 'latest_snapshot'")->fetchAll(PDO::FETCH_ASSOC);
print_r($cols);

echo "--- TEST SESSIONS latest_snapshot column ---\n";
$cols2 = $db->query("SHOW COLUMNS FROM mind_saga_test_sessions LIKE 'latest_snapshot'")->fetchAll(PDO::FETCH_ASSOC);
print_r($cols2);
