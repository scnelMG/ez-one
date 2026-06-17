import { describe, expect, it, vi } from 'vitest';
import { createRecommendationApi } from './recommendationApi';

describe('recommendationApi', () => {
    it('MM-001: loads Mattermost recommendations from the source-scoped backend API', async () => {
        const get = vi.fn().mockResolvedValue({
            data: {
                success: true,
                data: [
                    {
                        basketJobId: 9101,
                        workspaceId: null,
                        companyName: 'Line',
                        positionTitle: 'Server Platform Engineer',
                        deadlineLabel: 'D-7',
                        companyLogoUrl: 'https://www.google.com/s2/favicons?domain=linecorp.com&sz=128'
                    }
                ]
            }
        });
        const post = vi.fn();
        const api = createRecommendationApi({ get, post });

        const jobs = await api.listMattermostJobs();

        expect(get).toHaveBeenCalledWith('/api/recommendations/jobs', {
            params: { source: 'mattermost' },
            skipAuthRefresh: true
        });
        expect(jobs[0]).toMatchObject({
            id: '9101',
            companyName: 'Line',
            positionTitle: 'Server Platform Engineer',
            deadlineLabel: 'D-7',
            companyLogoUrl: 'https://www.google.com/s2/favicons?domain=linecorp.com&sz=128'
        });
    });

    it('MM-001: saves a Mattermost recommendation through the source-scoped save API', async () => {
        const get = vi.fn();
        const post = vi.fn().mockResolvedValue({
            data: {
                success: true,
                data: {
                    id: 201,
                    workspaceId: 202,
                    companyName: 'Line',
                    positionTitle: 'Server Platform Engineer',
                    applicationStatus: 'READY',
                    statusLabel: '지원전',
                    deadlineLabel: 'D-7',
                    deadlineSoon: true,
                    sourceUrl: 'https://careers.linecorp.com/jobs/102'
                }
            }
        });
        const api = createRecommendationApi({ get, post });

        const saved = await api.saveMattermostJob('9101');

        expect(post).toHaveBeenCalledWith('/api/recommendations/jobs/9101/save', null, {
            params: { source: 'mattermost' }
        });
        expect(saved).toMatchObject({
            id: '201',
            workspaceId: '202',
            companyName: 'Line'
        });
    });
});
