CREATE TABLE IF NOT EXISTS notion_connections (
  user_id BIGINT PRIMARY KEY,
  workspace_id VARCHAR(128) NULL,
  access_token_ciphertext TEXT NOT NULL,
  bot_id VARCHAR(128) NULL,
  connected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_notion_connections_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS notion_sync_settings (
  user_id BIGINT PRIMARY KEY,
  database_id VARCHAR(128) NOT NULL,
  sync_scope VARCHAR(64) NOT NULL DEFAULT 'JOB_ONLY',
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_notion_sync_settings_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS sync_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  basket_job_id BIGINT NULL,
  sync_scope VARCHAR(64) NOT NULL DEFAULT 'JOB_ONLY',
  status VARCHAR(32) NOT NULL,
  message TEXT NULL,
  notion_page_id VARCHAR(128) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sync_logs_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_sync_logs_basket_job FOREIGN KEY (basket_job_id) REFERENCES basket_jobs(id),
  KEY idx_sync_logs_user_created (user_id, created_at),
  KEY idx_sync_logs_basket_job (basket_job_id)
);

CREATE TABLE IF NOT EXISTS notion_job_sync_records (
  basket_job_id BIGINT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  notion_page_id VARCHAR(128) NOT NULL,
  last_synced_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_notion_job_sync_records_basket_job FOREIGN KEY (basket_job_id) REFERENCES basket_jobs(id),
  CONSTRAINT fk_notion_job_sync_records_user FOREIGN KEY (user_id) REFERENCES users(id),
  KEY idx_notion_job_sync_records_user (user_id)
);
