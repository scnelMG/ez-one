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
                companyLogoUrl: 'https://example.com/ohou.png',
                workspaceId: null
            },
            {
                id: '9001',
                companyName: '라인',
                positionTitle: 'Server Platform Engineer',
                deadlineLabel: 'D-7',
                deadlineDate: '2026-06-13',
                companyLogoUrl: 'https://example.com/line.png',
                workspaceId: null
            }
        ]);
        mocks.saveJob.mockResolvedValue({
            basketJobId: '101',
            workspaceId: '102',
            companyName: '라인',
            positionTitle: 'Server Platform Engineer'
        });
    });

    it('REC-001: renders deadline-sorted recommendations without filters and saves one into a workspace', async () => {
        const wrapper = await mountRecommendation();

        expect(mocks.listJobs).toHaveBeenCalled();
        expect(wrapper.find('.filter-bar').exists()).toBe(false);
        expect(wrapper.text()).toContain('마감일이 가까운 공고부터 보여드립니다.');
        expect(wrapper.text()).not.toContain('별표');

        const cards = wrapper.findAll('[data-testid="recommendation-card"]');
        expect(cards).toHaveLength(2);
        expect(cards[0].text()).toContain('라인');
        expect(cards[1].text()).toContain('오늘의집');
        expect(cards[0].find('img').attributes('src')).toBe('https://example.com/line.png');

        await wrapper.get('[data-testid="save-recommendation-9001"]').trigger('click');
        await flushPromises();
        expect(mocks.saveJob).toHaveBeenCalledWith('9001');
        expect(wrapper.text()).toContain('공고를 담았습니다');
        expect(wrapper.text()).toContain('라인 Server Platform Engineer 워크스페이스가 준비됐습니다.');
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
