SET @deadline_type_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'mm_parsed_job_posts'
    AND column_name = 'deadline_type'
);
SET @deadline_type_ddl := IF(
  @deadline_type_exists = 0,
  'ALTER TABLE mm_parsed_job_posts ADD COLUMN deadline_type VARCHAR(32) NULL AFTER deadline_label',
  'SELECT 1'
);
PREPARE deadline_type_stmt FROM @deadline_type_ddl;
EXECUTE deadline_type_stmt;
DEALLOCATE PREPARE deadline_type_stmt;

SET @deadline_date_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'mm_parsed_job_posts'
    AND column_name = 'deadline_date'
);
SET @deadline_date_ddl := IF(
  @deadline_date_exists = 0,
  'ALTER TABLE mm_parsed_job_posts ADD COLUMN deadline_date DATE NULL AFTER deadline_type',
  'SELECT 1'
);
PREPARE deadline_date_stmt FROM @deadline_date_ddl;
EXECUTE deadline_date_stmt;
DEALLOCATE PREPARE deadline_date_stmt;

SET @normalized_deadline_label_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'mm_parsed_job_posts'
    AND column_name = 'normalized_deadline_label'
);
SET @normalized_deadline_label_ddl := IF(
  @normalized_deadline_label_exists = 0,
  'ALTER TABLE mm_parsed_job_posts ADD COLUMN normalized_deadline_label VARCHAR(64) NULL AFTER deadline_date',
  'SELECT 1'
);
PREPARE normalized_deadline_label_stmt FROM @normalized_deadline_label_ddl;
EXECUTE normalized_deadline_label_stmt;
DEALLOCATE PREPARE normalized_deadline_label_stmt;

CREATE TABLE IF NOT EXISTS mm_recommendation_scores (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  candidate_id BIGINT NOT NULL,
  score INT NULL,
  role_score INT NULL,
  skills_score INT NULL,
  profile_score INT NULL,
  deadline_score INT NULL,
  source_score INT NULL,
  recommended BOOLEAN NULL,
  reason VARCHAR(500) NULL,
  evidence_json JSON NULL,
  model_version VARCHAR(128) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_mm_recommendation_scores_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_mm_recommendation_scores_candidate FOREIGN KEY (candidate_id) REFERENCES mm_parsed_job_posts(id),
  UNIQUE KEY uk_mm_recommendation_scores_user_candidate (user_id, candidate_id),
  KEY idx_mm_recommendation_scores_status (status),
  KEY idx_mm_recommendation_scores_score (score)
);
