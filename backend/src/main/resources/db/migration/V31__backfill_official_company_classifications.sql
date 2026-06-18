UPDATE companies c
JOIN (
  SELECT '카카오뱅크' AS company_name, 'kakaobank.com' AS domain, '대기업' AS company_type, '대기업' AS size, '금융' AS industry, 'https://www.kakaobank.com' AS homepage_url, 'FTC_BUSINESS_GROUP' AS source_type, '공정거래위원회 기업집단포털' AS source_name, 'https://www.egroup.go.kr/' AS source_url, '공시대상기업집단 소속회사 기준' AS license_note
  UNION ALL SELECT '카카오', 'kakaocorp.com', '대기업', '대기업', 'IT/플랫폼', 'https://www.kakaocorp.com', 'FTC_BUSINESS_GROUP', '공정거래위원회 기업집단포털', 'https://www.egroup.go.kr/', '공시대상기업집단 소속회사 기준'
  UNION ALL SELECT '카카오페이', 'kakaopay.com', '대기업', '대기업', '금융', 'https://www.kakaopay.com', 'FTC_BUSINESS_GROUP', '공정거래위원회 기업집단포털', 'https://www.egroup.go.kr/', '공시대상기업집단 소속회사 기준'
  UNION ALL SELECT '네이버', 'navercorp.com', '대기업', '대기업', 'IT/플랫폼', 'https://www.navercorp.com', 'FTC_BUSINESS_GROUP', '공정거래위원회 기업집단포털', 'https://www.egroup.go.kr/', '공시대상기업집단 소속회사 기준'
  UNION ALL SELECT '네이버페이', 'naverfincorp.com', '대기업', '대기업', '금융', 'https://www.naverfincorp.com', 'FTC_BUSINESS_GROUP', '공정거래위원회 기업집단포털', 'https://www.egroup.go.kr/', '공시대상기업집단 소속회사 기준'
  UNION ALL SELECT 'NAVER Cloud', 'navercloudcorp.com', '대기업', '대기업', 'IT/클라우드', 'https://www.navercloudcorp.com', 'FTC_BUSINESS_GROUP', '공정거래위원회 기업집단포털', 'https://www.egroup.go.kr/', '공시대상기업집단 소속회사 기준'
  UNION ALL SELECT 'LINE', 'line.me', '대기업', '대기업', 'IT/플랫폼', 'https://line.me', 'FTC_BUSINESS_GROUP', '공정거래위원회 기업집단포털', 'https://www.egroup.go.kr/', '공시대상기업집단 소속회사 기준'
  UNION ALL SELECT 'KB국민은행', 'kbstar.com', '대기업', '대기업', '금융', 'https://www.kbstar.com', 'FTC_BUSINESS_GROUP', '공정거래위원회 기업집단포털', 'https://www.egroup.go.kr/', '공시대상기업집단 소속회사 기준'
  UNION ALL SELECT 'kb국민카드', 'kbcard.com', '대기업', '대기업', '금융', 'https://card.kbcard.com', 'FTC_BUSINESS_GROUP', '공정거래위원회 기업집단포털', 'https://www.egroup.go.kr/', '공시대상기업집단 소속회사 기준'
  UNION ALL SELECT '신한은행', 'shinhan.com', '대기업', '대기업', '금융', 'https://www.shinhan.com', 'FTC_BUSINESS_GROUP', '공정거래위원회 기업집단포털', 'https://www.egroup.go.kr/', '공시대상기업집단 소속회사 기준'
  UNION ALL SELECT '하나은행', 'kebhana.com', '대기업', '대기업', '금융', 'https://www.kebhana.com', 'FTC_BUSINESS_GROUP', '공정거래위원회 기업집단포털', 'https://www.egroup.go.kr/', '공시대상기업집단 소속회사 기준'
  UNION ALL SELECT '하나은행 체험형 인턴', 'kebhana.com', '대기업', '대기업', '금융', 'https://www.kebhana.com', 'FTC_BUSINESS_GROUP', '공정거래위원회 기업집단포털', 'https://www.egroup.go.kr/', '공시대상기업집단 소속회사 기준'
  UNION ALL SELECT '우리은행', 'wooribank.com', '대기업', '대기업', '금융', 'https://www.wooribank.com', 'FTC_BUSINESS_GROUP', '공정거래위원회 기업집단포털', 'https://www.egroup.go.kr/', '공시대상기업집단 소속회사 기준'
  UNION ALL SELECT 'IBK 기업은행', 'ibk.co.kr', '공공기관', '공공기관', '금융', 'https://www.ibk.co.kr', 'ALIO_PUBLIC_INSTITUTION', 'ALIO 공공기관 경영정보 공개시스템', 'https://alio.go.kr/', '공공기관 경영정보 공개시스템 기준'
  UNION ALL SELECT 'ibk기업은행', 'ibk.co.kr', '공공기관', '공공기관', '금융', 'https://www.ibk.co.kr', 'ALIO_PUBLIC_INSTITUTION', 'ALIO 공공기관 경영정보 공개시스템', 'https://alio.go.kr/', '공공기관 경영정보 공개시스템 기준'
  UNION ALL SELECT '신용보증기금(KODIT)', 'kodit.co.kr', '공공기관', '공공기관', '공공/금융', 'https://www.kodit.co.kr', 'ALIO_PUBLIC_INSTITUTION', 'ALIO 공공기관 경영정보 공개시스템', 'https://alio.go.kr/', '공공기관 경영정보 공개시스템 기준'
  UNION ALL SELECT '한국교통안전공단(KOTSA)', 'kotsa.or.kr', '공공기관', '공공기관', '공공', 'https://www.kotsa.or.kr', 'ALIO_PUBLIC_INSTITUTION', 'ALIO 공공기관 경영정보 공개시스템', 'https://alio.go.kr/', '공공기관 경영정보 공개시스템 기준'
  UNION ALL SELECT '예금보험공사', 'kdic.or.kr', '공공기관', '공공기관', '공공/금융', 'https://www.kdic.or.kr', 'ALIO_PUBLIC_INSTITUTION', 'ALIO 공공기관 경영정보 공개시스템', 'https://alio.go.kr/', '공공기관 경영정보 공개시스템 기준'
  UNION ALL SELECT '한국은행', 'bok.or.kr', '공공기관', '공공기관', '공공/금융', 'https://www.bok.or.kr', 'ALIO_PUBLIC_INSTITUTION', 'ALIO 공공기관 경영정보 공개시스템', 'https://alio.go.kr/', '공공기관 경영정보 공개시스템 기준'
  UNION ALL SELECT '전력거래소', 'kpx.or.kr', '공공기관', '공공기관', '공공/에너지', 'https://www.kpx.or.kr', 'ALIO_PUBLIC_INSTITUTION', 'ALIO 공공기관 경영정보 공개시스템', 'https://alio.go.kr/', '공공기관 경영정보 공개시스템 기준'
) o ON o.company_name = c.name
SET
  c.company_type = o.company_type,
  c.size = o.size,
  c.domain = CASE
    WHEN c.domain = 'unknown'
      OR c.domain LIKE '%.wanted.company.%'
      OR c.domain IN ('jasoseol.com', 'www.jasoseol.com')
      THEN o.domain
    ELSE c.domain
  END,
  c.updated_at = CURRENT_TIMESTAMP;

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
  o.industry,
  o.homepage_url,
  'OFFICIAL_CLASSIFICATION',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM companies c
