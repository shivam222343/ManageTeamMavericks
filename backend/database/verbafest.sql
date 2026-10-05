-- ====================================================================
-- VERBAFEST 2026 - EVENT MANAGEMENT DATABASE FOUNDATION
-- Schema Migration Script (Phase 1)
--
-- Namespace: vf_* (Strict isolation from recruitment tables)
-- Target: Team Mavericks Management System
-- Compatibility: MySQL 8.0+ / MariaDB 10.5+
-- Collation: utf8mb4_unicode_ci | Storage Engine: InnoDB
-- Idempotent: Uses CREATE TABLE IF NOT EXISTS
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. Table: vf_participants
-- Canonical VERBAFEST participant registry.
-- Independent from recruitment `applications`.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vf_participants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    participant_code VARCHAR(50) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    college VARCHAR(255) NOT NULL DEFAULT 'KIT College of Engineering',
    prn VARCHAR(50) NULL,
    reg_gd TINYINT(1) NOT NULL DEFAULT 0,
    reg_debate TINYINT(1) NOT NULL DEFAULT 0,
    reg_mindsaga TINYINT(1) NOT NULL DEFAULT 0,
    checkin_status ENUM('not_arrived', 'checked_in', 'disqualified', 'completed') NOT NULL DEFAULT 'not_arrived',
    checkin_time DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_vf_participant_code UNIQUE (participant_code),
    INDEX idx_vf_part_email (email),
    INDEX idx_vf_part_checkin (checkin_status),
    INDEX idx_vf_part_events (reg_gd, reg_debate, reg_mindsaga)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 2. Table: vf_rooms
