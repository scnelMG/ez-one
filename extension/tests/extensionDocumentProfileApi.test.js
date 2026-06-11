import { describe, expect, it, vi } from 'vitest';
import { createExtensionDocumentProfileApi } from '../src/shared/api/extensionDocumentProfileApi';

describe('extensionDocumentProfileApi', () => {
    it('requires a stored access token before loading extension document profile data', async () => {
        const fetcher = vi.fn();
        const api = createExtensionDocumentProfileApi({
            apiBaseUrl: 'http://localhost:8080/api',
            getAccessToken: async () => null,
            fetcher
        });

        await expect(api.getDocumentProfile()).rejects.toThrow('로그인이 필요합니다.');
        expect(fetcher).not.toHaveBeenCalled();
    });

    it('loads document profile data with the extension bearer token', async () => {
        const fetcher = vi.fn(async () => ({
            ok: true,
            json: async () => ({
                success: true,
                data: {
                    sections: {
                        basicInfo: { nameKo: 'Kim Jiwon', email: 'jiwon@example.com' }
                    },
                    customFields: [],
                    lastSavedAt: '2026-06-06T00:00:00Z'
                },
                error: null
            })
        }));
        const api = createExtensionDocumentProfileApi({
            apiBaseUrl: 'http://localhost:8080/api',
            getAccessToken: async () => 'access-token',
            fetcher
        });

        const profile = await api.getDocumentProfile();

        expect(profile.sections.basicInfo.nameKo).toBe('Kim Jiwon');
        expect(fetcher).toHaveBeenCalledWith('http://localhost:8080/api/extension/document-profile', expect.objectContaining({
            method: 'GET',
            headers: {
                Authorization: 'Bearer access-token',
                'Content-Type': 'application/json'
            }
        }));
    });

    it('clears the extension session when refresh fails after an invalid access token', async () => {
        const fetcher = vi.fn()
            .mockResolvedValueOnce({
                ok: false,
                status: 401,
                json: async () => ({
                    success: false,
                    data: null,
                    error: { message: 'Invalid access token.' }
                })
            })
            .mockResolvedValueOnce({
                ok: false,
                status: 401,
                json: async () => ({
                    success: false,
                    data: null,
                    error: { message: 'Refresh token is invalid.' }
                })
            });
        const clearSession = vi.fn(async () => undefined);
        const api = createExtensionDocumentProfileApi({
            apiBaseUrl: 'http://localhost:8080/api',
            getAccessToken: async () => 'stale-access-token',
            getRefreshToken: async () => 'expired-refresh-token',
            clearSession,
            fetcher
        });

        await expect(api.getDocumentProfile()).rejects.toThrow('로그인이 만료되었습니다. 다시 로그인해 주세요.');
        expect(clearSession).toHaveBeenCalled();
    });
    it('hides raw browser fetch errors behind a user-friendly server message', async () => {
        const api = createExtensionDocumentProfileApi({
            apiBaseUrl: 'http://localhost:8080/api',
            getAccessToken: async () => 'access-token',
            fetcher: vi.fn(async () => {
                throw new TypeError('Failed to fetch');
            })
        });

        await expect(api.getDocumentProfile()).rejects.toThrow('서버에 연결하지 못했습니다. EZ-ONE 서버가 켜져 있는지 확인해 주세요.');
    });
});