JOIN (
  SELECT '카카오뱅크' AS company_name, '금융' AS industry, 'https://www.kakaobank.com' AS homepage_url
  UNION ALL SELECT '카카오', 'IT/플랫폼', 'https://www.kakaocorp.com'
  UNION ALL SELECT '카카오페이', '금융', 'https://www.kakaopay.com'
  UNION ALL SELECT '네이버', 'IT/플랫폼', 'https://www.navercorp.com'
  UNION ALL SELECT '네이버페이', '금융', 'https://www.naverfincorp.com'
  UNION ALL SELECT 'NAVER Cloud', 'IT/클라우드', 'https://www.navercloudcorp.com'
  UNION ALL SELECT 'LINE', 'IT/플랫폼', 'https://line.me'
  UNION ALL SELECT 'KB국민은행', '금융', 'https://www.kbstar.com'
  UNION ALL SELECT 'kb국민카드', '금융', 'https://card.kbcard.com'
  UNION ALL SELECT '신한은행', '금융', 'https://www.shinhan.com'
  UNION ALL SELECT '하나은행', '금융', 'https://www.kebhana.com'
  UNION ALL SELECT '하나은행 체험형 인턴', '금융', 'https://www.kebhana.com'
  UNION ALL SELECT '우리은행', '금융', 'https://www.wooribank.com'
  UNION ALL SELECT 'IBK 기업은행', '금융', 'https://www.ibk.co.kr'
  UNION ALL SELECT 'ibk기업은행', '금융', 'https://www.ibk.co.kr'
  UNION ALL SELECT '신용보증기금(KODIT)', '공공/금융', 'https://www.kodit.co.kr'
  UNION ALL SELECT '한국교통안전공단(KOTSA)', '공공', 'https://www.kotsa.or.kr'
  UNION ALL SELECT '예금보험공사', '공공/금융', 'https://www.kdic.or.kr'
  UNION ALL SELECT '한국은행', '공공/금융', 'https://www.bok.or.kr'
  UNION ALL SELECT '전력거래소', '공공/에너지', 'https://www.kpx.or.kr'
) o ON o.company_name = c.name
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
  o.source_type,
  o.source_name,
  o.source_url,
  o.license_note,
  CURRENT_TIMESTAMP
