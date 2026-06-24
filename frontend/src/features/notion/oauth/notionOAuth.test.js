import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    buildNotionOAuthUrl,
    consumeNotionOAuthState,
    createNotionOAuthState,
    getNotionRedirectUri
} from './notionOAuth';

describe('notionOAuth', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        sessionStorage.clear();
        vi.spyOn(crypto, 'randomUUID').mockReturnValue('notion-state-123');
    });

    it('NOTION-001: builds a Notion OAuth URL without asking users for API keys', () => {
        const state = createNotionOAuthState();
        const url = buildNotionOAuthUrl({
            clientId: 'notion-client-id',
            redirectUri: 'http://localhost:5173/mypage/notion',
            state
        });

        expect(url.origin).toBe('https://api.notion.com');
        expect(url.pathname).toBe('/v1/oauth/authorize');
        expect(url.searchParams.get('client_id')).toBe('notion-client-id');
        expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:5173/mypage/notion');
        expect(url.searchParams.get('response_type')).toBe('code');
        expect(url.searchParams.get('owner')).toBe('user');
        expect(url.searchParams.get('state')).toBe('notion-state-123');
        expect(url.searchParams.has('client_secret')).toBe(false);

        expect(() => consumeNotionOAuthState('notion-state-123')).not.toThrow();
    });

    it('NOTION-001: uses an explicit redirect URI when configured', () => {
        vi.stubEnv('VITE_NOTION_REDIRECT_URI', 'http://localhost:5173/mypage/notion');

        expect(getNotionRedirectUri()).toBe('http://localhost:5173/mypage/notion');
    });
});
