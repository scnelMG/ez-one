import { describe, expect, it, vi } from 'vitest';
import { createDashboardApi } from './dashboardApi';
describe('dashboardApi', () => {
    it('DASH-001: loads dashboard summary from the backend API contract', async () => {
        const get = vi.fn().mockResolvedValue({
            data: {
                success: true,
                data: {
                    totalApplications: 3,
                    inProgress: 1,
                    notStarted: 1,
                    deadlineSoon: 2,
                    todayJobs: [
                        {
                            basketJobId: 101,
                            workspaceId: 102,
                            companyName: '네이버',
                            positionTitle: 'Backend Engineer',
                            deadlineLabel: '오늘 18:00'
                        }
                    ]
                },
                error: null
            }
        });
        const api = createDashboardApi({ get });
        const response = await api.getSummary();
        expect(get).toHaveBeenCalledWith('/api/dashboard/summary');
        expect(response.summary.totalApplications).toBe(3);
        expect(response.todayJobs[0]).toMatchObject({
            companyName: '네이버',
            workspaceId: '102'
        });
    });
});
