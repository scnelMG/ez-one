-- V24__update_study_dashboard_features.sql
-- Add settings_json to study_group
ALTER TABLE study_group ADD COLUMN settings_json TEXT;

-- Add reason to shared_job
ALTER TABLE shared_job ADD COLUMN reason TEXT;

-- study_essay_read_log table
CREATE TABLE IF NOT EXISTS study_essay_read_log (
    study_id VARCHAR(36) NOT NULL,
    essay_id VARCHAR(36) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (essay_id, user_email),
    FOREIGN KEY (study_id) REFERENCES study_group(id) ON DELETE CASCADE,
    FOREIGN KEY (essay_id) REFERENCES shared_essay(id) ON DELETE CASCADE
);

-- study_notification table
CREATE TABLE IF NOT EXISTS study_notification (
    id VARCHAR(36) PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    study_id VARCHAR(36),
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'INFO',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (study_id) REFERENCES study_group(id) ON DELETE SET NULL
);
