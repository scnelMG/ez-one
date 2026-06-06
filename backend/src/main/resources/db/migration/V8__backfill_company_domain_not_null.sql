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
