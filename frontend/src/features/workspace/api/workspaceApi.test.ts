import { describe, expect, it, vi } from 'vitest'

import { createWorkspaceApi } from './workspaceApi'

describe('workspaceApi', () => {
  it('WS-001: loads workspace detail and reference boards from /api/workspaces/:id', async () => {
    const get = vi.fn().mockResolvedValue({
      data: {
        success: true,
        data: {
          id: 102,
          basketJobId: 101,
          companyName: '네이버',
          positionTitle: 'Backend Engineer',
          deadlineLabel: '오늘 18:00',
          statusLabel: '진행 중',
          sourceUrl: 'https://www.jasoseol.com/',
          questions: [
            {
              id: 103,
              prompt: '문항 1. 지원 동기와 입사 후 기여 계획을 작성하세요.',
              draft: '서비스 사용 경험과 백엔드 개선 경험을 연결해 초안을 작성합니다.',
              maxLength: 1000,
              currentLength: 31
            }
          ],
          references: [
            {
              id: 104,
              boardName: 'JD',
              referenceType: 'JD',
              title: 'JD 핵심 역량',
              body: '사용자가 직접 정리한 직무 요구사항입니다.',
              url: 'https://www.jasoseol.com/'
            }
          ]
        },
        error: null
      }
    })

    const api = createWorkspaceApi({ get })
    const workspace = await api.getWorkspace('102')

    expect(get).toHaveBeenCalledWith('/api/workspaces/102')
    expect(workspace).toMatchObject({
      id: '102',
      companyName: '네이버',
      questions: [expect.objectContaining({ id: '103' })],
      references: [expect.objectContaining({ id: '104', type: 'JD' })]
    })
  })
})
