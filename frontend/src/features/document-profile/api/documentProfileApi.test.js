import { describe, expect, it, vi } from 'vitest';
import { createDocumentProfileApi } from './documentProfileApi';

describe('documentProfileApi', () => {
    it('PROFILE-001: loads the document profile sections and custom fields', async () => {
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
        expect(get).toHaveBeenCalledWith('/api/document-profile', {});
        expect(profile.sections.basicInfo).toEqual({
            nameKo: '홍길동',
            email: 'user@example.com'
        });
        expect(profile.customFields).toEqual([
            {
                id: '301',
                label: '포트폴리오',
                fieldType: 'URL',
                value: 'https://example.com'
            }
        ]);
        expect(profile.lastSavedAt).toBe('2026-06-05T12:00:00Z');
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

    it('PROFILE-001: creates, updates, and deletes custom fields', async () => {
        const post = vi.fn().mockResolvedValue({
            data: {
                success: true,
                data: {
                    id: 401,
                    label: '포트폴리오',
                    fieldType: 'URL',
                    value: 'https://example.com'
                },
                error: null
            }
        });
        const patch = vi.fn().mockResolvedValue({
            data: {
                success: true,
                data: {
                    id: 401,
                    label: '포트폴리오 수정',
                    fieldType: 'URL',
                    value: 'https://example.com/updated'
                },
                error: null
            }
        });
        const deleteRequest = vi.fn().mockResolvedValue({
            data: { success: true, data: null, error: null }
        });
        const api = createDocumentProfileApi({ get: vi.fn(), put: vi.fn(), post, patch, delete: deleteRequest });
        await expect(api.createCustomField({
            label: '포트폴리오',
            fieldType: 'URL',
            value: 'https://example.com'
        })).resolves.toEqual({
            id: '401',
            label: '포트폴리오',
            fieldType: 'URL',
            value: 'https://example.com'
        });
        await expect(api.updateCustomField('401', {
            label: '포트폴리오 수정',
            fieldType: 'URL',
            value: 'https://example.com/updated'
        })).resolves.toMatchObject({ label: '포트폴리오 수정' });
        await expect(api.deleteCustomField('401')).resolves.toBeUndefined();
        expect(post).toHaveBeenCalledWith('/api/document-profile/custom-fields', {
            label: '포트폴리오',
            fieldType: 'URL',
            value: 'https://example.com'
        });
        expect(patch).toHaveBeenCalledWith('/api/document-profile/custom-fields/401', {
            label: '포트폴리오 수정',
            fieldType: 'URL',
            value: 'https://example.com/updated'
        });
        expect(deleteRequest).toHaveBeenCalledWith('/api/document-profile/custom-fields/401');
    });
});
