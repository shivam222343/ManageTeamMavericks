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
                    PDO::ATTR_PERSISTENT => true,
                ];
                self::$instance = new PDO($dsn, DB_USER, DB_PASS, $options);
                
                // Ensure email logs table exists
                self::$instance->exec("CREATE TABLE IF NOT EXISTS application_email_logs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    application_id INT NOT NULL,
                    sender_id INT NULL,
                    email_type VARCHAR(100) NOT NULL,
                    subject VARCHAR(255) NOT NULL,
                    body_html TEXT NOT NULL,
                    status ENUM('sent', 'failed') NOT NULL DEFAULT 'sent',
                    error_message TEXT NULL,
                    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
                    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
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
