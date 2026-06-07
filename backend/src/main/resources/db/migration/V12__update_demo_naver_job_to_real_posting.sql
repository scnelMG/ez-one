UPDATE jobs j
JOIN companies c ON c.domain = 'navercorp.com'
SET j.company_id = c.id,
    j.title = '[NAVER] AI 검색을 위한 LLM 활용 컴포넌트 연구 및 개발 (체험형 인턴)',
    j.role = '[NAVER] AI 검색을 위한 LLM 활용 컴포넌트 연구 및 개발 (체험형 인턴)',
    j.deadline_label = '2026.06.15',
    j.url = 'https://recruit.navercorp.com/rcrt/view.do?annoId=30004954'
WHERE j.url = 'https://recruit.navercorp.com/'
   OR j.url = 'https://www.jasoseol.com/recruit/ez-one-demo-naver-backend';

UPDATE reference_materials
SET url = 'https://recruit.navercorp.com/rcrt/view.do?annoId=30004954'
WHERE url = 'https://recruit.navercorp.com/'
   OR url = 'https://www.jasoseol.com/recruit/ez-one-demo-naver-backend';
