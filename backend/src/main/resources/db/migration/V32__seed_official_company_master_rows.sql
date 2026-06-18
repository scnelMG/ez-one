INSERT INTO companies (name, domain, company_type, size, created_at)
VALUES ('카카오뱅크', 'kakaobank.com', '대기업', '대기업', CURRENT_TIMESTAMP)
ON DUPLICATE KEY UPDATE
  company_type = VALUES(company_type),
  size = VALUES(size),
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO company_profiles (
  company_id,
  industry,
  homepage_url,
  source_priority,
  source_updated_at,
  created_at
)
SELECT
  c.id,
  '금융',
  'https://www.kakaobank.com',
  'OFFICIAL_CLASSIFICATION',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM companies c
WHERE c.name = '카카오뱅크'
  AND c.domain = 'kakaobank.com'
ON DUPLICATE KEY UPDATE
  industry = VALUES(industry),
  homepage_url = VALUES(homepage_url),
  source_priority = VALUES(source_priority),
  source_updated_at = CURRENT_TIMESTAMP;

INSERT INTO company_profile_sources (
  company_id,
  source_type,
  source_name,
  source_url,
  license_note,
  collected_at
)
SELECT
  c.id,
  'FTC_BUSINESS_GROUP',
  '공정거래위원회 기업집단포털',
  'https://www.egroup.go.kr/',
  '공시대상기업집단 소속회사 기준',
  CURRENT_TIMESTAMP
FROM companies c
WHERE c.name = '카카오뱅크'
  AND c.domain = 'kakaobank.com'
ON DUPLICATE KEY UPDATE
  source_name = VALUES(source_name),
  license_note = VALUES(license_note),
  collected_at = VALUES(collected_at);
