CREATE TABLE IF NOT EXISTS dart_analyses (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  workspace_id BIGINT NOT NULL,
  rcept_no VARCHAR(64) NOT NULL,
  report_name VARCHAR(255) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  status VARCHAR(32) NOT NULL,
  model VARCHAR(100),
  source_url VARCHAR(500),
  result_json LONGTEXT NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_dart_analyses_workspace (workspace_id, id),
  INDEX idx_dart_analyses_user_workspace (user_id, workspace_id),
  CONSTRAINT fk_dart_analyses_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_dart_analyses_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);
