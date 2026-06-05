import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useBasketStore } from './basketStore'

const mocks = vi.hoisted(() => ({
  listJobs: vi.fn(),
  createJob: vi.fn(),
  updateStatus: vi.fn(),
  archiveJob: vi.fn()
}))

vi.mock('@/features/basket/api/basketApi', () => ({
  basketApi: {
    listJobs: mocks.listJobs,
    createJob: mocks.createJob,
    updateStatus: mocks.updateStatus,
    archiveJob: mocks.archiveJob
  }
}))

describe('basketStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mocks.listJobs.mockReset()
    mocks.createJob.mockReset()
    mocks.updateStatus.mockReset()
    mocks.archiveJob.mockReset()
    mocks.listJobs.mockResolvedValue([
      {
        id: '101',
        companyName: 'Naver',
        positionTitle: 'Backend Engineer',
        status: 'IN_PROGRESS',
        statusLabel: '진행 중',
        deadlineLabel: '오늘',
        deadlineSoon: true,
        workspaceId: '102',
        sourceUrl: 'https://www.jasoseol.com/'
      },
      {
        id: '104',
        companyName: 'KakaoPay',
        positionTitle: 'Server Developer',
        status: 'NOT_STARTED',
        statusLabel: '지원 전',
        deadlineLabel: 'D-2',
        deadlineSoon: true,
        workspaceId: '105',
        sourceUrl: 'https://www.jasoseol.com/'
      },
      {
        id: '107',
        companyName: 'Toss',
        positionTitle: 'Platform Engineer',
        status: 'SUBMITTED',
        statusLabel: '지원완료',
        deadlineLabel: 'D-5',
        deadlineSoon: false,
        workspaceId: '108',
        sourceUrl: 'https://www.jasoseol.com/'
      }
    ])
  })

  it('JOB-005/JOB-014: loads P1 basket jobs from the backend API contract', async () => {
    const store = useBasketStore()

    await store.loadJobs()

    expect(store.status).toBe('ready')
    expect(store.jobs).toHaveLength(3)
    expect(store.jobs[0]).toMatchObject({
      companyName: 'Naver',
      positionTitle: 'Backend Engineer',
      workspaceId: '102'
    })
    expect(store.deadlineSoonCount).toBe(2)
  })

  it('JOB-004/JOB-010/JOB-008: creates, updates, and archives jobs in local state', async () => {
    const store = useBasketStore()
    await store.loadJobs()

    mocks.createJob.mockResolvedValue({
      id: '201',
      companyName: 'Line',
      positionTitle: 'Frontend Engineer',
      status: 'NOT_STARTED',
      statusLabel: '지원 전',
      deadlineLabel: '2026.06.28',
      deadlineSoon: false,
      workspaceId: '202',
      sourceUrl: 'https://www.jasoseol.com/'
    })
    await store.createJob({
      companyName: 'Line',
      positionTitle: 'Frontend Engineer',
      deadlineLabel: '2026.06.28',
      sourceUrl: 'https://www.jasoseol.com/',
      savedSource: 'MANUAL'
    })

    expect(store.jobs[0].companyName).toBe('Line')

    mocks.updateStatus.mockResolvedValue({
      ...store.jobs[0],
      status: 'SUBMITTED',
      statusLabel: '지원완료'
    })
    await store.updateStatus('201', 'SUBMITTED')

    expect(store.jobs[0]).toMatchObject({ id: '201', status: 'SUBMITTED' })

    mocks.archiveJob.mockResolvedValue(undefined)
    await store.archiveJob('201')

    expect(store.jobs.some((job) => job.id === '201')).toBe(false)
  })
})
