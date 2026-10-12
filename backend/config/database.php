<?php
// config/database.php

// --- Helper to load .env file if it exists ---
$envPath = null;
if (file_exists(__DIR__ . '/../.env')) {
    $envPath = __DIR__ . '/../.env';
} elseif (file_exists(__DIR__ . '/.env')) {
    $envPath = __DIR__ . '/.env';
}

if ($envPath) {
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if (empty($line) || str_starts_with($line, '#')) {
            continue;
        }
        if (str_contains($line, '=')) {
            [$key, $value] = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            // Strip matching surrounding quotes if present
            if ((str_starts_with($value, '"') && str_ends_with($value, '"')) ||
                (str_starts_with($value, "'") && str_ends_with($value, "'"))) {
                $value = substr($value, 1, -1);
            }
            if (getenv($key) === false && !isset($_ENV[$key])) {
                putenv("{$key}={$value}");
                $_ENV[$key] = $value;
                $_SERVER[$key] = $value;
            }
        }
    }
}

// Helper to fetch env value with fallback
$env = function(string $key, string $default = ''): string {
    $val = $_ENV[$key] ?? $_SERVER[$key] ?? getenv($key);
    return ($val !== false && $val !== null && $val !== '') ? (string)$val : $default;
};

// Database Configuration
define('DB_HOST', $env('DB_HOST', '127.0.0.1'));
define('DB_PORT', (int)$env('DB_PORT', '3306'));
define('DB_USER', $env('DB_USER', 'root'));
define('DB_PASS', $env('DB_PASS', ''));
define('DB_NAME', $env('DB_NAME', 'mavericks_rms'));

// JWT Configuration (Requires explicit configuration, no fallback)
$jwtSecret = $env('JWT_SECRET');
if ($jwtSecret === '') {
    throw new RuntimeException('JWT_SECRET is not configured. Please define it in your environment or .env file.');
}
define('JWT_SECRET', $jwtSecret);
define('JWT_EXPIRY', (int)$env('JWT_EXPIRY', '86400')); // Default 24 hours

// Cloudinary Configuration
define('CLOUDINARY_CLOUD_NAME', $env('CLOUDINARY_CLOUD_NAME', ''));
define('CLOUDINARY_API_KEY', $env('CLOUDINARY_API_KEY', ''));
define('CLOUDINARY_API_SECRET', $env('CLOUDINARY_API_SECRET', ''));

// SMTP Email Configuration
define('SMTP_HOST', $env('SMTP_HOST', 'smtp.hostinger.com'));
define('SMTP_PORT', (int)$env('SMTP_PORT', '465'));
define('SMTP_USER', $env('SMTP_USER', ''));
define('SMTP_PASS', $env('SMTP_PASS', ''));
define('SMTP_FROM_EMAIL', $env('SMTP_FROM_EMAIL', 'official@teammavericks.org'));
define('SMTP_FROM_NAME', $env('SMTP_FROM_NAME', 'Team Mavericks'));

// Application URLs and Error Reporting
define('FRONTEND_URL', $env('FRONTEND_URL', 'http://localhost:5173'));
$displayErrors = filter_var($env('DISPLAY_ERRORS', 'false'), FILTER_VALIDATE_BOOLEAN);
define('DISPLAY_ERRORS', $displayErrors);

if (DISPLAY_ERRORS) {
    ini_set('display_errors', '1');
    ini_set('display_startup_errors', '1');
    error_reporting(E_ALL);
} else {
    ini_set('display_errors', '0');
    error_reporting(0);
}
