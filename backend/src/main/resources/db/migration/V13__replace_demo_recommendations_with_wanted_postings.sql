INSERT INTO companies (name, domain, company_type, size, logo_url, logo_source_url, logo_status, logo_updated_at, created_at)
VALUES
  ('서브원', 'serveone.co.kr', '대기업', '대기업', 'https://www.google.com/s2/favicons?domain=serveone.co.kr&sz=128', 'https://www.serveone.co.kr', 'SEEDED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('퍼플독', 'purpledog.co.kr', '스타트업', '중소기업', 'https://www.google.com/s2/favicons?domain=purpledog.co.kr&sz=128', 'https://purpledog.co.kr', 'SEEDED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('플랜핏', 'planfit.ai', '스타트업', '중소기업', 'https://www.google.com/s2/favicons?domain=planfit.ai&sz=128', 'https://planfit.ai', 'SEEDED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON DUPLICATE KEY UPDATE
  logo_url = VALUES(logo_url),
  logo_source_url = VALUES(logo_source_url),
  logo_status = VALUES(logo_status),
  logo_updated_at = VALUES(logo_updated_at);

UPDATE jobs j
JOIN companies c ON c.domain = 'toss.im'
SET j.company_id = c.id,
    j.title = 'Frontend Developer',
    j.role = 'Frontend Developer',
    j.deadline_label = '상시',
    j.url = 'https://www.wanted.co.kr/wd/204081'
WHERE j.source = 'RECOMMENDATION'
  AND j.url IN (
    'https://toss.im/career/job-detail?job_id=4076141003',
    'https://www.jasoseol.com/recruit/ez-one-demo-toss-frontend'
  );

UPDATE jobs j
JOIN companies c ON c.domain = 'serveone.co.kr'
SET j.company_id = c.id,
    j.title = 'Frontend Developer',
    j.role = 'Frontend Developer',
    j.deadline_label = '상시',
    j.url = 'https://www.wanted.co.kr/wd/355373'
WHERE j.source = 'RECOMMENDATION'
  AND j.url IN (
    'https://careers.linecorp.com/jobs/3006/',
    'https://careers.linecorp.com/jobs/3007/',
    'https://www.jasoseol.com/recruit/ez-one-demo-line-platform'
  );

UPDATE jobs j
JOIN companies c ON c.domain = 'purpledog.co.kr'
SET j.company_id = c.id,
    j.title = '시니어 Java 백엔드 엔지니어 (신규서비스)',
    j.role = '시니어 Java 백엔드 엔지니어 (신규서비스)',
    j.deadline_label = '상시',
    j.url = 'https://www.wanted.co.kr/wd/101761'
WHERE j.source = 'RECOMMENDATION'
  AND j.url IN (
    'https://careers.kakao.com/jobs/P-14286',
    'https://recruit.navercorp.com/rcrt/view.do?annoId=30004954',
    'https://www.jasoseol.com/recruit/ez-one-demo-ohou-commerce'
  );

UPDATE jobs j
JOIN companies c ON c.domain = 'planfit.ai'
SET j.company_id = c.id,
    j.title = 'Frontend Developer',
    j.role = 'Frontend Developer',
    j.deadline_label = '상시',
    j.url = 'https://www.wanted.co.kr/wd/279145'
WHERE j.source = 'RECOMMENDATION'
  AND j.url IN (
    'https://www.coupang.jobs/en/jobs/7714929/staff-backend-engineer-ecommerce-engineering/',
    'https://www.jasoseol.com/recruit/ez-one-demo-coupang-platform'
  );
