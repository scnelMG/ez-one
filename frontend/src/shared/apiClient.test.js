import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AxiosError } from 'axios';
import { clearAuthSession, getAccessToken, getRefreshToken, saveAuthSession } from '@/features/auth/session/authSession';
import { defaultHttpClient, resolveApiBaseUrl, setLoginRedirectHandler } from './apiClient';
describe('apiClient', () => {
    const originalAdapter = defaultHttpClient.defaults.adapter;
    beforeEach(() => {
        localStorage.clear();
        setLoginRedirectHandler(() => {});
    });
    afterEach(() => {
        defaultHttpClient.defaults.adapter = originalAdapter;
        setLoginRedirectHandler(undefined);
        clearAuthSession();
    });
    it('normalizes API base URLs because frontend request paths already include /api', () => {
        expect(resolveApiBaseUrl('http://localhost:8080/api')).toBe('http://localhost:8080');
        expect(resolveApiBaseUrl('http://localhost:8080/api/')).toBe('http://localhost:8080');
        expect(resolveApiBaseUrl('http://localhost:8080')).toBe('http://localhost:8080');
    });
    it('AUTH-003/AUTH-004: does not attach a stale access token to public auth requests', async () => {
        localStorage.setItem('ezone.accessToken', 'stale-access-token');
        const seenHeaders = [];
        defaultHttpClient.defaults.adapter = async (config) => {
            seenHeaders.push(config.headers);
            return makeResponse(config, 200, {
                success: true,
                data: {
                    accessToken: 'new-access-token',
                    refreshToken: 'new-refresh-token',
                    tokenType: 'Bearer',
                    expiresIn: 1800,
                    user: {
                        id: 2,
                        email: 'new-google-user@example.com',
                        name: 'New Google User',
                        nickname: 'New Google User',
                        profileCompleted: false,
                        onboardingRequired: true
                    }
                },
                error: null
            });
        };

        await defaultHttpClient.post('/api/auth/google', { authorizationCode: 'google-oauth-code' });
        await defaultHttpClient.post('/api/auth/login', { email: 'local@example.com', password: 'password123!' });
        await defaultHttpClient.post('/api/auth/signup', { email: 'local@example.com', password: 'password123!', name: 'Local User' });
        await defaultHttpClient.post('/api/auth/refresh', { refreshToken: 'refresh-token' });
        await defaultHttpClient.post('/api/auth/logout', { refreshToken: 'refresh-token' });

        expect(seenHeaders.every((headers) => headers.Authorization === undefined)).toBe(true);
    });
    it('AUTH-007: refreshes the access token once and retries the original request after a 401', async () => {
        saveAuthSession({
            accessToken: 'expired-access-token',
            refreshToken: 'refresh-token',
            tokenType: 'Bearer',
            expiresIn: 1,
            user: {
                id: 1,
                email: 'user@example.com',
                name: 'Hong Gil Dong',
                nickname: 'Gil Dong',
                profileCompleted: true
            }
        });
        const calls = [];
        const adapter = async (config) => {
            calls.push(`${config.method?.toUpperCase()} ${config.url}`);
            if (config.url === '/api/me' && calls.length === 1) {
                const response = makeResponse(config, 401, {
                    success: false,
                    data: null,
                    error: { code: 'UNAUTHORIZED', message: 'Authentication is required.' }
                });
                throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, response);
            }
            if (config.url === '/api/auth/refresh') {
                return makeResponse(config, 200, {
                    success: true,
                    data: {
                        accessToken: 'new-access-token',
                        refreshToken: 'new-refresh-token',
                        tokenType: 'Bearer',
                        expiresIn: 1800,
                        user: {
                            id: 1,
                            email: 'user@example.com',
                            name: 'Hong Gil Dong',
                            nickname: 'Gil Dong',
                            profileCompleted: true
                        }
                    },
                    error: null
                });
            }
            return makeResponse(config, 200, {
                success: true,
                data: {
                    id: 1,
                    email: 'user@example.com',
                    name: 'Hong Gil Dong',
                    nickname: 'Gil Dong',
                    profileCompleted: true
                },
                error: null
            });
        };
        defaultHttpClient.defaults.adapter = adapter;
        const response = await defaultHttpClient.get('/api/me');
        expect(response.data.data.email).toBe('user@example.com');
        expect(getAccessToken()).toBe('new-access-token');
        expect(calls).toEqual(['GET /api/me', 'POST /api/auth/refresh', 'GET /api/me']);
    });
    it('EXT-003/AUTH-007: refreshes before retrying extension session issuance after a 401', async () => {
        saveAuthSession({
            accessToken: 'expired-access-token',
            refreshToken: 'refresh-token',
            tokenType: 'Bearer',
            expiresIn: 1,
            user: {
                id: 1,
                email: 'user@example.com',
                name: 'Hong Gil Dong',
                nickname: 'Gil Dong',
                profileCompleted: true
            }
        });
        const calls = [];
        const adapter = async (config) => {
            calls.push(`${config.method?.toUpperCase()} ${config.url}`);
            if (config.url === '/api/auth/extension-session' && calls.length === 1) {
                const response = makeResponse(config, 401, {
                    success: false,
                    data: null,
                    error: { code: 'UNAUTHORIZED', message: 'Authentication is required.' }
                });
                throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, response);
            }
            if (config.url === '/api/auth/refresh') {
                return makeResponse(config, 200, {
                    success: true,
                    data: {
                        accessToken: 'new-access-token',
                        refreshToken: 'new-refresh-token',
                        tokenType: 'Bearer',
                        expiresIn: 1800,
                        user: {
                            id: 1,
                            email: 'user@example.com',
                            name: 'Hong Gil Dong',
                            nickname: 'Gil Dong',
                            profileCompleted: true
                        }
                    },
                    error: null
                });
            }
            return makeResponse(config, 200, {
                success: true,
                data: {
                    accessToken: 'extension-access-token',
                    refreshToken: 'extension-refresh-token',
                    tokenType: 'Bearer',
                    expiresIn: 1800,
                    user: {
                        id: 1,
                        email: 'user@example.com',
                        name: 'Hong Gil Dong',
                        nickname: 'Gil Dong',
                        profileCompleted: true
                    }
                },
                error: null
            });
        };
        defaultHttpClient.defaults.adapter = adapter;
        const response = await defaultHttpClient.post('/api/auth/extension-session');
        expect(response.data.data.accessToken).toBe('extension-access-token');
        expect(getAccessToken()).toBe('new-access-token');
        expect(calls).toEqual([
            'POST /api/auth/extension-session',
            'POST /api/auth/refresh',
            'POST /api/auth/extension-session'
        ]);
    });
    it('AUTH-005/AUTH-007: clears the local session when refresh token reuse fails', async () => {
        saveAuthSession({
            accessToken: 'expired-access-token',
            refreshToken: 'revoked-refresh-token',
            tokenType: 'Bearer',
            expiresIn: 1,
            user: {
                id: 1,
                email: 'user@example.com',
                name: 'Hong Gil Dong',
                nickname: 'Gil Dong',
                profileCompleted: true
            }
        });
        const adapter = async (config) => {
            if (config.url === '/api/me') {
                const response = makeResponse(config, 401, {
                    success: false,
                    data: null,
                    error: { code: 'UNAUTHORIZED', message: 'Authentication is required.' }
                });
                throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, response);
            }
            const response = makeResponse(config, 401, {
                success: false,
                data: null,
                error: { code: 'INVALID_REFRESH_TOKEN', message: 'Refresh token is expired, revoked, or unknown.' }
            });
            throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, response);
        };
        defaultHttpClient.defaults.adapter = adapter;

        await expect(defaultHttpClient.get('/api/me')).rejects.toThrow('Unauthorized');

        expect(getAccessToken()).toBeNull();
        expect(getRefreshToken()).toBeNull();
    });

    it('AUTH-007: delegates missing-refresh login navigation without importing the router module', async () => {
        localStorage.setItem('ezone.accessToken', 'expired-access-token');
        const redirects = [];
        setLoginRedirectHandler((path) => {
            redirects.push(path);
        });
        const adapter = async (config) => {
            const response = makeResponse(config, 401, {
                success: false,
                data: null,
                error: { code: 'UNAUTHORIZED', message: 'Authentication is required.' }
            });
            throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, response);
        };
        defaultHttpClient.defaults.adapter = adapter;

        await expect(defaultHttpClient.get('/api/me')).rejects.toThrow('Unauthorized');

        expect(redirects).toEqual(['/login']);
        expect(getAccessToken()).toBeNull();
    });
});
function makeResponse(config, status, data) {
    return {
        data,
        status,
        statusText: status === 200 ? 'OK' : 'Unauthorized',
        headers: {},
        config
    };
}
