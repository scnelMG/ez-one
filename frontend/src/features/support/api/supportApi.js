import { defaultHttpClient, unwrapApiData } from '@/shared/apiClient';

export function createSupportApi(httpClient = defaultHttpClient) {
    return {
        async getMyRequests() {
            const response = await httpClient.get('/api/support/requests');
            return unwrapApiData(response.data);
        },
        async createRequest(request) {
            const response = await httpClient.post('/api/support/requests', request);
            return unwrapApiData(response.data);
        }
    };
}

export const supportApi = createSupportApi();