-- Physical venues, labs, waiting rooms, and control centers.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vf_rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    room_type ENUM('gd_panel', 'debate_panel', 'mindsaga_lab', 'waiting_room', 'control_room') NOT NULL,
    capacity INT NOT NULL DEFAULT 30,
    current_occupancy INT NOT NULL DEFAULT 0,
    location_details VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_vf_room_code UNIQUE (room_code),
    INDEX idx_vf_room_type (room_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 3. Table: vf_panels
-- Evaluation panels for GD and Debate (supports dynamic panel count).
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vf_panels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    panel_code VARCHAR(50) NOT NULL,
    event_type ENUM('gd', 'debate') NOT NULL,
    name VARCHAR(255) NOT NULL,
    room_id INT NOT NULL,
    capacity INT NOT NULL DEFAULT 10,
    current_group_id INT NULL,
    status ENUM('FREE', 'OCCUPIED', 'READY', 'BREAK', 'JUDGES_ABSENT') NOT NULL DEFAULT 'FREE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_vf_panel_code UNIQUE (panel_code),
    INDEX idx_vf_panel_event (event_type),
    INDEX idx_vf_panel_status (status),
    CONSTRAINT fk_vf_panel_room FOREIGN KEY (room_id) REFERENCES vf_rooms(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 4. Table: vf_judges
-- External and internal evaluators (user_id is nullable).
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vf_judges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NULL,
    designation VARCHAR(255) NULL,
    event_type ENUM('gd', 'debate', 'both') NOT NULL DEFAULT 'both',
    access_pin VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_vf_judge_email (email),
    INDEX idx_vf_judge_event (event_type),
    CONSTRAINT fk_vf_judge_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 5. Table: vf_panel_judges
-- Many-to-many binding between panels and judges.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vf_panel_judges (
    panel_id INT NOT NULL,
    judge_id INT NOT NULL,
    is_head_judge TINYINT(1) NOT NULL DEFAULT 0,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (panel_id, judge_id),
    CONSTRAINT fk_vf_pj_panel FOREIGN KEY (panel_id) REFERENCES vf_panels(id) ON DELETE CASCADE,
    CONSTRAINT fk_vf_pj_judge FOREIGN KEY (judge_id) REFERENCES vf_judges(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 6. Table: vf_schedule_slots
-- Time-slot master table for GD, Debate, and Mind Saga.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vf_schedule_slots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slot_code VARCHAR(50) NOT NULL,
    event_type ENUM('gd', 'debate', 'mindsaga') NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    panel_id INT NULL,
    room_id INT NULL,
    slot_label VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_vf_slot_code UNIQUE (slot_code),
    INDEX idx_vf_slot_times (start_time, end_time),
    INDEX idx_vf_slot_event (event_type),
    CONSTRAINT fk_vf_slot_panel FOREIGN KEY (panel_id) REFERENCES vf_panels(id) ON DELETE SET NULL,
    CONSTRAINT fk_vf_slot_room FOREIGN KEY (room_id) REFERENCES vf_rooms(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 7. Table: vf_group_allocations
-- Maps participants to event groups and schedule slots.
-- Enables multi-event scheduling conflict detection.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vf_group_allocations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_code VARCHAR(50) NOT NULL,
    event_type ENUM('gd', 'debate', 'mindsaga') NOT NULL,
    participant_id INT NOT NULL,
    slot_id INT NOT NULL,
    panel_id INT NULL,
    attendance_status ENUM('pending', 'present', 'absent') NOT NULL DEFAULT 'pending',
    allocated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_vf_alloc_part_event UNIQUE (participant_id, event_type),
    INDEX idx_vf_alloc_slot (slot_id),
    INDEX idx_vf_alloc_group (group_code),
    CONSTRAINT fk_vf_alloc_participant FOREIGN KEY (participant_id) REFERENCES vf_participants(id) ON DELETE CASCADE,
    CONSTRAINT fk_vf_alloc_slot FOREIGN KEY (slot_id) REFERENCES vf_schedule_slots(id) ON DELETE CASCADE,
    CONSTRAINT fk_vf_alloc_panel FOREIGN KEY (panel_id) REFERENCES vf_panels(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 8. Table: vf_scores
-- Evaluation marks submitted by judges (flexible criteria JSON).
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vf_scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_type ENUM('gd', 'debate') NOT NULL,
    participant_id INT NOT NULL,
    panel_id INT NOT NULL,
    judge_id INT NOT NULL,
    group_code VARCHAR(50) NOT NULL,
    criteria_json JSON NOT NULL,
    total_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    remarks TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_vf_score_part_judge_event UNIQUE (participant_id, judge_id, event_type),
    INDEX idx_vf_score_panel (panel_id),
    INDEX idx_vf_score_total (total_score),
    CONSTRAINT fk_vf_score_participant FOREIGN KEY (participant_id) REFERENCES vf_participants(id) ON DELETE CASCADE,
    CONSTRAINT fk_vf_score_panel FOREIGN KEY (panel_id) REFERENCES vf_panels(id) ON DELETE CASCADE,
    CONSTRAINT fk_vf_score_judge FOREIGN KEY (judge_id) REFERENCES vf_judges(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 9. Table: vf_mindsaga_sync
-- Synchronisation state with external Mind Saga platform.
-- Uses SHA-256 token hash (never stores raw tokens in plaintext).
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vf_mindsaga_sync (
    id INT AUTO_INCREMENT PRIMARY KEY,
    participant_id INT NOT NULL,
    participant_code VARCHAR(50) NOT NULL,
    handshake_token_hash VARCHAR(64) NULL,
    token_issued_at DATETIME NULL,
    batch_name VARCHAR(100) NULL,
    mind_saga_status ENUM('pending', 'in_progress', 'completed') NOT NULL DEFAULT 'pending',
    score_round_1 INT NOT NULL DEFAULT 0,
    score_round_2 INT NOT NULL DEFAULT 0,
    score_round_3 INT NOT NULL DEFAULT 0,
    total_score INT NOT NULL DEFAULT 0,
    completed_at DATETIME NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_vf_ms_part UNIQUE (participant_id),
    INDEX idx_vf_ms_code (participant_code),
    INDEX idx_vf_ms_status (mind_saga_status),
    CONSTRAINT fk_vf_ms_participant FOREIGN KEY (participant_id) REFERENCES vf_participants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 10. Table: vf_event_settings
-- Dynamic configuration parameters for VERBAFEST rules and timings.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vf_event_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT NOT NULL,
    description VARCHAR(255) NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_vf_setting_key UNIQUE (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