FROM companies c
JOIN (
  SELECT '카카오뱅크' AS company_name, 'FTC_BUSINESS_GROUP' AS source_type, '공정거래위원회 기업집단포털' AS source_name, 'https://www.egroup.go.kr/' AS source_url, '공시대상기업집단 소속회사 기준' AS license_note
  UNION ALL SELECT '카카오', 'FTC_BUSINESS_GROUP', '공정거래위원회 기업집단포털', 'https://www.egroup.go.kr/', '공시대상기업집단 소속회사 기준'
  UNION ALL SELECT '카카오페이', 'FTC_BUSINESS_GROUP', '공정거래위원회 기업집단포털', 'https://www.egroup.go.kr/', '공시대상기업집단 소속회사 기준'
  UNION ALL SELECT '네이버', 'FTC_BUSINESS_GROUP', '공정거래위원회 기업집단포털', 'https://www.egroup.go.kr/', '공시대상기업집단 소속회사 기준'
  UNION ALL SELECT '네이버페이', 'FTC_BUSINESS_GROUP', '공정거래위원회 기업집단포털', 'https://www.egroup.go.kr/', '공시대상기업집단 소속회사 기준'
  UNION ALL SELECT 'NAVER Cloud', 'FTC_BUSINESS_GROUP', '공정거래위원회 기업집단포털', 'https://www.egroup.go.kr/', '공시대상기업집단 소속회사 기준'
  UNION ALL SELECT 'LINE', 'FTC_BUSINESS_GROUP', '공정거래위원회 기업집단포털', 'https://www.egroup.go.kr/', '공시대상기업집단 소속회사 기준'
  UNION ALL SELECT 'KB국민은행', 'FTC_BUSINESS_GROUP', '공정거래위원회 기업집단포털', 'https://www.egroup.go.kr/', '공시대상기업집단 소속회사 기준'
  UNION ALL SELECT 'kb국민카드', 'FTC_BUSINESS_GROUP', '공정거래위원회 기업집단포털', 'https://www.egroup.go.kr/', '공시대상기업집단 소속회사 기준'
  UNION ALL SELECT '신한은행', 'FTC_BUSINESS_GROUP', '공정거래위원회 기업집단포털', 'https://www.egroup.go.kr/', '공시대상기업집단 소속회사 기준'
  UNION ALL SELECT '하나은행', 'FTC_BUSINESS_GROUP', '공정거래위원회 기업집단포털', 'https://www.egroup.go.kr/', '공시대상기업집단 소속회사 기준'
  UNION ALL SELECT '하나은행 체험형 인턴', 'FTC_BUSINESS_GROUP', '공정거래위원회 기업집단포털', 'https://www.egroup.go.kr/', '공시대상기업집단 소속회사 기준'
  UNION ALL SELECT '우리은행', 'FTC_BUSINESS_GROUP', '공정거래위원회 기업집단포털', 'https://www.egroup.go.kr/', '공시대상기업집단 소속회사 기준'
  UNION ALL SELECT 'IBK 기업은행', 'ALIO_PUBLIC_INSTITUTION', 'ALIO 공공기관 경영정보 공개시스템', 'https://alio.go.kr/', '공공기관 경영정보 공개시스템 기준'
  UNION ALL SELECT 'ibk기업은행', 'ALIO_PUBLIC_INSTITUTION', 'ALIO 공공기관 경영정보 공개시스템', 'https://alio.go.kr/', '공공기관 경영정보 공개시스템 기준'
  UNION ALL SELECT '신용보증기금(KODIT)', 'ALIO_PUBLIC_INSTITUTION', 'ALIO 공공기관 경영정보 공개시스템', 'https://alio.go.kr/', '공공기관 경영정보 공개시스템 기준'
  UNION ALL SELECT '한국교통안전공단(KOTSA)', 'ALIO_PUBLIC_INSTITUTION', 'ALIO 공공기관 경영정보 공개시스템', 'https://alio.go.kr/', '공공기관 경영정보 공개시스템 기준'
  UNION ALL SELECT '예금보험공사', 'ALIO_PUBLIC_INSTITUTION', 'ALIO 공공기관 경영정보 공개시스템', 'https://alio.go.kr/', '공공기관 경영정보 공개시스템 기준'
  UNION ALL SELECT '한국은행', 'ALIO_PUBLIC_INSTITUTION', 'ALIO 공공기관 경영정보 공개시스템', 'https://alio.go.kr/', '공공기관 경영정보 공개시스템 기준'
  UNION ALL SELECT '전력거래소', 'ALIO_PUBLIC_INSTITUTION', 'ALIO 공공기관 경영정보 공개시스템', 'https://alio.go.kr/', '공공기관 경영정보 공개시스템 기준'
) o ON o.company_name = c.name
ON DUPLICATE KEY UPDATE
  source_name = VALUES(source_name),
  license_note = VALUES(license_note),
  collected_at = VALUES(collected_at);
