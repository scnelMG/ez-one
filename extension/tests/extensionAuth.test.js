import { describe, expect, it, vi } from 'vitest';
import { PENDING_EXTENSION_CONTINUATION_KEY, buildWebLoginUrl, clearStoredSession, getStoredSession, handleExternalAuthMessage, validateStoredSession } from '../src/shared/auth/extensionAuth';
describe('extensionAuth', () => {
    it('exposes a storage key for restoring the selected extension task after login', () => {
        expect(PENDING_EXTENSION_CONTINUATION_KEY).toBe('ezonePendingExtensionContinuation');
    });

    it('opens the web login flow with an extension connect redirect', () => {
        const url = buildWebLoginUrl({
            webAppUrl: 'http://localhost:5173',
            currentUrl: 'https://www.jasoseol.com/recruit/1'
        });
        expect(url.toString()).toBe('http://localhost:5173/login?redirect=%2Fextension%2Fconnect%3FsourceUrl%3Dhttps%253A%252F%252Fwww.jasoseol.com%252Frecruit%252F1');
    });
    it('includes the source tab id in the web login redirect when available', () => {
        const url = buildWebLoginUrl({
            webAppUrl: 'http://localhost:5173',
            currentUrl: 'https://www.jasoseol.com/recruit/1',
            sourceTabId: 42
        });
        expect(url.searchParams.get('redirect')).toBe('/extension/connect?sourceUrl=https%3A%2F%2Fwww.jasoseol.com%2Frecruit%2F1&sourceTabId=42');
    });
    it('EXT-003/AUTH-006: validates a stored extension session by refreshing it before showing authenticated UI', async () => {
        const storage = {
            get: vi.fn(async () => ({
                ezoneAccessToken: 'stale-access-token',
                ezoneRefreshToken: 'refresh-token',
                ezoneCurrentUser: { id: 1, email: 'user@example.com' }
            })),
            set: vi.fn(async () => undefined),
            remove: vi.fn(async () => undefined)
        };
        const fetcher = vi.fn(async () => ({
            ok: true,
            status: 200,
            json: async () => ({
                success: true,
                data: {
                    accessToken: 'fresh-access-token',
                    refreshToken: 'fresh-refresh-token',
                    user: { id: 1, email: 'user@example.com' }
                },
                error: null
            })
        }));

        const session = await validateStoredSession(storage, {
            apiBaseUrl: 'http://localhost:8080/api',
            fetcher
        });

        expect(fetcher).toHaveBeenCalledWith('http://localhost:8080/api/auth/refresh', expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ refreshToken: 'refresh-token' })
        }));
        expect(storage.set).toHaveBeenCalledWith({
            ezoneAccessToken: 'fresh-access-token',
            ezoneRefreshToken: 'fresh-refresh-token',
            ezoneCurrentUser: { id: 1, email: 'user@example.com' }
        });
        expect(session?.accessToken).toBe('fresh-access-token');
        expect(storage.remove).not.toHaveBeenCalled();
    });
    it('EXT-003/AUTH-006: shares concurrent validation for the same refresh token', async () => {
        const storageValues = {
            ezoneAccessToken: 'stale-access-token',
            ezoneRefreshToken: 'refresh-token',
            ezoneCurrentUser: { id: 1, email: 'user@example.com' }
        };
        const storage = {
            get: vi.fn(async () => ({ ...storageValues })),
            set: vi.fn(async (values) => Object.assign(storageValues, values)),
            remove: vi.fn(async () => undefined)
        };
        const fetcher = vi.fn(async () => ({
            ok: true,
            status: 200,
            json: async () => ({
                success: true,
                data: {
                    accessToken: 'fresh-access-token',
                    refreshToken: 'fresh-refresh-token',
                    user: { id: 1, email: 'user@example.com' }
                },
                error: null
            })
        }));

        const [first, second] = await Promise.all([
            validateStoredSession(storage, {
                apiBaseUrl: 'http://localhost:8080/api',
                fetcher
            }),
            validateStoredSession(storage, {
                apiBaseUrl: 'http://localhost:8080/api',
                fetcher
            })
        ]);

        expect(fetcher).toHaveBeenCalledTimes(1);
        expect(first?.refreshToken).toBe('fresh-refresh-token');
        expect(second?.refreshToken).toBe('fresh-refresh-token');
        expect(storage.remove).not.toHaveBeenCalled();
    });
    it('EXT-003/AUTH-006: does not clear a newer stored session after an older refresh fails', async () => {
        const storageValues = {
            ezoneAccessToken: 'new-access-token',
            ezoneRefreshToken: 'new-refresh-token',
            ezoneCurrentUser: { id: 1, email: 'user@example.com' }
        };
        let firstGet = true;
        const storage = {
            get: vi.fn(async () => {
                if (firstGet) {
                    firstGet = false;
                    return {
                        ezoneAccessToken: 'stale-access-token',
                        ezoneRefreshToken: 'revoked-refresh-token',
                        ezoneCurrentUser: { id: 1, email: 'user@example.com' }
                    };
                }
                return { ...storageValues };
            }),
            set: vi.fn(async (values) => Object.assign(storageValues, values)),
            remove: vi.fn(async () => undefined)
        };
        const fetcher = vi.fn(async () => ({
            ok: false,
            status: 401,
            json: async () => ({
                success: false,
                data: null,
                error: { message: 'Invalid refresh token.' }
            })
        }));

        await expect(validateStoredSession(storage, {
            apiBaseUrl: 'http://localhost:8080/api',
            fetcher
        })).resolves.toBeNull();

        expect(storage.remove).not.toHaveBeenCalled();
    });
    it('EXT-003/AUTH-006: clears stored tokens when extension session refresh fails', async () => {
        const storage = {
            get: vi.fn(async () => ({
                ezoneAccessToken: 'stale-access-token',
                ezoneRefreshToken: 'revoked-refresh-token'
            })),
            set: vi.fn(async () => undefined),
            remove: vi.fn(async () => undefined)
        };
        const fetcher = vi.fn(async () => ({
            ok: false,
            status: 401,
            json: async () => ({
                success: false,
                data: null,
                error: { message: 'Invalid refresh token.' }
            })
        }));

        await expect(validateStoredSession(storage, {
            apiBaseUrl: 'http://localhost:8080/api',
            fetcher
        })).resolves.toBeNull();

        expect(storage.remove).toHaveBeenCalledWith([
            'ezoneAccessToken',
            'ezoneRefreshToken',
            'ezoneCurrentUser'
        ]);
        expect(storage.set).not.toHaveBeenCalled();
    });
    it('EXT-003/AUTH-006: keeps a stored session when refresh cannot reach the server', async () => {
        const storage = {
            get: vi.fn(async () => ({
                ezoneAccessToken: 'cached-access-token',
                ezoneRefreshToken: 'cached-refresh-token',
                ezoneCurrentUser: { id: 1, email: 'user@example.com' }
            })),
            set: vi.fn(async () => undefined),
            remove: vi.fn(async () => undefined)
        };
        const fetcher = vi.fn(async () => {
            throw new Error('Failed to fetch');
        });

        const session = await validateStoredSession(storage, {
            apiBaseUrl: 'http://localhost:8080/api',
            fetcher
        });

        expect(session).toEqual({
            accessToken: 'cached-access-token',
            refreshToken: 'cached-refresh-token',
            user: { id: 1, email: 'user@example.com' }
        });
        expect(storage.remove).not.toHaveBeenCalled();
        expect(storage.set).not.toHaveBeenCalled();
    });
    it('EXT-003/AUTH-006: rejects a stored session on refresh network failure when a fresh session is required', async () => {
        const storage = {
            get: vi.fn(async () => ({
                ezoneAccessToken: 'cached-access-token',
                ezoneRefreshToken: 'cached-refresh-token'
            })),
            set: vi.fn(async () => undefined),
            remove: vi.fn(async () => undefined)
        };
        const fetcher = vi.fn(async () => {
            throw new Error('Failed to fetch');
        });

        const session = await validateStoredSession(storage, {
            apiBaseUrl: 'http://localhost:8080/api',
            fetcher,
            requireFreshSession: true
        });

        expect(session).toBeNull();
        expect(storage.remove).not.toHaveBeenCalled();
        expect(storage.set).not.toHaveBeenCalled();
    });
    it('EXT-003/AUTH-006: keeps a stored session when refresh returns a temporary server error', async () => {
        const storage = {
            get: vi.fn(async () => ({
                ezoneAccessToken: 'cached-access-token',
                ezoneRefreshToken: 'cached-refresh-token'
            })),
            set: vi.fn(async () => undefined),
            remove: vi.fn(async () => undefined)
        };
        const fetcher = vi.fn(async () => ({
            ok: false,
            status: 503,
            json: async () => ({
                success: false,
                data: null,
                error: { message: 'Service unavailable.' }
            })
        }));

        const session = await validateStoredSession(storage, {
            apiBaseUrl: 'http://localhost:8080/api',
            fetcher
        });

        expect(session?.accessToken).toBe('cached-access-token');
        expect(storage.remove).not.toHaveBeenCalled();
        expect(storage.set).not.toHaveBeenCalled();
    });
    it('EXT-003/AUTH-006: rejects a stored session on temporary server errors when a fresh session is required', async () => {
        const storage = {
            get: vi.fn(async () => ({
                ezoneAccessToken: 'cached-access-token',
                ezoneRefreshToken: 'cached-refresh-token'
            })),
            set: vi.fn(async () => undefined),
            remove: vi.fn(async () => undefined)
        };
        const fetcher = vi.fn(async () => ({
            ok: false,
            status: 503,
            json: async () => ({
                success: false,
                data: null,
                error: { message: 'Service unavailable.' }
            })
        }));

        const session = await validateStoredSession(storage, {
            apiBaseUrl: 'http://localhost:8080/api',
            fetcher,
            requireFreshSession: true
        });

        expect(session).toBeNull();
        expect(storage.remove).not.toHaveBeenCalled();
        expect(storage.set).not.toHaveBeenCalled();
    });
    it('EXT-003/AUTH-006: treats invalidated extension storage reads as a missing session', async () => {
        const storage = {
            get: vi.fn(async () => {
                throw new Error('Extension context invalidated.');
            }),
            set: vi.fn(async () => undefined),
            remove: vi.fn(async () => undefined)
        };

        await expect(getStoredSession(storage)).resolves.toBeNull();
        await expect(validateStoredSession(storage, {
            apiBaseUrl: 'http://localhost:8080/api',
            fetcher: vi.fn()
        })).resolves.toBeNull();
    });
    it('EXT-003/AUTH-006: ignores invalidated extension storage clears', async () => {
        const storage = {
            get: vi.fn(async () => ({})),
            set: vi.fn(async () => undefined),
            remove: vi.fn(async () => {
                throw new Error('Extension context invalidated.');
            })
        };

        await expect(clearStoredSession(storage)).resolves.toBeUndefined();
    });
    it('stores the web-issued EZ-ONE session sent by the extension connect page', async () => {
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
    it('returns focus to the source posting tab after storing the session', async () => {
        const storage = {
            set: vi.fn(async () => undefined),
            get: vi.fn(async () => ({})),
            remove: vi.fn(async () => undefined)
        };
        const tabs = {
            update: vi.fn(async () => undefined),
            remove: vi.fn(async () => undefined)
        };
        await handleExternalAuthMessage(storage, {
            type: 'EZONE_EXTENSION_AUTH_SESSION',
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
            sourceTabId: '42'
        }, {
            tabs,
            senderTabId: 99
        });
        expect(tabs.update).toHaveBeenCalledWith(42, { active: true });
        expect(tabs.remove).not.toHaveBeenCalled();
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

    it('ignores auth messages when the extension context was invalidated during storage', async () => {
        const storage = {
            set: vi.fn(async () => {
                throw new Error('Extension context invalidated.');
            }),
            get: vi.fn(async () => ({})),
            remove: vi.fn(async () => undefined)
        };
        const tabs = {
            update: vi.fn(async () => undefined)
        };

        await expect(handleExternalAuthMessage(storage, {
            type: 'EZONE_EXTENSION_AUTH_SESSION',
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
            sourceTabId: '42'
        }, { tabs })).resolves.toBe(false);
        expect(tabs.update).not.toHaveBeenCalled();
    });
});
