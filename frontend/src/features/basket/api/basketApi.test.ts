import { describe, expect, it, vi } from 'vitest'

import { createBasketApi } from './basketApi'

describe('basketApi', () => {
  it('JOB-001: loads basket jobs from /api/basket/jobs and maps backend status values', async () => {
    const get = vi.fn().mockResolvedValue({
      data: {
        success: true,
        data: [
          {
            id: 101,
            workspaceId: 102,
            companyName: '네이버',
            positionTitle: 'Backend Engineer',
            applicationStatus: 'IN_PROGRESS',
            statusLabel: '진행 중',
            deadlineLabel: '오늘',
            deadlineSoon: true,
            sourceUrl: 'https://www.jasoseol.com/'
          },
          {
            id: 104,
            workspaceId: 105,
            companyName: '카카오페이',
            positionTitle: 'Server Developer',
            applicationStatus: 'NOT_APPLIED',
            statusLabel: '지원 전',
            deadlineLabel: 'D-2',
            deadlineSoon: true,
            sourceUrl: 'https://www.jasoseol.com/'
          }
        ],
        error: null
      }
    })

    const api = createBasketApi({ get })
    const jobs = await api.listJobs()

    expect(get).toHaveBeenCalledWith('/api/basket/jobs', { params: undefined })
    expect(jobs).toEqual([
      expect.objectContaining({ id: '101', status: 'IN_PROGRESS', workspaceId: '102' }),
      expect.objectContaining({ id: '104', status: 'NOT_STARTED', workspaceId: '105' })
    ])
  })
})
