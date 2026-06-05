import { defaultHttpClient } from '@/shared/apiClient';
import { isAxiosError } from 'axios';
export function createAuthApi(httpClient = defaultHttpClient) {
    return {
        async signup(request) {
            const response = await postAuthRequest('/api/auth/signup', request, httpClient);
            return response.data.data;
        },
        async loginWithEmail(request) {
            const response = await postAuthRequest('/api/auth/login', request, httpClient);
            return response.data.data;
        },
        async loginWithGoogle(request) {
            const response = await postAuthRequest('/api/auth/google', request, httpClient);
            return response.data.data;
        },
        async refresh(refreshToken) {
            const response = await httpClient.post('/api/auth/refresh', {
                refreshToken
            });
            return response.data.data;
        },
        async logout(refreshToken) {
            await httpClient.post('/api/auth/logout', { refreshToken });
        },
        async getCurrentUser() {
            const response = await httpClient.get('/api/me');
            return response.data.data;
        },
        async updateCurrentUser(request) {
            const response = await httpClient.patch('/api/me', request);
            return response.data.data;
        }
    };
}
export const authApi = createAuthApi();
async function postAuthRequest(url, body, httpClient) {
    try {
        return await httpClient.post(url, body);
    }
    catch (error) {
        if (isAxiosError(error)) {
            const message = error.response?.data?.error?.message;
            if (message) {
                throw new Error(message);
            }
        }
        throw error;
    }
}
