-- ====================================================================
-- VERBAFEST 2026 - DEVELOPMENT SEED DATA (Phase 1)
--
-- Notice: Contains mock/demo entities for testing & development ONLY.
-- Demo participant codes use the format: VF-9001 ... VF-9010
-- Safe to re-run with INSERT IGNORE / ON DUPLICATE KEY UPDATE.
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. Seed Event Settings
-- --------------------------------------------------------------------
INSERT INTO vf_event_settings (setting_key, setting_value, description) VALUES
('event_name', 'VERBAFEST 2026', 'Official title of the event'),
('event_date', '2026-10-25', 'Scheduled event execution date'),
('gd_duration_minutes', '25', 'Duration per GD group slot in minutes'),
('debate_duration_minutes', '30', 'Duration per Debate round in minutes'),
('mindsaga_duration_minutes', '35', 'Duration per Mind Saga lab batch in minutes'),
('transition_buffer_minutes', '15', 'Buffer between slots to prevent participant collision'),
('gd_panel_count', '4', 'Active GD panels'),
('debate_panel_count', '4', 'Active Debate panels'),
('gd_group_size', '8', 'Nominal participant count per GD group'),
('debate_group_size', '6', 'Nominal participant count per Debate matchup (3 vs 3)'),
('waiting_room_buffer', '20', 'Buffer minutes before slot start for reporting to waiting room'),
('registration_open', '1', '1 if open, 0 if closed'),
('registration_close', '2026-10-24 23:59:59', 'Online registration deadline'),
('event_status', 'scheduled', 'Status: scheduled, live, paused, completed')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

-- --------------------------------------------------------------------
-- 2. Seed Rooms
-- --------------------------------------------------------------------
INSERT INTO vf_rooms (id, room_code, name, room_type, capacity, current_occupancy, location_details) VALUES
(1, 'ROOM-GD-101', 'Seminar Hall 1', 'gd_panel', 15, 0, 'Main Academic Block, 1st Floor'),
(2, 'ROOM-GD-102', 'Seminar Hall 2', 'gd_panel', 15, 0, 'Main Academic Block, 1st Floor'),
(3, 'ROOM-GD-103', 'Conference Room A', 'gd_panel', 15, 0, 'Library Building, Ground Floor'),
(4, 'ROOM-GD-104', 'Conference Room B', 'gd_panel', 15, 0, 'Library Building, Ground Floor'),
(5, 'ROOM-DEB-201', 'Amphitheatre Room 1', 'debate_panel', 20, 0, 'Architecture Wing, 2nd Floor'),
(6, 'ROOM-DEB-202', 'Amphitheatre Room 2', 'debate_panel', 20, 0, 'Architecture Wing, 2nd Floor'),
(7, 'ROOM-DEB-203', 'Moot Court Hall', 'debate_panel', 20, 0, 'Management Wing, 1st Floor'),
(8, 'ROOM-DEB-204', 'Boardroom East', 'debate_panel', 20, 0, 'Management Wing, 1st Floor'),
(9, 'LAB-MS-301', 'Central Computer Lab 3', 'mindsaga_lab', 40, 0, 'IT Complex, 3rd Floor'),
(10, 'WAIT-HALL-A', 'Auditorium Waiting Lounge A', 'waiting_room', 80, 0, 'Central Auditorium Foyer'),
(11, 'WAIT-HALL-B', 'Auditorium Waiting Lounge B', 'waiting_room', 80, 0, 'Central Auditorium Foyer'),
(12, 'CTRL-ROOM-01', 'Central Operations Desk', 'control_room', 15, 0, 'Administration Building, Room 05')
ON DUPLICATE KEY UPDATE name = VALUES(name), capacity = VALUES(capacity);

