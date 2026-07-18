-- Create database if not exists
CREATE DATABASE IF NOT EXISTS u714635531_MavericksDB;
USE u714635531_MavericksDB;

-- Drop tables in reverse order of foreign keys to support safe re-running
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS email_templates;
DROP TABLE IF EXISTS application_notes;
DROP TABLE IF EXISTS application_status_history;
DROP TABLE IF EXISTS application_domains;
DROP TABLE IF EXISTS application_files;
DROP TABLE IF EXISTS application_answers;
DROP TABLE IF EXISTS applications;
DROP TABLE IF EXISTS domains;
DROP TABLE IF EXISTS field_options;
DROP TABLE IF EXISTS form_fields;
DROP TABLE IF EXISTS form_sections;
DROP TABLE IF EXISTS campaigns;
DROP TABLE IF EXISTS users;

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('coordinator', 'core_member', 'member') NOT NULL DEFAULT 'member',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Campaigns
CREATE TABLE IF NOT EXISTS campaigns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    banner_url VARCHAR(255),
    logo_url VARCHAR(255),
    opening_date DATETIME NOT NULL,
    deadline DATETIME NOT NULL,
    status ENUM('open', 'closed', 'draft') NOT NULL DEFAULT 'draft',
    visibility ENUM('public', 'private') NOT NULL DEFAULT 'public',
    seo_title VARCHAR(255),
    seo_description TEXT,
    thank_you_message TEXT,
    closed_message TEXT,
    max_applications INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Form Sections
CREATE TABLE IF NOT EXISTS form_sections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    campaign_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    display_order INT NOT NULL DEFAULT 0,
    is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Form Fields
