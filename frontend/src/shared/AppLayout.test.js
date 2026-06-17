import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AppLayout from './AppLayout.vue';

const mocks = vi.hoisted(() => ({
    clearAuthSession: vi.fn(),
    getCurrentUser: vi.fn(() => ({
        id: 1,
        email: 'mingyu@example.com',
        name: 'Mingyu',
        nickname: 'Mingyu',
        pictureUrl: 'https://example.com/profile.png'
    })),
    getRefreshToken: vi.fn(() => 'refresh-token'),
    logout: vi.fn(),
    profile: null,
    profileStatus: 'ready',
    loadProfile: vi.fn()
}));

vi.mock('@/features/auth/api/authApi', () => ({
    authApi: {
        logout: mocks.logout
    }
}));

vi.mock('@/features/auth/session/authSession', () => ({
    clearAuthSession: mocks.clearAuthSession,
    getCurrentUser: mocks.getCurrentUser,
    getRefreshToken: mocks.getRefreshToken
}));

vi.mock('@/stores/profileStore', () => ({
    useProfileStore: () => ({
        profile: mocks.profile,
        status: mocks.profileStatus,
        loadProfile: mocks.loadProfile
    })
}));

function makeRouter() {
    return createRouter({
        history: createMemoryHistory(),
        routes: [
            { path: '/', component: { template: '<div>main</div>' } },
            { path: '/login', component: { template: '<div>login</div>' } },
            { path: '/basket', component: { template: '<div>basket</div>' } },
            { path: '/document-profile', component: { template: '<div>document profile</div>' } },
            { path: '/history', component: { template: '<div>history</div>' } },
            { path: '/study', component: { template: '<div>study</div>' } },
            { path: '/recommendations/mattermost', component: { template: '<div>mattermost</div>' } },
            { path: '/mypage', component: { template: '<div>mypage</div>' } },
            { path: '/mypage/notion', component: { template: '<div>notion</div>' } },
            { path: '/mypage/onboarding', component: { template: '<div>onboarding</div>' } },
            { path: '/mypage/inquiry', component: { template: '<div>inquiry</div>' } },
            { path: '/mypage/partnership', component: { template: '<div>partnership</div>' } },
            { path: '/mypage/terms', component: { template: '<div>terms</div>' } }
        ]
    });
}

