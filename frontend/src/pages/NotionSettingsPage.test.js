import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NotionSettingsPage from './NotionSettingsPage.vue';

const mocks = vi.hoisted(() => ({
    getConnection: vi.fn(),
    getOAuthUrl: vi.fn(),
    connect: vi.fn(),
    updateSyncSettings: vi.fn(),
    syncNow: vi.fn(),
    listSyncLogs: vi.fn(),
    getCurrentUser: vi.fn(),
    getRefreshToken: vi.fn(() => null),
    clearAuthSession: vi.fn(),
    buildNotionOAuthUrl: vi.fn(),
    consumeNotionOAuthState: vi.fn(),
    createNotionOAuthState: vi.fn(),
    getNotionClientId: vi.fn(),
    getNotionRedirectUri: vi.fn(),
    redirectToNotionOAuth: vi.fn()
}));

vi.mock('@/features/notion/api/notionApi', () => ({
    notionApi: {
        getConnection: mocks.getConnection,
        getOAuthUrl: mocks.getOAuthUrl,
        connect: mocks.connect,
        updateSyncSettings: mocks.updateSyncSettings,
        syncNow: mocks.syncNow,
        listSyncLogs: mocks.listSyncLogs
    }
}));

vi.mock('@/features/auth/session/authSession', () => ({
    getCurrentUser: mocks.getCurrentUser,
    getRefreshToken: mocks.getRefreshToken,
    clearAuthSession: mocks.clearAuthSession
}));

