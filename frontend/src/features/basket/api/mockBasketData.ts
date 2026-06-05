import type { BasketJob } from './basketApi'

export const mockBasketJobs: BasketJob[] = [
  {
    id: '101',
    companyName: '네이버',
    positionTitle: 'Backend Engineer',
    status: 'IN_PROGRESS',
    statusLabel: '진행 중',
    deadlineLabel: '2026.06.11',
    deadlineDate: '2026-06-11',
    deadlineSoon: true,
    workspaceId: '102',
    sourceUrl: 'https://www.jasoseol.com/',
    applicationMemo: ''
  },
  {
    id: '104',
    companyName: '카카오페이',
    positionTitle: 'Server Developer',
    status: 'NOT_STARTED',
    statusLabel: '지원 전',
    deadlineLabel: '2026.06.20',
    deadlineDate: '2026-06-20',
    deadlineSoon: true,
    workspaceId: '105',
    sourceUrl: 'https://www.jasoseol.com/',
    applicationMemo: ''
  },
  {
    id: '107',
    companyName: '토스',
    positionTitle: 'Platform Engineer',
    status: 'SUBMITTED',
    statusLabel: '지원완료',
    deadlineLabel: '2026.06.23',
    deadlineDate: '2026-06-23',
    deadlineSoon: false,
    workspaceId: '108',
    sourceUrl: 'https://www.jasoseol.com/',
    applicationMemo: ''
  },
  {
    id: '110',
    companyName: '라인플러스',
    positionTitle: 'Frontend Engineer',
    status: 'NOT_STARTED',
    statusLabel: '지원 전',
    deadlineLabel: '2026.06.28',
    deadlineDate: '2026-06-28',
    deadlineSoon: false,
    workspaceId: '111',
    sourceUrl: 'https://www.jasoseol.com/',
    applicationMemo: ''
  },
  {
    id: '113',
    companyName: '우아한형제들',
    positionTitle: 'Product Backend Developer',
    status: 'IN_PROGRESS',
    statusLabel: '진행 중',
    deadlineLabel: '2026.06.30',
    deadlineDate: '2026-06-30',
    deadlineSoon: false,
    workspaceId: '114',
    sourceUrl: 'https://www.jasoseol.com/',
    applicationMemo: ''
  }
]
