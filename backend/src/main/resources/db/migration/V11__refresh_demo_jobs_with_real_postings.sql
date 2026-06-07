INSERT INTO companies (name, domain, company_type, size, logo_url, logo_source_url, logo_status, logo_updated_at, created_at)
VALUES
  ('카카오', 'kakao.com', '대기업', '대기업', 'https://www.google.com/s2/favicons?domain=kakao.com&sz=128', 'https://www.kakao.com', 'SEEDED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
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
    j.url = 'https://toss.im/career/job-detail?job_id=4076141003'
WHERE j.url = 'https://www.jasoseol.com/recruit/ez-one-demo-toss-frontend';

UPDATE jobs j
JOIN companies c ON c.domain = 'line.me'
SET j.company_id = c.id,
    j.title = 'LINE Pay Hybrid Engineer (Native & Frontend)',
    j.role = 'LINE Pay Hybrid Engineer (Native & Frontend)',
    j.deadline_label = '상시',
    j.url = 'https://careers.linecorp.com/jobs/3006/'
WHERE j.url = 'https://www.jasoseol.com/recruit/ez-one-demo-line-platform';

UPDATE jobs j
JOIN companies c ON c.domain = 'kakao.com'
SET j.company_id = c.id,
    j.title = 'Machine Learning Engineer (Search/ML/LLM) (신입)',
    j.role = 'Machine Learning Engineer (Search/ML/LLM) (신입)',
    j.deadline_label = '상시',
    j.url = 'https://careers.kakao.com/jobs/P-14286'
WHERE j.url = 'https://www.jasoseol.com/recruit/ez-one-demo-ohou-commerce';

UPDATE jobs j
JOIN companies c ON c.domain = 'coupang.com'
SET j.company_id = c.id,
    j.title = 'Staff Backend Engineer - eCommerce Engineering',
    j.role = 'Staff Backend Engineer - eCommerce Engineering',
    j.deadline_label = '상시',
    j.url = 'https://www.coupang.jobs/en/jobs/7714929/staff-backend-engineer-ecommerce-engineering/'
WHERE j.url = 'https://www.jasoseol.com/recruit/ez-one-demo-coupang-platform';

UPDATE jobs j
JOIN companies c ON c.domain = 'daangn.com'
SET j.company_id = c.id,
    j.title = 'Software Engineer, Backend | 나의당근',
    j.role = 'Software Engineer, Backend | 나의당근',
    j.deadline_label = '상시',
    j.url = 'https://about.daangn.com/jobs/software-engineer-backend/'
WHERE j.url = 'https://www.jasoseol.com/recruit/ez-one-demo-daangn-product';

UPDATE jobs j
JOIN companies c ON c.domain = 'kakaopay.com'
SET j.company_id = c.id,
    j.title = '서비스플랫폼 Backend Engineer',
    j.role = '서비스플랫폼 Backend Engineer',
    j.deadline_label = '마감',
    j.url = 'https://careers.kakao.com/jobs/S-4714'
WHERE j.url = 'https://www.jasoseol.com/recruit/ez-one-demo-kakaopay-server';

UPDATE jobs j
JOIN companies c ON c.domain = 'navercorp.com'
SET j.company_id = c.id,
    j.title = 'Backend Engineer',
    j.role = 'Backend Engineer',
    j.deadline_label = '상시',
    j.url = 'https://recruit.navercorp.com/'
WHERE j.url = 'https://www.jasoseol.com/recruit/ez-one-demo-naver-backend';

UPDATE reference_materials r
SET r.url = CASE r.url
    WHEN 'https://www.jasoseol.com/recruit/ez-one-demo-daangn-product' THEN 'https://about.daangn.com/jobs/software-engineer-backend/'
    WHEN 'https://www.jasoseol.com/recruit/ez-one-demo-kakaopay-server' THEN 'https://careers.kakao.com/jobs/S-4714'
    WHEN 'https://www.jasoseol.com/recruit/ez-one-demo-naver-backend' THEN 'https://recruit.navercorp.com/'
    ELSE r.url
  END
WHERE r.url IN (
  'https://www.jasoseol.com/recruit/ez-one-demo-daangn-product',
  'https://www.jasoseol.com/recruit/ez-one-demo-kakaopay-server',
  'https://www.jasoseol.com/recruit/ez-one-demo-naver-backend'
);
