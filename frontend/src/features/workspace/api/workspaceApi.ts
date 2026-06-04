import {
  defaultHttpClient,
  unwrapApiData,
  type ApiEnvelope,
  type HttpClient
} from '@/shared/apiClient'

export interface WorkspaceQuestion {
  id: string
  prompt: string
  draft: string
  maxLength: number
}

export interface WorkspaceReference {
  id: string
  type: 'JD' | 'NEWS' | 'DART' | 'TALENT_PROFILE' | 'PROMPT' | 'MEMO'
  title: string
}

export interface WorkspaceDetail {
  id: string
  companyName: string
  positionTitle: string
  deadlineLabel: string
  statusLabel: string
  sourceUrl: string
  questions: WorkspaceQuestion[]
  references: WorkspaceReference[]
}

interface WorkspaceDto {
  id: number
  basketJobId: number
  companyName: string
  positionTitle: string
  deadlineLabel: string
  statusLabel: string
  sourceUrl: string
  questions: Array<{
    id: number
    prompt: string
    draft: string
    maxLength: number
    currentLength: number
  }>
  references: Array<{
    id: number
    boardName: string
    referenceType: WorkspaceReference['type']
    title: string
    body: string
    url: string
  }>
}

type WorkspaceHttpClient = Pick<HttpClient, 'get'>

export function createWorkspaceApi(httpClient: WorkspaceHttpClient = defaultHttpClient) {
  return {
    async getWorkspace(workspaceId: string): Promise<WorkspaceDetail> {
      const response = await httpClient.get<ApiEnvelope<WorkspaceDto>>(`/api/workspaces/${workspaceId}`)
      const data = unwrapApiData(response.data)

      return {
        id: String(data.id),
        companyName: data.companyName,
        positionTitle: data.positionTitle,
        deadlineLabel: data.deadlineLabel,
        statusLabel: data.statusLabel,
        sourceUrl: data.sourceUrl,
        questions: data.questions.map((question) => ({
          id: String(question.id),
          prompt: question.prompt,
          draft: question.draft,
          maxLength: question.maxLength
        })),
        references: data.references.map((reference) => ({
          id: String(reference.id),
          type: reference.referenceType,
          title: reference.title
        }))
      }
    }
  }
}

export const workspaceApi = createWorkspaceApi()
