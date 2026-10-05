-- ============================================================
-- EVENTS SYSTEM MIGRATION
-- Run after existing database.sql schema is in place
-- Safe to run multiple times (uses IF NOT EXISTS)
-- ============================================================

-- 1. Events Table
CREATE TABLE IF NOT EXISTS events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    banner_url VARCHAR(500),
    cover_image_url VARCHAR(500),
    start_date DATETIME,
    end_date DATETIME,
    location VARCHAR(255),
    mode ENUM('online', 'offline', 'hybrid') NOT NULL DEFAULT 'offline',
    -- Event lifecycle status (independent of registration)
    event_status ENUM('draft', 'published', 'ongoing', 'completed', 'archived') NOT NULL DEFAULT 'draft',
    -- Registration control (independent of event status)
    registration_status ENUM('open', 'closed', 'scheduled') NOT NULL DEFAULT 'closed',
    registration_start_date DATETIME DEFAULT NULL,
    registration_end_date DATETIME DEFAULT NULL,
    max_participants INT DEFAULT NULL,
    -- Payment
    payment_required BOOLEAN NOT NULL DEFAULT FALSE,
    registration_fee DECIMAL(10,2) DEFAULT 0.00,
    -- Future extensibility fields
    tags VARCHAR(500) DEFAULT NULL,
    organizer_name VARCHAR(255) DEFAULT NULL,
    contact_email VARCHAR(255) DEFAULT NULL,
    created_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Event Registration Forms Table
CREATE TABLE IF NOT EXISTS event_registration_forms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL UNIQUE,
    form_name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    success_message TEXT,
    closed_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Modify form_sections to support event forms
-- Add event_form_id as nullable FK (existing campaign_id rows are untouched)
ALTER TABLE form_sections 
    ADD COLUMN IF NOT EXISTS event_form_id INT DEFAULT NULL;

ALTER TABLE form_sections 
    MODIFY COLUMN campaign_id INT DEFAULT NULL;

-- 4. Event Registrations Table
CREATE TABLE IF NOT EXISTS event_registrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    event_form_id INT NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    status ENUM('pending', 'confirmed', 'cancelled', 'waitlisted') NOT NULL DEFAULT 'pending',
    payment_status ENUM('not_required', 'pending', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'not_required',
    payment_amount DECIMAL(10,2) DEFAULT 0.00,
    transaction_id VARCHAR(255) DEFAULT NULL,
    payment_gateway VARCHAR(100) DEFAULT NULL,
    payment_meta JSON DEFAULT NULL,
    registration_token VARCHAR(64) UNIQUE NOT NULL,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT unique_event_email UNIQUE (event_id, email),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (event_form_id) REFERENCES event_registration_forms(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Event Registration Answers Table
CREATE TABLE IF NOT EXISTS event_registration_answers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    registration_id INT NOT NULL,
    field_id INT NOT NULL,
    answer_text TEXT,
    FOREIGN KEY (registration_id) REFERENCES event_registrations(id) ON DELETE CASCADE,
    FOREIGN KEY (field_id) REFERENCES form_fields(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Event Registration Files Table
CREATE TABLE IF NOT EXISTS event_registration_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    registration_id INT NOT NULL,
    field_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size INT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (registration_id) REFERENCES event_registrations(id) ON DELETE CASCADE,
    FOREIGN KEY (field_id) REFERENCES form_fields(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- SEED: Default Events
-- ============================================================

INSERT IGNORE INTO events (name, slug, description, event_status, registration_status, mode, payment_required) VALUES
('Varba Fest', 'varba-fest', 'Annual cultural and technical festival of KIT College of Engineering, Kolhapur.', 'draft', 'closed', 'offline', FALSE),
('Bodhantra', 'bodhantra', 'Technical symposium and project exhibition showcasing innovation by engineering students.', 'draft', 'closed', 'offline', FALSE),
('Invicta', 'invicta', 'Flagship intercollegiate competition featuring technical and non-technical events.', 'draft', 'closed', 'offline', FALSE),
('School Visit', 'school-visit', 'Community outreach program visiting local schools to inspire the next generation.', 'draft', 'closed', 'offline', FALSE);
