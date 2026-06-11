import { defaultHttpClient, unwrapApiData } from '@/shared/apiClient';

const emptyDashboardSummary = {
    summary: {
        totalApplications: 0,
        inProgress: 0,
        notStarted: 0,
        deadlineSoon: 0
    },
    todayJobs: []
};

export function createDashboardApi(httpClient = defaultHttpClient) {
    return {
        async getSummary() {
            try {
                const response = await httpClient.get('/api/dashboard/summary', { skipAuthRefresh: true });
                const data = unwrapApiData(response.data);
                return {
                    summary: {
                        totalApplications: data.totalApplications,
                        inProgress: data.inProgress,
                        notStarted: data.notStarted,
                        deadlineSoon: data.deadlineSoon
                    },
                    todayJobs: data.todayJobs.map((job) => ({
                        companyName: job.companyName,
                        positionTitle: job.positionTitle,
                        deadlineLabel: job.deadlineLabel,
                        workspaceId: String(job.workspaceId)
                    }))
                };
            } catch {
                return emptyDashboardSummary;
            }
        },
        async getActivities() {
            try {
                const response = await httpClient.get('/api/dashboard/activities', { skipAuthRefresh: true });
                return unwrapApiData(response.data);
            } catch {
                return [];
            }
        }
    };
}

export const dashboardApi = createDashboardApi();
