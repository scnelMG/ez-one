import type { WorkspaceDetail } from './workspaceApi'

const workspaceDefaults = {
  sourceUrl: 'https://www.jasoseol.com/',
  questions: [
    {
      id: 'q-1',
      prompt: '지원 동기와 입사 후 기여 계획을 작성하세요.',
      draft: '서비스 사용자 경험을 개선한 경험과 안정적인 백엔드 설계 경험을 바탕으로 팀의 제품 속도에 기여하겠습니다.',
      maxLength: 1000
    }
  ],
  references: [
    {
      id: 'r-1',
      type: 'JD' as const,
      title: '채용 공고 핵심 요구사항'
    },
    {
      id: 'r-2',
      type: 'MEMO' as const,
      title: '지원 전략 메모'
    }
  ]
}

export const mockWorkspaces: Record<string, WorkspaceDetail> = {
  '102': {
    id: '102',
    companyName: '네이버',
    positionTitle: 'Backend Engineer',
    deadlineLabel: '2026.06.11',
    statusLabel: '진행 중',
    ...workspaceDefaults
  },
  '105': {
    id: '105',
    companyName: '카카오페이',
    positionTitle: 'Server Developer',
    deadlineLabel: '2026.06.20',
    statusLabel: '지원 전',
    ...workspaceDefaults
  },
  '108': {
    id: '108',
    companyName: '토스',
    positionTitle: 'Platform Engineer',
    deadlineLabel: '2026.06.23',
    statusLabel: '지원 완료',
    ...workspaceDefaults
  },
  '111': {
    id: '111',
    companyName: '라인플러스',
    positionTitle: 'Frontend Engineer',
    deadlineLabel: '2026.06.28',
    statusLabel: '지원 전',
    ...workspaceDefaults
  },
  '114': {
    id: '114',
    companyName: '우아한형제들',
    positionTitle: 'Product Backend Developer',
    deadlineLabel: '2026.06.30',
    statusLabel: '진행 중',
    ...workspaceDefaults
  }
}
