import {
  defaultHttpClient,
  unwrapApiData,
  type ApiEnvelope,
  type HttpClient
} from '@/shared/apiClient'

export interface RecommendationJob {
  id: string
  companyName: string
  positionTitle: string
  deadlineLabel: string
  workspaceId: string | null
}

export interface SavedRecommendationJob {
  basketJobId: string
  workspaceId: string
  companyName: string
  positionTitle: string
}

interface RecommendationJobDto {
  basketJobId: number
  workspaceId: number | null
  companyName: string
  positionTitle: string
  deadlineLabel: string
}

interface BasketJobDto {
  id: number
  workspaceId: number
  companyName: string
  positionTitle: string
}

type RecommendationHttpClient = Pick<HttpClient, 'get' | 'post'>

export function createRecommendationApi(httpClient: RecommendationHttpClient = defaultHttpClient) {
  return {
    async listJobs(): Promise<RecommendationJob[]> {
      const response = await httpClient.get<ApiEnvelope<RecommendationJobDto[]>>('/api/recommendations/jobs')
      return unwrapApiData(response.data).map(toRecommendationJob)
    },

    async saveJob(recommendationId: string): Promise<SavedRecommendationJob> {
      const response = await httpClient.post<ApiEnvelope<BasketJobDto>>(
        `/api/recommendations/jobs/${recommendationId}/save`
      )
      const data = unwrapApiData(response.data)

      return {
        basketJobId: String(data.id),
        workspaceId: String(data.workspaceId),
        companyName: data.companyName,
        positionTitle: data.positionTitle
      }
    }
  }
}

function toRecommendationJob(dto: RecommendationJobDto): RecommendationJob {
  return {
    id: String(dto.basketJobId),
    companyName: dto.companyName,
    positionTitle: dto.positionTitle,
    deadlineLabel: dto.deadlineLabel,
    workspaceId: dto.workspaceId == null ? null : String(dto.workspaceId)
  }
}

export const recommendationApi = createRecommendationApi()
