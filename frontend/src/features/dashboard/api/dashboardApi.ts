import {
  defaultHttpClient,
  unwrapApiData,
  type ApiEnvelope,
  type HttpClient
} from '@/shared/apiClient'

export interface DashboardSummary {
  totalApplications: number
  inProgress: number
  notStarted: number
  deadlineSoon: number
}

export interface DashboardJob {
  companyName: string
  positionTitle: string
  deadlineLabel: string
  workspaceId: string
}

export interface DashboardResponse {
  summary: DashboardSummary
  todayJobs: DashboardJob[]
}

interface DashboardSummaryDto extends DashboardSummary {
  todayJobs: Array<{
    basketJobId: number
    workspaceId: number
    companyName: string
    positionTitle: string
    deadlineLabel: string
  }>
}

type DashboardHttpClient = Pick<HttpClient, 'get'>

export function createDashboardApi(httpClient: DashboardHttpClient = defaultHttpClient) {
  return {
    async getSummary(): Promise<DashboardResponse> {
      const response = await httpClient.get<ApiEnvelope<DashboardSummaryDto>>('/api/dashboard/summary')
      const data = unwrapApiData(response.data)

      return {
        summary: {
          totalApplications: data.totalApplications,
          inProgress: data.inProgress,
          notStarted: data.notStarted,
          deadlineSoon: data.deadlineSoon
        },
        todayJobs: data.todayJobs.map((job) => ({
          companyName: job.companyName,
          positionTitle: job.positionTitle,
          deadlineLabel: job.deadlineLabel,
          workspaceId: String(job.workspaceId)
        }))
      }
    }
  }
}

export const dashboardApi = createDashboardApi()
