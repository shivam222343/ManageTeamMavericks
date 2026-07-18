<?php
// api.php

// Router fallback for PHP built-in web server to serve static files directly
if (php_sapi_name() === 'cli-server') {
    $url = parse_url($_SERVER['REQUEST_URI']);
    $file = __DIR__ . $url['path'];
    if (is_file($file)) {
        return false;
    }
}

require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/config/database.php';

use App\Router;
use App\Controllers\AuthController;
use App\Controllers\CampaignController;
use App\Controllers\FormBuilderController;
use App\Controllers\ApplicantController;
use App\Controllers\AnalyticsController;
use App\Controllers\FaqController;

// --- CORS Configuration ---
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Get the request path info
$pathInfo = $_SERVER['PATH_INFO'] ?? '';
if (empty($pathInfo)) {
    // Fallback if PATH_INFO is not populated
    $requestUri = $_SERVER['REQUEST_URI'];
    // Strip query string
    if (($pos = strpos($requestUri, '?')) !== false) {
        $requestUri = substr($requestUri, 0, $pos);
    }
    // Match route after api.php
    if (preg_match('#api\.php(/.*)$#', $requestUri, $matches)) {
        $pathInfo = $matches[1];
    } else {
        $pathInfo = $requestUri;
    }
}

$router = new Router();

// --- AUTHENTICATION ROUTES ---
$router->addRoute('POST', '/auth/login', [AuthController::class, 'login']);
$router->addRoute('GET', '/auth/me', [AuthController::class, 'me']);

// --- CAMPAIGN CONFIGURATION ROUTES ---
$router->addRoute('GET', '/campaigns', [CampaignController::class, 'list']);
$router->addRoute('POST', '/campaigns', [CampaignController::class, 'create']);
$router->addRoute('GET', '/campaigns/{id}', [CampaignController::class, 'get']);
$router->addRoute('PUT', '/campaigns/{id}', [CampaignController::class, 'update']);
$router->addRoute('DELETE', '/campaigns/{id}', [CampaignController::class, 'delete']);
$router->addRoute('GET', '/campaigns/public/{slug}', [CampaignController::class, 'getPublic']);
$router->addRoute('PATCH', '/campaigns/{id}/status', [CampaignController::class, 'patchStatus']);
$router->addRoute('GET', '/campaigns/{id}/domains', [CampaignController::class, 'getDomains']);
$router->addRoute('POST', '/campaigns/{id}/domains', [CampaignController::class, 'saveDomains']);
$router->addRoute('GET', '/campaigns/{id}/email-templates', [CampaignController::class, 'getEmailTemplates']);
$router->addRoute('PUT', '/campaigns/{id}/email-templates', [CampaignController::class, 'saveEmailTemplates']);

// --- FORM BUILDER METADATA ROUTES ---
$router->addRoute('GET', '/campaigns/{id}/form', [FormBuilderController::class, 'getForm']);
$router->addRoute('PUT', '/campaigns/{id}/form', [FormBuilderController::class, 'saveForm']);
$router->addRoute('GET', '/campaigns/{id}/faqs', [FaqController::class, 'getFaqs']);
$router->addRoute('PUT', '/campaigns/{id}/faqs', [FaqController::class, 'saveFaqs']);

// --- APPLICANT PIPELINE ROUTES ---
$router->addRoute('GET', '/applicants', [ApplicantController::class, 'list']);
$router->addRoute('GET', '/applicants/export', [ApplicantController::class, 'export']);
$router->addRoute('POST', '/applicants/apply', [ApplicantController::class, 'apply']);
$router->addRoute('GET', '/applicants/{id}', [ApplicantController::class, 'get']);
$router->addRoute('PUT', '/applicants/{id}/status', [ApplicantController::class, 'updateStatus']);
$router->addRoute('DELETE', '/applicants/{id}', [ApplicantController::class, 'delete']);
$router->addRoute('POST', '/applicants/{id}/notes', [ApplicantController::class, 'addNote']);
$router->addRoute('DELETE', '/applicants/{id}/notes/{noteId}', [ApplicantController::class, 'deleteNote']);

// --- ANALYTICS INSIGHTS ROUTES ---
$router->addRoute('GET', '/analytics', [AnalyticsController::class, 'getStats']);