-- --------------------------------------------------------------------
-- 3. Seed Panels (4 GD Panels + 4 Debate Panels)
-- --------------------------------------------------------------------
INSERT INTO vf_panels (id, panel_code, event_type, name, room_id, capacity, status) VALUES
(1, 'GD-PANEL-01', 'gd', 'GD Panel 1 (Corporate Hiring)', 1, 10, 'FREE'),
(2, 'GD-PANEL-02', 'gd', 'GD Panel 2 (Managerial Assessment)', 2, 10, 'FREE'),
(3, 'GD-PANEL-03', 'gd', 'GD Panel 3 (Tech & Innovation)', 3, 10, 'FREE'),
(4, 'GD-PANEL-04', 'gd', 'GD Panel 4 (Critical Thought)', 4, 10, 'FREE'),
(5, 'DEBATE-PANEL-01', 'debate', 'Debate Panel A (Policy & Governance)', 5, 8, 'FREE'),
(6, 'DEBATE-PANEL-02', 'debate', 'Debate Panel B (Ethics & Technology)', 6, 8, 'FREE'),
(7, 'DEBATE-PANEL-03', 'debate', 'Debate Panel C (Socio-Economics)', 7, 8, 'FREE'),
(8, 'DEBATE-PANEL-04', 'debate', 'Debate Panel D (Global Affairs)', 8, 8, 'FREE')
ON DUPLICATE KEY UPDATE name = VALUES(name), status = VALUES(status);

-- --------------------------------------------------------------------
-- 4. Seed Judges (External & Internal)
-- --------------------------------------------------------------------
INSERT INTO vf_judges (id, user_id, name, email, phone, designation, event_type, access_pin) VALUES
(1, 1, 'Dr. Rajesh Deshmukh', 'coordinator@teammavericks.org', '9822011223', 'Head of Placement & Corporate Relations', 'both', '9011'),
(2, 2, 'Prof. Sneha Kulkarni', 'core@teammavericks.org', '9822044556', 'Senior Faculty Advisor / Core Evaluator', 'gd', '9022'),
(3, NULL, 'Vikramaditya Patil', 'vikram.patil@tcs.corp', '9833077889', 'External Corporate HR Director (TCS)', 'gd', '9033'),
(4, NULL, 'Adv. Meera Sen', 'meera.sen@legalchambers.in', '9844011223', 'High Court Advocate & National Debater', 'debate', '9044'),
(5, NULL, 'Anand R. Verma', 'anand.verma@cognizant.com', '9855033445', 'Lead Tech Architect & GD Specialist', 'both', '9055')
ON DUPLICATE KEY UPDATE name = VALUES(name), access_pin = VALUES(access_pin);

-- --------------------------------------------------------------------
-- 5. Seed Panel Judges (Mapping)
-- --------------------------------------------------------------------
INSERT INTO vf_panel_judges (panel_id, judge_id, is_head_judge) VALUES
(1, 1, 1),
(1, 3, 0),
(2, 2, 1),
(2, 5, 0),
(3, 3, 1),
(4, 5, 1),
(5, 4, 1),
(5, 1, 0),
(6, 4, 1),
(7, 5, 1),
(8, 4, 1)
ON DUPLICATE KEY UPDATE is_head_judge = VALUES(is_head_judge);

