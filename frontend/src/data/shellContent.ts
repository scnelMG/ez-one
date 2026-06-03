export interface ShellCardContent {
  kicker: string
  title: string
  body: string
  status: string
}

export const dashboardCards: ShellCardContent[] = [
  {
    kicker: 'DASH-001',
    title: '지원 현황 요약',
    body: '지원 완료, 임박한 마감, 진행 중 작업, 저장한 공고 현황을 이곳에 모읍니다.',
    status: '준비중'
  },
  {
    kicker: 'JOB-001',
    title: '공고함 미리보기',
    body: '저장한 공고를 마감 임박 순으로 보여주고 각 지원 워크스페이스로 연결합니다.',
    status: '준비중'
  },
  {
    kicker: 'REC-001',
    title: '추천 공고',
    body: 'P2 수집원을 활성화하지 않고 프로필 기반 추천 공고 영역만 준비합니다.',
    status: '준비중'
  }
]

export const basketCards: ShellCardContent[] = [
  {
    kicker: 'JOB-001',
    title: '저장 공고 목록',
    body: '회사, 직무, 마감일, 출처, 지원 상태 열을 사용할 수 있도록 자리를 잡아둡니다.',
    status: '비어있음'
  },
  {
    kicker: 'COMMON-001',
    title: '필터와 정렬',
    body: '검색어, 지원 상태, 마감일 정렬은 API 슬라이스 구현 시 연결합니다.',
    status: '대기'
  }
]

export const workspaceCards: ShellCardContent[] = [
  {
    kicker: 'WS-001',
    title: '워크스페이스 헤더',
    body: '공고, 회사, 마감일, 현재 지원 상태가 상단에 배치됩니다.',
    status: '준비중'
  },
  {
    kicker: 'WS-002',
    title: '자기소개서 작성 영역',
    body: '문항별 초안, 저장 상태, 버전 관리 동작을 연결할 자리를 준비합니다.',
    status: '준비중'
  },
  {
    kicker: 'REF-001',
    title: '참고자료 보드',
    body: 'JD, 뉴스, DART, 인재상, 프롬프트, 메모 참고자료는 P1에서 수동 입력으로 둡니다.',
    status: '준비중'
  }
]

export const documentProfileCards: ShellCardContent[] = [
  {
    kicker: 'PROFILE-001',
    title: '재사용 서류 정보',
    body: '학력, 경력, 프로젝트, 자격증, 수상, 커스텀 항목을 이곳에서 관리합니다.',
    status: '준비중'
  },
  {
    kicker: 'PROFILE-001',
    title: '커스텀 항목',
    body: '기업별 반복 입력 항목을 준비하되 확장 프로그램 자동 입력은 P2로 남깁니다.',
    status: '준비중'
  }
]
