ALTER TABLE notion_connections
  ADD COLUMN notion_account_email VARCHAR(255) NULL AFTER bot_id;

ALTER TABLE sync_logs
  ADD COLUMN target VARCHAR(64) NOT NULL DEFAULT 'JOB' AFTER sync_scope;