vi.mock('@/features/notion/oauth/notionOAuth', () => ({
    buildNotionOAuthUrl: mocks.buildNotionOAuthUrl,
    consumeNotionOAuthState: mocks.consumeNotionOAuthState,
    createNotionOAuthState: mocks.createNotionOAuthState,
    getNotionClientId: mocks.getNotionClientId,
    getNotionRedirectUri: mocks.getNotionRedirectUri,
    redirectToNotionOAuth: mocks.redirectToNotionOAuth
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
        mocks.getOAuthUrl.mockReset();
        mocks.updateSyncSettings.mockReset();
        mocks.syncNow.mockReset();
        mocks.listSyncLogs.mockReset();
        mocks.getCurrentUser.mockReset();
        mocks.buildNotionOAuthUrl.mockReset();
        mocks.consumeNotionOAuthState.mockReset();
        mocks.createNotionOAuthState.mockReset();
        mocks.getNotionClientId.mockReset();
        mocks.getNotionRedirectUri.mockReset();
        mocks.redirectToNotionOAuth.mockReset();
        mocks.getCurrentUser.mockReturnValue({ email: 'hong.gildong@gmail.com' });
        mocks.buildNotionOAuthUrl.mockReturnValue(new URL('https://api.notion.com/v1/oauth/authorize?state=notion-state'));
        mocks.createNotionOAuthState.mockReturnValue('notion-state');
        mocks.getNotionClientId.mockReturnValue('notion-client-id');
        mocks.getNotionRedirectUri.mockReturnValue('http://localhost:5173/mypage/notion');
        mocks.getOAuthUrl.mockResolvedValue('https://api.notion.com/v1/oauth/authorize?client_id=notion-client-id&state=notion-state');
        mocks.getConnection.mockResolvedValue({
            connected: true,
            notionAccountEmail: 'gildong.work@gmail.com',
            syncEnabled: false,
            syncScope: 'JOB_ONLY'
        });
        mocks.listSyncLogs.mockResolvedValue([
            {
                id: '1',
                basketJobId: 10,
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
        mocks.syncNow.mockResolvedValue({
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

    it('NOTION-001: renders Notion settings without Google account details and toggles automatic sync', async () => {
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
        expect(wrapper.findAll('.notion-settings-card .account-setting-row')).toHaveLength(3);
        expect(wrapper.findAll('.notion-settings-card .account-setting-label').map((label) => label.text())).toEqual([
            'Notion 계정',
            '공고 자동 동기화',
            '대상 위치'
        ]);
        const settingsCardText = wrapper.get('.notion-settings-card').text();
        expect(settingsCardText).toContain('공고 자동 동기화 꺼짐');
        expect(wrapper.text()).not.toContain('로그인 이메일과 노션 이메일이 서로 달라도 연동돼요.');
        expect(settingsCardText).not.toContain('hong.gildong@gmail.com');
        expect(settingsCardText).not.toContain('Google 계정');
        expect(settingsCardText).toContain('gildong.work@gmail.com');
        expect(settingsCardText).toContain('취업 준비');
        expect(settingsCardText).not.toContain('열기');
        expect(wrapper.find('.notion-target-location-row .account-setting-link').exists()).toBe(false);
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

    it('NOTION-001: starts Notion OAuth without a user-entered API key', async () => {
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
        expect(wrapper.text()).toContain('공고 정보만 Notion 취업 준비 페이지에 동기화됩니다.');
        expect(wrapper.text()).toContain('자기소개서, 도화지, 문서 프로필은 Notion으로 보내지 않습니다.');
        await wrapper.get('[data-testid="connect-notion"]').trigger('click');
        await flushPromises();
        expect(mocks.createNotionOAuthState).toHaveBeenCalled();
        expect(mocks.getOAuthUrl).toHaveBeenCalledWith({
            redirectUri: 'http://localhost:5173/mypage/notion',
            state: 'notion-state'
        });
        expect(mocks.redirectToNotionOAuth).toHaveBeenCalled();
        expect(mocks.connect).not.toHaveBeenCalled();
    });

    it('NOTION-001: hides stale failure logs after the same basket job syncs successfully', async () => {
        mocks.listSyncLogs.mockResolvedValue([
            {
                id: '2',
                basketJobId: 10,
                target: 'JOB',
                status: 'SUCCESS',
                message: 'JOB_ONLY synced: Example Labs / Backend Developer -> page-10'
            },
            {
                id: '1',
                basketJobId: 10,
                target: 'JOB',
                status: 'FAILURE',
                message: 'Notion page creation failed.'
            }
        ]);

        const wrapper = await mountPage();

        expect(wrapper.text()).toContain('JOB_ONLY synced: Example Labs / Backend Developer -> page-10');
        expect(wrapper.text()).not.toContain('Notion page creation failed.');
    });

    it('NOTION-001: shows the server setup error when Notion OAuth URL cannot be created', async () => {
        mocks.getConnection.mockResolvedValue({
            connected: false,
            notionAccountEmail: null,
            syncEnabled: false,
            syncScope: 'JOB_ONLY'
        });
        const error = new Error('Request failed with status code 400');
        error.response = {
            data: {
                success: false,
                error: { message: 'Notion OAuth client ID is not configured.' }
            }
        };
        mocks.getOAuthUrl.mockRejectedValue(error);
        mocks.listSyncLogs.mockResolvedValue([]);
        const wrapper = await mountPage();

        await wrapper.get('[data-testid="connect-notion"]').trigger('click');
        await flushPromises();

        expect(wrapper.text()).toContain('Notion OAuth client ID is not configured.');
        expect(mocks.redirectToNotionOAuth).not.toHaveBeenCalled();
    });

    it('NOTION-001: completes Notion OAuth callback with authorization code only', async () => {
        const wrapper = await mountPage('/mypage/notion?code=notion-code&state=notion-state');

        expect(mocks.consumeNotionOAuthState).toHaveBeenCalledWith('notion-state');
        expect(mocks.connect).toHaveBeenCalledWith({
            authorizationCode: 'notion-code',
            redirectUri: 'http://localhost:5173/mypage/notion'
        });
        expect(wrapper.text()).toContain('gildong.work@gmail.com');
    });

    it('NOTION-001: clears a stale OAuth callback instead of leaving a missing state error', async () => {
        mocks.consumeNotionOAuthState.mockImplementation(() => {
            throw new Error('Notion OAuth state was not found.');
        });

        const wrapper = await mountPage('/mypage/notion?code=notion-code&state=notion-state');

        expect(mocks.connect).not.toHaveBeenCalled();
        expect(mocks.getConnection).toHaveBeenCalled();
        expect(wrapper.text()).not.toContain('Notion OAuth state was not found.');
        expect(wrapper.text()).toContain('gildong.work@gmail.com');
    });

    it('NOTION-001: renders an actionable empty sync log state', async () => {
        mocks.listSyncLogs.mockResolvedValue([]);
        const wrapper = await mountPage();

        expect(wrapper.text()).toContain('아직 동기화된 공고가 없습니다.');
        expect(wrapper.text()).toContain('장바구니에 공고를 저장하면 회사명, 직무, 마감일만 Notion에 기록됩니다.');
        expect(wrapper.text()).toContain('먼저 공고 장바구니에서 저장된 공고를 확인해 주세요.');
        expect(wrapper.text()).not.toContain('JOB_ONLY');
    });

    it('NOTION-001: shows an inline error when sync toggle fails', async () => {
        mocks.updateSyncSettings.mockRejectedValue(new Error('network'));
        const wrapper = await mountPage();

        await wrapper.get('[data-testid="toggle-job-only-sync"]').trigger('click');
        await flushPromises();

        expect(wrapper.text()).toContain('Notion 동기화 설정을 저장하지 못했습니다.');
        expect(wrapper.text()).toContain('Notion 연결 상태와 네트워크를 확인한 뒤 다시 시도해 주세요.');
    });
});

async function mountPage(path = '/mypage/notion') {
    const router = makeRouter();
    router.push(path);
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
