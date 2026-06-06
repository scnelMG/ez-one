import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NotionSettingsPage from './NotionSettingsPage.vue';
const mocks = vi.hoisted(() => ({
    getConnection: vi.fn(),
    connect: vi.fn(),
    updateSyncSettings: vi.fn(),
    listSyncLogs: vi.fn()
}));
vi.mock('@/features/notion/api/notionApi', () => ({
    notionApi: {
        getConnection: mocks.getConnection,
        connect: mocks.connect,
        updateSyncSettings: mocks.updateSyncSettings,
        listSyncLogs: mocks.listSyncLogs
    }
}));
const makeRouter = () => createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/mypage/notion', component: NotionSettingsPage },
        { path: '/', component: { template: '<div>main</div>' } },
        { path: '/main', component: { template: '<div>main</div>' } },
        { path: '/basket', component: { template: '<div>basket</div>' } },
        { path: '/mypage', component: { template: '<div>mypage</div>' } },
        { path: '/recommendations', component: { template: '<div>recommendations</div>' } },
        { path: '/document-profile', component: { template: '<div>document profile</div>' } }
    ]
});
describe('NotionSettingsPage', () => {
    beforeEach(() => {
        mocks.getConnection.mockReset();
        mocks.connect.mockReset();
        mocks.updateSyncSettings.mockReset();
        mocks.listSyncLogs.mockReset();
        mocks.getConnection.mockResolvedValue({
            connected: true,
            notionAccountEmail: 'notion@example.com',
            syncEnabled: false,
            syncScope: 'JOB_ONLY'
        });
        mocks.listSyncLogs.mockResolvedValue([
            {
                id: '1',
                target: 'JOB',
                status: 'SUCCESS',
                message: 'Synced'
            }
        ]);
        mocks.updateSyncSettings.mockResolvedValue({
            connected: true,
            notionAccountEmail: 'notion@example.com',
            syncEnabled: true,
            syncScope: 'JOB_ONLY'
        });
        mocks.connect.mockResolvedValue({
            connected: true,
            notionAccountEmail: 'notion@example.com',
            syncEnabled: true,
            syncScope: 'JOB_ONLY'
        });
    });
    it('NOTION-001: renders JOB_ONLY settings and toggles sync', async () => {
        const router = makeRouter();
        router.push('/mypage/notion');
        await router.isReady();
        const wrapper = mount(NotionSettingsPage, {
            global: {
                plugins: [createPinia(), router]
            }
        });
        await flushPromises();
        expect(mocks.getConnection).toHaveBeenCalled();
        expect(mocks.listSyncLogs).toHaveBeenCalled();
        expect(wrapper.text()).toContain('notion@example.com');
        expect(wrapper.text()).toContain('공고만 동기화');
        expect(wrapper.text()).toContain('Synced');
        await wrapper.get('[data-testid="toggle-job-only-sync"]').trigger('click');
        await flushPromises();
        expect(mocks.updateSyncSettings).toHaveBeenCalledWith(true);
        expect(wrapper.text()).toContain('동기화 끄기');
    });
    it('NOTION-001: connects a disconnected Notion account from the settings page', async () => {
        mocks.getConnection.mockResolvedValue({
            connected: false,
            notionAccountEmail: null,
            syncEnabled: false,
            syncScope: 'JOB_ONLY'
        });
        mocks.listSyncLogs.mockResolvedValue([]);
        const router = makeRouter();
        router.push('/mypage/notion');
        await router.isReady();
        const wrapper = mount(NotionSettingsPage, {
            global: {
                plugins: [createPinia(), router]
            }
        });
        await flushPromises();
        expect(wrapper.text()).toContain('연결된 계정 없음');
        await wrapper.get('[data-testid="connect-notion"]').trigger('click');
        await flushPromises();
        expect(mocks.connect).toHaveBeenCalled();
        expect(wrapper.text()).toContain('notion@example.com');
    });
});
function flushPromises() {
    return new Promise((resolve) => setTimeout(resolve));
}
