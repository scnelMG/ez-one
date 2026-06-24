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
        recommendationReason: '마감이 가까워 먼저 확인할 공고입니다.',
        postedAt: '2026-04-16T15:26:00',
        collectedAt: '2026-06-18T20:30:00'
    },
    {
        id: '9102',
        companyName: 'Channel Corp',
        positionTitle: 'Frontend Engineer',
        deadlineLabel: '2026.03.31',
        sourceUrl: 'https://www.wanted.co.kr/wd/324638',
        companyLogoUrl: 'https://www.google.com/s2/favicons?domain=channel.io&sz=128',
        companyDomain: 'channel.io',
        companyType: '스타트업',
        recommendationScore: null,
        recommendationReason: '추천도 계산 대기 중입니다.',
        postedAt: '2026-01-13T15:26:00',
        collectedAt: '2026-06-18T20:31:00'
    },
    {
        id: '9103',
        companyName: 'Channel Corp',
        positionTitle: 'Frontend Engineer',
        deadlineLabel: '2026.03.31',
        sourceUrl: 'https://www.wanted.co.kr/wd/324638/',
        companyLogoUrl: 'https://www.google.com/s2/favicons?domain=channel.io&sz=128',
        companyDomain: 'channel.io',
        companyType: '스타트업',
        recommendationScore: null,
        recommendationReason: '추천도 계산 대기 중입니다.',
        postedAt: '2026-01-13T15:26:00',
        collectedAt: '2026-06-18T20:31:00'
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

    it('MM-001: renders a readable Mattermost job feed with review-priority copy', async () => {
        const wrapper = await mountPage();

        expect(recommendationApi.listMattermostJobs).toHaveBeenCalled();
        expect(wrapper.get('[data-testid="mm-recommendation-title"]').text()).toContain('Mattermost 추천공고');
        expect(wrapper.text()).toContain('마감 전 공고');
        expect(wrapper.text()).toContain('전체 공고');
        expect(wrapper.text()).toContain('검토 추천');
        expect(wrapper.text()).toContain('마감 임박');
        expect(wrapper.text()).not.toContain('추천도 기준 정렬');
        expect(wrapper.text()).not.toContain('Webhook 수집 기준');
        expect(wrapper.get('[data-testid="mm-sort-select"]').element.value).toBe('deadline');
        expect(wrapper.get('[data-testid="mm-recommendation-card-9101"]').text()).toContain('Line');
        expect(wrapper.get('[data-testid="mm-recommendation-card-9101"]').text()).toContain('Server Platform Engineer');
        expect(wrapper.get('[data-testid="mm-recommendation-card-9101"] [data-testid="mm-deadline-chip"]').text()).toContain('마감 D-7');
        expect(wrapper.get('[data-testid="mm-recommendation-card-9101"]').text()).toContain('대기업');
        expect(wrapper.get('[data-testid="mm-recommendation-card-9101"]').text()).toContain('90');
        expect(wrapper.get('[data-testid="mm-recommendation-card-9101"]').text()).toContain('마감이 가까워 먼저 확인할 공고입니다.');
        expect(wrapper.get('[data-testid="mm-recommendation-card-9102"]').text()).toContain('Channel Corp');
        expect(wrapper.get('[data-testid="mm-recommendation-card-9102"] [data-testid="mm-deadline-chip"]').text()).toContain('마감 2026.03.31');
        expect(wrapper.get('[data-testid="mm-recommendation-card-9102"]').text()).toContain('스타트업');
        expect(wrapper.get('[data-testid="mm-save-9102"]').text()).toBe('마감된 공고');
        expect(wrapper.get('[data-testid="mm-save-9102"]').attributes('disabled')).toBeDefined();
        expect(wrapper.get('[data-testid="mm-recommendation-card-9102"]').text()).toContain('계산 대기');
        expect(wrapper.get('[data-testid="mm-recommendation-card-9101"]').text()).not.toContain('line.me');
        expect(wrapper.get('[data-testid="mm-recommendation-card-9101"]').text()).not.toContain('게시');
        expect(wrapper.get('[data-testid="mm-recommendation-card-9101"]').text()).not.toContain('Mattermost');
        expect(wrapper.get('[data-testid="mm-recommendation-card-9102"]').text()).not.toContain('channel.io');
        expect(wrapper.get('[data-testid="mm-recommendation-source-9101"]').attributes('href')).toBe('https://careers.linecorp.com/jobs/102');
        expect(wrapper.get('[data-testid="mm-save-9101"]').text()).toBe('공고 장바구니 저장');
        expect(wrapper.find('[data-testid="mm-recommendation-card-9103"]').exists()).toBe(false);
    });

    it('MM-009/REC-004: filters review recommendations and urgent jobs without hiding the all-jobs default', async () => {
        const wrapper = await mountPage();

        expect(wrapper.findAll('[data-testid^="mm-recommendation-card-"]').map((card) => card.attributes('data-testid'))).toEqual([
            'mm-recommendation-card-9101',
            'mm-recommendation-card-9102'
        ]);

        await wrapper.get('[data-testid="mm-segment-ai"]').trigger('click');
        expect(wrapper.find('[data-testid="mm-recommendation-card-9101"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="mm-recommendation-card-9102"]').exists()).toBe(false);

        await wrapper.get('[data-testid="mm-segment-urgent"]').trigger('click');
        expect(wrapper.find('[data-testid="mm-recommendation-card-9101"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="mm-recommendation-card-9102"]').exists()).toBe(false);
    });

    it('MM-001: saves a Mattermost recommendation into the basket and exposes the workspace link', async () => {
        const wrapper = await mountPage();

        await wrapper.get('[data-testid="mm-save-9101"]').trigger('click');
        await flushPromises();

        expect(recommendationApi.saveMattermostJob).toHaveBeenCalledWith('9101');
        expect(wrapper.get('[data-testid="mm-saved-workspace-9101"]').attributes('href')).toBe('/workspaces/202');
    });

    it('MM-001: shows a friendly message when saving a Mattermost recommendation fails', async () => {
        vi.mocked(recommendationApi.saveMattermostJob).mockRejectedValueOnce(new Error('저장 권한을 확인해 주세요.'));
        const wrapper = await mountPage();

        await wrapper.get('[data-testid="mm-save-9101"]').trigger('click');
        await flushPromises();

        expect(wrapper.get('[data-testid="mm-save-error"]').text()).toContain('저장 권한을 확인해 주세요.');
        expect(wrapper.find('[data-testid="mm-saved-workspace-9101"]').exists()).toBe(false);
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
