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
        { path: '/document-profile', component: { template: '<div>document profile</div>' } },
        { path: '/study', component: { template: '<div>study</div>' } },
        { path: '/history', component: { template: '<div>history</div>' } },
        { path: '/mypage/onboarding', component: { template: '<div>onboarding</div>' } },
        { path: '/mypage/qna', component: { template: '<div>qna</div>' } },
        { path: '/mypage/terms', component: { template: '<div>terms</div>' } }
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
        expect(wrapper.find('.page-header .eyebrow').exists()).toBe(false);
        expect(wrapper.find('.page-header h1 + p').exists()).toBe(false);
        expect(wrapper.text()).toContain('Notion 연동 관리');
        expect(wrapper.text()).not.toContain('마이페이지 · 노션 연동 관리');
        expect(wrapper.find('.mypage-summary-strip').exists()).toBe(false);
        expect(wrapper.find('.notion-account-card').exists()).toBe(false);
        expect(wrapper.find('.notion-settings-card').exists()).toBe(true);
        expect(wrapper.findAll('.notion-settings-card .account-setting-row')).toHaveLength(4);
        expect(wrapper.findAll('.notion-settings-card .account-setting-label').map((label) => label.text())).toEqual([
            'Google 계정',
            'Notion 계정',
            '공고 자동 동기화',
            '대상 위치'
        ]);
        const settingsCardText = wrapper.get('.notion-settings-card').text();
        expect(settingsCardText).toContain('공고 자동 동기화 꺼짐');
        expect(wrapper.text()).not.toContain('로그인 이메일과 노션 이메일이 서로 달라도 연동돼요.');
        expect(settingsCardText).toContain('hong.gildong@gmail.com');
        expect(settingsCardText).toContain('gildong.work@gmail.com');
        expect(settingsCardText).not.toContain('자소서 · 도화지');
        expect(settingsCardText).not.toContain('과거 지원 내역');
        expect(settingsCardText).not.toContain('준비 중');
        expect(settingsCardText).not.toContain('P1');
        expect(settingsCardText).not.toContain('P2');
        expect(settingsCardText).not.toContain('JOB_ONLY');
        expect(wrapper.text()).toContain('Synced');

        await wrapper.get('[data-testid="toggle-job-only-sync"]').trigger('click');
        await flushPromises();
        expect(mocks.updateSyncSettings).toHaveBeenCalledWith(true);
        expect(wrapper.text()).toContain('공고 자동 동기화가 켜졌습니다.');
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
        expect(wrapper.text()).toContain('연결 필요');
        await wrapper.get('[data-testid="connect-notion"]').trigger('click');
        await flushPromises();
        expect(mocks.connect).toHaveBeenCalled();
        expect(wrapper.text()).toContain('gildong.work@gmail.com');
    });

    it('NOTION-001: renders an actionable empty sync log state', async () => {
        mocks.listSyncLogs.mockResolvedValue([]);
        const wrapper = await mountPage();

        expect(wrapper.text()).toContain('아직 동기화된 공고가 없습니다.');
        expect(wrapper.text()).toContain('공고를 저장하고 동기화를 켜면 Notion에 기록됩니다.');
        expect(wrapper.text()).not.toContain('JOB_ONLY');
    });

    it('NOTION-001: shows an inline error when sync toggle fails', async () => {
        mocks.updateSyncSettings.mockRejectedValue(new Error('network'));
        const wrapper = await mountPage();

        await wrapper.get('[data-testid="toggle-job-only-sync"]').trigger('click');
        await flushPromises();

        expect(wrapper.text()).toContain('Notion 동기화 설정을 저장하지 못했습니다.');
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
