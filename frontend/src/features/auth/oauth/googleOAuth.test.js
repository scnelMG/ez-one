import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildGoogleOAuthUrl, consumeOAuthState, createOAuthState } from './googleOAuth';
describe('googleOAuth', () => {
    beforeEach(() => {
        sessionStorage.clear();
        vi.spyOn(crypto, 'randomUUID').mockReturnValue('state-123');
    });
    it('AUTH-001: builds a Google OAuth authorization URL with state and redirect target', () => {
        const state = createOAuthState('/basket');
        const url = buildGoogleOAuthUrl({
            clientId: 'google-client-id',
            redirectUri: 'http://localhost:5173/login/callback',
            state
        });
        expect(url.origin).toBe('https://accounts.google.com');
        expect(url.pathname).toBe('/o/oauth2/v2/auth');
        expect(url.searchParams.get('client_id')).toBe('google-client-id');
        expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:5173/login/callback');
        expect(url.searchParams.get('response_type')).toBe('code');
        expect(url.searchParams.get('scope')).toContain('openid');
        expect(url.searchParams.get('state')).toBe('state-123');
        expect(consumeOAuthState('state-123')).toBe('/basket');
    });
});
