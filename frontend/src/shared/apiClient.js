import axios from 'axios';
import { clearAuthSession, getAccessToken, getRefreshToken, saveAuthSession } from '@/features/auth/session/authSession';
export const defaultHttpClient = axios.create({
    baseURL: resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL)
});
defaultHttpClient.interceptors.request.use((config) => {
    const accessToken = getAccessToken();
    if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
});
defaultHttpClient.interceptors.response.use((response) => response, async (error) => {
    const originalRequest = error.config;
    if (error.response?.status !== 401 ||
        !originalRequest ||
        originalRequest._retry ||
        originalRequest.skipAuthRefresh ||
        isAuthEndpoint(originalRequest.url)) {
        throw error;
    }
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
        clearAuthSession();
        throw error;
    }
    try {
        originalRequest._retry = true;
        const response = await defaultHttpClient.post('/api/auth/refresh', { refreshToken }, { skipAuthRefresh: true });
        saveAuthSession(response.data.data);
        originalRequest.headers = {
            ...originalRequest.headers,
            Authorization: `Bearer ${response.data.data.accessToken}`
        };
        return defaultHttpClient.request(originalRequest);
    }
    catch (refreshError) {
        clearAuthSession();
        throw refreshError;
    }
});
export function unwrapApiData(envelope) {
    if (!envelope.success) {
        throw new Error(envelope.error?.message ?? 'API request failed');
    }
    return envelope.data;
}
export function resolveApiBaseUrl(value) {
    if (!value) {
        return undefined;
    }
    return value.replace(/\/api\/?$/, '');
}
function isAuthEndpoint(url) {
    return Boolean(url?.startsWith('/api/auth/'));
}
