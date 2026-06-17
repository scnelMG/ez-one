ALTER TABLE application_history
  MODIFY raw_result VARCHAR(255) NULL,
  MODIFY deadline_label VARCHAR(64) NULL,
  MODIFY period_year INT NULL,
  MODIFY period_half VARCHAR(8) NOT NULL,
  MODIFY source_url VARCHAR(1024) NULL,
  MODIFY company_type VARCHAR(64) NULL;
