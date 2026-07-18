<?php
// src/Database.php
namespace App;

use PDO;
use PDOException;

class Database {
    private static ?PDO $instance = null;

    /**
     * Get database PDO connection instance
     */
    public static function getConnection(): PDO {
        if (self::$instance === null) {
            try {
                $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
                $options = [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ];
                self::$instance = new PDO($dsn, DB_USER, DB_PASS, $options);
            } catch (PDOException $e) {
                // Return 500 error in JSON format
                Router::sendJson([
                    'error' => 'Database connection failed: ' . $e->getMessage()
                ], 500);
            }
        }
        return self::$instance;
    }
}
