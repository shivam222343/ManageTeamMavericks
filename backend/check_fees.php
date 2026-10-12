<?php
require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/config/database.php';

use App\Database;

$db = Database::getConnection();
echo "--- EVENTS ---\n";
$events = $db->query("SELECT id, name, slug, registration_fee, combo_fee, payment_required FROM events")->fetchAll(PDO::FETCH_ASSOC);
print_r($events);

echo "--- SUB EVENTS ---\n";
$subEvents = $db->query("SELECT id, event_id, name, fee, is_active FROM event_sub_events")->fetchAll(PDO::FETCH_ASSOC);
print_r($subEvents);
