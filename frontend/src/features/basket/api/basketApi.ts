import {
  defaultHttpClient,
  unwrapApiData,
  type ApiEnvelope,
  type HttpClient
} from '@/shared/apiClient'
import { mockBasketJobs } from './mockBasketData'

export type BasketJobStatus = 'NOT_STARTED' | 'NOT_APPLIED' | 'IN_PROGRESS' | 'SUBMITTED'
type BackendApplicationStatus = 'READY' | 'NOT_APPLIED' | 'IN_PROGRESS' | 'COMPLETED'

export interface BasketJob {
  id: string
  companyName: string
  positionTitle: string
  status: BasketJobStatus
  statusLabel: string
  deadlineLabel: string
  deadlineDate?: string
  deadlineSoon: boolean
  workspaceId: string
  sourceUrl: string
  applicationMemo: string
}

export interface CreateBasketJobPayload {
  companyName: string
  positionTitle: string
  deadlineLabel: string
  sourceUrl: string
  savedSource: 'EXTENSION' | 'RECOMMENDATION' | 'MANUAL'
}

export type UpdateBasketJobPayload = Omit<CreateBasketJobPayload, 'savedSource'> & {
  applicationMemo?: string
}

interface BasketJobDto {
  id: number
  workspaceId: number
  companyName: string
  positionTitle: string
  applicationStatus: BackendApplicationStatus
  statusLabel: string
  deadlineLabel: string
  deadlineDate?: string
  deadlineSoon: boolean
  sourceUrl: string
  applicationMemo?: string
}

type BasketHttpClient = Pick<HttpClient, 'get' | 'post' | 'patch' | 'delete'>

export function createBasketApi(httpClient: BasketHttpClient = defaultHttpClient) {
  return {
    async listJobs(status?: BasketJobStatus): Promise<BasketJob[]> {
      try {
        const response = await httpClient.get<ApiEnvelope<BasketJobDto[]>>('/api/basket/jobs', {
          params: status ? { status: toBackendStatus(status) } : undefined
        })

        return unwrapApiData(response.data).map(toBasketJob)
      } catch {
        return status ? mockBasketJobs.filter((job) => job.status === status) : mockBasketJobs
      }
    },

    async createJob(payload: CreateBasketJobPayload): Promise<BasketJob> {
      const response = await httpClient.post<ApiEnvelope<BasketJobDto>>('/api/basket/jobs', payload)
      return toBasketJob(unwrapApiData(response.data))
    },

    async getJob(basketJobId: string): Promise<BasketJob> {
      const response = await httpClient.get<ApiEnvelope<BasketJobDto>>(`/api/basket/jobs/${basketJobId}`)
      return toBasketJob(unwrapApiData(response.data))
    },

    async updateJob(basketJobId: string, payload: UpdateBasketJobPayload): Promise<BasketJob> {
      const response = await httpClient.patch<ApiEnvelope<BasketJobDto>>(`/api/basket/jobs/${basketJobId}`, payload)
      return toBasketJob(unwrapApiData(response.data))
    },

    async updateStatus(basketJobId: string, status: BasketJobStatus): Promise<BasketJob> {
      const response = await httpClient.patch<ApiEnvelope<BasketJobDto>>(
        `/api/basket/jobs/${basketJobId}/status`,
        { applicationStatus: toBackendStatus(status) }
      )
      return toBasketJob(unwrapApiData(response.data))
    },

    async archiveJob(basketJobId: string): Promise<void> {
      await httpClient.delete<ApiEnvelope<null>>(`/api/basket/jobs/${basketJobId}`)
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
    deadlineDate: dto.deadlineDate,
    deadlineSoon: dto.deadlineSoon,
    workspaceId: String(dto.workspaceId),
    sourceUrl: dto.sourceUrl,
    applicationMemo: dto.applicationMemo ?? ''
  }
}

function toFrontendStatus(status: BackendApplicationStatus): BasketJobStatus {
  if (status === 'READY') {
    return 'NOT_STARTED'
  }

  if (status === 'NOT_APPLIED') {
    return 'NOT_APPLIED'
  }

  if (status === 'COMPLETED') {
    return 'SUBMITTED'
  }

  if (status === 'IN_PROGRESS') {
    return 'IN_PROGRESS'
  }

  return 'NOT_STARTED'
}

function toBackendStatus(status: BasketJobStatus): BackendApplicationStatus {
  if (status === 'NOT_STARTED') {
    return 'READY'
  }

  if (status === 'NOT_APPLIED') {
    return 'NOT_APPLIED'
  }

  if (status === 'SUBMITTED') {
    return 'COMPLETED'
  }

  if (status === 'IN_PROGRESS') {
    return 'IN_PROGRESS'
  }

  return 'NOT_APPLIED'
}

export const basketApi = createBasketApi()
