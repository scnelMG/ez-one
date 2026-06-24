import { resolveCompanyLogoUrl } from '@/features/jobs/companyLogo';
import { defaultHttpClient, unwrapApiData } from '@/shared/apiClient';

export function createRecommendationApi(httpClient = defaultHttpClient) {
    return {
        async listMattermostJobs(options = {}) {
            const response = await httpClient.get('/api/recommendations/jobs', {
                params: {
                    source: 'mattermost',
                    deadlineMode: options.deadlineMode ?? 'exact'
                }
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
        companyDomain: dto.companyDomain ?? '',
        companyType: dto.companyType ?? '',
        sourceUrl: dto.sourceUrl ?? '',
        recommendationScore: dto.recommendationScore ?? null,
        recommendationReason: dto.recommendationReason ?? '',
        recommendationStatus: dto.recommendationStatus ?? '',
        postedAt: dto.postedAt ?? '',
        collectedAt: dto.collectedAt ?? ''
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
