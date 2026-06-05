import { defaultHttpClient, unwrapApiData } from '@/shared/apiClient';
export function createRecommendationApi(httpClient = defaultHttpClient) {
    return {
        async listJobs() {
            const response = await httpClient.get('/api/recommendations/jobs');
            return unwrapApiData(response.data).map(toRecommendationJob);
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
export const recommendationApi = createRecommendationApi();
