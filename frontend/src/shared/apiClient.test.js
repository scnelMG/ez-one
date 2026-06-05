import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AxiosError } from 'axios';
import { clearAuthSession, getAccessToken, saveAuthSession } from '@/features/auth/session/authSession';
import { defaultHttpClient, resolveApiBaseUrl } from './apiClient';
describe('apiClient', () => {
    const originalAdapter = defaultHttpClient.defaults.adapter;
    beforeEach(() => {
        localStorage.clear();
    });
    afterEach(() => {
        defaultHttpClient.defaults.adapter = originalAdapter;
        clearAuthSession();
    });
    it('normalizes API base URLs because frontend request paths already include /api', () => {
        expect(resolveApiBaseUrl('http://localhost:8080/api')).toBe('http://localhost:8080');
        expect(resolveApiBaseUrl('http://localhost:8080/api/')).toBe('http://localhost:8080');
        expect(resolveApiBaseUrl('http://localhost:8080')).toBe('http://localhost:8080');
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
