import type { EssayQuestion, ExtractedJobPosting } from '../../content/jobExtractor'

export interface ExtensionJobApiConfig {
  apiBaseUrl: string
  getAccessToken: () => Promise<string | null>
  fetcher?: typeof fetch
}

export interface ExtensionJobSaveRequest {
  companyName: string | null
  positionTitle: string | null
  deadlineLabel: string | null
  sourceUrl: string
  selectedRoles: string[]
  essayQuestions: EssayQuestion[]
}

interface ApiEnvelope<T> {
  success: boolean
  data: T
  error: null | {
    message: string
  }
}

export function createExtensionJobApi({ apiBaseUrl, getAccessToken, fetcher = fetch }: ExtensionJobApiConfig) {
  return {
    preview: (payload: ExtractedJobPosting) =>
      request(apiBaseUrl, getAccessToken, fetcher, '/extension/jobs/preview', payload),
    save: (payload: ExtensionJobSaveRequest) =>
      request(apiBaseUrl, getAccessToken, fetcher, '/extension/jobs/save', payload)
  }
}

async function request<T>(
  apiBaseUrl: string,
  getAccessToken: () => Promise<string | null>,
  fetcher: typeof fetch,
  path: string,
  payload: unknown
) {
  const token = await getAccessToken()

  if (!token) {
    throw new Error('로그인이 필요합니다.')
  }

  const response = await fetcher(`${apiBaseUrl.replace(/\/$/, '')}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
  const envelope = await response.json() as ApiEnvelope<T>

  if (!response.ok || !envelope.success) {
    throw new Error(envelope.error?.message ?? '요청에 실패했습니다.')
  }

  return envelope.data
}
