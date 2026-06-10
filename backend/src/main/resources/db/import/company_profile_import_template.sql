-- Copy this file locally before editing real data.
-- Do not commit private API keys, paid data exports, or copied third-party text.

SET @company_name = '회사명';
SET @company_domain = 'example.com';
SET @corp_code = '00000000';
SET @source_url = 'https://example.com/source';

INSERT INTO companies (name, domain, company_type, size, created_at)
VALUES (@company_name, @company_domain, NULL, NULL, CURRENT_TIMESTAMP)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  updated_at = CURRENT_TIMESTAMP;

SET @company_id = (
  SELECT id
  FROM companies
  WHERE name = @company_name
    AND domain = @company_domain
  LIMIT 1
);

INSERT INTO company_profiles (
  company_id,
  corp_code,
  stock_code,
  business_number,
  industry,
  company_category,
  ceo_name,
  founded_at,
  employee_count,
  capital_amount,
  revenue_amount,
  homepage_url,
  address,
  profile_summary,
  source_updated_at
)
VALUES (
  @company_id,
  @corp_code,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  CURRENT_TIMESTAMP
)
ON DUPLICATE KEY UPDATE
  corp_code = VALUES(corp_code),
  stock_code = VALUES(stock_code),
  business_number = VALUES(business_number),
  industry = VALUES(industry),
  company_category = VALUES(company_category),
  ceo_name = VALUES(ceo_name),
  founded_at = VALUES(founded_at),
  employee_count = VALUES(employee_count),
  capital_amount = VALUES(capital_amount),
  revenue_amount = VALUES(revenue_amount),
  homepage_url = VALUES(homepage_url),
  address = VALUES(address),
  profile_summary = VALUES(profile_summary),
  source_updated_at = VALUES(source_updated_at);

INSERT INTO company_profile_sources (
  company_id,
  source_type,
  source_name,
  source_url,
  license_name,
  license_url,
  license_note,
  collected_at
)
VALUES (
  @company_id,
  'OPENDART',
  'OpenDART',
  @source_url,
  NULL,
  NULL,
  'Source URL recorded. Do not store private API key in SQL.',
  CURRENT_TIMESTAMP
)
ON DUPLICATE KEY UPDATE
  source_name = VALUES(source_name),
  license_name = VALUES(license_name),
  license_url = VALUES(license_url),
  license_note = VALUES(license_note),
  collected_at = VALUES(collected_at);
