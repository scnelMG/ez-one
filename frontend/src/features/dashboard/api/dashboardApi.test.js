import { describe, expect, it, vi } from 'vitest';
import { createDashboardApi } from './dashboardApi';

describe('dashboardApi', () => {
    it('DASH-001: loads dashboard summary from the backend API contract', async () => {
        const get = vi.fn().mockResolvedValue({
            data: {
                success: true,
                data: {
                    totalApplications: 3,
                    inProgress: 2,
                    notStarted: 1,
                    deadlineSoon: 1,
                    todayJobs: [
                        {
                            workspaceId: 102,
                            companyName: '네이버',
                            positionTitle: '백엔드 개발자',
                            deadlineLabel: '오늘 18:00'
                        }
                    ]
                }
            }
        });
        const api = createDashboardApi({ get });
        const response = await api.getSummary();
        expect(get).toHaveBeenCalledWith('/api/dashboard/summary', { skipAuthRefresh: true });
        expect(response.summary.totalApplications).toBe(3);
        expect(response.todayJobs[0]).toMatchObject({
            companyName: '네이버',
            positionTitle: '백엔드 개발자',
            deadlineLabel: '오늘 18:00',
            workspaceId: '102'
        });
    });

    it('DASH-001: falls back to an empty Korean-ready dashboard when the API is unavailable', async () => {
        const get = vi.fn().mockRejectedValue(new Error('Request failed with status code 401'));
        const api = createDashboardApi({ get });
        const response = await api.getSummary();
        expect(response).toEqual({
            summary: {
                totalApplications: 0,
                inProgress: 0,
                notStarted: 0,
                deadlineSoon: 0
            },
            todayJobs: []
        });
    });
});
