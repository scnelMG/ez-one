ALTER TABLE notion_sync_settings
  ADD COLUMN data_source_id VARCHAR(128) NULL AFTER database_id,
  ADD COLUMN root_page_id VARCHAR(128) NULL AFTER data_source_id;