describe('AppLayout', () => {
    beforeEach(() => {
        vi.useRealTimers();
        mocks.clearAuthSession.mockReset();
        mocks.getCurrentUser.mockReset();
        mocks.getCurrentUser.mockReturnValue({
            id: 1,
            email: 'mingyu@example.com',
            name: 'Mingyu',
            nickname: 'Mingyu',
            pictureUrl: 'https://example.com/profile.png'
        });
        mocks.getRefreshToken.mockReset();
        mocks.getRefreshToken.mockReturnValue('refresh-token');
        mocks.logout.mockReset();
        mocks.logout.mockResolvedValue({});
        mocks.profile = { ssafy: false };
        mocks.profileStatus = 'ready';
        mocks.loadProfile.mockReset();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('ALERT-001: keeps alert IA visible but disabled for P1', async () => {
        const wrapper = await mountLayout('/');
        const alertEntry = wrapper.get('[data-testid="reserved-alerts"]');

        expect(alertEntry.attributes('aria-disabled')).toBe('true');
        expect(alertEntry.attributes('aria-label')).toBe('알림은 준비 중입니다');
        expect(alertEntry.attributes('title')).toBe('알림은 준비 중입니다');
        expect(alertEntry.element.tagName).not.toBe('BUTTON');
    });

    it('MAIN-013/HISTORY-001: uses the logo as main link and keeps approved global navigation visible', async () => {
        const wrapper = await mountLayout('/');
        const navLinks = wrapper.findAll('.primary-nav a').map((link) => link.attributes('href'));
        const navText = wrapper.get('.primary-nav').text();

        expect(wrapper.get('.brand-lockup').attributes('href')).toBe('/');
        expect(navLinks).toEqual(['/basket', '/document-profile', '/study', '/history']);
        expect(navText).toContain('공고 장바구니');
        expect(navText).toContain('취업 스터디');
        expect(navText).not.toContain('공고 바구니');
        expect(navLinks).not.toContain('/recommendations/mattermost');
    });

    it('MM-001: shows the Mattermost recommendation menu only for SSAFY users in the original order', async () => {
        mocks.profile = { ssafy: true };
        const wrapper = await mountLayout('/');
        const navLinks = wrapper.findAll('.primary-nav a').map((link) => link.attributes('href'));

        expect(navLinks).toEqual([
            '/basket',
            '/document-profile',
            '/study',
            '/recommendations/mattermost',
            '/history'
        ]);
        expect(wrapper.get('.primary-nav').text()).toContain('MM 추천공고');
    });

    it('MAIN-013: renders a production-style footer without fake company facts', async () => {
        const wrapper = await mountLayout('/');
        const footer = wrapper.get('.app-footer');
        const footerLinks = footer.findAll('a').map((link) => link.attributes('href'));

        expect(footer.text()).toContain('EZ-ONE');
        expect(footer.text()).toContain('채용 공고, 작성 자료, 서류 정보를 한곳에서 관리하는 취업 준비 워크스페이스입니다.');
        expect(footer.text()).toContain('support@ez-one.local');
        expect(footer.text()).toContain('사업자 정보는 정식 출시 전 확정 예정입니다.');
        expect(footerLinks).toEqual([
            '/mypage/terms',
            '/mypage/terms#privacy',
            '/mypage/inquiry',
            '/mypage/partnership',
            'mailto:support@ez-one.local'
        ]);
    });

    it('MY-001: opens a compact mypage dropdown with the Google profile photo', async () => {
        const wrapper = await mountLayout('/');

        expect(wrapper.get('[data-testid="profile-photo"]').attributes('src')).toBe('https://example.com/profile.png');
        expect(wrapper.get('[data-testid="mypage-menu-trigger"]').text()).toContain('Mingyu');

        await wrapper.get('[data-testid="mypage-menu-trigger"]').trigger('mouseenter');
        const dropdown = wrapper.get('[data-testid="mypage-dropdown"]');
        expect(dropdown.text()).toContain('내 계정');
        expect(dropdown.text()).toContain('Notion 연동 관리');
        expect(dropdown.text()).toContain('온보딩 정보');
        expect(dropdown.text()).toContain('1:1 문의');
        expect(wrapper.get('[data-testid="mypage-link-notion"]').attributes('href')).toBe('/mypage/notion');
    });

    it('MY-001: keeps the dropdown open while moving from trigger to menu', async () => {
        vi.useFakeTimers();
        const wrapper = await mountLayout('/');

        await wrapper.get('[data-testid="mypage-menu-trigger"]').trigger('mouseenter');
        await wrapper.get('.profile-menu').trigger('mouseleave');

        expect(wrapper.find('[data-testid="mypage-dropdown"]').exists()).toBe(true);
        await wrapper.get('[data-testid="mypage-dropdown"]').trigger('mouseenter');
        vi.advanceTimersByTime(250);
        await wrapper.vm.$nextTick();

        expect(wrapper.find('[data-testid="mypage-dropdown"]').exists()).toBe(true);
    });

    it('ALERT-001: renders the reserved alert as icon-only with the supplied bell asset', async () => {
        const wrapper = await mountLayout('/');
        const alertEntry = wrapper.get('[data-testid="reserved-alerts"]');

        expect(alertEntry.text()).toBe('');
        expect(alertEntry.get('[data-testid="reserved-alerts-icon"]').attributes('src')).toContain('bell.svg');
    });
});

async function mountLayout(path) {
    return (await mountLayoutWithRouter(path)).wrapper;
}

async function mountLayoutWithRouter(path) {
    const router = makeRouter();
    router.push(path);
    await router.isReady();
    const wrapper = mount(AppLayout, {
        global: {
            plugins: [createPinia(), router]
        }
    });
    return { wrapper, router };
}
