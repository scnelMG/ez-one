import { describe, expect, it, vi } from 'vitest';
import { createHistoryApi } from './historyApi';

describe('historyApi', () => {
    it('HISTORY-003/HISTORY-004: loads period-filtered past applications from the history endpoint', async () => {
        const get = vi.fn().mockResolvedValue({
            data: {
                success: true,
                data: {
                    periods: [{ value: '2026-H1', label: '2026 H1' }],
                    summary: { total: 1, completed: 0, notApplied: 1, inProgress: 0, ready: 0 },
                    companyTypes: [{ type: 'Startup', count: 1 }],
                    rows: [{
                        id: 1,
                        workspaceId: 102,
                        companyName: 'Dalpha',
                        positionTitle: 'AI Engineer',
                        applicationStatus: 'NOT_APPLIED',
                        resultStage: 'DOCUMENT_FAILED',
                        resultLabel: 'Document stage ended',
                        rawResult: 'Document failed',
                        deadlineLabel: '2025.03.23',
                        sourceUrl: 'https://example.com',
                        companyType: 'Startup'
                    }]
                }
            }
        });
        const api = createHistoryApi({ get });

        const history = await api.listApplications({ period: '2026-H1', resultStage: 'DOCUMENT_FAILED' });

        expect(get).toHaveBeenCalledWith('/api/history/applications', {
            params: { period: '2026-H1', resultStage: 'DOCUMENT_FAILED' }
        });
        expect(history.periods[0].label).toBe('2026 H1');
        expect(history.rows[0]).toMatchObject({
            workspaceId: '102',
            companyName: 'Dalpha',
            resultStage: 'DOCUMENT_FAILED',
            resultLabel: 'Document stage ended'
        });
    });
});
