CREATE TABLE IF NOT EXISTS mm_messages (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  channel_id VARCHAR(255) NOT NULL,
  message_id VARCHAR(255) NOT NULL,
  sender_name VARCHAR(255) NULL,
  raw_text MEDIUMTEXT NULL,
  raw_payload_json JSON NULL,
  message_type VARCHAR(64) NOT NULL,
  parse_status VARCHAR(64) NOT NULL,
  parse_error TEXT NULL,
  received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_mm_messages_message_id (message_id),
  KEY idx_mm_messages_channel_received (channel_id, received_at),
  KEY idx_mm_messages_parse_status (parse_status)
);

CREATE TABLE IF NOT EXISTS mm_parsed_job_posts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  mm_message_id BIGINT NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  url VARCHAR(1024) NOT NULL,
  deadline_label VARCHAR(64) NULL,
  review_status VARCHAR(64) NOT NULL DEFAULT 'NEEDS_REVIEW',
  reviewer_user_id BIGINT NULL,
  promoted_job_id BIGINT NULL,
  reviewed_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_mm_parsed_job_posts_message FOREIGN KEY (mm_message_id) REFERENCES mm_messages(id),
  CONSTRAINT fk_mm_parsed_job_posts_reviewer FOREIGN KEY (reviewer_user_id) REFERENCES users(id),
  CONSTRAINT fk_mm_parsed_job_posts_promoted_job FOREIGN KEY (promoted_job_id) REFERENCES jobs(id),
  UNIQUE KEY uk_mm_parsed_job_posts_message_url (mm_message_id, url(255)),
  KEY idx_mm_parsed_job_posts_review_status (review_status),
  KEY idx_mm_parsed_job_posts_promoted_job (promoted_job_id)
);
