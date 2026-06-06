import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NotionSettingsPage from './NotionSettingsPage.vue';

const mocks = vi.hoisted(() => ({
    getConnection: vi.fn(),
    connect: vi.fn(),
    updateSyncSettings: vi.fn(),
    listSyncLogs: vi.fn(),
    getCurrentUser: vi.fn(),
    getRefreshToken: vi.fn(() => null),
    clearAuthSession: vi.fn()
}));

vi.mock('@/features/notion/api/notionApi', () => ({
    notionApi: {
        getConnection: mocks.getConnection,
        connect: mocks.connect,
        updateSyncSettings: mocks.updateSyncSettings,
        listSyncLogs: mocks.listSyncLogs
    }
}));

vi.mock('@/features/auth/session/authSession', () => ({
    getCurrentUser: mocks.getCurrentUser,
    getRefreshToken: mocks.getRefreshToken,
    clearAuthSession: mocks.clearAuthSession
}));

const makeRouter = () => createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/mypage/notion', component: NotionSettingsPage },
        { path: '/', component: { template: '<div>main</div>' } },
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
        mocks.getCurrentUser.mockReset();
        mocks.getCurrentUser.mockReturnValue({ email: 'hong.gildong@gmail.com' });
        mocks.getConnection.mockResolvedValue({
            connected: true,
            notionAccountEmail: 'gildong.work@gmail.com',
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
            notionAccountEmail: 'gildong.work@gmail.com',
            syncEnabled: true,
            syncScope: 'JOB_ONLY'
        });
        mocks.connect.mockResolvedValue({
            connected: true,
            notionAccountEmail: 'gildong.work@gmail.com',
            syncEnabled: true,
            syncScope: 'JOB_ONLY'
        });
    });

    it('NOTION-001: renders account mismatch guidance and toggles automatic sync', async () => {
        const wrapper = await mountPage();

        expect(mocks.getConnection).toHaveBeenCalled();
        expect(mocks.listSyncLogs).toHaveBeenCalled();
        expect(wrapper.find('[data-testid="mypage-left-board"]').exists()).toBe(false);
        expect(wrapper.text()).toContain('마이페이지 · 노션 연동 관리');
        expect(wrapper.text()).toContain('로그인 이메일과 노션 이메일이 서로 달라도 연동돼요.');
        expect(wrapper.text()).toContain('hong.gildong@gmail.com');
        expect(wrapper.text()).toContain('gildong.work@gmail.com');
        expect(wrapper.text()).toContain('자소서 · 도화지');
        expect(wrapper.text()).toContain('Synced');

        await wrapper.get('[data-testid="toggle-job-only-sync"]').trigger('click');
        await flushPromises();
        expect(mocks.updateSyncSettings).toHaveBeenCalledWith(true);
    });

    it('NOTION-001: connects a disconnected Notion account from the settings page', async () => {
        mocks.getConnection.mockResolvedValue({
            connected: false,
            notionAccountEmail: null,
            syncEnabled: false,
            syncScope: 'JOB_ONLY'
        });
        mocks.listSyncLogs.mockResolvedValue([]);
        const wrapper = await mountPage();

        expect(wrapper.text()).toContain('연결된 계정 없음');
        await wrapper.get('[data-testid="connect-notion"]').trigger('click');
        await flushPromises();
        expect(mocks.connect).toHaveBeenCalled();
        expect(wrapper.text()).toContain('gildong.work@gmail.com');
    });
});

async function mountPage() {
    const router = makeRouter();
    router.push('/mypage/notion');
    await router.isReady();
    const wrapper = mount(NotionSettingsPage, {
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
