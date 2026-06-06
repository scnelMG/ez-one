import { defaultHttpClient, unwrapApiData } from '@/shared/apiClient';
import { mockBasketJobs } from '@/features/basket/api/mockBasketData';
export function createRecommendationApi(httpClient = defaultHttpClient) {
    return {
        async listJobs() {
            try {
                const response = await httpClient.get('/api/recommendations/jobs', readConfig(httpClient));
                return unwrapApiData(response.data).map(toRecommendationJob);
            } catch {
                return mockBasketJobs.slice(0, 3).map((job) => ({
                    id: job.id,
                    companyName: job.companyName,
                    positionTitle: job.positionTitle,
                    deadlineLabel: job.deadlineLabel,
                    workspaceId: job.workspaceId
                }));
            }
        },
        async saveJob(recommendationId) {
            const response = await httpClient.post(`/api/recommendations/jobs/${recommendationId}/save`);
            const data = unwrapApiData(response.data);
            return {
                basketJobId: String(data.id),
                workspaceId: String(data.workspaceId),
                companyName: data.companyName,
                positionTitle: data.positionTitle
            };
        }
    };
}
function toRecommendationJob(dto) {
    return {
        id: String(dto.basketJobId),
        companyName: dto.companyName,
        positionTitle: dto.positionTitle,
        deadlineLabel: dto.deadlineLabel,
        workspaceId: dto.workspaceId == null ? null : String(dto.workspaceId)
    };
}
function readConfig(httpClient) {
    return httpClient === defaultHttpClient ? { skipAuthRefresh: true } : {};
}
export const recommendationApi = createRecommendationApi();


