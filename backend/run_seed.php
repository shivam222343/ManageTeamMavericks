<?php
// run_seed.php — HTTP-accessible seed endpoint. Hit this once in browser while dev server is running.
// URL: http://localhost:8000/run_seed.php

require_once __DIR__ . '/config/database.php';

header('Content-Type: text/plain; charset=utf-8');

try {
    $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
    $db = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    echo "✅ Connected to database: " . DB_NAME . "\n\n";

    // ── Create Tables ─────────────────────────────────────────────────────────
    $tables = [
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
        "CREATE TABLE IF NOT EXISTS application_email_logs (id INT AUTO_INCREMENT PRIMARY KEY, application_id INT NOT NULL, sender_id INT NULL, email_type VARCHAR(100) NOT NULL, subject VARCHAR(255) NOT NULL, body_html TEXT NOT NULL, status ENUM('sent', 'failed') NOT NULL DEFAULT 'sent', error_message TEXT NULL, sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE, FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    ];
    foreach ($tables as $sql) {
        $db->exec($sql);
    }
    echo "✅ All tables created/verified.\n\n";

    // ── Users ─────────────────────────────────────────────────────────────────
    $userCount = $db->query("SELECT COUNT(*) FROM users")->fetchColumn();
    if ($userCount == 0) {
        $hash = '$2y$10$4GNIXBV.pFi2VChlWlwBxuVTaO0Dv3dtjW2ZcyK53eGYVlh2nvgSi';
        $db->exec("INSERT INTO users (id,name,email,password_hash,role) VALUES
            (1,'Mavericks Coordinator','coordinator@teammavericks.org','$hash','coordinator'),
            (2,'Mavericks Core Member','core@teammavericks.org','$hash','core_member'),
            (3,'Mavericks General Member','member@teammavericks.org','$hash','member')");
        echo "✅ Inserted default users.\n";
    } else {
        echo "ℹ️  Users already exist ($userCount found). Skipping.\n";
    }

    // ── Campaign ──────────────────────────────────────────────────────────────
    $camp = $db->query("SELECT id FROM campaigns WHERE id = 1")->fetch();
    if (!$camp) {
        $db->exec("INSERT INTO campaigns (id,name,slug,description,banner_url,logo_url,opening_date,deadline,status,visibility,seo_title,seo_description,thank_you_message,closed_message,max_applications) VALUES
            (1,'Team Mavericks Recruitment 2026','recruitment-2026',
            'Join Team Mavericks, the premier student organization of KIT College of Engineering, Kolhapur!',
            'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80',
            '/Logos/Mavericks_Logo.png',
            '2026-07-01 00:00:00','2026-09-01 23:59:59','open','public',
            'Join Team Mavericks | Recruitment 2026',
            'Apply for Team Mavericks Recruitment 2026.',
            'Thank you for applying! We will review your application.',
            'Recruitment is currently closed. Thank you for your interest!',
            NULL)");
        echo "✅ Inserted Campaign ID 1.\n";
    } else {
        echo "ℹ️  Campaign ID 1 already exists. Skipping.\n";
    }

    // ── Domains ───────────────────────────────────────────────────────────────
    $domCount = $db->query("SELECT COUNT(*) FROM domains WHERE campaign_id=1")->fetchColumn();
    if ($domCount == 0) {
        $db->exec("INSERT INTO domains (id,campaign_id,name,description,color,icon,max_intake,status,display_order) VALUES
            (1,1,'Technical','Full stack development, coding, app development, and technical event execution.','#3B82F6','Code2',15,'open',0),
            (2,1,'Design & Editing','UI/UX design, poster creation, video editing, branding, and graphic design.','#F97316','Palette',10,'open',1),
            (3,1,'Event Management','Operations, stage management, venue decor, hospitality, and scheduling.','#10B981','Calendar',20,'open',2),
            (4,1,'Public Relations & Marketing','Outreach, school campaigns, sponsorships, anchors, and community interactions.','#EC4899','Megaphone',12,'open',3),
            (5,1,'Social Media & Content','Content writing, blogging, managing official channels, and scripting.','#8B5CF6','Share2',8,'open',4)");
        echo "✅ Inserted 5 domains.\n";
    } else {
        echo "ℹ️  Domains already exist ($domCount found). Skipping.\n";
    }

    // ── Form Sections ─────────────────────────────────────────────────────────
    $secCount = $db->query("SELECT COUNT(*) FROM form_sections WHERE campaign_id=1")->fetchColumn();
    if ($secCount == 0) {
        $db->exec("INSERT INTO form_sections (id,campaign_id,name,description,display_order,is_hidden) VALUES
            (1,1,'Personal Details','Tell us about yourself so we can get in touch.',0,0),
            (2,1,'Academic Information','Your current educational status at KIT CoEK.',1,0),
            (3,1,'Domain & Portfolio','Which domain would you like to join?',2,0),
            (4,1,'Questionnaire','Let us understand your mindset and goals.',3,0),
            (5,1,'Documents Upload','Please upload your credentials.',4,0),
            (6,1,'Consent & Declaration','Final check and submission.',5,0)");
        echo "✅ Inserted 6 form sections.\n";
    } else {
        echo "ℹ️  Form sections already exist ($secCount found). Skipping.\n";
    }

    // ── Form Fields ───────────────────────────────────────────────────────────
    $fldCount = $db->query("SELECT COUNT(*) FROM form_fields")->fetchColumn();
    if ($fldCount == 0) {
        $db->exec("INSERT INTO form_fields (id,section_id,label,placeholder,field_type,is_required,description,validation_rules,help_text,display_order) VALUES
            (1,1,'Full Name','Enter your full name','text',1,'First name, middle name, and last name.','{\"min\":3,\"max\":100}','Make sure this matches your college records.',0),
            (2,1,'Email Address','Enter your personal email','email',1,'We will use this to contact you.',NULL,'Provide a frequently used email.',1),
            (3,1,'Phone Number','Enter 10-digit mobile number','phone',1,'WhatsApp active number is preferred.','{\"regex\":\"^[0-9]{10}$\"}','Do not add country code (+91).',2),
            (4,1,'Gender','Select your gender','dropdown',1,NULL,NULL,NULL,3),
            (5,2,'Permanent Registration Number (PRN)','Enter your 10-digit college PRN','prn',1,'KIT College of Engineering PRN.','{\"regex\":\"^[0-9a-zA-Z]{10}$\"}','Unique identifier for KIT students.',0),
            (6,2,'Department / Branch','Select your department','dropdown',1,NULL,NULL,NULL,1),
            (7,2,'Current Year','Select your academic year','dropdown',1,NULL,NULL,NULL,2),
            (8,3,'Preferred Domains',NULL,'checkbox',1,'Select one or more domains you want to be considered for.',NULL,'You can select multiple domains.',0),
            (9,3,'GitHub Profile Link','https://github.com/username','url',0,'Required for Technical domain.',NULL,'Optional if not applying for Tech.',1),
            (10,3,'Portfolio Link','https://...','url',0,'Required for Design & Editing domain.',NULL,'Optional if not applying for Design.',2),
            (11,4,'Why do you want to join Team Mavericks?','Type your answer here...','paragraph',1,'Explain in 100-250 words.','{\"min\":50,\"max\":1000}','We read these answers carefully!',0),
            (12,4,'Describe a project or event you were part of.','Describe your experience...','paragraph',1,NULL,NULL,'Could be high school, college, or personal projects.',1),
            (13,4,'Rate your teamwork skills',NULL,'rating',1,'Rate from 1 to 5 stars.',NULL,NULL,2),
            (14,5,'Resume (PDF format)',NULL,'resume',1,'Upload your latest CV or Resume.','{\"max_size\":5242880,\"types\":[\"application/pdf\"]}','Max size: 5MB. Only PDF allowed.',0),
            (15,5,'College ID Card Image',NULL,'id_card',1,'Upload a clear photo of your college ID.','{\"max_size\":2097152,\"types\":[\"image/jpeg\",\"image/png\"]}','Max size: 2MB. JPG/PNG only.',1),
            (16,6,'Declaration',NULL,'consent',1,'I declare that the information provided above is correct and to the best of my knowledge.',NULL,'Check to confirm.',0)");

        // Options for fields
        $db->exec("INSERT INTO field_options (field_id,option_value,option_label,display_order) VALUES
            (4,'male','Male',0),(4,'female','Female',1),(4,'other','Other',2),
            (6,'cse','Computer Science & Engineering',0),(6,'it','Information Technology',1),(6,'etc','Electronics & Telecommunication',2),(6,'mech','Mechanical Engineering',3),(6,'civil','Civil Engineering',4),(6,'electrical','Electrical Engineering',5),(6,'aids','Artificial Intelligence & Data Science',6),
            (7,'fy','First Year (B.Tech)',0),(7,'sy','Second Year (B.Tech)',1),(7,'ty','Third Year (B.Tech)',2),
            (8,'1','Technical',0),(8,'2','Design & Editing',1),(8,'3','Event Management',2),(8,'4','Public Relations & Marketing',3),(8,'5','Social Media & Content',4)");
        echo "✅ Inserted 16 form fields and all options.\n";
    } else {
        echo "ℹ️  Form fields already exist ($fldCount found). Skipping.\n";
    }

    // ── Email Templates ───────────────────────────────────────────────────────
    $tplCount = $db->query("SELECT COUNT(*) FROM email_templates WHERE campaign_id=1")->fetchColumn();
    if ($tplCount == 0) {
        $db->exec("INSERT INTO email_templates (campaign_id,trigger_event,subject,body_html) VALUES
            (1,'applied','Application Received - Team Mavericks Recruitment 2026','<p>Hello {full_name}, thank you for applying! Your Application ID is TM-2026-{app_id}.</p>'),
            (1,'shortlisted','You have been Shortlisted!','<p>Dear {full_name}, you have been shortlisted for interviews.</p>'),
            (1,'interview_scheduled','Interview Details','<p>Dear {full_name}, your interview is scheduled at {interview_datetime}.</p>'),
            (1,'selected','Welcome to Team Mavericks!','<p>Dear {full_name}, welcome to the club!</p>'),
            (1,'rejected','Application Status Update','<p>Dear {full_name}, thank you for your time. Unfortunately we cannot proceed.</p>')");
        echo "✅ Inserted email templates.\n";
    } else {
        echo "ℹ️  Email templates already exist ($tplCount found). Skipping.\n";
    }

    echo "\n\n🎉 Database seeded successfully! All done.\n";

} catch (PDOException $e) {
    echo "\n❌ Database Error: " . $e->getMessage() . "\n";
    exit(1);
}
