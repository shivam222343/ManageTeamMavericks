<?php
// config/database.php

define('DB_HOST', 'srv1001.hstgr.io');
define('DB_PORT', 3306);
define('DB_USER', 'u714635531_teammavericks');
define('DB_PASS', 'Mavericsk0077');
define('DB_NAME', 'u714635531_MavericksDB');

define('JWT_SECRET', 'teammavericks_rms_super_secret_key_2026');
define('JWT_EXPIRY', 86400); // 24 hours in seconds

// SMTP Configuration for PHPMailer
define('SMTP_HOST', 'smtp.gmail.com');
define('SMTP_PORT', 587);
define('SMTP_USER', 'your-email@gmail.com');
define('SMTP_PASS', 'your-app-password');
define('SMTP_FROM_EMAIL', 'no-reply@teammavericks.org');
define('SMTP_FROM_NAME', 'Team Mavericks Kit');

// Error reporting config (set to false in production)
define('DISPLAY_ERRORS', true);

if (DISPLAY_ERRORS) {
    ini_set('display_errors', 1);
    ini_set('display_startup_errors', 1);
    error_reporting(E_ALL);
} else {
    ini_set('display_errors', 0);
    error_reporting(0);
}
