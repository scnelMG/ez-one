import { describe, expect, it, vi } from 'vitest';
import { createAuthApi } from './authApi';
const successEnvelope = {
    success: true,
    data: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        tokenType: 'Bearer',
        expiresIn: 3600,
        user: {
            id: 1,
            email: 'user@example.com',
            name: 'Hong Gil Dong',
            nickname: 'Gil Dong',
            profileCompleted: false
        }
    },
    error: null
};
describe('authApi', () => {
    it('AUTH-001: posts Google authorization code and returns issued tokens', async () => {
        const get = vi.fn();
        const post = vi.fn().mockResolvedValue({ data: successEnvelope });
        const api = createAuthApi({ get, post, patch: vi.fn(), delete: vi.fn() });
        const response = await api.loginWithGoogle({
            authorizationCode: 'google-oauth-code',
            redirectUri: 'http://localhost:5173/login/callback'
        });
        expect(post).toHaveBeenCalledWith('/api/auth/google', {
            authorizationCode: 'google-oauth-code',
            redirectUri: 'http://localhost:5173/login/callback'
        });
        expect(response.accessToken).toBe('access-token');
        expect(response.refreshToken).toBe('refresh-token');
        expect(response.user.profileCompleted).toBe(false);
    });
    it('AUTH-001: logs out with the refresh token', async () => {
        const get = vi.fn();
        const post = vi.fn().mockResolvedValue({ data: { success: true, data: null, error: null } });
        const api = createAuthApi({ get, post, patch: vi.fn(), delete: vi.fn() });
        await api.logout('refresh-token');
        expect(post).toHaveBeenCalledWith('/api/auth/logout', { refreshToken: 'refresh-token' });
    });
    it('AUTH-002: signs up with email credentials and returns issued tokens', async () => {
        const post = vi.fn().mockResolvedValue({ data: successEnvelope });
        const api = createAuthApi({ get: vi.fn(), post, patch: vi.fn(), delete: vi.fn() });
        const response = await api.signup({
            email: 'local@example.com',
            password: 'password123!',
            name: 'Local User'
        });
        expect(post).toHaveBeenCalledWith('/api/auth/signup', {
            email: 'local@example.com',
            password: 'password123!',
            name: 'Local User'
        });
        expect(response.accessToken).toBe('access-token');
    });
    it('AUTH-003: logs in with email credentials and returns issued tokens', async () => {
        const post = vi.fn().mockResolvedValue({ data: successEnvelope });
        const api = createAuthApi({ get: vi.fn(), post, patch: vi.fn(), delete: vi.fn() });
        const response = await api.loginWithEmail({
            email: 'local@example.com',
            password: 'password123!'
        });
        expect(post).toHaveBeenCalledWith('/api/auth/login', {
            email: 'local@example.com',
            password: 'password123!'
        });
        expect(response.refreshToken).toBe('refresh-token');
    });
    it('AUTH-014: updates the current user nickname', async () => {
        const updatedUser = {
            id: 1,
            email: 'user@example.com',
            name: 'Hong Gil Dong',
            nickname: '길동',
            profileCompleted: true
        };
        const patch = vi.fn().mockResolvedValue({
            data: {
                success: true,
                data: updatedUser,
                error: null
            }
        });
        const api = createAuthApi({ get: vi.fn(), post: vi.fn(), patch, delete: vi.fn() });
        const response = await api.updateCurrentUser({ nickname: '길동' });
        expect(patch).toHaveBeenCalledWith('/api/me', { nickname: '길동' });
        expect(response.nickname).toBe('길동');
    });
    it('AUTH-001: surfaces Google login API error messages', async () => {
        const post = vi.fn().mockRejectedValue({
            isAxiosError: true,
            response: {
                data: {
                    success: false,
                    data: null,
                    error: {
                        code: 'OAUTH_FAILED',
                        message: 'Google 인증 코드 교환에 실패했습니다. 다시 로그인해 주세요.'
                    }
                }
            }
        });
        const api = createAuthApi({ get: vi.fn(), post, patch: vi.fn(), delete: vi.fn() });
        await expect(api.loginWithGoogle({
            authorizationCode: 'google-oauth-code',
            redirectUri: 'http://localhost:5173/login/callback'
        })).rejects.toThrow('Google 인증 코드 교환에 실패했습니다. 다시 로그인해 주세요.');
    });
});
