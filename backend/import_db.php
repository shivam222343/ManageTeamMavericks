<?php
// import_db.php
require_once __DIR__ . '/config/database.php';

try {
    // Initial connection without selecting database (to create it first if not exists)
    $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ];
    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
    
    echo "Connecting to MySQL server...\n";

    // Read the SQL schema file
    $sqlFile = __DIR__ . '/database.sql';
    if (!file_exists($sqlFile)) {
        die("Error: database.sql not found at: $sqlFile\n");
    }

    $sqlContent = file_get_contents($sqlFile);
    
    // We run the queries
    echo "Importing database schema and seeds...\n";
    $pdo->exec($sqlContent);
    echo "Database initialization completed successfully!\n";

} catch (PDOException $e) {
    echo "Error during import: " . $e->getMessage() . "\n";
    exit(1);
}
