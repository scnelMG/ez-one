import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { useRecommendationStore } from '@/stores/recommendationStore';
import { createMemoryHistory, createRouter } from 'vue-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RecommendationPage from './RecommendationPage.vue';

const mocks = vi.hoisted(() => ({
    listJobs: vi.fn(),
    saveJob: vi.fn()
}));

vi.mock('@/features/recommendations/api/recommendationApi', () => ({
    recommendationApi: {
        listJobs: mocks.listJobs,
        saveJob: mocks.saveJob
    }
}));

const makeRouter = () => createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/', component: { template: '<div>main</div>' } },
        { path: '/recommendations', component: RecommendationPage },
        { path: '/workspaces/:workspaceId', component: { template: '<div>workspace</div>' } },
        { path: '/main', component: { template: '<div>main</div>' } },
        { path: '/basket', component: { template: '<div>basket</div>' } },
        { path: '/mypage', component: { template: '<div>mypage</div>' } },
        { path: '/document-profile', component: { template: '<div>document profile</div>' } },
        { path: '/mypage/terms', component: { template: '<div>terms</div>' } }
    ]
});

describe('RecommendationPage', () => {
    beforeEach(() => {
        mocks.listJobs.mockReset();
        mocks.saveJob.mockReset();
        mocks.listJobs.mockResolvedValue([
            {
                id: '9002',
                companyName: '퍼플독',
                positionTitle: '시니어 Java 백엔드 엔지니어 (신규서비스)',
                deadlineLabel: '4일 남음',
                deadlineDate: '2026-06-11',
                participantCount: 485,
                companyLogoUrl: 'https://www.google.com/s2/favicons?domain=purpledog.co.kr&sz=128',
                workspaceId: null
            },
            {
                id: '9001',
                companyName: '서브원',
                positionTitle: 'Frontend Developer',
                deadlineLabel: '8시간 남음',
                deadlineDate: '2026-06-08',
                participantCount: 150,
                companyLogoUrl: 'https://www.google.com/s2/favicons?domain=serveone.co.kr&sz=128',
                workspaceId: null
            },
            {
                id: '9004',
                companyName: '플랜핏',
                positionTitle: 'Frontend Developer',
                deadlineLabel: '10일 남음',
                deadlineDate: '2026-06-17',
                participantCount: 194,
                companyLogoUrl: 'https://www.google.com/s2/favicons?domain=planfit.ai&sz=128',
                workspaceId: null
            },
            {
                id: '9003',
                companyName: '토스',
                positionTitle: 'Frontend Developer',
                deadlineLabel: '2일 남음',
                deadlineDate: '2026-06-09',
                participantCount: 362,
                companyLogoUrl: 'https://www.google.com/s2/favicons?domain=toss.im&sz=128',
                workspaceId: null
            }
        ]);
        mocks.saveJob.mockResolvedValue({
            basketJobId: '101',
            workspaceId: '102',
            companyName: '서브원',
            positionTitle: 'Frontend Developer'
        });
    });

    it('renders deadline-sorted recommendations with real-looking logos and saves one into a workspace', async () => {
        const wrapper = await mountRecommendation();

        expect(mocks.listJobs).toHaveBeenCalled();
        expect(wrapper.text()).not.toContain('REC-001');
        expect(wrapper.text()).not.toContain('Jasoseol');
        expect(wrapper.text()).not.toContain('자소설');
        expect(wrapper.text()).toContain('마감이 있는 공고를 빠른 순서로 정리했습니다.');
        expect(wrapper.text()).toContain('추천 공고 4건');
        expect(wrapper.text()).toContain('마감 임박순으로 제공됩니다.');
        expect(wrapper.find('.filter-bar').exists()).toBe(false);
        expect(wrapper.find('.recommendation-sort-note').exists()).toBe(false);

        const cards = wrapper.findAll('[data-testid="recommendation-card"]');
        expect(cards).toHaveLength(4);
        expect(cards[0].find('.recommendation-card-header').exists()).toBe(true);
        expect(cards[0].find('.recommendation-card-copy').exists()).toBe(true);
        expect(cards.map((card) => card.find('h3').text())).toEqual(['서브원', '토스', '퍼플독', '플랜핏']);
        expect(cards[0].text()).toContain('8시간 남음 · 150명 작성');
        expect(cards[0].find('img').attributes('src')).toBe('https://www.google.com/s2/favicons?domain=serveone.co.kr&sz=128');
        expect(cards[2].find('img').attributes('src')).toBe('https://www.google.com/s2/favicons?domain=purpledog.co.kr&sz=128');
        expect(wrapper.find('[data-testid="recommendation-trademark-disclaimer"]').exists()).toBe(false);
        const globalNotice = wrapper.get('[data-testid="global-trademark-notice"]');
        expect(globalNotice.text()).toContain('채용공고 식별 목적');
        expect(globalNotice.text()).toContain('제휴 또는 후원');

        await wrapper.get('[data-testid="save-recommendation-9001"]').trigger('click');
        await flushPromises();
        expect(mocks.saveJob).toHaveBeenCalledWith('9001');
        expect(wrapper.text()).toContain('공고를 담았습니다');
        expect(wrapper.text()).toContain('서브원 Frontend Developer 워크스페이스가 준비되었습니다.');
        expect(wrapper.get('[data-testid="saved-workspace-link"]').text()).toContain('워크스페이스 열기');
        expect(wrapper.get('[data-testid="saved-workspace-link"]').attributes('href')).toBe('/workspaces/102');
    });

    it('keeps existing recommendation cards visible while recommendations refresh', async () => {
        const wrapper = await mountRecommendation();
        const store = useRecommendationStore();
        let resolveRefresh;
        mocks.listJobs.mockImplementationOnce(() => new Promise((resolve) => {
            resolveRefresh = resolve;
        }));

        void store.loadRecommendations();
        await flushPromises();

        expect(wrapper.find('[data-testid="recommendation-refreshing"]').exists()).toBe(true);
        expect(wrapper.findAll('[data-testid="recommendation-card"]')).toHaveLength(4);
        expect(wrapper.text()).toContain('서브원');

        resolveRefresh([
            {
                id: '9005',
                companyName: '우리은행',
                positionTitle: '일반 (하계 체험형)',
                deadlineLabel: '22시간 남음',
                deadlineDate: '2026-06-08',
                participantCount: 2135,
                companyLogoUrl: 'https://www.google.com/s2/favicons?domain=wooribank.com&sz=128',
                workspaceId: null
            }
        ]);
        await flushPromises();
        expect(wrapper.findAll('[data-testid="recommendation-card"]')).toHaveLength(1);
        expect(wrapper.text()).toContain('우리은행');
    });
});

async function mountRecommendation() {
    const router = makeRouter();
    router.push('/recommendations');
    await router.isReady();
    const wrapper = mount(RecommendationPage, {
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
