import { describe, expect, it, vi } from 'vitest';
import { buildWebLoginUrl, handleExternalAuthMessage } from '../src/shared/auth/extensionAuth';
describe('extensionAuth', () => {
    it('opens the web login flow with an extension connect redirect', () => {
        const url = buildWebLoginUrl({
            webAppUrl: 'http://localhost:5173',
            currentUrl: 'https://www.jasoseol.com/recruit/1'
        });
        expect(url.toString()).toBe('http://localhost:5173/?redirect=%2Fextension%2Fconnect%3FsourceUrl%3Dhttps%253A%252F%252Fwww.jasoseol.com%252Frecruit%252F1');
    });
    it('stores the web-issued EZ One session sent by the extension connect page', async () => {
        const storage = {
            set: vi.fn(async () => undefined),
            get: vi.fn(async () => ({})),
            remove: vi.fn(async () => undefined)
        };
        const accepted = await handleExternalAuthMessage(storage, {
            type: 'EZONE_EXTENSION_AUTH_SESSION',
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
            user: { id: 1, email: 'user@example.com' }
        });
        expect(accepted).toBe(true);
        expect(storage.set).toHaveBeenCalledWith({
            ezoneAccessToken: 'access-token',
            ezoneRefreshToken: 'refresh-token',
            ezoneCurrentUser: { id: 1, email: 'user@example.com' }
        });
    });
    it('rejects unrelated external messages', async () => {
        const storage = {
            set: vi.fn(async () => undefined),
            get: vi.fn(async () => ({})),
            remove: vi.fn(async () => undefined)
        };
        await expect(handleExternalAuthMessage(storage, { type: 'OTHER' })).resolves.toBe(false);
        expect(storage.set).not.toHaveBeenCalled();
    });
});
