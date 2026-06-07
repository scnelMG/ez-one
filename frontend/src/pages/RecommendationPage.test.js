import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
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
        { path: '/recommendations', component: RecommendationPage },
        { path: '/workspaces/:workspaceId', component: { template: '<div>workspace</div>' } },
        { path: '/main', component: { template: '<div>main</div>' } },
        { path: '/basket', component: { template: '<div>basket</div>' } },
        { path: '/mypage', component: { template: '<div>mypage</div>' } },
        { path: '/document-profile', component: { template: '<div>document profile</div>' } }
    ]
});

describe('RecommendationPage', () => {
    beforeEach(() => {
        mocks.listJobs.mockReset();
        mocks.saveJob.mockReset();
        mocks.listJobs.mockResolvedValue([
            {
                id: '9002',
                companyName: '오늘의집',
                positionTitle: 'Commerce Backend Developer',
                deadlineLabel: 'D-10',
                deadlineDate: '2026-06-16',
                companyLogoUrl: 'https://www.google.com/s2/favicons?domain=ohou.se&sz=128',
                workspaceId: null
            },
            {
                id: '9001',
                companyName: 'LINE',
                positionTitle: 'Server Platform Engineer',
                deadlineLabel: 'D-7',
                deadlineDate: '2026-06-13',
                companyLogoUrl: 'https://www.google.com/s2/favicons?domain=line.me&sz=128',
                workspaceId: null
            },
            {
                id: '9004',
                companyName: '쿠팡',
                positionTitle: 'Platform Engineer',
                deadlineLabel: 'D-12',
                deadlineDate: '2026-06-18',
                companyLogoUrl: 'https://www.google.com/s2/favicons?domain=coupang.com&sz=128',
                workspaceId: null
            },
            {
                id: '9003',
                companyName: '토스',
                positionTitle: 'Frontend Developer',
                deadlineLabel: 'D-3',
                deadlineDate: '2026-06-09',
                companyLogoUrl: 'https://www.google.com/s2/favicons?domain=toss.im&sz=128',
                workspaceId: null
            }
        ]);
        mocks.saveJob.mockResolvedValue({
            basketJobId: '101',
            workspaceId: '102',
            companyName: 'LINE',
            positionTitle: 'Server Platform Engineer'
        });
    });

    it('renders deadline-sorted recommendations with real-looking logos and saves one into a workspace', async () => {
        const wrapper = await mountRecommendation();

        expect(mocks.listJobs).toHaveBeenCalled();
        expect(wrapper.text()).not.toContain('REC-001');
        expect(wrapper.text()).not.toContain('Jasoseol');
        expect(wrapper.text()).not.toContain('자소설');
        expect(wrapper.text()).toContain('관심 직무와 입력한 정보를 바탕으로 지금 확인할 만한 공고를 모아 보여드립니다.');
        expect(wrapper.find('.filter-bar').exists()).toBe(false);
        expect(wrapper.find('.recommendation-sort-note').exists()).toBe(false);

        const cards = wrapper.findAll('[data-testid="recommendation-card"]');
        expect(cards).toHaveLength(4);
        expect(cards.map((card) => card.find('h3').text())).toEqual(['토스', 'LINE', '오늘의집', '쿠팡']);
        expect(cards[0].find('img').attributes('src')).toBe('https://www.google.com/s2/favicons?domain=toss.im&sz=128');
        expect(cards[1].find('img').attributes('src')).toBe('https://www.google.com/s2/favicons?domain=line.me&sz=128');
        const disclaimer = wrapper.get('[data-testid="recommendation-trademark-disclaimer"]');
        expect(disclaimer.text()).toContain('채용공고 식별 목적');
        expect(disclaimer.text()).toContain('제휴 또는 후원');

        await wrapper.get('[data-testid="save-recommendation-9001"]').trigger('click');
        await flushPromises();
        expect(mocks.saveJob).toHaveBeenCalledWith('9001');
        expect(wrapper.text()).toContain('공고를 담았습니다');
        expect(wrapper.text()).toContain('LINE Server Platform Engineer 워크스페이스가 준비됐습니다.');
        expect(wrapper.get('[data-testid="saved-workspace-link"]').text()).toContain('워크스페이스 열기');
        expect(wrapper.get('[data-testid="saved-workspace-link"]').attributes('href')).toBe('/workspaces/102');
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