CREATE TABLE IF NOT EXISTS form_fields (
    id INT AUTO_INCREMENT PRIMARY KEY,
    section_id INT NOT NULL,
    label VARCHAR(255) NOT NULL,
    placeholder VARCHAR(255),
    field_type VARCHAR(50) NOT NULL,
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    description VARCHAR(255),
    validation_rules JSON DEFAULT NULL,
    default_value TEXT,
    help_text TEXT,
    conditional_visibility JSON DEFAULT NULL,
    display_order INT NOT NULL DEFAULT 0,
    is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (section_id) REFERENCES form_sections(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Field Options
CREATE TABLE IF NOT EXISTS field_options (
    id INT AUTO_INCREMENT PRIMARY KEY,
    field_id INT NOT NULL,
    option_value VARCHAR(255) NOT NULL,
    option_label VARCHAR(255) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    FOREIGN KEY (field_id) REFERENCES form_fields(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Domains
CREATE TABLE IF NOT EXISTS domains (
    id INT AUTO_INCREMENT PRIMARY KEY,
    campaign_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6',
    icon VARCHAR(50) DEFAULT 'Terminal',
    max_intake INT DEFAULT NULL,
    status ENUM('open', 'closed') NOT NULL DEFAULT 'open',
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Applications
CREATE TABLE IF NOT EXISTS applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    campaign_id INT NOT NULL,
    prn VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    status ENUM('applied', 'under_review', 'shortlisted', 'interview', 'selected', 'rejected') NOT NULL DEFAULT 'applied',
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT unique_campaign_prn UNIQUE (campaign_id, prn),
    CONSTRAINT unique_campaign_email UNIQUE (campaign_id, email),
    CONSTRAINT unique_campaign_phone UNIQUE (campaign_id, phone),
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Application Answers
CREATE TABLE IF NOT EXISTS application_answers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    application_id INT NOT NULL,
    field_id INT NOT NULL,
    answer_text TEXT,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
    FOREIGN KEY (field_id) REFERENCES form_fields(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Application Files
CREATE TABLE IF NOT EXISTS application_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    application_id INT NOT NULL,
    field_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size INT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
    FOREIGN KEY (field_id) REFERENCES form_fields(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Selected Domains Mapping
CREATE TABLE IF NOT EXISTS application_domains (
    application_id INT NOT NULL,
    domain_id INT NOT NULL,
    PRIMARY KEY (application_id, domain_id),
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
    FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Application Status History
CREATE TABLE IF NOT EXISTS application_status_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    application_id INT NOT NULL,
    old_status ENUM('applied', 'under_review', 'shortlisted', 'interview', 'selected', 'rejected', 'none') NOT NULL DEFAULT 'none',
    new_status ENUM('applied', 'under_review', 'shortlisted', 'interview', 'selected', 'rejected') NOT NULL,
    changed_by INT NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Application Notes
CREATE TABLE IF NOT EXISTS application_notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    application_id INT NOT NULL,
    user_id INT NOT NULL,
    note_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Email Templates
CREATE TABLE IF NOT EXISTS email_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    campaign_id INT NOT NULL,
    trigger_event ENUM('applied', 'shortlisted', 'interview_scheduled', 'selected', 'rejected') NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body_html TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    CONSTRAINT unique_campaign_trigger UNIQUE (campaign_id, trigger_event)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Global Settings
CREATE TABLE IF NOT EXISTS settings (
    `key` VARCHAR(255) PRIMARY KEY,
    `value` TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ==================== SEED DATA ====================

-- 1. Insert Default Users (Password is 'mavericks123' for all)
INSERT INTO users (id, name, email, password_hash, role) VALUES
(1, 'Mavericks Coordinator', 'coordinator@teammavericks.org', '$2y$10$4GNIXBV.pFi2VChlWlwBxuVTaO0Dv3dtjW2ZcyK53eGYVlh2nvgSi', 'coordinator'),
(2, 'Mavericks Core Member', 'core@teammavericks.org', '$2y$10$4GNIXBV.pFi2VChlWlwBxuVTaO0Dv3dtjW2ZcyK53eGYVlh2nvgSi', 'core_member'),
(3, 'Mavericks General Member', 'member@teammavericks.org', '$2y$10$4GNIXBV.pFi2VChlWlwBxuVTaO0Dv3dtjW2ZcyK53eGYVlh2nvgSi', 'member');

-- 2. Insert Default Campaign
INSERT INTO campaigns (id, name, slug, description, banner_url, logo_url, opening_date, deadline, status, visibility, seo_title, seo_description, thank_you_message, closed_message, max_applications) VALUES
(1, 'Team Mavericks Recruitment 2026', 'recruitment-2026', 'Join Team Mavericks, the premier student organization of KIT\'s College of Engineering, Kolhapur! We are looking for passionate, driven individuals who want to learn with fun and make a difference. Technical, Design, Public Relations, Event Management, and other roles are open.', 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80', '/Logos/Mavericks_Logo.png', '2026-07-01 00:00:00', '2026-09-01 23:59:59', 'open', 'public', 'Join Team Mavericks | Recruitment 2026', 'Apply for Team Mavericks Recruitment 2026 drive. Multiple domains open including Tech, Design, Event Management, PR, Social Media, and more. KIT CoEK.', 'Thank you for applying to Team Mavericks! We have received your application. Our team will review your responses and get back to you soon. Please keep an eye on your email for updates!', 'Recruitment is currently closed. Thank you for your interest in Team Mavericks!', NULL);

-- 3. Insert Domains for the Campaign
INSERT INTO domains (id, campaign_id, name, description, color, icon, max_intake, status, display_order) VALUES
(1, 1, 'Technical', 'Full stack development, coding, app development, and technical event execution.', '#3B82F6', 'Code2', 15, 'open', 0),
(2, 1, 'Design & Editing', 'UI/UX design, poster creation, video editing, branding, and graphic design.', '#F97316', 'Palette', 10, 'open', 1),
(3, 1, 'Event Management', 'Operations, stage management, venue decor, hospitality, and overall event scheduling.', '#10B981', 'Calendar', 20, 'open', 2),
(4, 1, 'Public Relations & Marketing', 'Outreach, school campaigns, sponsorships, anchors, and community interactions.', '#EC4899', 'Megaphone', 12, 'open', 3),
(5, 1, 'Social Media & Content', 'Content writing, blogging, managing official channels, and scripting.', '#8B5CF6', 'Share2', 8, 'open', 4);

-- 4. Insert Default Form Sections
INSERT INTO form_sections (id, campaign_id, name, description, display_order, is_hidden) VALUES
(1, 1, 'Personal Details', 'Tell us about yourself so we can get in touch.', 0, FALSE),
(2, 1, 'Academic Information', 'Your current educational status at KIT CoEK.', 1, FALSE),
(3, 1, 'Domain & Portfolio', 'Which domain would you like to join?', 2, FALSE),
(4, 1, 'Questionnaire', 'Let\'s understand your mindset and goals.', 3, FALSE),
(5, 1, 'Documents Upload', 'Please upload your credentials.', 4, FALSE),
(6, 1, 'Consent & Declaration', 'Final check and submission.', 5, FALSE);

-- 5. Insert Form Fields for Section 1 (Personal Details)
INSERT INTO form_fields (id, section_id, label, placeholder, field_type, is_required, description, validation_rules, default_value, help_text, display_order) VALUES
(1, 1, 'Full Name', 'Enter your full name', 'text', TRUE, 'First name, middle name, and last name.', '{"min": 3, "max": 100}', NULL, 'Make sure this matches your college records.', 0),
(2, 1, 'Email Address', 'Enter your personal email', 'email', TRUE, 'We will use this to contact you.', NULL, NULL, 'Provide a frequently used email.', 1),
(3, 1, 'Phone Number', 'Enter 10-digit mobile number', 'phone', TRUE, 'WhatsApp active number is preferred.', '{"regex": "^[0-9]{10}$"}', NULL, 'Do not add country code (+91).', 2),
(4, 1, 'Gender', 'Select your gender', 'dropdown', TRUE, NULL, NULL, NULL, NULL, 3);

-- Options for Gender dropdown
INSERT INTO field_options (field_id, option_value, option_label, display_order) VALUES
(4, 'male', 'Male', 0),
(4, 'female', 'Female', 1),
(4, 'other', 'Other', 2);

-- 6. Insert Form Fields for Section 2 (Academic Information)
INSERT INTO form_fields (id, section_id, label, placeholder, field_type, is_required, description, validation_rules, default_value, help_text, display_order) VALUES
(5, 2, 'Permanent Registration Number (PRN)', 'Enter your 10-digit college PRN', 'prn', TRUE, 'KIT College of Engineering PRN.', '{"regex": "^[0-9a-zA-Z]{10}$"}', NULL, 'Unique identifier for KIT students.', 0),
(6, 2, 'Department / Branch', 'Select your department', 'dropdown', TRUE, NULL, NULL, NULL, NULL, 1),
(7, 2, 'Current Year', 'Select your academic year', 'dropdown', TRUE, NULL, NULL, NULL, NULL, 2);

-- Options for Department dropdown
INSERT INTO field_options (field_id, option_value, option_label, display_order) VALUES
(6, 'cse', 'Computer Science & Engineering', 0),
(6, 'it', 'Information Technology', 1),
(6, 'etc', 'Electronics & Telecommunication', 2),
(6, 'mech', 'Mechanical Engineering', 3),
(6, 'civil', 'Civil Engineering', 4),
(6, 'electrical', 'Electrical Engineering', 5),
(6, 'aids', 'Artificial Intelligence & Data Science', 6);

-- Options for Current Year dropdown
INSERT INTO field_options (field_id, option_value, option_label, display_order) VALUES
(7, 'fy', 'First Year (B.Tech)', 0),
(7, 'sy', 'Second Year (B.Tech)', 1),
(7, 'ty', 'Third Year (B.Tech)', 2);

-- 7. Insert Form Fields for Section 3 (Domain Preference)
INSERT INTO form_fields (id, section_id, label, placeholder, field_type, is_required, description, validation_rules, default_value, help_text, display_order) VALUES
(8, 3, 'Preferred Domains', NULL, 'checkbox', TRUE, 'Select one or more domains you want to be considered for.', NULL, NULL, 'You can select multiple domains.', 0),
(9, 3, 'GitHub Profile Link', 'https://github.com/username', 'url', FALSE, 'Required for Technical domain.', NULL, NULL, 'Optional if not applying for Tech.', 1),
(10, 3, 'Portfolio Link (Behance/Dribbble/Drive)', 'https://...', 'url', FALSE, 'Required for Design & Editing domain.', NULL, NULL, 'Optional if not applying for Design.', 2);

-- Options for domains (mapping domain IDs)
INSERT INTO field_options (field_id, option_value, option_label, display_order) VALUES
(8, '1', 'Technical', 0),
(8, '2', 'Design & Editing', 1),
(8, '3', 'Event Management', 2),
(8, '4', 'Public Relations & Marketing', 3),
(8, '5', 'Social Media & Content', 4);

-- 8. Insert Form Fields for Section 4 (Questionnaire)
INSERT INTO form_fields (id, section_id, label, placeholder, field_type, is_required, description, validation_rules, default_value, help_text, display_order) VALUES
(11, 4, 'Why do you want to join Team Mavericks?', 'Type your answer here...', 'paragraph', TRUE, 'Explain in 100-250 words.', '{"min": 50, "max": 1000}', NULL, 'We read these answers carefully!', 0),
(12, 4, 'Describe any project, event, or initiative you led or was a major part of.', 'Describe your experience...', 'paragraph', TRUE, NULL, NULL, NULL, 'Could be high school, college, or personal projects.', 1),
(13, 4, 'Rate your teamwork skills', NULL, 'rating', TRUE, 'Rate from 1 to 5 stars.', NULL, '4', NULL, 2);

-- 9. Insert Form Fields for Section 5 (Documents Upload)
INSERT INTO form_fields (id, section_id, label, placeholder, field_type, is_required, description, validation_rules, default_value, help_text, display_order) VALUES
(14, 5, 'Resume (PDF format)', NULL, 'resume', TRUE, 'Upload your latest CV or Resume.', '{"max_size": 5242880, "types": ["application/pdf"]}', NULL, 'Max size: 5MB. Only PDF allowed.', 0),
(15, 5, 'College ID Card Image', NULL, 'id_card', TRUE, 'Upload a clear photo of your college ID.', '{"max_size": 2097152, "types": ["image/jpeg", "image/png"]}', NULL, 'Max size: 2MB. JPG/PNG only.', 1);

-- 10. Insert Form Fields for Section 6 (Consent & Declaration)
INSERT INTO form_fields (id, section_id, label, placeholder, field_type, is_required, description, validation_rules, default_value, help_text, display_order) VALUES
(16, 6, 'Declaration', NULL, 'consent', TRUE, 'I declare that the information provided above is correct and to the best of my knowledge.', NULL, NULL, 'Check to confirm.', 0);

-- 11. Insert Default Email Templates for the Campaign
INSERT INTO email_templates (campaign_id, trigger_event, subject, body_html) VALUES
(1, 'applied', 'Application Received - Team Mavericks Recruitment 2026', '
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e7; border-radius: 8px;">
  <h2 style="color: #2563eb; margin-top: 0;">Hello {full_name},</h2>
  <p>Thank you for applying for the <strong>Team Mavericks Recruitment 2026</strong>! We have received your application successfully.</p>
  <div style="background-color: #f4f4f5; padding: 15px; border-radius: 6px; margin: 20px 0;">
    <strong>Your Application ID:</strong> TM-2026-{app_id}<br/>
    <strong>PRN:</strong> {prn}<br/>
    <strong>Domains Selected:</strong> {domains}
  </div>
  <p>Our Core Committee and Coordinators are currently reviewing all submissions. We will reach out to you via email for the next rounds of the recruitment drive.</p>
  <p>If you have any questions, feel free to reply to this email.</p>
  <br/>
  <p>Best regards,<br/><strong>Team Mavericks</strong><br/><span style="color: #6b7280; font-size: 12px;">Learning with Fun</span></p>
</div>
'),
(1, 'shortlisted', 'Congratulations! You are Shortlisted - Team Mavericks Recruitment 2026', '
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e7; border-radius: 8px;">
  <h2 style="color: #10b981; margin-top: 0;">Congratulations {full_name}!</h2>
  <p>We are pleased to inform you that your application for <strong>Team Mavericks</strong> has been <strong>Shortlisted</strong> for the interview round!</p>
  <p>Our team was highly impressed by your responses and experience.</p>
  <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; border-radius: 4px; margin: 20px 0;">
    <strong>Status:</strong> Shortlisted for Interview<br/>
    <strong>Domains:</strong> {domains}
  </div>
  <p>We will schedule your interview shortly. You will receive another email containing the date, time, and venue details. Please be prepared to discuss your portfolio, projects, and interest in the club.</p>
  <br/>
  <p>Best regards,<br/><strong>Team Mavericks</strong><br/><span style="color: #6b7280; font-size: 12px;">Learning with Fun</span></p>
</div>
'),
(1, 'interview_scheduled', 'Interview Scheduled - Team Mavericks Recruitment 2026', '
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e7; border-radius: 8px;">
  <h2 style="color: #2563eb; margin-top: 0;">Interview Scheduled: {full_name}</h2>
  <p>Your interview for <strong>Team Mavericks Recruitment 2026</strong> has been scheduled. Please find the details below:</p>
  <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; border-radius: 4px; margin: 20px 0;">
    <strong>Date & Time:</strong> {interview_datetime}<br/>
    <strong>Venue / Link:</strong> {interview_venue}<br/>
    <strong>Assigned Domain:</strong> {domains}
  </div>
  <p>Please make sure to arrive 10 minutes prior to your slot. If you have any conflicts, please contact us immediately.</p>
  <br/>
  <p>Best regards,<br/><strong>Team Mavericks Team</strong><br/><span style="color: #6b7280; font-size: 12px;">Learning with Fun</span></p>
</div>
'),
(1, 'selected', 'Welcome to Team Mavericks! - Selection Notice', '
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e7; border-radius: 8px; background-color: #fafafa;">
  <h2 style="color: #2563eb; margin-top: 0; text-align: center;">Welcome to the Family! 🎉</h2>
  <p>Dear <strong>{full_name}</strong>,</p>
  <p>We are absolutely thrilled to inform you that you have been <strong>SELECTED</strong> to join <strong>Team Mavericks</strong> for the academic year 2026-27!</p>
  <p>We received an overwhelming number of applications, and your talent, attitude, and drive stood out among the rest.</p>
  <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 6px; margin: 20px 0; text-align: center;">
    <h3 style="color: #166534; margin: 0 0 10px 0;">Selected Domain: {domains}</h3>
    <p style="margin: 0; color: #166534; font-size: 14px;">Get ready for an amazing journey of "Learning with Fun"!</p>
  </div>
  <p>We will host an onboarding/welcome meet shortly. Details regarding date, time, and location will be shared in our official communication channels.</p>
  <p>Congratulations once again! We cannot wait to build awesome things together.</p>
  <br/>
  <p style="text-align: center;">Best regards,<br/><strong>Team Mavericks Core Committee</strong><br/><span style="color: #6b7280; font-size: 12px;">KIT\'s College of Engineering, Kolhapur</span></p>
</div>
'),
(1, 'rejected', 'Update on your Team Mavericks Application', '
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e7; border-radius: 8px;">
  <h2 style="color: #374151; margin-top: 0;">Hello {full_name},</h2>
  <p>Thank you for taking the time to apply to <strong>Team Mavericks</strong> and speaking with us during the selection process.</p>
  <p>We had the opportunity to review many exceptional candidacies, and unfortunately, we are unable to offer you a spot in the club at this time.</p>
  <p>Please note that this is not a reflection of your potential. We receive hundreds of applications and are constrained by a limited student intake. We encourage you to keep developing your skills, stay active in college workshops, and apply again in our future recruitment drives!</p>
  <p>We wish you the very best in your academic and professional endeavors.</p>
  <br/>
  <p>Sincerely,<br/><strong>Team Mavericks Committee</strong><br/><span style="color: #6b7280; font-size: 12px;">Learning with Fun</span></p>
</div>
');
