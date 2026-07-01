import axios from 'axios';
import { clearAuthSession, getAccessToken, saveAuthSession } from '@/features/auth/session/authSession';
export const defaultHttpClient = axios.create({
    baseURL: resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL),
    withCredentials: true
});
const apiBaseUrlCandidates = resolveApiBaseUrlCandidates(import.meta.env.VITE_API_BASE_URL, import.meta.env.VITE_API_FALLBACK_BASE_URLS);
let loginRedirectHandler = defaultLoginRedirectHandler;

export function setLoginRedirectHandler(handler) {
    loginRedirectHandler = typeof handler === 'function' ? handler : defaultLoginRedirectHandler;
}

defaultHttpClient.interceptors.request.use((config) => {
    const accessToken = getAccessToken();
    if (accessToken && shouldAttachAuthorization(config.url)) {
        config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
});
defaultHttpClient.interceptors.response.use((response) => response, async (error) => {
    const fallbackResponse = await retryWithFallbackApiBaseUrl(error);
    if (fallbackResponse) {
        return fallbackResponse;
    }

    const originalRequest = error.config;
    if (error.response?.status !== 401 ||
        !originalRequest ||
        originalRequest._retry ||
        originalRequest.skipAuthRefresh ||
        isAuthRefreshExcludedEndpoint(originalRequest.url)) {
        throw error;
    }
    try {
        originalRequest._retry = true;
        const response = await defaultHttpClient.post('/api/auth/refresh', undefined, { skipAuthRefresh: true });
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

export function resolveApiBaseUrlCandidates(primaryValue, fallbackValue = '', options = {}) {
    const includeLocalDevelopment = options.includeLocalDevelopment ?? import.meta.env.DEV;
    const candidates = [
        resolveApiBaseUrl(primaryValue),
        ...String(fallbackValue)
            .split(',')
            .map((value) => resolveApiBaseUrl(value.trim())),
        ...(includeLocalDevelopment ? localDevelopmentApiBaseUrls() : [])
    ].filter(Boolean);
    return [...new Set(candidates)];
}

async function retryWithFallbackApiBaseUrl(error) {
    if (error.response || !error.config) {
        return null;
    }

    const currentBaseUrl = resolveApiBaseUrl(error.config.baseURL ?? defaultHttpClient.defaults.baseURL);
    const attemptedBaseUrls = new Set(error.config._apiBaseFallbackAttempted ?? []);
    if (currentBaseUrl) {
        attemptedBaseUrls.add(currentBaseUrl);
    }
    const nextBaseUrl = nextFallbackApiBaseUrl(currentBaseUrl, error.config._apiBaseFallbackIndex, attemptedBaseUrls);
    if (!nextBaseUrl) {
        return null;
    }

    defaultHttpClient.defaults.baseURL = nextBaseUrl;
    return defaultHttpClient.request({
        ...error.config,
        baseURL: nextBaseUrl,
        _apiBaseFallbackIndex: apiBaseUrlCandidates.indexOf(nextBaseUrl),
        _apiBaseFallbackAttempted: [...attemptedBaseUrls, nextBaseUrl]
    });
}

function nextFallbackApiBaseUrl(currentBaseUrl, previousIndex, attemptedBaseUrls = new Set()) {
    const startIndex = Number.isInteger(previousIndex)
        ? previousIndex + 1
        : Math.max(0, apiBaseUrlCandidates.indexOf(currentBaseUrl) + 1);
    for (let offset = 0; offset < apiBaseUrlCandidates.length; offset += 1) {
        const index = (startIndex + offset) % apiBaseUrlCandidates.length;
        const candidate = apiBaseUrlCandidates[index];
        if (candidate !== currentBaseUrl && !attemptedBaseUrls.has(candidate)) {
            return candidate;
        }
    }
    return null;
}

function localDevelopmentApiBaseUrls() {
    if (typeof window === 'undefined') {
        return [];
    }
    const hostnames = new Set([
        window.location.hostname,
        '127.0.0.1',
        'localhost'
    ]);
    return [...hostnames].flatMap((hostname) => [
        `http://${hostname}:8080`,
        `http://${hostname}:8081`
    ]);
}
function isAuthRefreshExcludedEndpoint(url) {
    return isPublicAuthEndpoint(url);
}
function shouldAttachAuthorization(url) {
    return !isPublicAuthEndpoint(url);
}
function isPublicAuthEndpoint(url) {
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
