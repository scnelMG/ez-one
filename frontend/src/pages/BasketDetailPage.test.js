import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BasketDetailPage from './BasketDetailPage.vue';
const mocks = vi.hoisted(() => ({
    getJob: vi.fn(),
    updateJob: vi.fn()
}));
vi.mock('@/features/basket/api/basketApi', () => ({
    basketApi: {
        getJob: mocks.getJob,
        updateJob: mocks.updateJob
    }
}));
const makeRouter = () => createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/basket/:basketJobId', component: BasketDetailPage },
        { path: '/basket', component: { template: '<div>basket</div>' } },
        { path: '/main', component: { template: '<div>main</div>' } },
        { path: '/mypage', component: { template: '<div>my page</div>' } },
        { path: '/workspaces/:workspaceId', component: { template: '<div>workspace</div>' } },
        { path: '/recommendations', component: { template: '<div>recommendations</div>' } },
        { path: '/document-profile', component: { template: '<div>document profile</div>' } }
    ]
});
describe('BasketDetailPage', () => {
    beforeEach(() => {
        mocks.getJob.mockReset();
        mocks.updateJob.mockReset();
        mocks.getJob.mockResolvedValue({
            id: '101',
            companyName: 'Naver',
            positionTitle: 'Backend Engineer',
            status: 'IN_PROGRESS',
            statusLabel: '진행 중',
            deadlineLabel: '2026.06.11',
            deadlineSoon: true,
            workspaceId: '102',
            sourceUrl: 'https://www.jasoseol.com/',
            applicationMemo: 'Phone screen scheduled.'
        });
        mocks.updateJob.mockResolvedValue({
            id: '101',
            companyName: 'Naver Cloud',
            positionTitle: 'Platform Engineer',
            status: 'IN_PROGRESS',
            statusLabel: '진행 중',
            deadlineLabel: '2026.07.01',
            deadlineSoon: false,
            workspaceId: '102',
            sourceUrl: 'https://www.jasoseol.com/jobs/101',
            applicationMemo: 'Ask about platform team.'
        });
    });
    it('JOB-006/JOB-007: loads a saved job detail and persists edits', async () => {
        const router = makeRouter();
        router.push('/basket/101');
        await router.isReady();
        const wrapper = mount(BasketDetailPage, {
            global: {
                plugins: [createPinia(), router]
            }
        });
        await flushPromises();
        expect(mocks.getJob).toHaveBeenCalledWith('101');
        expect(wrapper.get('[data-testid="detail-company"]').element.value).toBe('Naver');
        expect(wrapper.get('[data-testid="detail-memo"]').element.value).toBe('Phone screen scheduled.');
        await wrapper.get('[data-testid="detail-company"]').setValue('Naver Cloud');
        await wrapper.get('[data-testid="detail-position"]').setValue('Platform Engineer');
        await wrapper.get('[data-testid="detail-deadline"]').setValue('2026.07.01');
        await wrapper.get('[data-testid="detail-source"]').setValue('https://www.jasoseol.com/jobs/101');
        await wrapper.get('[data-testid="detail-memo"]').setValue('Ask about platform team.');
        await wrapper.get('[data-testid="detail-form"]').trigger('submit');
        await flushPromises();
        expect(mocks.updateJob).toHaveBeenCalledWith('101', {
            companyName: 'Naver Cloud',
            positionTitle: 'Platform Engineer',
            deadlineLabel: '2026.07.01',
            sourceUrl: 'https://www.jasoseol.com/jobs/101',
            applicationMemo: 'Ask about platform team.'
        });
        expect(wrapper.text()).toContain('Naver Cloud');
    });
});
function flushPromises() {
    return new Promise((resolve) => setTimeout(resolve));
}
