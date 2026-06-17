import { defaultHttpClient, unwrapApiData } from '@/shared/apiClient';
export function createDocumentProfileApi(httpClient = defaultHttpClient) {
    return {
        async getDocumentProfile() {
            try {
                const response = await httpClient.get('/api/document-profile', readConfig(httpClient));
                return toDocumentProfile(unwrapApiData(response.data));
            } catch {
                return toDocumentProfile({ sections: {}, customFields: [], lastSavedAt: null });
            }
        },
        async saveSection(sectionType, payload) {
            const response = await httpClient.put(`/api/document-profile/sections/${sectionType}`, { payload });
            return toDocumentProfile(unwrapApiData(response.data));
        }
    };
}
function toDocumentProfile(dto) {
    return {
        sections: dto.sections ?? {},
        customFields: [],
        lastSavedAt: dto.lastSavedAt
    };
}
function readConfig(httpClient) {
    return httpClient === defaultHttpClient ? { skipAuthRefresh: true } : {};
}
export const documentProfileApi = createDocumentProfileApi();


