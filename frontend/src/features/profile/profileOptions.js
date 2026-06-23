export const undecidedRoleOption = '아직 명확하지 않음';

export const roleGroupOptions = [
  'SW 개발',
  'AI/데이터',
  '클라우드/인프라',
  '서비스기획/PM',
  '공공기관 전산/IT',
  'UX/UI',
  '디자인',
  '마케팅/사업개발',
  '영업/영업관리',
  '경영지원/인사/재무',
  undecidedRoleOption,
  '기타'
];

export const roleDetailOptionsByGroup = {
  'SW 개발': ['프론트엔드', '백엔드', '모바일', 'QA', 'DevOps'],
  'AI/데이터': ['AI/ML', '데이터 엔지니어', '데이터 분석'],
  '클라우드/인프라': ['클라우드 엔지니어', '클라우드 IT 인프라', '인프라 엔지니어'],
  '서비스기획/PM': ['서비스기획', 'PM', 'PO'],
  '공공기관 전산/IT': ['공공기관 전산', '정보보안', 'IT 운영'],
  'UX/UI': ['UX 리서치', 'UI 기획', '프로덕트 디자인'],
  '디자인': ['브랜드 디자인', '콘텐츠 디자인', '그래픽 디자인'],
  '마케팅/사업개발': ['퍼포먼스 마케팅', '콘텐츠 마케팅', '사업개발'],
  '영업/영업관리': ['B2B 영업', '영업관리', '고객성공'],
  '경영지원/인사/재무': ['인사', '재무/회계', '총무/운영'],
  기타: ['기타 직무']
};

export const roleOptions = [
  ...new Set([
    ...roleGroupOptions,
    ...Object.values(roleDetailOptionsByGroup).flat()
  ])
];

export const companyTypeOptions = ['대기업', '공공기관', '중견기업', '중소기업', '스타트업', '외국계', '기타'];

export const industryOptions = ['IT/플랫폼', '제조', '금융', '커머스', '게임', '바이오/헬스', '미디어', '공공/교육', '건설/토목', '기타'];

export const regionOptions = ['서울', '경기', '인천', '대전', '부산', '대구', '광주', '세종', '제주', '전국', '원격'];

export const skillSuggestionOptions = ['React', 'Java', 'Spring', 'Python', 'SQL', 'AWS', 'Docker', 'TypeScript'];
