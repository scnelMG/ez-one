import axios from 'axios';
import { clearAuthSession, getAccessToken, getRefreshToken, saveAuthSession } from '@/features/auth/session/authSession';
export const defaultHttpClient = axios.create({
    baseURL: resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL)
});
let loginRedirectHandler = defaultLoginRedirectHandler;

export function setLoginRedirectHandler(handler) {
    loginRedirectHandler = typeof handler === 'function' ? handler : defaultLoginRedirectHandler;
}

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
        isAuthRefreshExcludedEndpoint(originalRequest.url)) {
        throw error;
    }
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
        clearAuthSession();
        await redirectToLogin();
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
        await redirectToLogin();
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
function isAuthRefreshExcludedEndpoint(url) {
    return Boolean(url?.startsWith('/api/auth/') && url !== '/api/auth/extension-session');
}
async function redirectToLogin() {
    try {
        await loginRedirectHandler('/login');
    }
    catch {
        defaultLoginRedirectHandler('/login');
    }
}
function defaultLoginRedirectHandler(path) {
    window.location.href = path;
}
