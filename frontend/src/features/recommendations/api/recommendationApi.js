import { resolveCompanyLogoUrl } from '@/features/jobs/companyLogo';
import { defaultHttpClient, unwrapApiData } from '@/shared/apiClient';

export function createRecommendationApi(httpClient = defaultHttpClient) {
    return {
        async listMattermostJobs() {
            const response = await httpClient.get('/api/recommendations/jobs', {
                params: { source: 'mattermost' },
                skipAuthRefresh: true
            });
            return unwrapApiData(response.data).map(toRecommendationJob);
        },
        async saveMattermostJob(recommendationId) {
            const response = await httpClient.post(`/api/recommendations/jobs/${recommendationId}/save`, null, {
                params: { source: 'mattermost' }
            });
            return toSavedBasketJob(unwrapApiData(response.data));
        }
    };
}

function toRecommendationJob(dto) {
    return {
        id: String(dto.basketJobId),
        workspaceId: dto.workspaceId == null ? null : String(dto.workspaceId),
        companyName: dto.companyName,
        positionTitle: dto.positionTitle,
        deadlineLabel: dto.deadlineLabel,
        companyLogoUrl: resolveCompanyLogoUrl(dto),
        sourceUrl: dto.sourceUrl ?? ''
    };
}

function toSavedBasketJob(dto) {
    return {
        id: String(dto.id),
        workspaceId: String(dto.workspaceId),
        companyName: dto.companyName,
        positionTitle: dto.positionTitle
    };
}

export const recommendationApi = createRecommendationApi();
