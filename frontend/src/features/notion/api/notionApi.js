import { defaultHttpClient, unwrapApiData } from '@/shared/apiClient';
export function createNotionApi(httpClient = defaultHttpClient) {
    return {
        async getConnection() {
            const response = await httpClient.get('/api/integrations/notion');
            return unwrapApiData(response.data);
        },
        async connect() {
            const response = await httpClient.post('/api/integrations/notion/connect', {
                authorizationCode: 'local-mvp-connect'
            });
            return unwrapApiData(response.data);
        },
        async updateSyncSettings(syncEnabled) {
            const response = await httpClient.put('/api/integrations/notion/sync-settings', {
                syncEnabled,
                syncScope: 'JOB_ONLY'
            });
            return unwrapApiData(response.data);
        },
        async listSyncLogs() {
            const response = await httpClient.get('/api/integrations/notion/sync-logs');
            return unwrapApiData(response.data).map((log) => ({
                id: String(log.id),
                target: log.target,
                status: log.status,
                message: log.message
            }));
        }
    };
}
export const notionApi = createNotionApi();
