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
});
