import { describe, expect, it, beforeEach } from 'vitest';
import { clearAuthSession, getAccessToken, getCurrentUser, getRefreshToken, saveAuthSession, saveCurrentUser } from './authSession';
describe('authSession', () => {
    beforeEach(() => {
        localStorage.clear();
    });
    it('AUTH-001: stores and clears issued auth tokens and current user', () => {
        saveAuthSession({
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
            tokenType: 'Bearer',
            expiresIn: 3600,
            user: {
                id: 1,
                email: 'user@example.com',
                name: '홍길동',
                nickname: '길동',
                profileCompleted: true
            }
        });
        expect(getAccessToken()).toBe('access-token');
        expect(getRefreshToken()).toBe('refresh-token');
        expect(getCurrentUser()?.email).toBe('user@example.com');
        clearAuthSession();
        expect(getAccessToken()).toBeNull();
        expect(getRefreshToken()).toBeNull();
        expect(getCurrentUser()).toBeNull();
    });
    it('AUTH-014: updates only the stored current user profile', () => {
        saveAuthSession({
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
            tokenType: 'Bearer',
            expiresIn: 3600,
            user: {
                id: 1,
                email: 'user@example.com',
                name: 'Hong Gil Dong',
                nickname: 'Gil Dong',
                profileCompleted: true
            }
        });
        saveCurrentUser({
            id: 1,
            email: 'user@example.com',
            name: 'Hong Gil Dong',
            nickname: '길동',
            profileCompleted: true
        });
        expect(getAccessToken()).toBe('access-token');
        expect(getRefreshToken()).toBe('refresh-token');
        expect(getCurrentUser()?.nickname).toBe('길동');
    });
});
