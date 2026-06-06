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
        },
        async createCustomField(payload) {
            const response = await httpClient.post('/api/document-profile/custom-fields', payload);
            return toDocumentCustomField(unwrapApiData(response.data));
        },
        async updateCustomField(fieldId, payload) {
            const response = await httpClient.patch(`/api/document-profile/custom-fields/${fieldId}`, payload);
            return toDocumentCustomField(unwrapApiData(response.data));
        },
        async deleteCustomField(fieldId) {
            await httpClient.delete(`/api/document-profile/custom-fields/${fieldId}`);
        }
    };
}
function toDocumentProfile(dto) {
    return {
        sections: dto.sections ?? {},
        customFields: (dto.customFields ?? []).map(toDocumentCustomField),
        lastSavedAt: dto.lastSavedAt
    };
}
function toDocumentCustomField(dto) {
    return {
        id: String(dto.id),
        label: dto.label,
        fieldType: dto.fieldType,
        value: dto.value
    };
}
function readConfig(httpClient) {
    return httpClient === defaultHttpClient ? { skipAuthRefresh: true } : {};
}
export const documentProfileApi = createDocumentProfileApi();


