ALTER TABLE mm_parsed_job_posts
  ADD COLUMN deadline_type VARCHAR(32) NULL AFTER deadline_label,
  ADD COLUMN deadline_date DATE NULL AFTER deadline_type,
  ADD COLUMN normalized_deadline_label VARCHAR(64) NULL AFTER deadline_date;

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
