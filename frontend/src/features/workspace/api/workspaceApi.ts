import {
  defaultHttpClient,
  unwrapApiData,
  type ApiEnvelope,
  type HttpClient
} from '@/shared/apiClient'
import { mockWorkspaces } from './mockWorkspaceData'

export interface WorkspaceQuestion {
  id: string
  prompt: string
  draft: string
  maxLength: number
}

export interface EssayVersion {
  id: string
  questionId: string
  versionName: string
  body: string
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

interface EssayQuestionDto {
  id: number
  prompt: string
  draft: string
  maxLength: number
  currentLength: number
}

interface EssayVersionDto {
  id: number
  questionId: number
  versionName: string
  body: string
}

type WorkspaceHttpClient = Pick<HttpClient, 'get' | 'patch' | 'post'>

export function createWorkspaceApi(httpClient: WorkspaceHttpClient = defaultHttpClient) {
  return {
    async getWorkspace(workspaceId: string): Promise<WorkspaceDetail> {
      try {
        const response = await httpClient.get<ApiEnvelope<WorkspaceDto>>(`/api/workspaces/${workspaceId}`)
        const data = unwrapApiData(response.data)

        return {
          id: String(data.id),
          companyName: data.companyName,
          positionTitle: data.positionTitle,
          deadlineLabel: data.deadlineLabel,
          statusLabel: data.statusLabel,
          sourceUrl: data.sourceUrl,
          questions: data.questions.map(toWorkspaceQuestion),
          references: data.references.map((reference) => ({
            id: String(reference.id),
            type: reference.referenceType,
            title: reference.title
          }))
        }
      } catch {
        const mockWorkspace = mockWorkspaces[workspaceId]

        if (!mockWorkspace) {
          throw new Error('Workspace not found')
        }

        return mockWorkspace
      }
    },

    async saveDraft(workspaceId: string, draftId: string, body: string): Promise<WorkspaceQuestion> {
      const response = await httpClient.patch<ApiEnvelope<EssayQuestionDto>>(
        `/api/workspaces/${workspaceId}/drafts/${draftId}`,
        { body }
      )
      return toWorkspaceQuestion(unwrapApiData(response.data))
    },

    async createVersion(workspaceId: string, questionId: string, versionName: string): Promise<EssayVersion> {
      const response = await httpClient.post<ApiEnvelope<EssayVersionDto>>(
        `/api/workspaces/${workspaceId}/versions`,
        {
          questionId: Number(questionId),
          versionName
        }
      )
      return toEssayVersion(unwrapApiData(response.data))
    },

    async listVersions(workspaceId: string): Promise<EssayVersion[]> {
      const response = await httpClient.get<ApiEnvelope<EssayVersionDto[]>>(
        `/api/workspaces/${workspaceId}/versions`
      )
      return unwrapApiData(response.data).map(toEssayVersion)
    }
  }
}

function toWorkspaceQuestion(question: EssayQuestionDto): WorkspaceQuestion {
  return {
    id: String(question.id),
    prompt: question.prompt,
    draft: question.draft,
    maxLength: question.maxLength
  }
}

function toEssayVersion(version: EssayVersionDto): EssayVersion {
  return {
    id: String(version.id),
    questionId: String(version.questionId),
    versionName: version.versionName,
    body: version.body
  }
}

export const workspaceApi = createWorkspaceApi()
