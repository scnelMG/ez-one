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
    body: '저장한 공고와 지원 상태를 한 화면에서 확인하고 공고함으로 이어갑니다.',
    status: 'P1',
    meta: '이번 주 기준'
  },
  {
    kicker: 'JOB-001',
    title: '오늘 마감',
    body: '마감이 가까운 공고를 먼저 보여주고 각 워크스페이스로 바로 연결합니다.',
    status: 'D-0',
    meta: '2건'
  },
  {
    kicker: 'REC-001',
    title: '추천 공고',
    body: '온보딩에서 입력한 선호 직무와 기술 스택을 기준으로 맞춤 공고를 제안합니다.',
    status: 'P1',
    meta: '프로필 기반'
  }
]

export const basketCards: ShellCardContent[] = [
  {
    kicker: 'JOB-001',
    title: '공고 목록',
    body: '회사, 직무, 지원 상태, 마감일, 원문 링크를 같은 행에서 비교합니다.',
    status: 'P1',
    meta: '3건'
  },
  {
    kicker: 'JOB-002',
    title: '워크스페이스 연결',
    body: '저장한 공고를 열면 해당 공고의 자기소개서 작성 공간으로 이동합니다.',
    status: 'P1',
    meta: '공고별 1개'
  }
]

export const documentProfileCards: ShellCardContent[] = [
  {
    kicker: 'PROFILE-001',
    title: '반복 서류 정보',
    body: '학력, 경력, 프로젝트, 자격증, 수상, 활동 정보를 섹션별로 관리합니다.',
    status: 'P1'
  },
  {
    kicker: 'WS-003',
    title: '워크스페이스 기본값',
    body: '저장된 서류 정보는 각 지원 워크스페이스에서 기본 입력값으로 재사용됩니다.',
    status: 'P1'
  }
]

export const p2ReservedItems = ['과거 지원 내역', '알림 센터', '외부 캘린더', '고객지원']
