SET @users_updated_at_missing = (
  SELECT COUNT(*) = 0
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND column_name = 'updated_at'
);
SET @add_users_updated_at_sql = IF(
  @users_updated_at_missing,
  'ALTER TABLE users ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at',
  'SELECT 1'
);
PREPARE add_users_updated_at_stmt FROM @add_users_updated_at_sql;
EXECUTE add_users_updated_at_stmt;
DEALLOCATE PREPARE add_users_updated_at_stmt;

SET @companies_updated_at_missing = (
  SELECT COUNT(*) = 0
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'companies'
    AND column_name = 'updated_at'
);
SET @add_companies_updated_at_sql = IF(
  @companies_updated_at_missing,
  'ALTER TABLE companies ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at',
  'SELECT 1'
);
PREPARE add_companies_updated_at_stmt FROM @add_companies_updated_at_sql;
EXECUTE add_companies_updated_at_stmt;
DEALLOCATE PREPARE add_companies_updated_at_stmt;

SET @jobs_updated_at_missing = (
  SELECT COUNT(*) = 0
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'jobs'
    AND column_name = 'updated_at'
);
SET @add_jobs_updated_at_sql = IF(
  @jobs_updated_at_missing,
  'ALTER TABLE jobs ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at',
  'SELECT 1'
);
PREPARE add_jobs_updated_at_stmt FROM @add_jobs_updated_at_sql;
EXECUTE add_jobs_updated_at_stmt;
DEALLOCATE PREPARE add_jobs_updated_at_stmt;

SET @basket_jobs_updated_at_missing = (
  SELECT COUNT(*) = 0
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'basket_jobs'
    AND column_name = 'updated_at'
);
SET @add_basket_jobs_updated_at_sql = IF(
  @basket_jobs_updated_at_missing,
  'ALTER TABLE basket_jobs ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at',
  'SELECT 1'
);
PREPARE add_basket_jobs_updated_at_stmt FROM @add_basket_jobs_updated_at_sql;
EXECUTE add_basket_jobs_updated_at_stmt;
DEALLOCATE PREPARE add_basket_jobs_updated_at_stmt;

SET @essay_questions_updated_at_missing = (
  SELECT COUNT(*) = 0
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'essay_questions'
    AND column_name = 'updated_at'
);
SET @add_essay_questions_updated_at_sql = IF(
  @essay_questions_updated_at_missing,
  'ALTER TABLE essay_questions ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at',
  'SELECT 1'
);
PREPARE add_essay_questions_updated_at_stmt FROM @add_essay_questions_updated_at_sql;
EXECUTE add_essay_questions_updated_at_stmt;
DEALLOCATE PREPARE add_essay_questions_updated_at_stmt;

SET @essay_drafts_created_at_missing = (
  SELECT COUNT(*) = 0
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'essay_drafts'
    AND column_name = 'created_at'
);
SET @add_essay_drafts_created_at_sql = IF(
  @essay_drafts_created_at_missing,
  'ALTER TABLE essay_drafts ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER save_revision',
  'SELECT 1'
);
PREPARE add_essay_drafts_created_at_stmt FROM @add_essay_drafts_created_at_sql;
EXECUTE add_essay_drafts_created_at_stmt;
DEALLOCATE PREPARE add_essay_drafts_created_at_stmt;

SET @essay_drafts_updated_at_missing = (
  SELECT COUNT(*) = 0
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'essay_drafts'
    AND column_name = 'updated_at'
);
SET @add_essay_drafts_updated_at_sql = IF(
  @essay_drafts_updated_at_missing,
  'ALTER TABLE essay_drafts ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at',
  'SELECT 1'
);
PREPARE add_essay_drafts_updated_at_stmt FROM @add_essay_drafts_updated_at_sql;
EXECUTE add_essay_drafts_updated_at_stmt;
DEALLOCATE PREPARE add_essay_drafts_updated_at_stmt;

SET @reference_materials_updated_at_missing = (
  SELECT COUNT(*) = 0
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'reference_materials'
    AND column_name = 'updated_at'
);
SET @add_reference_materials_updated_at_sql = IF(
  @reference_materials_updated_at_missing,
  'ALTER TABLE reference_materials ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at',
  'SELECT 1'
);
PREPARE add_reference_materials_updated_at_stmt FROM @add_reference_materials_updated_at_sql;
EXECUTE add_reference_materials_updated_at_stmt;
DEALLOCATE PREPARE add_reference_materials_updated_at_stmt;

CREATE TABLE IF NOT EXISTS document_profile_sections (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  section_type VARCHAR(64) NOT NULL,
  payload_json JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_document_profile_sections_user FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE KEY uk_document_profile_sections_user_type (user_id, section_type)
);

CREATE TABLE IF NOT EXISTS document_custom_fields (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  label VARCHAR(255) NOT NULL,
  field_type VARCHAR(64) NOT NULL,
  value TEXT NULL,
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_document_custom_fields_user FOREIGN KEY (user_id) REFERENCES users(id),
  KEY idx_document_custom_fields_user_deleted (user_id, deleted_at)
);
