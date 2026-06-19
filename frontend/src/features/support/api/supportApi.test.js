import { describe, expect, it, vi } from 'vitest';
import { createSupportApi } from './supportApi';

describe('supportApi', () => {
    it('SUPPORT-001: fetches current user support requests', async () => {
        const get = vi.fn().mockResolvedValue({
            data: {
                success: true,
                data: [{ id: 1, title: '문의', status: 'RECEIVED' }],
                error: null
            }
        });
        const api = createSupportApi({ get, post: vi.fn() });

        const response = await api.getMyRequests();

        expect(get).toHaveBeenCalledWith('/api/support/requests');
        expect(response[0].title).toBe('문의');
    });

    it('SUPPORT-001: creates a support request', async () => {
        const request = {
            requestType: 'INQUIRY',
            category: 'ERROR',
            title: '오류 문의',
            body: '동기화가 실패합니다.'
        };
        const post = vi.fn().mockResolvedValue({
            data: {
                success: true,
                data: { id: 2, ...request, status: 'RECEIVED' },
                error: null
            }
        });
        const api = createSupportApi({ get: vi.fn(), post });

        const response = await api.createRequest(request);

        expect(post).toHaveBeenCalledWith('/api/support/requests', request);
        expect(response.status).toBe('RECEIVED');
    });

    it('SUPPORT-001: rejects retired partnership support payloads before posting', async () => {
        const post = vi.fn();
        const api = createSupportApi({ get: vi.fn(), post });

        await expect(api.createRequest({
            requestType: 'PARTNERSHIP',
            category: 'CONTENT',
            title: '제휴 문의',
            body: '제휴 제안입니다.',
            companyName: 'Partner Co.'
        })).rejects.toThrow('Only inquiry support requests are supported.');
        expect(post).not.toHaveBeenCalled();
    });
});
