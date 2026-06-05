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

  it('JOB-004/JOB-010/JOB-008: creates, updates status, fetches detail, and archives basket jobs', async () => {
    const response = {
      data: {
        success: true,
        data: {
          id: 201,
          workspaceId: 202,
          companyName: 'Naver',
          positionTitle: 'Backend Engineer',
          applicationStatus: 'COMPLETED',
          statusLabel: '지원완료',
          deadlineLabel: '2026.06.30',
          deadlineSoon: false,
          sourceUrl: 'https://www.jasoseol.com/'
        },
        error: null
      }
    }
    const get = vi.fn().mockResolvedValue(response)
    const post = vi.fn().mockResolvedValue(response)
    const patch = vi.fn().mockResolvedValue(response)
    const deleteRequest = vi.fn().mockResolvedValue({
      data: { success: true, data: null, error: null }
    })
    const api = createBasketApi({ get, post, patch, delete: deleteRequest })

    await expect(
      api.createJob({
        companyName: 'Naver',
        positionTitle: 'Backend Engineer',
        deadlineLabel: '2026.06.30',
        sourceUrl: 'https://www.jasoseol.com/',
        savedSource: 'MANUAL'
      })
    ).resolves.toMatchObject({ id: '201', status: 'SUBMITTED' })
    await expect(api.getJob('201')).resolves.toMatchObject({ id: '201' })
    await expect(api.updateStatus('201', 'SUBMITTED')).resolves.toMatchObject({ status: 'SUBMITTED' })
    await expect(api.archiveJob('201')).resolves.toBeUndefined()

    expect(post).toHaveBeenCalledWith('/api/basket/jobs', {
      companyName: 'Naver',
      positionTitle: 'Backend Engineer',
      deadlineLabel: '2026.06.30',
      sourceUrl: 'https://www.jasoseol.com/',
      savedSource: 'MANUAL'
    })
    expect(get).toHaveBeenCalledWith('/api/basket/jobs/201')
    expect(patch).toHaveBeenCalledWith('/api/basket/jobs/201/status', {
      applicationStatus: 'COMPLETED'
    })
    expect(deleteRequest).toHaveBeenCalledWith('/api/basket/jobs/201')
  })
})
