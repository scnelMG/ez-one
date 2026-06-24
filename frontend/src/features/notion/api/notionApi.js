import { defaultHttpClient, unwrapApiData } from '@/shared/apiClient';
export function createNotionApi(httpClient = defaultHttpClient) {
    return {
        async getConnection() {
            try {
                const response = await httpClient.get('/api/integrations/notion', readConfig(httpClient));
                return unwrapApiData(response.data);
            } catch {
                return { connected: false, syncEnabled: false, syncScope: 'JOB_ONLY', accountName: '' };
            }
        },
        async getOAuthUrl({ redirectUri, state }) {
            const response = await httpClient.get('/api/integrations/notion/oauth-url', {
                ...readConfig(httpClient),
                params: { redirectUri, state }
            });
            return unwrapApiData(response.data).authorizationUrl;
        },
        async connect({ authorizationCode, redirectUri }) {
            const response = await httpClient.post('/api/integrations/notion/connect', {
                authorizationCode,
                redirectUri
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
        async syncNow() {
            const response = await httpClient.post('/api/integrations/notion/sync-now', {});
            return unwrapApiData(response.data);
        },
        async disconnect() {
            await httpClient.delete('/api/integrations/notion');
        },
        async listSyncLogs() {
            try {
                const response = await httpClient.get('/api/integrations/notion/sync-logs', readConfig(httpClient));
                return unwrapApiData(response.data).map((log) => ({
                    id: String(log.id),
                    target: log.target,
                    status: log.status,
                    message: log.message
                }));
            } catch {
                return [];
            }
        }
    };
}
function readConfig(httpClient) {
    return httpClient === defaultHttpClient ? { skipAuthRefresh: true } : {};
}
export const notionApi = createNotionApi();
