INSERT INTO companies (name, domain, company_type, size, created_at)
VALUES
  ('카카오뱅크', 'kakaobank.com', '대기업', '대기업', CURRENT_TIMESTAMP),
  ('KB국민은행', 'kbstar.com', '금융권', '대기업', CURRENT_TIMESTAMP),
  ('국민은행', 'kbstar.com', '금융권', '대기업', CURRENT_TIMESTAMP),
  ('신한은행', 'shinhan.com', '금융권', '대기업', CURRENT_TIMESTAMP),
  ('하나은행', 'kebhana.com', '금융권', '대기업', CURRENT_TIMESTAMP),
  ('우리은행', 'wooribank.com', '금융권', '대기업', CURRENT_TIMESTAMP),
  ('토스뱅크', 'tossbank.com', '금융권', '대기업', CURRENT_TIMESTAMP),
  ('카카오페이', 'kakaopay.com', '대기업', '대기업', CURRENT_TIMESTAMP),
  ('네이버', 'navercorp.com', '대기업', '대기업', CURRENT_TIMESTAMP),
  ('네이버페이', 'naverfincorp.com', '대기업', '대기업', CURRENT_TIMESTAMP),
  ('라인', 'line.me', '대기업', '대기업', CURRENT_TIMESTAMP),
  ('LINE', 'line.me', '대기업', '대기업', CURRENT_TIMESTAMP),
  ('쿠팡', 'coupang.com', '대기업', '대기업', CURRENT_TIMESTAMP),
  ('당근', 'daangn.com', '스타트업', '스타트업', CURRENT_TIMESTAMP),
  ('신용보증기금', 'kodit.co.kr', '공공기관', '공공기관', CURRENT_TIMESTAMP),
  ('신용보증기금(KODIT)', 'kodit.co.kr', '공공기관', '공공기관', CURRENT_TIMESTAMP),
  ('한국교통안전공단', 'kotsa.or.kr', '공공기관', '공공기관', CURRENT_TIMESTAMP),
  ('한국교통안전공단(KOTSA)', 'kotsa.or.kr', '공공기관', '공공기관', CURRENT_TIMESTAMP),
  ('한국평가데이터', 'kodata.co.kr', '금융권', '중견기업', CURRENT_TIMESTAMP),
  ('저축은행중앙회', 'fsb.or.kr', '금융권', '중견기업', CURRENT_TIMESTAMP),
  ('AXA손해보험', 'axa.co.kr', '금융권', '대기업', CURRENT_TIMESTAMP)
ON DUPLICATE KEY UPDATE
  company_type = COALESCE(NULLIF(company_type, ''), VALUES(company_type)),
  size = COALESCE(NULLIF(size, ''), VALUES(size));

INSERT INTO company_profiles (company_id, industry, homepage_url, source_priority, source_updated_at, created_at)
SELECT c.id, known.industry, known.domain, 'RULE_BASED_INTERNAL', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM companies c
JOIN (
  SELECT '카카오뱅크' AS name, 'kakaobank.com' AS domain, '금융' AS industry
  UNION ALL SELECT 'KB국민은행', 'kbstar.com', '금융'
  UNION ALL SELECT '국민은행', 'kbstar.com', '금융'
  UNION ALL SELECT '신한은행', 'shinhan.com', '금융'
  UNION ALL SELECT '하나은행', 'kebhana.com', '금융'
  UNION ALL SELECT '우리은행', 'wooribank.com', '금융'
  UNION ALL SELECT '토스뱅크', 'tossbank.com', '금융'
  UNION ALL SELECT '카카오페이', 'kakaopay.com', '금융'
  UNION ALL SELECT '네이버', 'navercorp.com', 'IT/플랫폼'
  UNION ALL SELECT '네이버페이', 'naverfincorp.com', '금융'
  UNION ALL SELECT '라인', 'line.me', 'IT/플랫폼'
  UNION ALL SELECT 'LINE', 'line.me', 'IT/플랫폼'
  UNION ALL SELECT '쿠팡', 'coupang.com', '커머스'
  UNION ALL SELECT '당근', 'daangn.com', 'IT/플랫폼'
  UNION ALL SELECT '신용보증기금', 'kodit.co.kr', '공공/금융'
  UNION ALL SELECT '신용보증기금(KODIT)', 'kodit.co.kr', '공공/금융'
  UNION ALL SELECT '한국교통안전공단', 'kotsa.or.kr', '공공'
  UNION ALL SELECT '한국교통안전공단(KOTSA)', 'kotsa.or.kr', '공공'
  UNION ALL SELECT '한국평가데이터', 'kodata.co.kr', '금융/데이터'
  UNION ALL SELECT '저축은행중앙회', 'fsb.or.kr', '금융'
  UNION ALL SELECT 'AXA손해보험', 'axa.co.kr', '금융'
) known ON known.name = c.name AND known.domain = c.domain
ON DUPLICATE KEY UPDATE
  industry = COALESCE(NULLIF(industry, ''), VALUES(industry)),
  homepage_url = COALESCE(NULLIF(homepage_url, ''), VALUES(homepage_url));

UPDATE jobs j
JOIN companies bad ON bad.id = j.company_id
JOIN companies good ON good.name = bad.name
SET j.company_id = good.id
WHERE (
    bad.domain IN ('unknown', 'jasoseol.com', 'saramin.co.kr', 'jobkorea.co.kr', 'wanted.co.kr', 'incruit.com', 'catch.co.kr', 'linkareer.com', 'programmers.co.kr')
    OR bad.domain LIKE '%.jasoseol.com'
    OR bad.domain LIKE '%.saramin.co.kr'
    OR bad.domain LIKE '%.jobkorea.co.kr'
    OR bad.domain LIKE '%.wanted.co.kr'
    OR bad.domain LIKE '%.incruit.com'
    OR bad.domain LIKE '%.catch.co.kr'
    OR bad.domain LIKE '%.linkareer.com'
    OR bad.domain LIKE '%.programmers.co.kr'
  )
  AND (
    (bad.name = '카카오뱅크' AND good.domain = 'kakaobank.com')
    OR (bad.name IN ('KB국민은행', '국민은행') AND good.domain = 'kbstar.com')
    OR (bad.name = '신한은행' AND good.domain = 'shinhan.com')
    OR (bad.name = '하나은행' AND good.domain = 'kebhana.com')
    OR (bad.name = '우리은행' AND good.domain = 'wooribank.com')
    OR (bad.name = '토스뱅크' AND good.domain = 'tossbank.com')
    OR (bad.name = '카카오페이' AND good.domain = 'kakaopay.com')
    OR (bad.name = '네이버' AND good.domain = 'navercorp.com')
    OR (bad.name = '네이버페이' AND good.domain = 'naverfincorp.com')
    OR (bad.name IN ('라인', 'LINE') AND good.domain = 'line.me')
    OR (bad.name = '쿠팡' AND good.domain = 'coupang.com')
    OR (bad.name = '당근' AND good.domain = 'daangn.com')
    OR (bad.name IN ('신용보증기금', '신용보증기금(KODIT)') AND good.domain = 'kodit.co.kr')
    OR (bad.name IN ('한국교통안전공단', '한국교통안전공단(KOTSA)') AND good.domain = 'kotsa.or.kr')
    OR (bad.name = '한국평가데이터' AND good.domain = 'kodata.co.kr')
    OR (bad.name = '저축은행중앙회' AND good.domain = 'fsb.or.kr')
    OR (bad.name = 'AXA손해보험' AND good.domain = 'axa.co.kr')
  );
