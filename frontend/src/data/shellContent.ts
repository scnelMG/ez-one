export interface ShellCardContent {
  kicker: string
  title: string
  body: string
  status: string
  meta?: string
}

export const dashboardCards: ShellCardContent[] = [
  {
    kicker: 'DASH-001',
    title: '지원 현황 요약',
    body: '지원 완료 3건, 진행 중 5건, 저장한 공고 12건을 상태별로 묶어 보여줍니다.',
    status: 'P1',
    meta: '이번 주 기준'
  },
  {
    kicker: 'JOB-012',
    title: '오늘 마감',
    body: '마감이 임박한 공고를 가장 먼저 보여주고 공고함 필터로 바로 연결합니다.',
    status: 'D-0',
    meta: '2건'
  },
  {
    kicker: 'REC-001',
    title: '추천 공고',
    body: '온보딩 선호 직무와 기술 스택을 기준으로 추천 후보만 표시합니다.',
    status: 'P1',
    meta: '프로필 기반'
  }
]

export const basketCards: ShellCardContent[] = [
  {
    kicker: 'JOB-001',
    title: '공고 목록',
    body: '회사, 직무, 지원 상태, 마감일, 저장 출처를 한 줄에서 비교합니다.',
    status: '12건',
    meta: '마감 임박순'
  },
  {
    kicker: 'JOB-014',
    title: '상태 필터',
    body: '전체, 진행 중, 지원 완료, 미지원 상태로 공고함을 빠르게 좁힙니다.',
    status: 'P1',
    meta: '4개 상태'
  }
]

export const workspaceCards: ShellCardContent[] = [
  {
    kicker: 'WS-001',
    title: '워크스페이스 헤더',
    body: '회사명, 직무, 마감일, 지원 상태와 공고 원문 링크를 상단에 고정합니다.',
    status: 'P1'
  },
  {
    kicker: 'WS-002',
    title: '자기소개서 캔버스',
    body: '문항별 초안과 저장 상태를 한 화면에서 관리하는 작성 영역입니다.',
    status: 'P1'
  },
  {
    kicker: 'REF-001',
    title: '참고자료 보드',
    body: 'JD, 뉴스, DART, 인재상, 프롬프트, 메모를 수동 입력 기준으로 정리합니다.',
    status: 'P1'
  }
]

export const documentProfileCards: ShellCardContent[] = [
  {
    kicker: 'PROFILE-001',
    title: '반복 서류 정보',
    body: '학력, 경력, 프로젝트, 자격증, 수상, 활동을 섹션별로 관리합니다.',
    status: 'P1'
  },
  {
    kicker: 'PROFILE-001',
    title: '커스텀 항목',
    body: '기업별 반복 질문에 맞춰 필요한 입력 항목을 직접 추가합니다.',
    status: 'P1'
  }
]

export const p2ReservedItems = ['과거 지원 이력', '알림 센터', '주간 캘린더', '고객지원']
