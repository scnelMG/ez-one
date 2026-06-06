import { mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AppLayout from './AppLayout.vue';

const mocks = vi.hoisted(() => ({
    clearAuthSession: vi.fn(),
    getCurrentUser: vi.fn(() => ({
        id: 1,
        email: 'mingyu@example.com',
        name: '민규',
        nickname: '민규',
        pictureUrl: 'https://example.com/profile.png'
    })),
    getRefreshToken: vi.fn(() => 'refresh-token'),
    logout: vi.fn()
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

function makeRouter() {
    return createRouter({
        history: createMemoryHistory(),
        routes: [
            { path: '/', component: { template: '<div>main</div>' } },
            { path: '/login', component: { template: '<div>login</div>' } },
            { path: '/basket', component: { template: '<div>basket</div>' } },
            { path: '/document-profile', component: { template: '<div>document profile</div>' } },
            { path: '/recommendations', component: { template: '<div>recommendations</div>' } },
            { path: '/mypage', component: { template: '<div>mypage</div>' } },
            { path: '/mypage/notion', component: { template: '<div>notion</div>' } },
            { path: '/mypage/onboarding', component: { template: '<div>onboarding</div>' } },
            { path: '/mypage/qna', component: { template: '<div>qna</div>' } },
            { path: '/mypage/inquiry', component: { template: '<div>inquiry</div>' } },
            { path: '/mypage/partnership', component: { template: '<div>partnership</div>' } },
            { path: '/mypage/terms', component: { template: '<div>terms</div>' } }
        ]
    });
}

describe('AppLayout', () => {
    beforeEach(() => {
        mocks.clearAuthSession.mockReset();
        mocks.getCurrentUser.mockReset();
        mocks.getCurrentUser.mockReturnValue({
            id: 1,
            email: 'mingyu@example.com',
            name: '민규',
            nickname: '민규',
            pictureUrl: 'https://example.com/profile.png'
        });
        mocks.getRefreshToken.mockReset();
        mocks.getRefreshToken.mockReturnValue('refresh-token');
        mocks.logout.mockReset();
        mocks.logout.mockResolvedValue({});
    });

    it('ALERT-001: keeps alert IA visible but disabled for P1', async () => {
        const wrapper = await mountLayout('/');
        const alertEntry = wrapper.get('[data-testid="reserved-alerts"]');

        expect(alertEntry.attributes('aria-disabled')).toBe('true');
        expect(alertEntry.element.tagName).not.toBe('BUTTON');
    });

    it('MY-001: opens the mypage dropdown on hover/click and exposes each mypage page link', async () => {
        const wrapper = await mountLayout('/');

        expect(wrapper.get('[data-testid="profile-photo"]').attributes('src')).toBe('https://example.com/profile.png');
        expect(wrapper.get('[data-testid="mypage-menu-trigger"]').text()).toContain('민규');

        await wrapper.get('[data-testid="mypage-menu-trigger"]').trigger('mouseenter');
        const dropdown = wrapper.get('[data-testid="mypage-dropdown"]');
        expect(dropdown.text()).toContain('내 계정');
        expect(dropdown.text()).toContain('노션 연동 관리');
        expect(dropdown.text()).toContain('온보딩 정보');
        expect(dropdown.text()).toContain('QnA');
        expect(dropdown.text()).toContain('1:1 문의');
        expect(dropdown.text()).toContain('제휴 문의');
        expect(dropdown.text()).toContain('이용약관');
        expect(wrapper.get('[data-testid="mypage-link-notion"]').attributes('href')).toBe('/mypage/notion');
    });

    it('AUTH-004: lets signed-in users switch to another Google account from the mypage dropdown', async () => {
        const { wrapper, router } = await mountLayoutWithRouter('/');

        await wrapper.get('[data-testid="mypage-menu-trigger"]').trigger('click');
        await wrapper.get('[data-testid="account-switch"]').trigger('click');
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(mocks.logout).toHaveBeenCalledWith('refresh-token');
        expect(mocks.clearAuthSession).toHaveBeenCalled();
        expect(router.currentRoute.value.fullPath).toBe('/login?switch=account');
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
            plugins: [router]
        }
    });
    return { wrapper, router };
}
