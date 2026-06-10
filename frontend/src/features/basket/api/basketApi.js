import { defaultHttpClient, unwrapApiData } from '@/shared/apiClient';
import { mockBasketJobs } from './mockBasketData';
import { resolveCompanyLogoUrl } from '@/features/jobs/companyLogo';
export function createBasketApi(httpClient = defaultHttpClient) {
    return {
        async listJobs(status) {
            const response = await httpClient.get('/api/basket/jobs', {
                params: status ? { status: toBackendStatus(status) } : undefined,
                ...readConfig(httpClient)
            });
            return unwrapApiData(response.data).map(toBasketJob);
        },
        async createJob(payload) {
            const response = await httpClient.post('/api/basket/jobs', payload);
            return toBasketJob(unwrapApiData(response.data));
        },
        async getJob(basketJobId) {
            const response = await httpClient.get(`/api/basket/jobs/${basketJobId}`);
            return toBasketJob(unwrapApiData(response.data));
        },
        async updateJob(basketJobId, payload) {
            const response = await httpClient.patch(`/api/basket/jobs/${basketJobId}`, payload);
            return toBasketJob(unwrapApiData(response.data));
        },
        async updateStatus(basketJobId, status) {
            const response = await httpClient.patch(`/api/basket/jobs/${basketJobId}/status`, { applicationStatus: toBackendStatus(status) });
            return toBasketJob(unwrapApiData(response.data));
        },
        async archiveJob(basketJobId) {
            await httpClient.delete(`/api/basket/jobs/${basketJobId}`);
        }
    };
}
function toBasketJob(dto) {
    return {
        id: String(dto.id),
        companyName: dto.companyName,
        positionTitle: dto.positionTitle,
        status: toFrontendStatus(dto.applicationStatus),
        statusLabel: dto.statusLabel,
        deadlineLabel: dto.deadlineLabel,
        deadlineDate: dto.deadlineDate,
        deadlineSoon: dto.deadlineSoon,
        companyLogoUrl: resolveCompanyLogoUrl(dto),
        workspaceId: String(dto.workspaceId),
        sourceUrl: dto.sourceUrl,
        applicationMemo: dto.applicationMemo ?? ''
    };
}
function toFrontendStatus(status) {
    if (status === 'READY') {
        return 'NOT_STARTED';
    }
    if (status === 'NOT_APPLIED') {
        return 'NOT_APPLIED';
    }
    if (status === 'COMPLETED') {
        return 'SUBMITTED';
    }
    if (status === 'IN_PROGRESS') {
        return 'IN_PROGRESS';
    }
    return 'NOT_STARTED';
}
function toBackendStatus(status) {
    if (status === 'NOT_STARTED') {
        return 'READY';
    }
    if (status === 'NOT_APPLIED') {
        return 'NOT_APPLIED';
    }
    if (status === 'SUBMITTED') {
        return 'COMPLETED';
    }
    if (status === 'IN_PROGRESS') {
        return 'IN_PROGRESS';
    }
    return 'NOT_APPLIED';
}
function readConfig(httpClient) {
    return httpClient === defaultHttpClient ? { skipAuthRefresh: true } : {};
}
export const basketApi = createBasketApi();

