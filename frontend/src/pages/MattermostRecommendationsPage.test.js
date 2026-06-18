import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { recommendationApi } from '@/features/recommendations/api/recommendationApi';
import MattermostRecommendationsPage from './MattermostRecommendationsPage.vue';

vi.mock('@/features/recommendations/api/recommendationApi', () => ({
    recommendationApi: {
        listMattermostJobs: vi.fn(),
        saveMattermostJob: vi.fn()
    }
}));

const jobs = [
    {
        id: '9101',
        companyName: 'Line',
        positionTitle: 'Server Platform Engineer',
        deadlineLabel: 'D-7',
        sourceUrl: 'https://careers.linecorp.com/jobs/102',
        companyLogoUrl: 'https://www.google.com/s2/favicons?domain=linecorp.com&sz=128',
        companyDomain: 'line.me',
        companyType: '대기업',
        recommendationScore: 90,
        recommendationReason: '마감이 가까운 공고라 우선 추천',
        postedAt: '2026-04-16T15:26:00',
        collectedAt: '2026-06-18T20:30:00'
    }
];

describe('MattermostRecommendationsPage', () => {
    beforeEach(() => {
        vi.mocked(recommendationApi.listMattermostJobs).mockReset();
        vi.mocked(recommendationApi.listMattermostJobs).mockResolvedValue(jobs);
        vi.mocked(recommendationApi.saveMattermostJob).mockReset();
        vi.mocked(recommendationApi.saveMattermostJob).mockResolvedValue({
            id: '201',
            workspaceId: '202',
            companyName: 'Line',
            positionTitle: 'Server Platform Engineer'
        });
    });

    it('MM-001: renders a trusted Mattermost job feed without internal review labels', async () => {
        const wrapper = await mountPage();

        expect(recommendationApi.listMattermostJobs).toHaveBeenCalled();
        expect(wrapper.get('[data-testid="mm-recommendation-title"]').text()).toContain('Mattermost');
        expect(wrapper.text()).toContain('마감 전 공고');
        expect(wrapper.text()).toContain('Webhook 수집 기준');
        expect(wrapper.get('[data-testid="mm-recommendation-card-9101"]').text()).toContain('Line');
        expect(wrapper.get('[data-testid="mm-recommendation-card-9101"]').text()).toContain('Server Platform Engineer');
        expect(wrapper.get('[data-testid="mm-recommendation-card-9101"]').text()).toContain('line.me');
        expect(wrapper.get('[data-testid="mm-recommendation-card-9101"]').text()).toContain('대기업');
        expect(wrapper.get('[data-testid="mm-recommendation-card-9101"]').text()).toContain('90');
        expect(wrapper.get('[data-testid="mm-recommendation-card-9101"]').text()).toContain('마감이 가까운 공고라 우선 추천');
        expect(wrapper.get('[data-testid="mm-recommendation-card-9101"]').text()).toContain('게시');
        expect(wrapper.get('[data-testid="mm-recommendation-card-9101"]').text()).not.toContain('수집 6. 18.');
        expect(wrapper.get('[data-testid="mm-recommendation-card-9101"]').text()).not.toContain('승인 후보');
        expect(wrapper.get('[data-testid="mm-recommendation-source-9101"]').attributes('href')).toBe('https://careers.linecorp.com/jobs/102');
        expect(wrapper.get('[data-testid="mm-save-9101"]').text()).toBe('공고 장바구니 저장');
    });

    it('MM-001: saves a Mattermost recommendation into the basket and exposes the workspace link', async () => {
        const wrapper = await mountPage();

        await wrapper.get('[data-testid="mm-save-9101"]').trigger('click');
        await flushPromises();

        expect(recommendationApi.saveMattermostJob).toHaveBeenCalledWith('9101');
        expect(wrapper.get('[data-testid="mm-saved-workspace-9101"]').attributes('href')).toBe('/workspaces/202');
    });
});

async function mountPage() {
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [
            { path: '/recommendations/mattermost', component: MattermostRecommendationsPage },
            { path: '/', component: { template: '<div>main</div>' } },
            { path: '/basket', component: { template: '<div>basket</div>' } },
            { path: '/document-profile', component: { template: '<div>document profile</div>' } },
            { path: '/study', component: { template: '<div>study</div>' } },
            { path: '/history', component: { template: '<div>history</div>' } },
            { path: '/mypage/inquiry', component: { template: '<div>inquiry</div>' } },
            { path: '/mypage/partnership', component: { template: '<div>partnership</div>' } },
            { path: '/mypage/terms', component: { template: '<div>terms</div>' } },
            { path: '/workspaces/:workspaceId', component: { template: '<div>workspace</div>' } }
        ]
    });
    router.push('/recommendations/mattermost');
    await router.isReady();
    const wrapper = mount(MattermostRecommendationsPage, {
        global: {
            plugins: [createPinia(), router]
        }
    });
    await flushPromises();
    return wrapper;
}

function flushPromises() {
    return new Promise((resolve) => setTimeout(resolve));
}
