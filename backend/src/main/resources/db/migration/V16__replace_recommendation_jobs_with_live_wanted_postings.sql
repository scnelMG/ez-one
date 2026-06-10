-- Replace recommendation jobs with live postings (as of 2026-06-10) and real logo assets.
-- Keep source rows intact and refresh their metadata (company, URL, title, deadline, logo).

INSERT INTO companies (
  name,
  domain,
  company_type,
  size,
  logo_url,
  logo_source_url,
  logo_status,
  logo_updated_at,
  created_at,
  updated_at
) VALUES
  ('Alirinsaram People', 'wanted.company.2154', 'COMPANY', 'SMALL',
   'https://image.wanted.co.kr/optimize?q=100&src=https://static.wanted.co.kr/images/company/2154/nnljqloiviaynehw__1080_790.png&w=700',
   'https://www.wanted.co.kr/wd/363227', 'SEEDED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Topcareer Insight', 'wanted.company.55287', 'COMPANY', 'MID',
   'https://image.wanted.co.kr/optimize?q=100&src=https://static.wanted.co.kr/images/company/55287/1fmkrnqd6b2wh4jm__1080_790.png&w=700',
   'https://www.wanted.co.kr/wd/346476', 'SEEDED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Madoe Wang', 'wanted.company.47347', 'COMPANY', 'SMALL',
   'https://image.wanted.co.kr/optimize?q=100&src=https://static.wanted.co.kr/images/company/47347/fso4egrut6artoyv__1080_790.png&w=700',
   'https://www.wanted.co.kr/wd/353076', 'SEEDED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Good Morning World', 'wanted.company.56761', 'COMPANY', 'MID',
   'https://image.wanted.co.kr/optimize?q=100&src=https://static.wanted.co.kr/images/company/56761/f5ijmabv5fbq6jxj__1080_790.jpg&w=700',
   'https://www.wanted.co.kr/wd/354441', 'SEEDED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON DUPLICATE KEY UPDATE
  logo_url = VALUES(logo_url),
  logo_source_url = VALUES(logo_source_url),
  logo_status = VALUES(logo_status),
  logo_updated_at = VALUES(logo_updated_at),
  updated_at = VALUES(updated_at);

UPDATE jobs j
SET
  company_id = (SELECT c.id FROM companies c WHERE c.domain = 'wanted.company.2154' LIMIT 1),
  title = 'Remote Accounting/Administration',
  role = 'Remote Accounting/Administration',
  deadline_label = '2026.06.30',
  deadline_at = '2026-06-30 23:59:59',
  url = 'https://www.wanted.co.kr/wd/363227'
WHERE j.source = 'RECOMMENDATION'
  AND j.url IN (
    'https://www.wanted.co.kr/wd/363227',
    'https://www.wanted.co.kr/wd/204081',
    'https://www.toss.im/career/job-detail?job_id=4076141003',
    'https://www.jasoseol.com/recruit/ez-one-demo-toss-frontend'
  );

UPDATE jobs j
SET
  company_id = (SELECT c.id FROM companies c WHERE c.domain = 'wanted.company.55287' LIMIT 1),
  title = 'Corporate FX Risk Manager',
  role = 'Corporate FX Risk Manager',
  deadline_label = '2026.03.15',
  deadline_at = '2026-03-15 23:59:59',
  url = 'https://www.wanted.co.kr/wd/346476'
WHERE j.source = 'RECOMMENDATION'
  AND j.url IN (
    'https://www.wanted.co.kr/wd/346476',
    'https://www.wanted.co.kr/wd/355373',
    'https://careers.linecorp.com/jobs/3006/',
    'https://careers.linecorp.com/jobs/3007/',
    'https://www.jasoseol.com/recruit/ez-one-demo-line-platform'
  );

UPDATE jobs j
SET
  company_id = (SELECT c.id FROM companies c WHERE c.domain = 'wanted.company.47347' LIMIT 1),
  title = 'Service Operations and Customer Support',
  role = 'Service Operations and Customer Support',
  deadline_label = '2026.06.01',
  deadline_at = '2026-06-01 23:59:59',
  url = 'https://www.wanted.co.kr/wd/353076'
WHERE j.source = 'RECOMMENDATION'
  AND j.url IN (
    'https://www.wanted.co.kr/wd/353076',
    'https://www.wanted.co.kr/wd/101761',
    'https://careers.kakao.com/jobs/P-14286',
    'https://recruit.navercorp.com/rcrt/view.do?annoId=30004954'
  );

UPDATE jobs j
SET
  company_id = (SELECT c.id FROM companies c WHERE c.domain = 'wanted.company.56761' LIMIT 1),
  title = 'Video Shooting and Editing',
  role = 'Video Shooting and Editing',
  deadline_label = '2026.05.15',
  deadline_at = '2026-05-15 23:59:59',
  url = 'https://www.wanted.co.kr/wd/354441'
WHERE j.source = 'RECOMMENDATION'
  AND j.url IN (
    'https://www.wanted.co.kr/wd/354441',
    'https://www.wanted.co.kr/wd/279145',
    'https://www.coupang.jobs/en/jobs/7714929/staff-backend-engineer-ecommerce-engineering/',
    'https://www.jasoseol.com/recruit/ez-one-demo-coupang-platform'
  );
