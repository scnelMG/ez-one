import { describe, expect, it, vi } from 'vitest';
import { createHistoryApi } from './historyApi';

describe('historyApi', () => {
    it('HISTORY-003/HISTORY-004: loads period-filtered past applications from the history endpoint', async () => {
        const get = vi.fn().mockResolvedValue({
            data: {
                success: true,
                data: {
                    periods: [{ value: '2026-H1', label: '2026 상반기' }],
                    summary: { total: 1, completed: 0, notApplied: 1, inProgress: 0, ready: 0 },
                    companyTypes: [{ type: '스타트업', count: 1 }],
                    industryStats: [{ industry: 'AI', count: 1 }],
                    dataQuality: { total: 1, companyMaster: 0, ruleBased: 1, unknown: 0 },
                    rows: [{
                        id: 1,
                        workspaceId: 102,
                        companyName: '달파',
                        positionTitle: 'AI Engineer',
                        applicationStatus: 'NOT_APPLIED',
                        resultStage: 'DOCUMENT_FAILED',
                        resultLabel: '서류 단계 종료',
                        rawResult: '서류탈락',
                        deadlineLabel: '2025.03.23',
                        sourceUrl: 'https://example.com',
                        companyLogoUrl: 'https://logo.example.com/dalpha.png',
                        companyType: '스타트업',
                        companyIndustry: 'AI',
                        companyDataSource: 'RULE'
                    }]
                }
            }
        });
        const api = createHistoryApi({ get });

        const history = await api.listApplications({ period: '2026-H1', resultStage: 'DOCUMENT_FAILED' });

        expect(get).toHaveBeenCalledWith('/api/history/applications', {
            params: { period: '2026-H1', resultStage: 'DOCUMENT_FAILED' }
        });
        expect(history.periods[0].label).toBe('2026 상반기');
        expect(history.industryStats[0]).toMatchObject({ industry: 'AI', count: 1 });
        expect(history.dataQuality.ruleBased).toBe(1);
        expect(history.rows[0]).toMatchObject({
            workspaceId: '102',
            companyName: '달파',
            resultStage: 'DOCUMENT_FAILED',
            resultLabel: '서류 단계 종료',
            companyLogoUrl: 'https://logo.example.com/dalpha.png',
            companyIndustry: 'AI',
            companyDataSource: 'RULE'
        });
    });
});
