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
        async issueExtensionSession() {
            const response = await httpClient.post('/api/auth/extension-session');
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
                throw new Error(normalizeAuthErrorMessage(message));
            }
            if (!error.response) {
                throw new Error('인증 서버에 연결하지 못했습니다. 백엔드 서버와 VITE_API_BASE_URL 설정을 확인해 주세요.');
            }
        }
        throw error;
    }
}

function normalizeAuthErrorMessage(message) {
    if (message === 'Email is already registered.') {
        return '이미 가입된 이메일입니다. 로그인 탭에서 다시 시도해 주세요.';
    }
    if (message === 'Google OAuth client is not configured yet.') {
        return 'Google 로그인 설정이 아직 완료되지 않았습니다. 백엔드 Google OAuth 설정을 확인해 주세요.';
    }
    return message;
}
