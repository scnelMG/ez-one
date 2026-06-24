import { describe, expect, it, vi } from 'vitest';
import { createNotionApi } from './notionApi';
describe('notionApi', () => {
    it('NOTION-001: loads the current Notion connection', async () => {
        const get = vi.fn().mockResolvedValue({
            data: {
                success: true,
                data: {
                    connected: true,
                    notionAccountEmail: 'notion@example.com',
                    syncEnabled: true,
                    syncScope: 'JOB_ONLY'
                },
                error: null
            }
        });
        const api = createNotionApi({ get, post: vi.fn(), put: vi.fn() });
        const connection = await api.getConnection();
        expect(get).toHaveBeenCalledWith('/api/integrations/notion', {});
        expect(connection).toEqual({
            connected: true,
            notionAccountEmail: 'notion@example.com',
            syncEnabled: true,
            syncScope: 'JOB_ONLY'
        });
    });
    it('NOTION-001: persists JOB_ONLY sync settings only', async () => {
        const put = vi.fn().mockResolvedValue({
            data: {
                success: true,
                data: {
                    connected: true,
                    notionAccountEmail: 'notion@example.com',
                    syncEnabled: true,
                    syncScope: 'JOB_ONLY'
                },
                error: null
            }
        });
        const api = createNotionApi({ get: vi.fn(), post: vi.fn(), put });
        const connection = await api.updateSyncSettings(true);
        expect(put).toHaveBeenCalledWith('/api/integrations/notion/sync-settings', {
            syncEnabled: true,
            syncScope: 'JOB_ONLY'
        });
        expect(connection.syncScope).toBe('JOB_ONLY');
    });
    it('NOTION-001: connects the current user Notion account', async () => {
        const post = vi.fn().mockResolvedValue({
            data: {
                success: true,
                data: {
                    connected: true,
                    notionAccountEmail: 'notion@example.com',
                    syncEnabled: true,
                    syncScope: 'JOB_ONLY'
                },
                error: null
            }
        });
        const api = createNotionApi({ get: vi.fn(), post, put: vi.fn() });
        const connection = await api.connect({
            authorizationCode: 'notion-oauth-code',
            redirectUri: 'http://localhost:5173/mypage/notion'
        });
        expect(post).toHaveBeenCalledWith('/api/integrations/notion/connect', {
            authorizationCode: 'notion-oauth-code',
            redirectUri: 'http://localhost:5173/mypage/notion'
        });
        expect(connection.connected).toBe(true);
        expect(connection.syncScope).toBe('JOB_ONLY');
    });
    it('NOTION-001: requests immediate sync for the current basket jobs', async () => {
        const post = vi.fn().mockResolvedValue({
            data: {
                success: true,
                data: {
                    connected: true,
                    notionAccountEmail: 'notion@example.com',
                    syncEnabled: true,
                    syncScope: 'JOB_ONLY'
                },
                error: null
            }
        });
        const api = createNotionApi({ get: vi.fn(), post, put: vi.fn() });
        const connection = await api.syncNow();
        expect(post).toHaveBeenCalledWith('/api/integrations/notion/sync-now', {});
        expect(connection.connected).toBe(true);
    });
    it('NOTION-001: loads the server-built Notion OAuth URL', async () => {
        const get = vi.fn().mockResolvedValue({
            data: {
                success: true,
                data: {
                    authorizationUrl: 'https://api.notion.com/v1/oauth/authorize?client_id=notion-client-id'
                },
                error: null
            }
        });
        const api = createNotionApi({ get, post: vi.fn(), put: vi.fn() });
        const authorizationUrl = await api.getOAuthUrl({
            redirectUri: 'http://localhost:5173/mypage/notion',
            state: 'notion-state'
        });
        expect(get).toHaveBeenCalledWith('/api/integrations/notion/oauth-url', {
            params: {
                redirectUri: 'http://localhost:5173/mypage/notion',
                state: 'notion-state'
            }
        });
        expect(authorizationUrl).toBe('https://api.notion.com/v1/oauth/authorize?client_id=notion-client-id');
    });
    it('NOTION-JOB-001: loads sync logs', async () => {
        const get = vi.fn().mockResolvedValue({
            data: {
                success: true,
                data: [
                    {
                        id: 1,
                        target: 'JOB',
                        status: 'SUCCESS',
                        message: 'Synced'
                    }
                ],
                error: null
            }
        });
        const api = createNotionApi({ get, post: vi.fn(), put: vi.fn() });
        const logs = await api.listSyncLogs();
        expect(get).toHaveBeenCalledWith('/api/integrations/notion/sync-logs', {});
        expect(logs).toEqual([
            {
                id: '1',
                target: 'JOB',
                status: 'SUCCESS',
                message: 'Synced'
            }
        ]);
    });
});

