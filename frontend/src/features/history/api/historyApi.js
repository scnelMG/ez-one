import { defaultHttpClient, unwrapApiData } from '@/shared/apiClient';

export function createHistoryApi(httpClient = defaultHttpClient) {
    return {
        async listApplications({ period = 'ALL', resultStage } = {}) {
            const response = await httpClient.get('/api/history/applications', {
                params: {
                    period,
                    resultStage
                }
            });
            return toHistory(unwrapApiData(response.data));
        },
        async updateApplicationLabels(historyApplicationId, { applicationStatus, resultStage }) {
            const response = await httpClient.patch(`/api/history/applications/${historyApplicationId}/labels`, {
                applicationStatus,
                resultStage
            });
            return toHistoryRow(unwrapApiData(response.data));
        }
    };
}

function toHistory(dto) {
    return {
        periods: dto.periods ?? [],
        summary: {
            total: dto.summary?.total ?? 0,
            completed: dto.summary?.completed ?? 0,
            notApplied: dto.summary?.notApplied ?? 0,
            inProgress: dto.summary?.inProgress ?? 0,
            ready: dto.summary?.ready ?? 0,
            documentFailed: dto.summary?.documentFailed ?? 0,
            testFailed: dto.summary?.testFailed ?? 0,
            interviewFailed: dto.summary?.interviewFailed ?? 0
        },
        companyTypes: dto.companyTypes ?? [],
        industryStats: dto.industryStats ?? [],
        dataQuality: {
            total: dto.dataQuality?.total ?? 0,
            companyMaster: dto.dataQuality?.companyMaster ?? 0,
            ruleBased: dto.dataQuality?.ruleBased ?? 0,
            unknown: dto.dataQuality?.unknown ?? 0
        },
        rows: (dto.rows ?? []).map(toHistoryRow)
    };
}

function toHistoryRow(dto) {
    return {
        id: String(dto.id),
        workspaceId: String(dto.workspaceId),
        companyName: dto.companyName,
        positionTitle: dto.positionTitle,
        applicationStatus: dto.applicationStatus,
        resultStage: dto.resultStage,
        resultLabel: dto.resultLabel,
        rawResult: dto.rawResult,
        deadlineLabel: dto.deadlineLabel,
        sourceUrl: dto.sourceUrl,
        companyLogoUrl: dto.companyLogoUrl,
        companyType: dto.companyType,
        companyIndustry: dto.companyIndustry,
        companyDataSource: dto.companyDataSource
    };
}

export const historyApi = createHistoryApi();
