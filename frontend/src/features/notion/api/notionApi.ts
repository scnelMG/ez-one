import {
  defaultHttpClient,
  unwrapApiData,
  type ApiEnvelope,
  type HttpClient
} from '@/shared/apiClient'

export type NotionSyncScope = 'JOB_ONLY'

export interface NotionConnection {
  connected: boolean
  notionAccountEmail: string | null
  syncEnabled: boolean
  syncScope: NotionSyncScope
}

export interface NotionSyncLog {
  id: string
  target: string
  status: string
  message: string
}

interface NotionConnectionDto {
  connected: boolean
  notionAccountEmail: string | null
  syncEnabled: boolean
  syncScope: NotionSyncScope
}

interface NotionSyncLogDto {
  id: number
  target: string
  status: string
  message: string
}

type NotionHttpClient = Pick<HttpClient, 'get' | 'post' | 'put'>

export function createNotionApi(httpClient: NotionHttpClient = defaultHttpClient) {
  return {
    async getConnection(): Promise<NotionConnection> {
      const response = await httpClient.get<ApiEnvelope<NotionConnectionDto>>('/api/integrations/notion')
      return unwrapApiData(response.data)
    },

    async connect(): Promise<NotionConnection> {
      const response = await httpClient.post<ApiEnvelope<NotionConnectionDto>>(
        '/api/integrations/notion/connect',
        {
          code: 'local-mvp-connect'
        }
      )
      return unwrapApiData(response.data)
    },

    async updateSyncSettings(syncEnabled: boolean): Promise<NotionConnection> {
      const response = await httpClient.put<ApiEnvelope<NotionConnectionDto>>(
        '/api/integrations/notion/sync-settings',
        {
          syncEnabled,
          syncScope: 'JOB_ONLY'
        }
      )
      return unwrapApiData(response.data)
    },

    async listSyncLogs(): Promise<NotionSyncLog[]> {
      const response = await httpClient.get<ApiEnvelope<NotionSyncLogDto[]>>(
        '/api/integrations/notion/sync-logs'
      )

      return unwrapApiData(response.data).map((log) => ({
        id: String(log.id),
        target: log.target,
        status: log.status,
        message: log.message
      }))
    }
  }
}

export const notionApi = createNotionApi()
