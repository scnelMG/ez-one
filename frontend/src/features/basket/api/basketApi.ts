import {
  defaultHttpClient,
  unwrapApiData,
  type ApiEnvelope,
  type HttpClient
} from '@/shared/apiClient'

export type BasketJobStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED'
type BackendApplicationStatus = 'READY' | 'NOT_APPLIED' | 'IN_PROGRESS' | 'COMPLETED'

export interface BasketJob {
  id: string
  companyName: string
  positionTitle: string
  status: BasketJobStatus
  statusLabel: string
  deadlineLabel: string
  deadlineSoon: boolean
  workspaceId: string
  sourceUrl: string
}

interface BasketJobDto {
  id: number
  workspaceId: number
  companyName: string
  positionTitle: string
  applicationStatus: BackendApplicationStatus
  statusLabel: string
  deadlineLabel: string
  deadlineSoon: boolean
  sourceUrl: string
}

type BasketHttpClient = Pick<HttpClient, 'get'>

export function createBasketApi(httpClient: BasketHttpClient = defaultHttpClient) {
  return {
    async listJobs(status?: BasketJobStatus): Promise<BasketJob[]> {
      const response = await httpClient.get<ApiEnvelope<BasketJobDto[]>>('/api/basket/jobs', {
        params: status ? { status: toBackendStatus(status) } : undefined
      })

      return unwrapApiData(response.data).map(toBasketJob)
    }
  }
}

function toBasketJob(dto: BasketJobDto): BasketJob {
  return {
    id: String(dto.id),
    companyName: dto.companyName,
    positionTitle: dto.positionTitle,
    status: toFrontendStatus(dto.applicationStatus),
    statusLabel: dto.statusLabel,
    deadlineLabel: dto.deadlineLabel,
    deadlineSoon: dto.deadlineSoon,
    workspaceId: String(dto.workspaceId),
    sourceUrl: dto.sourceUrl
  }
}

function toFrontendStatus(status: BackendApplicationStatus): BasketJobStatus {
  if (status === 'COMPLETED') {
    return 'SUBMITTED'
  }

  if (status === 'IN_PROGRESS') {
    return 'IN_PROGRESS'
  }

  return 'NOT_STARTED'
}

function toBackendStatus(status: BasketJobStatus): BackendApplicationStatus {
  if (status === 'SUBMITTED') {
    return 'COMPLETED'
  }

  if (status === 'IN_PROGRESS') {
    return 'IN_PROGRESS'
  }

  return 'NOT_APPLIED'
}

export const basketApi = createBasketApi()
