import { describe, expect, it, vi } from 'vitest'

import { createRecommendationApi } from './recommendationApi'

describe('recommendationApi', () => {
  it('REC-001: loads recommendation jobs from the backend', async () => {
    const get = vi.fn().mockResolvedValue({
      data: {
        success: true,
        data: [
          {
            basketJobId: 9001,
            workspaceId: null,
            companyName: '라인',
            positionTitle: 'Server Platform Engineer',
            deadlineLabel: 'D-7'
          }
        ],
        error: null
      }
    })

    const api = createRecommendationApi({ get, post: vi.fn() })
    const jobs = await api.listJobs()

    expect(get).toHaveBeenCalledWith('/api/recommendations/jobs')
    expect(jobs).toEqual([
      {
        id: '9001',
        companyName: '라인',
        positionTitle: 'Server Platform Engineer',
        deadlineLabel: 'D-7',
        workspaceId: null
      }
    ])
  })

  it('REC-001: saves a recommendation and returns the basket workspace path', async () => {
    const post = vi.fn().mockResolvedValue({
      data: {
        success: true,
        data: {
          id: 101,
          workspaceId: 102,
          companyName: '라인',
          positionTitle: 'Server Platform Engineer',
          applicationStatus: 'NOT_APPLIED',
          statusLabel: '지원 예정',
          deadlineLabel: 'D-7',
          deadlineSoon: true,
          sourceUrl: 'https://www.jasoseol.com/'
        },
        error: null
      }
    })

    const api = createRecommendationApi({ get: vi.fn(), post })
    const savedJob = await api.saveJob('9001')

    expect(post).toHaveBeenCalledWith('/api/recommendations/jobs/9001/save')
    expect(savedJob).toEqual({
      basketJobId: '101',
      workspaceId: '102',
      companyName: '라인',
      positionTitle: 'Server Platform Engineer'
    })
  })
})
