UPDATE companies
SET logo_url = CASE domain
    WHEN 'line.me' THEN 'https://www.google.com/s2/favicons?domain=line.me&sz=128'
    WHEN 'ohou.se' THEN 'https://www.google.com/s2/favicons?domain=ohou.se&sz=128'
    WHEN 'toss.im' THEN 'https://www.google.com/s2/favicons?domain=toss.im&sz=128'
    WHEN 'coupang.com' THEN 'https://www.google.com/s2/favicons?domain=coupang.com&sz=128'
    WHEN 'navercorp.com' THEN 'https://www.google.com/s2/favicons?domain=navercorp.com&sz=128'
    WHEN 'kakaopay.com' THEN 'https://www.google.com/s2/favicons?domain=kakaopay.com&sz=128'
    WHEN 'daangn.com' THEN 'https://www.google.com/s2/favicons?domain=daangn.com&sz=128'
    ELSE logo_url
  END,
  logo_status = 'SEEDED',
  logo_updated_at = CURRENT_TIMESTAMP
WHERE domain IN ('line.me', 'ohou.se', 'toss.im', 'coupang.com', 'navercorp.com', 'kakaopay.com', 'daangn.com')
  AND logo_source_url IN (
    'https://line.me',
    'https://ohou.se',
    'https://toss.im',
    'https://www.coupang.com',
    'https://www.navercorp.com',
    'https://www.kakaopay.com',
    'https://www.daangn.com'
  );
