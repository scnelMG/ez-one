ALTER TABLE mm_messages
  ADD COLUMN posted_at TIMESTAMP NULL AFTER parse_error;

CREATE INDEX idx_mm_messages_channel_posted
  ON mm_messages (channel_id, posted_at);