-- --------------------------------------------------------------------
-- 6. Seed Demo Participants (VF-9001 to VF-9010)
-- Covers all permutations: Triple, Dual, and Single registrations.
-- --------------------------------------------------------------------
INSERT INTO vf_participants (id, participant_code, full_name, email, phone, college, prn, reg_gd, reg_debate, reg_mindsaga, checkin_status) VALUES
(1, 'VF-9001', 'Aarav Sharma (Demo Triple)', 'aarav.demo@kitcoek.in', '9811009001', 'KIT College of Engineering', '22U01001', 1, 1, 1, 'checked_in'),
(2, 'VF-9002', 'Ananya Joshi (Demo Triple)', 'ananya.demo@kitcoek.in', '9811009002', 'KIT College of Engineering', '22U01002', 1, 1, 1, 'checked_in'),
(3, 'VF-9003', 'Rohan Patil (Demo GD+Debate)', 'rohan.demo@gce.ac.in', '9811009003', 'Govt College of Engineering, Karad', '21U02003', 1, 1, 0, 'checked_in'),
(4, 'VF-9004', 'Tanvi Kulkarni (Demo GD+MS)', 'tanvi.demo@kitcoek.in', '9811009004', 'KIT College of Engineering', '22U01004', 1, 0, 1, 'checked_in'),
(5, 'VF-9005', 'Aditya More (Demo Debate+MS)', 'aditya.demo@dkte.ac.in', '9811009005', 'DKTE Society Textile & Engg Institute', '23U03005', 0, 1, 1, 'not_arrived'),
(6, 'VF-9006', 'Isha Shinde (Demo GD Only)', 'isha.demo@kitcoek.in', '9811009006', 'KIT College of Engineering', '23U01006', 1, 0, 0, 'not_arrived'),
(7, 'VF-9007', 'Siddharth Chavan (Demo Debate Only)', 'siddharth.demo@walchand.ac.in', '9811009007', 'Walchand College of Engineering', '22U04007', 0, 1, 0, 'checked_in'),
(8, 'VF-9008', 'Pooja Bhosale (Demo MS Only)', 'pooja.demo@kitcoek.in', '9811009008', 'KIT College of Engineering', '23U01008', 0, 0, 1, 'checked_in'),
(9, 'VF-9009', 'Nikhil Jadhav (Demo Triple)', 'nikhil.demo@kitcoek.in', '9811009009', 'KIT College of Engineering', '22U01009', 1, 1, 1, 'not_arrived'),
(10, 'VF-9010', 'Sayali Salunkhe (Demo GD+Debate)', 'sayali.demo@ritindia.edu', '9811009010', 'Rajarambapu Institute of Technology', '21U05010', 1, 1, 0, 'checked_in')
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), checkin_status = VALUES(checkin_status);

-- --------------------------------------------------------------------
-- 7. Seed Schedule Slots (Example Non-Overlapping Slots)
-- --------------------------------------------------------------------
INSERT INTO vf_schedule_slots (id, slot_code, event_type, start_time, end_time, panel_id, room_id, slot_label) VALUES
-- Slot 1: Morning GD (10:00 - 10:30 AM)
(1, 'SLOT-GD-01', 'gd', '2026-10-25 10:00:00', '2026-10-25 10:30:00', 1, 1, 'GD Round 1 - Slot 01 (Panel 1)'),
(2, 'SLOT-GD-02', 'gd', '2026-10-25 10:00:00', '2026-10-25 10:30:00', 2, 2, 'GD Round 1 - Slot 02 (Panel 2)'),
-- Slot 2: Mid-Morning Mind Saga Batch (11:00 - 11:35 AM)
(3, 'SLOT-MS-01', 'mindsaga', '2026-10-25 11:00:00', '2026-10-25 11:35:00', NULL, 9, 'Mind Saga Batch Alpha (Lab 301)'),
(4, 'SLOT-MS-02', 'mindsaga', '2026-10-25 11:45:00', '2026-10-25 12:20:00', NULL, 9, 'Mind Saga Batch Beta (Lab 301)'),
-- Slot 3: Afternoon Debate (12:30 - 01:00 PM)
(5, 'SLOT-DEB-01', 'debate', '2026-10-25 12:30:00', '2026-10-25 13:00:00', 5, 5, 'Debate Round 1 - Slot 01 (Panel A)'),
(6, 'SLOT-DEB-02', 'debate', '2026-10-25 12:30:00', '2026-10-25 13:00:00', 6, 6, 'Debate Round 1 - Slot 02 (Panel B)')
ON DUPLICATE KEY UPDATE slot_label = VALUES(slot_label);

-- --------------------------------------------------------------------
-- 8. Seed Group Allocations (Conflict-Free Participant Timetable)
-- Shows VF-9001 attending GD at 10:00, Mind Saga at 11:00, Debate at 12:30.
-- Zero time collision!
-- --------------------------------------------------------------------
INSERT INTO vf_group_allocations (id, group_code, event_type, participant_id, slot_id, panel_id, attendance_status) VALUES
-- VF-9001 (Triple)
(1, 'GD-GRP-A1', 'gd', 1, 1, 1, 'present'),
(2, 'MS-BATCH-A', 'mindsaga', 1, 3, NULL, 'present'),
(3, 'DEB-MATCH-01', 'debate', 1, 5, 5, 'pending'),

