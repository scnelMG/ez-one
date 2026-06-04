CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  provider VARCHAR(32) NOT NULL,
  provider_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_users_provider_subject (provider, provider_id)
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  refresh_token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_sessions_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS companies (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) NULL,
  company_type VARCHAR(64) NULL,
  size VARCHAR(64) NULL,
  rating DECIMAL(4, 2) NULL,
  starting_salary INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_companies_name (name)
);

CREATE TABLE IF NOT EXISTS jobs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  company_id BIGINT NOT NULL,
  title VARCHAR(255) NOT NULL,
  role VARCHAR(255) NULL,
  deadline_label VARCHAR(64) NULL,
  deadline_at TIMESTAMP NULL,
  source VARCHAR(64) NOT NULL,
  url VARCHAR(1024) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_jobs_company FOREIGN KEY (company_id) REFERENCES companies(id)
);

CREATE TABLE IF NOT EXISTS basket_jobs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  job_id BIGINT NOT NULL,
  application_status VARCHAR(32) NOT NULL,
  status_updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status_reason VARCHAR(64) NOT NULL,
  saved_source VARCHAR(64) NOT NULL,
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_basket_jobs_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_basket_jobs_job FOREIGN KEY (job_id) REFERENCES jobs(id),
  KEY idx_basket_jobs_user_status (user_id, application_status, deleted_at)
);

CREATE TABLE IF NOT EXISTS workspaces (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  basket_job_id BIGINT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_workspaces_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_workspaces_basket_job FOREIGN KEY (basket_job_id) REFERENCES basket_jobs(id),
  UNIQUE KEY uk_workspaces_basket_job (basket_job_id)
);

CREATE TABLE IF NOT EXISTS essay_questions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  workspace_id BIGINT NOT NULL,
  question_text TEXT NOT NULL,
  max_length INT NOT NULL,
  sort_order INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_essay_questions_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);

CREATE TABLE IF NOT EXISTS essay_drafts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  workspace_id BIGINT NOT NULL,
  question_id BIGINT NOT NULL,
  body TEXT NOT NULL,
  image_payload_json JSON NULL,
  save_revision INT NOT NULL DEFAULT 1,
  client_updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  auto_saved_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_essay_drafts_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  CONSTRAINT fk_essay_drafts_question FOREIGN KEY (question_id) REFERENCES essay_questions(id),
  UNIQUE KEY uk_essay_drafts_question (question_id)
);

CREATE TABLE IF NOT EXISTS essay_versions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  workspace_id BIGINT NOT NULL,
  question_id BIGINT NOT NULL,
  version_name VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  image_payload_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_essay_versions_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  CONSTRAINT fk_essay_versions_question FOREIGN KEY (question_id) REFERENCES essay_questions(id)
);

CREATE TABLE IF NOT EXISTS reference_materials (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  workspace_id BIGINT NOT NULL,
  board_name VARCHAR(64) NOT NULL,
  reference_type VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NULL,
  image_payload_json JSON NULL,
  url VARCHAR(1024) NULL,
  display_mode VARCHAR(32) NOT NULL,
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reference_materials_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);
