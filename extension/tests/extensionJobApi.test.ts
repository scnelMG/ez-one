import { describe, expect, it, vi } from 'vitest'
import { createExtensionJobApi } from '../src/shared/api/extensionJobApi'

describe('extensionJobApi', () => {
  it('requires a stored extension access token before preview or save calls', async () => {
    const fetcher = vi.fn()
    const api = createExtensionJobApi({
      apiBaseUrl: 'http://localhost:8080/api',
      getAccessToken: async () => null,
      fetcher
    })

    await expect(api.save({
      companyName: 'Naver',
      positionTitle: 'Backend Developer',
      deadlineLabel: 'D-26',
      sourceUrl: 'https://www.jasoseol.com/recruit/1',
      selectedRoles: ['Backend'],
      essayQuestions: []
    })).rejects.toThrow('로그인이 필요합니다.')
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('previews extracted data with the extension bearer token', async () => {
    const fetcher = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          saveable: true,
          companyName: 'Naver',
          positionTitle: 'Backend Developer',
          deadlineLabel: 'D-26',
          sourceUrl: 'https://www.jasoseol.com/recruit/1',
          message: '저장 가능한 공고입니다.'
        },
        error: null
      })
    } as Response))
    const api = createExtensionJobApi({
      apiBaseUrl: 'http://localhost:8080/api',
      getAccessToken: async () => 'access-token',
      fetcher
    })

    await api.preview({
      companyName: 'Naver',
      positionTitle: 'Backend Developer',
      deadlineLabel: 'D-26',
      sourceUrl: 'https://www.jasoseol.com/recruit/1',
      roleOptions: ['Backend'],
      essayQuestions: []
    })

    expect(fetcher).toHaveBeenCalledWith('http://localhost:8080/api/extension/jobs/preview', expect.objectContaining({
      method: 'POST',
      headers: {
        Authorization: 'Bearer access-token',
        'Content-Type': 'application/json'
      }
    }))
  })

  it('saves selected roles and essay questions through the extension save API', async () => {
    const fetcher = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          { basketJobId: 10, workspaceId: 20, companyName: 'Naver', positionTitle: 'Backend' },
          { basketJobId: 11, workspaceId: 21, companyName: 'Naver', positionTitle: 'Platform' }
        ],
        error: null
      })
    } as Response))
    const api = createExtensionJobApi({
      apiBaseUrl: 'http://localhost:8080/api',
      getAccessToken: async () => 'access-token',
      fetcher
    })

    await api.save({
      companyName: 'Naver',
      positionTitle: 'Backend Developer',
      deadlineLabel: 'D-26',
      sourceUrl: 'https://www.jasoseol.com/recruit/1',
      selectedRoles: ['Backend', 'Platform'],
      essayQuestions: [{ prompt: '지원동기를 작성해 주세요.', maxLength: 1000 }]
    })

    const [, init] = fetcher.mock.calls[0]
    expect(JSON.parse(String(init?.body))).toEqual({
      companyName: 'Naver',
      positionTitle: 'Backend Developer',
      deadlineLabel: 'D-26',
      sourceUrl: 'https://www.jasoseol.com/recruit/1',
      selectedRoles: ['Backend', 'Platform'],
      essayQuestions: [{ prompt: '지원동기를 작성해 주세요.', maxLength: 1000 }]
    })
  })
})
