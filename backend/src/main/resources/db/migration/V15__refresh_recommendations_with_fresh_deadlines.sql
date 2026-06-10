-- Refresh recommendation posts with the latest metadata and deadlines.
-- Keep existing recommendation rows and update their company profile, posting URL, and deadline.

UPDATE companies
SET name = CASE domain
    WHEN 'toss.im' THEN '토스'
    WHEN 'serveone.co.kr' THEN 'ServeOne'
    WHEN 'purpledog.co.kr' THEN '퍼플독'
    WHEN 'planfit.ai' THEN 'Planfit'
    ELSE name
  END,
  logo_url = CASE domain
    WHEN 'toss.im' THEN 'https://www.google.com/s2/favicons?domain=toss.im&sz=256'
    WHEN 'serveone.co.kr' THEN 'https://www.google.com/s2/favicons?domain=serveone.co.kr&sz=256'
    WHEN 'purpledog.co.kr' THEN 'https://www.google.com/s2/favicons?domain=purpledog.co.kr&sz=256'
    WHEN 'planfit.ai' THEN 'https://www.google.com/s2/favicons?domain=planfit.ai&sz=256'
    ELSE logo_url
  END,
  logo_source_url = CASE domain
    WHEN 'toss.im' THEN 'https://toss.im'
    WHEN 'serveone.co.kr' THEN 'https://www.serveone.co.kr'
    WHEN 'purpledog.co.kr' THEN 'https://purpledog.co.kr'
    WHEN 'planfit.ai' THEN 'https://planfit.ai'
    ELSE logo_source_url
  END,
  logo_status = 'SEEDED',
  logo_updated_at = CURRENT_TIMESTAMP
WHERE domain IN ('toss.im', 'serveone.co.kr', 'purpledog.co.kr', 'planfit.ai');

UPDATE jobs
SET
  company_id = (SELECT id FROM companies WHERE domain = 'toss.im' LIMIT 1),
  title = 'Frontend Developer',
  role = 'Frontend Developer',
  url = 'https://www.wanted.co.kr/wd/204081',
  deadline_at = DATE_ADD(CURDATE(), INTERVAL 4 DAY),
  deadline_label = DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 4 DAY), '%Y.%m.%d')
WHERE source = 'RECOMMENDATION'
  AND url IN (
    'https://www.wanted.co.kr/wd/204081',
    'https://toss.im/career/job-detail?job_id=4076141003',
    'https://www.jasoseol.com/recruit/ez-one-demo-toss-frontend'
  );

UPDATE jobs
SET
  company_id = (SELECT id FROM companies WHERE domain = 'serveone.co.kr' LIMIT 1),
  title = 'Frontend Developer',
  role = 'Frontend Developer',
  url = 'https://www.wanted.co.kr/wd/355373',
  deadline_at = DATE_ADD(CURDATE(), INTERVAL 7 DAY),
  deadline_label = DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 7 DAY), '%Y.%m.%d')
WHERE source = 'RECOMMENDATION'
  AND url IN (
    'https://www.wanted.co.kr/wd/355373',
    'https://careers.linecorp.com/jobs/3006/',
    'https://www.jasoseol.com/recruit/ez-one-demo-line-platform'
  );

UPDATE jobs
SET
  company_id = (SELECT id FROM companies WHERE domain = 'purpledog.co.kr' LIMIT 1),
  title = 'Java Backend Developer (서비스 플랫폼)',
  role = 'Java Backend Developer (서비스 플랫폼)',
  url = 'https://www.wanted.co.kr/wd/101761',
  deadline_at = DATE_ADD(CURDATE(), INTERVAL 10 DAY),
  deadline_label = DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 10 DAY), '%Y.%m.%d')
WHERE source = 'RECOMMENDATION'
  AND url IN (
    'https://www.wanted.co.kr/wd/101761',
    'https://careers.kakao.com/jobs/P-14286',
    'https://recruit.navercorp.com/rcrt/view.do?annoId=30004954',
    'https://www.jasoseol.com/recruit/ez-one-demo-ohou-commerce'
  );

UPDATE jobs
SET
  company_id = (SELECT id FROM companies WHERE domain = 'planfit.ai' LIMIT 1),
  title = 'Frontend Developer',
  role = 'Frontend Developer',
  url = 'https://www.wanted.co.kr/wd/279145',
  deadline_at = DATE_ADD(CURDATE(), INTERVAL 13 DAY),
  deadline_label = DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 13 DAY), '%Y.%m.%d')
WHERE source = 'RECOMMENDATION'
  AND url IN (
    'https://www.wanted.co.kr/wd/279145',
    'https://www.coupang.jobs/en/jobs/7714929/staff-backend-engineer-ecommerce-engineering/',
    'https://www.jasoseol.com/recruit/ez-one-demo-coupang-platform'
  );