-- VF-9002 (Triple)
(4, 'GD-GRP-A1', 'gd', 2, 1, 1, 'present'),
(5, 'MS-BATCH-A', 'mindsaga', 2, 3, NULL, 'present'),
(6, 'DEB-MATCH-01', 'debate', 2, 5, 5, 'pending'),

-- VF-9003 (GD + Debate)
(7, 'GD-GRP-A1', 'gd', 3, 1, 1, 'present'),
(8, 'DEB-MATCH-01', 'debate', 3, 5, 5, 'pending'),

-- VF-9004 (GD + Mind Saga)
(9, 'GD-GRP-A2', 'gd', 4, 2, 2, 'present'),
(10, 'MS-BATCH-B', 'mindsaga', 4, 4, NULL, 'pending'),

-- VF-9008 (Mind Saga only)
(11, 'MS-BATCH-A', 'mindsaga', 8, 3, NULL, 'present')
ON DUPLICATE KEY UPDATE attendance_status = VALUES(attendance_status);

-- --------------------------------------------------------------------
-- 9. Seed Mind Saga Sync Records
-- --------------------------------------------------------------------
INSERT INTO vf_mindsaga_sync (id, participant_id, participant_code, handshake_token_hash, token_issued_at, batch_name, mind_saga_status, score_round_1, score_round_2, score_round_3, total_score) VALUES
(1, 1, 'VF-9001', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', '2026-10-25 10:55:00', 'Batch Alpha', 'in_progress', 850, 0, 0, 850),
(2, 2, 'VF-9002', '7d793037a0760186574b0282f2f435e7b1e516b9cfd6f6004b5006b5eb725458', '2026-10-25 10:55:00', 'Batch Alpha', 'pending', 0, 0, 0, 0),
(3, 4, 'VF-9004', NULL, NULL, 'Batch Beta', 'pending', 0, 0, 0, 0),
(4, 5, 'VF-9005', NULL, NULL, 'Batch Beta', 'pending', 0, 0, 0, 0),
(5, 8, 'VF-9008', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', '2026-10-25 10:55:00', 'Batch Alpha', 'completed', 920, 1150, 1400, 3470),
(6, 9, 'VF-9009', NULL, NULL, 'Batch Gamma', 'pending', 0, 0, 0, 0)
ON DUPLICATE KEY UPDATE total_score = VALUES(total_score), mind_saga_status = VALUES(mind_saga_status);

-- --------------------------------------------------------------------
-- 10. Seed Example Scores (Rubric JSON)
-- --------------------------------------------------------------------
INSERT INTO vf_scores (id, event_type, participant_id, panel_id, judge_id, group_code, criteria_json, total_score, remarks) VALUES
(1, 'gd', 1, 1, 1, 'GD-GRP-A1', '{"fluency": 8.5, "content_logic": 9.0, "body_language": 8.0, "leadership": 7.5, "listening": 8.0}', 41.00, 'Strong argument construction and respectful rebuttal delivery.'),
(2, 'gd', 1, 1, 3, 'GD-GRP-A1', '{"fluency": 8.0, "content_logic": 8.5, "body_language": 8.5, "leadership": 8.0, "listening": 8.0}', 41.00, 'Good articulation and team engagement.'),
(3, 'gd', 2, 1, 1, 'GD-GRP-A1', '{"fluency": 9.0, "content_logic": 8.0, "body_language": 9.0, "leadership": 8.5, "listening": 8.5}', 43.00, 'Exceptional poise, calm tone, and synthesis of divergent opinions.')
ON DUPLICATE KEY UPDATE total_score = VALUES(total_score), remarks = VALUES(remarks);
