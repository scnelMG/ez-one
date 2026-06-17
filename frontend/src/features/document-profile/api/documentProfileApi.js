import { defaultHttpClient, unwrapApiData } from '@/shared/apiClient';
export function createDocumentProfileApi(httpClient = defaultHttpClient) {
    return {
        async getDocumentProfile() {
            const response = await httpClient.get('/api/document-profile');
            return toDocumentProfile(unwrapApiData(response.data));
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
export const documentProfileApi = createDocumentProfileApi();
