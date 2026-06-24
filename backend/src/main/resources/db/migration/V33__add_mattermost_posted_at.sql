SET @posted_at_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'mm_messages'
    AND column_name = 'posted_at'
);
SET @posted_at_ddl := IF(
  @posted_at_exists = 0,
  'ALTER TABLE mm_messages ADD COLUMN posted_at TIMESTAMP NULL AFTER parse_error',
  'SELECT 1'
);
PREPARE posted_at_stmt FROM @posted_at_ddl;
EXECUTE posted_at_stmt;
DEALLOCATE PREPARE posted_at_stmt;

SET @posted_at_index_exists := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'mm_messages'
    AND index_name = 'idx_mm_messages_channel_posted'
);
SET @posted_at_index_ddl := IF(
  @posted_at_index_exists = 0,
  'CREATE INDEX idx_mm_messages_channel_posted ON mm_messages (channel_id, posted_at)',
  'SELECT 1'
);
PREPARE posted_at_index_stmt FROM @posted_at_index_ddl;
EXECUTE posted_at_index_stmt;
DEALLOCATE PREPARE posted_at_index_stmt;
