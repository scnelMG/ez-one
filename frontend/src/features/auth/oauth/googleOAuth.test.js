import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildGoogleOAuthUrl, consumeOAuthState, createOAuthState, getGoogleRedirectUri } from './googleOAuth';
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
        expect(url.searchParams.has('prompt')).toBe(false);
        expect(consumeOAuthState('state-123')).toBe('/basket');
    });
    it('AUTH-001: stores OAuth states by nonce so parallel login tabs do not overwrite each other', () => {
        vi.spyOn(crypto, 'randomUUID')
            .mockReturnValueOnce('state-a')
            .mockReturnValueOnce('state-b');

        expect(createOAuthState('/basket')).toBe('state-a');
        expect(createOAuthState('/recommendations')).toBe('state-b');

        expect(consumeOAuthState('state-a')).toBe('/basket');
        expect(consumeOAuthState('state-b')).toBe('/recommendations');
    });
    it('AUTH-004: asks Google to show account selection only for explicit account switching', () => {
        const url = buildGoogleOAuthUrl({
            clientId: 'google-client-id',
            redirectUri: 'http://localhost:5173/login/callback',
            state: 'state-123',
            selectAccount: true
        });
        expect(url.searchParams.get('prompt')).toBe('select_account');
    });
    it('AUTH-001: uses an explicit redirect URI when configured', () => {
        vi.stubEnv('VITE_GOOGLE_REDIRECT_URI', 'http://localhost:5173/login/callback');
        expect(getGoogleRedirectUri()).toBe('http://localhost:5173/login/callback');
    });
});
