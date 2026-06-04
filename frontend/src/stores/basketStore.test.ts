import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useBasketStore } from './basketStore'

vi.mock('@/features/basket/api/basketApi', () => ({
  basketApi: {
    listJobs: vi.fn().mockResolvedValue([
      {
        id: '101',
        companyName: '네이버',
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
        companyName: '카카오페이',
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
        companyName: '토스',
        positionTitle: 'Platform Engineer',
        status: 'SUBMITTED',
        statusLabel: '지원 완료',
        deadlineLabel: 'D-5',
        deadlineSoon: false,
        workspaceId: '108',
        sourceUrl: 'https://www.jasoseol.com/'
      }
    ])
  }
}))

describe('basketStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('JOB-001: loads P1 basket jobs from the backend API contract', async () => {
    const store = useBasketStore()

    await store.loadJobs()

    expect(store.status).toBe('ready')
    expect(store.jobs).toHaveLength(3)
    expect(store.jobs[0]).toMatchObject({
      companyName: '네이버',
      positionTitle: 'Backend Engineer',
      workspaceId: '102'
    })
    expect(store.deadlineSoonCount).toBe(2)
  })
})
