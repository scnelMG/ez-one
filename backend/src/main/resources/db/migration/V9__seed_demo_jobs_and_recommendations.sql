INSERT IGNORE INTO users (id, email, name, nickname, provider, provider_id, profile_completed, created_at, updated_at)
VALUES (1, 'demo@ez-one.local', 'Demo User', '민규', 'LOCAL', 'ez-one-demo-user', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO companies (name, domain, company_type, size, logo_url, logo_source_url, logo_status, logo_updated_at, created_at)
VALUES
  ('LINE', 'line.me', '대기업', '대기업', 'https://logo.clearbit.com/line.me', 'https://line.me', 'SEEDED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('오늘의집', 'ohou.se', '스타트업', '중견기업', 'https://logo.clearbit.com/ohou.se', 'https://ohou.se', 'SEEDED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('토스', 'toss.im', '스타트업', '대기업', 'https://logo.clearbit.com/toss.im', 'https://toss.im', 'SEEDED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('쿠팡', 'coupang.com', '대기업', '대기업', 'https://logo.clearbit.com/coupang.com', 'https://www.coupang.com', 'SEEDED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('네이버', 'navercorp.com', '대기업', '대기업', 'https://logo.clearbit.com/navercorp.com', 'https://www.navercorp.com', 'SEEDED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('카카오페이', 'kakaopay.com', '대기업', '대기업', 'https://logo.clearbit.com/kakaopay.com', 'https://www.kakaopay.com', 'SEEDED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('당근', 'daangn.com', '스타트업', '중견기업', 'https://logo.clearbit.com/daangn.com', 'https://www.daangn.com', 'SEEDED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON DUPLICATE KEY UPDATE
  logo_url = COALESCE(logo_url, VALUES(logo_url)),
  logo_source_url = COALESCE(logo_source_url, VALUES(logo_source_url)),
  logo_status = COALESCE(logo_status, VALUES(logo_status)),
  logo_updated_at = COALESCE(logo_updated_at, VALUES(logo_updated_at));

INSERT INTO jobs (company_id, title, role, deadline_label, source, url, created_at)
SELECT c.id, seed.title, seed.title, seed.deadline_label, seed.source, seed.url, CURRENT_TIMESTAMP
FROM (
  SELECT 'LINE' AS company_name, 'line.me' AS domain, 'Server Platform Engineer' AS title, 'D-7' AS deadline_label, 'RECOMMENDATION' AS source, 'https://www.jasoseol.com/recruit/ez-one-demo-line-platform' AS url
  UNION ALL SELECT '오늘의집', 'ohou.se', 'Commerce Backend Developer', 'D-10', 'RECOMMENDATION', 'https://www.jasoseol.com/recruit/ez-one-demo-ohou-commerce'
  UNION ALL SELECT '토스', 'toss.im', 'Frontend Developer', 'D-3', 'RECOMMENDATION', 'https://www.jasoseol.com/recruit/ez-one-demo-toss-frontend'
  UNION ALL SELECT '쿠팡', 'coupang.com', 'Platform Engineer', 'D-12', 'RECOMMENDATION', 'https://www.jasoseol.com/recruit/ez-one-demo-coupang-platform'
  UNION ALL SELECT '네이버', 'navercorp.com', 'Backend Engineer', '2026.06.30', 'DIRECT', 'https://www.jasoseol.com/recruit/ez-one-demo-naver-backend'
  UNION ALL SELECT '카카오페이', 'kakaopay.com', 'Server Developer', 'D-5', 'DIRECT', 'https://www.jasoseol.com/recruit/ez-one-demo-kakaopay-server'
  UNION ALL SELECT '당근', 'daangn.com', 'Product Engineer', 'D-9', 'DIRECT', 'https://www.jasoseol.com/recruit/ez-one-demo-daangn-product'
) seed
JOIN companies c ON c.name = seed.company_name AND c.domain = seed.domain
WHERE NOT EXISTS (
  SELECT 1 FROM jobs existing WHERE existing.url = seed.url
);

INSERT INTO basket_jobs (user_id, job_id, application_status, application_memo, status_updated_at, status_reason, saved_source, created_at)
SELECT 1, j.id, seed.application_status, '', CURRENT_TIMESTAMP, 'DEMO_SEED', 'DIRECT', CURRENT_TIMESTAMP
FROM (
  SELECT 'https://www.jasoseol.com/recruit/ez-one-demo-naver-backend' AS url, 'IN_PROGRESS' AS application_status
  UNION ALL SELECT 'https://www.jasoseol.com/recruit/ez-one-demo-kakaopay-server', 'READY'
  UNION ALL SELECT 'https://www.jasoseol.com/recruit/ez-one-demo-daangn-product', 'NOT_APPLIED'
) seed
JOIN jobs j ON j.url = seed.url
WHERE NOT EXISTS (
  SELECT 1 FROM basket_jobs bj WHERE bj.user_id = 1 AND bj.job_id = j.id AND bj.deleted_at IS NULL
);

INSERT INTO workspaces (user_id, basket_job_id, created_at, updated_at)
SELECT bj.user_id, bj.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM basket_jobs bj
JOIN jobs j ON j.id = bj.job_id
WHERE bj.user_id = 1
  AND j.url LIKE 'https://www.jasoseol.com/recruit/ez-one-demo-%'
  AND NOT EXISTS (
    SELECT 1 FROM workspaces w WHERE w.basket_job_id = bj.id
  );

INSERT INTO essay_questions (workspace_id, question_text, max_length, sort_order, created_at)
SELECT w.id, '지원 동기와 입사 후 기여 계획을 작성하세요.', 1000, 1, CURRENT_TIMESTAMP
FROM workspaces w
JOIN basket_jobs bj ON bj.id = w.basket_job_id
JOIN jobs j ON j.id = bj.job_id
WHERE j.url LIKE 'https://www.jasoseol.com/recruit/ez-one-demo-%'
  AND NOT EXISTS (
    SELECT 1 FROM essay_questions q WHERE q.workspace_id = w.id
  );

INSERT INTO essay_drafts (workspace_id, question_id, body, save_revision, client_updated_at, auto_saved_at)
SELECT q.workspace_id, q.id, '', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM essay_questions q
JOIN workspaces w ON w.id = q.workspace_id
JOIN basket_jobs bj ON bj.id = w.basket_job_id
JOIN jobs j ON j.id = bj.job_id
WHERE j.url LIKE 'https://www.jasoseol.com/recruit/ez-one-demo-%'
  AND NOT EXISTS (
    SELECT 1 FROM essay_drafts d WHERE d.question_id = q.id
  );

INSERT INTO reference_materials (workspace_id, board_name, reference_type, title, body, url, display_mode, created_at)
SELECT w.id, 'JD', 'JD', 'JD 핵심 요약', '데모 공고 확인을 위한 참고자료입니다.', j.url, 'BOTH', CURRENT_TIMESTAMP
FROM workspaces w
JOIN basket_jobs bj ON bj.id = w.basket_job_id
JOIN jobs j ON j.id = bj.job_id
WHERE j.url LIKE 'https://www.jasoseol.com/recruit/ez-one-demo-%'
  AND NOT EXISTS (
    SELECT 1 FROM reference_materials r WHERE r.workspace_id = w.id AND r.board_name = 'JD'
  );
