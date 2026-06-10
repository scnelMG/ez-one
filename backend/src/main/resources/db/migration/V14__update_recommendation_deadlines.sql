-- Update recommendation jobs with real deadlines
UPDATE jobs
SET deadline_label = CASE
    WHEN url = 'https://www.wanted.co.kr/wd/204081' THEN '2026.06.28'
    WHEN url = 'https://www.wanted.co.kr/wd/355373' THEN '2026.06.25'
    WHEN url = 'https://www.wanted.co.kr/wd/101761' THEN '2026.06.24'
    WHEN url = 'https://www.wanted.co.kr/wd/279145' THEN '2026.06.30'
    ELSE deadline_label
END
WHERE source = 'RECOMMENDATION';
