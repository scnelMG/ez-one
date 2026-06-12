import { defaultHttpClient, unwrapApiData } from '@/shared/apiClient';

export const companyApi = {
    async searchCompanies(query) {
        if (!query || query.trim().length === 0) return [];
        try {
            const response = await defaultHttpClient.get('/api/p1/companies/search', { params: { query } });
            return unwrapApiData(response.data);
        } catch {
            return [];
        }
    }
};
