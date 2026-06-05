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

export interface CreateQuestionPayload {
  prompt: string
  maxLength: number
}

export interface VersionComparison {
  leftVersionId: string
  rightVersionId: string
  leftBody: string
  rightBody: string
  changed: boolean
}

export interface WorkspaceReference {
  id: string
  boardName?: string
  type: ReferenceType
  title: string
  body?: string
  url?: string
}

export type ReferenceType = 'FREE_MEMO' | 'JD' | 'NEWS' | 'DART' | 'TALENT_PROFILE' | 'PROMPT' | 'CUSTOM'

export interface CreateReferencePayload {
  boardName: string
  referenceType: ReferenceType
  title: string
  body: string
  url: string
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
    referenceType: ReferenceType
    title: string
    body: string
    url: string
  }>
}

interface ReferenceDto {
  id: number
  boardName: string
  referenceType: ReferenceType
  title: string
  body: string
  url: string
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

interface VersionComparisonDto {
  leftVersionId: number
  rightVersionId: number
  leftBody: string
  rightBody: string
  changed: boolean
}

type WorkspaceHttpClient = Pick<HttpClient, 'get' | 'patch' | 'post'> & Partial<Pick<HttpClient, 'delete'>>

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
          references: data.references.map(toWorkspaceReference)
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

    async createQuestion(workspaceId: string, payload: CreateQuestionPayload): Promise<WorkspaceQuestion> {
      const response = await httpClient.post<ApiEnvelope<EssayQuestionDto>>(
        `/api/workspaces/${workspaceId}/questions`,
        payload
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
    },

    async compareVersions(
      workspaceId: string,
      leftVersionId: string,
      rightVersionId: string
    ): Promise<VersionComparison> {
      const response = await httpClient.post<ApiEnvelope<VersionComparisonDto>>(
        `/api/workspaces/${workspaceId}/versions/compare`,
        {
          leftVersionId: Number(leftVersionId),
          rightVersionId: Number(rightVersionId)
        }
      )
      return toVersionComparison(unwrapApiData(response.data))
    },

    async createReference(
      workspaceId: string,
      payload: CreateReferencePayload
    ): Promise<WorkspaceReference> {
      const response = await httpClient.post<ApiEnvelope<ReferenceDto>>(
        `/api/workspaces/${workspaceId}/references`,
        payload
      )
      return toWorkspaceReference(unwrapApiData(response.data))
    },

    async getReference(referenceId: string): Promise<WorkspaceReference> {
      const response = await httpClient.get<ApiEnvelope<ReferenceDto>>(`/api/references/${referenceId}`)
      return toWorkspaceReference(unwrapApiData(response.data))
    },

    async updateReference(referenceId: string, payload: CreateReferencePayload): Promise<WorkspaceReference> {
      const response = await httpClient.patch<ApiEnvelope<ReferenceDto>>(
        `/api/references/${referenceId}`,
        payload
      )
      return toWorkspaceReference(unwrapApiData(response.data))
    },

    async deleteReference(referenceId: string): Promise<void> {
      if (!httpClient.delete) {
        throw new Error('HTTP delete is not configured')
      }

      await httpClient.delete<ApiEnvelope<null>>(`/api/references/${referenceId}`)
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

function toVersionComparison(comparison: VersionComparisonDto): VersionComparison {
  return {
    leftVersionId: String(comparison.leftVersionId),
    rightVersionId: String(comparison.rightVersionId),
    leftBody: comparison.leftBody,
    rightBody: comparison.rightBody,
    changed: comparison.changed
  }
}

function toWorkspaceReference(reference: ReferenceDto): WorkspaceReference {
  return {
    id: String(reference.id),
    boardName: reference.boardName,
    type: reference.referenceType,
    title: reference.title,
    body: reference.body,
    url: reference.url
  }
}

export const workspaceApi = createWorkspaceApi()
