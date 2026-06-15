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
        companyType: dto.companyType
    };
}

export const historyApi = createHistoryApi();