// --- SEED ROUTE (temporary — remove after seeding) ---
$router->addRoute('GET', '/seed', function() {
    header('Content-Type: text/plain; charset=utf-8');
    try {
        $db = \App\Database::getConnection();
        echo "Connected to database.\n\n";

        // Create all tables
        $stmts = [
            "CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL, email VARCHAR(255) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL, role ENUM('coordinator','core_member','member') NOT NULL DEFAULT 'member', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
            "CREATE TABLE IF NOT EXISTS campaigns (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL, slug VARCHAR(255) UNIQUE NOT NULL, description TEXT, banner_url VARCHAR(255), logo_url VARCHAR(255), opening_date DATETIME NOT NULL, deadline DATETIME NOT NULL, status ENUM('open','closed','draft') NOT NULL DEFAULT 'draft', visibility ENUM('public','private') NOT NULL DEFAULT 'public', seo_title VARCHAR(255), seo_description TEXT, thank_you_message TEXT, closed_message TEXT, max_applications INT DEFAULT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
            "CREATE TABLE IF NOT EXISTS form_sections (id INT AUTO_INCREMENT PRIMARY KEY, campaign_id INT NOT NULL, name VARCHAR(255) NOT NULL, description TEXT, display_order INT NOT NULL DEFAULT 0, is_hidden BOOLEAN NOT NULL DEFAULT FALSE, FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
            "CREATE TABLE IF NOT EXISTS form_fields (id INT AUTO_INCREMENT PRIMARY KEY, section_id INT NOT NULL, label VARCHAR(255) NOT NULL, placeholder VARCHAR(255), field_type VARCHAR(50) NOT NULL, is_required BOOLEAN NOT NULL DEFAULT FALSE, description VARCHAR(255), validation_rules JSON DEFAULT NULL, default_value TEXT, help_text TEXT, conditional_visibility JSON DEFAULT NULL, display_order INT NOT NULL DEFAULT 0, is_hidden BOOLEAN NOT NULL DEFAULT FALSE, FOREIGN KEY (section_id) REFERENCES form_sections(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
            "CREATE TABLE IF NOT EXISTS field_options (id INT AUTO_INCREMENT PRIMARY KEY, field_id INT NOT NULL, option_value VARCHAR(255) NOT NULL, option_label VARCHAR(255) NOT NULL, display_order INT NOT NULL DEFAULT 0, FOREIGN KEY (field_id) REFERENCES form_fields(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
            "CREATE TABLE IF NOT EXISTS domains (id INT AUTO_INCREMENT PRIMARY KEY, campaign_id INT NOT NULL, name VARCHAR(255) NOT NULL, description TEXT, color VARCHAR(7) DEFAULT '#3B82F6', icon VARCHAR(50) DEFAULT 'Terminal', max_intake INT DEFAULT NULL, status ENUM('open','closed') NOT NULL DEFAULT 'open', display_order INT NOT NULL DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
            "CREATE TABLE IF NOT EXISTS applications (id INT AUTO_INCREMENT PRIMARY KEY, campaign_id INT NOT NULL, prn VARCHAR(50) NOT NULL, email VARCHAR(255) NOT NULL, phone VARCHAR(50) NOT NULL, full_name VARCHAR(255) NOT NULL, status ENUM('applied','under_review','shortlisted','interview','selected','rejected') NOT NULL DEFAULT 'applied', applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, CONSTRAINT unique_campaign_prn UNIQUE (campaign_id,prn), CONSTRAINT unique_campaign_email UNIQUE (campaign_id,email), CONSTRAINT unique_campaign_phone UNIQUE (campaign_id,phone), FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
            "CREATE TABLE IF NOT EXISTS application_answers (id INT AUTO_INCREMENT PRIMARY KEY, application_id INT NOT NULL, field_id INT NOT NULL, answer_text TEXT, FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE, FOREIGN KEY (field_id) REFERENCES form_fields(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
            "CREATE TABLE IF NOT EXISTS application_files (id INT AUTO_INCREMENT PRIMARY KEY, application_id INT NOT NULL, field_id INT NOT NULL, file_name VARCHAR(255) NOT NULL, file_path VARCHAR(255) NOT NULL, file_type VARCHAR(100) NOT NULL, file_size INT NOT NULL, uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE, FOREIGN KEY (field_id) REFERENCES form_fields(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
            "CREATE TABLE IF NOT EXISTS application_domains (application_id INT NOT NULL, domain_id INT NOT NULL, PRIMARY KEY (application_id,domain_id), FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE, FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
            "CREATE TABLE IF NOT EXISTS application_status_history (id INT AUTO_INCREMENT PRIMARY KEY, application_id INT NOT NULL, old_status ENUM('applied','under_review','shortlisted','interview','selected','rejected','none') NOT NULL DEFAULT 'none', new_status ENUM('applied','under_review','shortlisted','interview','selected','rejected') NOT NULL, changed_by INT NOT NULL, changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, notes TEXT, FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE, FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
            "CREATE TABLE IF NOT EXISTS application_notes (id INT AUTO_INCREMENT PRIMARY KEY, application_id INT NOT NULL, user_id INT NOT NULL, note_text TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
            "CREATE TABLE IF NOT EXISTS email_templates (id INT AUTO_INCREMENT PRIMARY KEY, campaign_id INT NOT NULL, trigger_event ENUM('applied','shortlisted','interview_scheduled','selected','rejected') NOT NULL, subject VARCHAR(255) NOT NULL, body_html TEXT NOT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE, CONSTRAINT unique_campaign_trigger UNIQUE (campaign_id,trigger_event)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
            "CREATE TABLE IF NOT EXISTS settings (id INT AUTO_INCREMENT PRIMARY KEY, setting_key VARCHAR(255) UNIQUE NOT NULL, setting_value TEXT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        ];
        foreach ($stmts as $s) { $db->exec($s); }
        echo "All tables created/verified.\n";

        // Users
        if ($db->query('SELECT COUNT(*) FROM users')->fetchColumn() == 0) {
            $h = '$2y$10$4GNIXBV.pFi2VChlWlwBxuVTaO0Dv3dtjW2ZcyK53eGYVlh2nvgSi';
            $db->exec("INSERT INTO users (id,name,email,password_hash,role) VALUES (1,'Coordinator','coordinator@teammavericks.org','$h','coordinator'),(2,'Core Member','core@teammavericks.org','$h','core_member'),(3,'Member','member@teammavericks.org','$h','member')");
            echo "Inserted users.\n";
        } else { echo "Users exist. Skipped.\n"; }

        // Campaign
        if (!$db->query('SELECT id FROM campaigns WHERE id=1')->fetch()) {
            $db->exec("INSERT INTO campaigns (id,name,slug,description,banner_url,logo_url,opening_date,deadline,status,visibility,seo_title,seo_description,thank_you_message,closed_message,max_applications) VALUES (1,'Team Mavericks Recruitment 2026','recruitment-2026','Join Team Mavericks, the premier student organization of KIT College of Engineering, Kolhapur!','https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80','/Logos/Mavericks_Logo.png','2026-07-01 00:00:00','2026-09-01 23:59:59','open','public','Join Team Mavericks | Recruitment 2026','Apply for Team Mavericks Recruitment 2026.','Thank you for applying! We will review your application.','Recruitment is currently closed. Thank you for your interest!',NULL)");
            echo "Inserted Campaign.\n";
        } else { echo "Campaign exists. Skipped.\n"; }

        // Domains
        if ($db->query('SELECT COUNT(*) FROM domains WHERE campaign_id=1')->fetchColumn() == 0) {
            $db->exec("INSERT INTO domains (id,campaign_id,name,description,color,icon,max_intake,status,display_order) VALUES (1,1,'Technical','Full stack development, coding, app development.','#3B82F6','Code2',15,'open',0),(2,1,'Design & Editing','UI/UX design, poster creation, video editing.','#F97316','Palette',10,'open',1),(3,1,'Event Management','Operations, stage management, venue decor.','#10B981','Calendar',20,'open',2),(4,1,'Public Relations & Marketing','Outreach, school campaigns, sponsorships.','#EC4899','Megaphone',12,'open',3),(5,1,'Social Media & Content','Content writing, blogging, managing channels.','#8B5CF6','Share2',8,'open',4)");
            echo "Inserted domains.\n";
        } else { echo "Domains exist. Skipped.\n"; }

        // Sections
        if ($db->query('SELECT COUNT(*) FROM form_sections WHERE campaign_id=1')->fetchColumn() == 0) {
            $db->exec("INSERT INTO form_sections (id,campaign_id,name,description,display_order,is_hidden) VALUES (1,1,'Personal Details','Tell us about yourself.',0,0),(2,1,'Academic Information','Your college credentials.',1,0),(3,1,'Domain & Portfolio','Which domain you want to join.',2,0),(4,1,'Questionnaire','Your mindset and goals.',3,0),(5,1,'Documents Upload','Upload verification files.',4,0),(6,1,'Consent & Declaration','Final acceptance.',5,0)");
            echo "Inserted sections.\n";
        } else { echo "Sections exist. Skipped.\n"; }

        // Fields
        if ($db->query('SELECT COUNT(*) FROM form_fields')->fetchColumn() == 0) {
            $db->exec("INSERT INTO form_fields (id,section_id,label,placeholder,field_type,is_required,description,display_order) VALUES (1,1,'Full Name','Enter your full name','text',1,'First, middle, and last name.',0),(2,1,'Email Address','Enter your personal email','email',1,'We will use this to contact you.',1),(3,1,'Phone Number','Enter 10-digit mobile number','phone',1,'WhatsApp active number preferred.',2),(4,1,'Gender',NULL,'radio',1,NULL,3),(5,2,'PRN','Enter your 10-digit PRN','prn',1,'Permanent Registration Number.',0),(6,2,'Department',NULL,'radio',1,NULL,1),(7,2,'Current Year',NULL,'radio',1,NULL,2),(8,3,'Preferred Domains',NULL,'checkbox',1,'Select domains to be considered for.',0),(9,3,'GitHub Profile Link','https://github.com/username','text',0,'Required for Technical domain.',1),(10,3,'Portfolio Link','https://...','text',0,'Required for Design domain.',2),(11,4,'Why do you want to join Team Mavericks?','Type your answer...','paragraph',1,'100-250 words.',0),(12,4,'Describe a project you were part of.','Describe your experience...','paragraph',1,NULL,1),(14,5,'Resume','Upload PDF','file',1,'Your latest CV or Resume.',0),(15,5,'College ID Card','Upload image','file',1,'Clear photo of your college ID.',1),(16,6,'Declaration',NULL,'checkbox',1,'I declare the information above is correct.',0)");

            $db->exec("INSERT INTO field_options (field_id,option_value,option_label,display_order) VALUES (4,'male','Male',0),(4,'female','Female',1),(4,'other','Other',2),(6,'cse','Computer Science & Engineering',0),(6,'it','Information Technology',1),(6,'etc','Electronics & Telecommunication',2),(6,'mech','Mechanical Engineering',3),(6,'civil','Civil Engineering',4),(6,'aids','AI & Data Science',5),(7,'fy','First Year',0),(7,'sy','Second Year',1),(7,'ty','Third Year',2),(8,'1','Technical',0),(8,'2','Design & Editing',1),(8,'3','Event Management',2),(8,'4','Public Relations',3),(8,'5','Social Media',4)");
            echo "Inserted fields and options.\n";
        } else { echo "Fields exist. Skipped.\n"; }

        // Email templates
        if ($db->query('SELECT COUNT(*) FROM email_templates WHERE campaign_id=1')->fetchColumn() == 0) {
            $db->exec("INSERT INTO email_templates (campaign_id,trigger_event,subject,body_html) VALUES (1,'applied','Application Received','<p>Thank you {full_name} for applying!</p>'),(1,'shortlisted','You are Shortlisted!','<p>Dear {full_name}, you have been shortlisted.</p>'),(1,'interview_scheduled','Interview Scheduled','<p>Dear {full_name}, your interview is at {interview_datetime}.</p>'),(1,'selected','Welcome to Team Mavericks!','<p>Dear {full_name}, welcome aboard!</p>'),(1,'rejected','Application Update','<p>Dear {full_name}, thank you for your interest.</p>')");
            echo "Inserted email templates.\n";
        } else { echo "Email templates exist. Skipped.\n"; }

        echo "\n🎉 Seeding complete!";
    } catch (\Exception $e) {
        echo "ERROR: " . $e->getMessage();
    }
    exit;
});

// --- RESOLVE THE REQUEST ---
$router->resolve($_SERVER['REQUEST_METHOD'], $pathInfo);
