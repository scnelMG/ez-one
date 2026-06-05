import { defaultHttpClient, unwrapApiData } from '@/shared/apiClient';
export function createDashboardApi(httpClient = defaultHttpClient) {
    return {
        async getSummary() {
            const response = await httpClient.get('/api/dashboard/summary');
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
        }
    };
}
export const dashboardApi = createDashboardApi();
