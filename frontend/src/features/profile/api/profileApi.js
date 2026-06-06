import { defaultHttpClient, unwrapApiData } from '@/shared/apiClient';
export function createProfileApi(httpClient = defaultHttpClient) {
    return {
        async getUserProfile() {
            try {
                const response = await httpClient.get('/api/me/profile', readConfig(httpClient));
                return unwrapApiData(response.data);
            } catch {
                return {
                    desiredRoles: [],
                    companyTypes: [],
                    industries: [],
                    regions: [],
                    skills: [],
                    ssafy: false,
                    completed: true
                };
            }
        },
        async saveUserProfile(payload) {
            const response = await httpClient.put('/api/me/profile', payload);
            return unwrapApiData(response.data);
        }
    };
}
function readConfig(httpClient) {
    return httpClient === defaultHttpClient ? { skipAuthRefresh: true } : {};
}
export const profileApi = createProfileApi();


