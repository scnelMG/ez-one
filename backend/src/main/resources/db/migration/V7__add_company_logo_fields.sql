SET @companies_logo_url_missing = (
  SELECT COUNT(*) = 0
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'companies'
    AND column_name = 'logo_url'
);
SET @add_companies_logo_url_sql = IF(
  @companies_logo_url_missing,
  'ALTER TABLE companies ADD COLUMN logo_url VARCHAR(1024) NULL AFTER size',
  'SELECT 1'
);
PREPARE add_companies_logo_url_stmt FROM @add_companies_logo_url_sql;
EXECUTE add_companies_logo_url_stmt;
DEALLOCATE PREPARE add_companies_logo_url_stmt;

SET @companies_logo_source_url_missing = (
  SELECT COUNT(*) = 0
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'companies'
    AND column_name = 'logo_source_url'
);
SET @add_companies_logo_source_url_sql = IF(
  @companies_logo_source_url_missing,
  'ALTER TABLE companies ADD COLUMN logo_source_url VARCHAR(1024) NULL AFTER logo_url',
  'SELECT 1'
);
PREPARE add_companies_logo_source_url_stmt FROM @add_companies_logo_source_url_sql;
EXECUTE add_companies_logo_source_url_stmt;
DEALLOCATE PREPARE add_companies_logo_source_url_stmt;

SET @companies_logo_status_missing = (
  SELECT COUNT(*) = 0
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'companies'
    AND column_name = 'logo_status'
);
SET @add_companies_logo_status_sql = IF(
  @companies_logo_status_missing,
  'ALTER TABLE companies ADD COLUMN logo_status VARCHAR(32) NULL AFTER logo_source_url',
  'SELECT 1'
);
PREPARE add_companies_logo_status_stmt FROM @add_companies_logo_status_sql;
EXECUTE add_companies_logo_status_stmt;
DEALLOCATE PREPARE add_companies_logo_status_stmt;

SET @companies_logo_updated_at_missing = (
  SELECT COUNT(*) = 0
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'companies'
    AND column_name = 'logo_updated_at'
);
SET @add_companies_logo_updated_at_sql = IF(
  @companies_logo_updated_at_missing,
  'ALTER TABLE companies ADD COLUMN logo_updated_at TIMESTAMP NULL AFTER logo_status',
  'SELECT 1'
);
PREPARE add_companies_logo_updated_at_stmt FROM @add_companies_logo_updated_at_sql;
EXECUTE add_companies_logo_updated_at_stmt;
DEALLOCATE PREPARE add_companies_logo_updated_at_stmt;

UPDATE companies
SET domain = 'unknown'
WHERE domain IS NULL OR domain = '';

SET @companies_domain_nullable = (
  SELECT COUNT(*) > 0
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'companies'
    AND column_name = 'domain'
    AND is_nullable = 'YES'
);
SET @modify_companies_domain_sql = IF(
  @companies_domain_nullable,
  'ALTER TABLE companies MODIFY COLUMN domain VARCHAR(255) NOT NULL',
  'SELECT 1'
);
PREPARE modify_companies_domain_stmt FROM @modify_companies_domain_sql;
EXECUTE modify_companies_domain_stmt;
DEALLOCATE PREPARE modify_companies_domain_stmt;

SET @companies_name_unique_exists = (
  SELECT COUNT(*) > 0
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'companies'
    AND index_name = 'uk_companies_name'
);
SET @drop_companies_name_unique_sql = IF(
  @companies_name_unique_exists,
  'ALTER TABLE companies DROP INDEX uk_companies_name',
  'SELECT 1'
);
PREPARE drop_companies_name_unique_stmt FROM @drop_companies_name_unique_sql;
EXECUTE drop_companies_name_unique_stmt;
DEALLOCATE PREPARE drop_companies_name_unique_stmt;

SET @companies_name_domain_unique_missing = (
  SELECT COUNT(*) = 0
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'companies'
    AND index_name = 'uk_companies_name_domain'
);
SET @add_companies_name_domain_unique_sql = IF(
  @companies_name_domain_unique_missing,
  'ALTER TABLE companies ADD UNIQUE KEY uk_companies_name_domain (name, domain)',
  'SELECT 1'
);
PREPARE add_companies_name_domain_unique_stmt FROM @add_companies_name_domain_unique_sql;
EXECUTE add_companies_name_domain_unique_stmt;
DEALLOCATE PREPARE add_companies_name_domain_unique_stmt;
