import { describe, expect, it, vi } from 'vitest';
import { createDocumentProfileApi } from './documentProfileApi';

describe('documentProfileApi', () => {
    it('PROFILE-001: loads the standard document profile sections without custom fields', async () => {
        const get = vi.fn().mockResolvedValue({
            data: {
                success: true,
                data: {
                    sections: {
                        basicInfo: {
                            nameKo: '홍길동',
                            email: 'user@example.com'
                        }
                    },
                    customFields: [
                        {
                            id: 301,
                            label: '포트폴리오',
                            fieldType: 'URL',
                            value: 'https://example.com'
                        }
                    ],
                    lastSavedAt: '2026-06-05T12:00:00Z'
                },
                error: null
            }
        });
        const api = createDocumentProfileApi({ get, put: vi.fn() });

        const profile = await api.getDocumentProfile();

        expect(get).toHaveBeenCalledWith('/api/document-profile');
        expect(profile.sections.basicInfo).toEqual({
            nameKo: '홍길동',
            email: 'user@example.com'
        });
        expect(profile.customFields).toEqual([]);
        expect(profile.lastSavedAt).toBe('2026-06-05T12:00:00Z');
    });

    it('PROFILE-001: does not hide authentication failures as an empty profile', async () => {
        const authError = new Error('Authentication is required.');
        const get = vi.fn().mockRejectedValue(authError);
        const api = createDocumentProfileApi({ get, put: vi.fn() });

        await expect(api.getDocumentProfile()).rejects.toThrow('Authentication is required.');
    });

    it('PROFILE-001: saves a section through the backend section endpoint', async () => {
        const put = vi.fn().mockResolvedValue({
            data: {
                success: true,
                data: {
                    sections: {
                        basicInfo: {
                            nameKo: '김지원',
                            email: 'jiwon@example.com'
                        }
                    },
                    customFields: []
                },
                error: null
            }
        });
        const api = createDocumentProfileApi({ get: vi.fn(), put });

        const profile = await api.saveSection('basicInfo', {
            nameKo: '김지원',
            email: 'jiwon@example.com'
        });

        expect(put).toHaveBeenCalledWith('/api/document-profile/sections/basicInfo', {
            payload: {
                nameKo: '김지원',
                email: 'jiwon@example.com'
            }
        });
        expect(profile.sections.basicInfo.email).toBe('jiwon@example.com');
    });
});
