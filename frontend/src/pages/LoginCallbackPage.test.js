import { mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginCallbackPage from './LoginCallbackPage.vue';
import { getAccessToken } from '@/features/auth/session/authSession';
const mocks = vi.hoisted(() => ({
    consumeOAuthState: vi.fn(() => '/basket'),
    loginWithGoogle: vi.fn()
}));
vi.mock('@/features/auth/api/authApi', () => ({
    authApi: {
        loginWithGoogle: mocks.loginWithGoogle
    }
}));
vi.mock('@/features/auth/oauth/googleOAuth', () => ({
    consumeOAuthState: mocks.consumeOAuthState,
    getGoogleRedirectUri: vi.fn(() => 'http://localhost:5173/login/callback')
}));
function makeRouter() {
    return createRouter({
        history: createMemoryHistory(),
        routes: [
            { path: '/login/callback', component: LoginCallbackPage },
            { path: '/basket', component: { template: '<div>basket</div>' } },
            { path: '/', component: { template: '<div>login</div>' } }
        ]
    });
}
describe('LoginCallbackPage', () => {
    beforeEach(() => {
        localStorage.clear();
        mocks.consumeOAuthState.mockReset();
        mocks.consumeOAuthState.mockReturnValue('/basket');
        mocks.loginWithGoogle.mockReset();
    });
    it('AUTH-001: exchanges Google code, stores issued tokens, and returns to the protected page', async () => {
        mocks.loginWithGoogle.mockResolvedValue({
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
            tokenType: 'Bearer',
            expiresIn: 3600,
            user: {
                id: 1,
                email: 'user@example.com',
                name: 'Hong Gil Dong',
                nickname: 'Gil Dong',
                profileCompleted: false,
                onboardingRequired: false
            }
        });
        const router = makeRouter();
        router.push('/login/callback?code=google-code&state=state-123');
        await router.isReady();
        mount(LoginCallbackPage, {
            global: {
                plugins: [router]
            }
        });
        await new Promise((resolve) => setTimeout(resolve));
        expect(mocks.loginWithGoogle).toHaveBeenCalledWith({
            authorizationCode: 'google-code',
            redirectUri: 'http://localhost:5173/login/callback'
        });
        expect(getAccessToken()).toBe('access-token');
        expect(router.currentRoute.value.fullPath).toBe('/basket');
    });
    it('ONB-001: sends new-account onboarding prompts to the main page modal host', async () => {
        mocks.loginWithGoogle.mockResolvedValue({
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
            tokenType: 'Bearer',
            expiresIn: 3600,
            user: {
                id: 1,
                email: 'user@example.com',
                name: 'Hong Gil Dong',
                nickname: 'Gil Dong',
                profileCompleted: false,
                onboardingRequired: true
            }
        });
        const router = makeRouter();
        router.push('/login/callback?code=google-code&state=state-123');
        await router.isReady();
        mount(LoginCallbackPage, {
            global: {
                plugins: [router]
            }
        });
        await new Promise((resolve) => setTimeout(resolve));
        expect(router.currentRoute.value.fullPath).toBe('/');
    });
    it('EXT-003: preserves extension connect redirects after Google login even when onboarding is pending', async () => {
        mocks.consumeOAuthState.mockReturnValue('/extension/connect?sourceUrl=https%3A%2F%2Fwww.jasoseol.com%2Frecruit%2F1&sourceTabId=42');
        mocks.loginWithGoogle.mockResolvedValue({
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
            tokenType: 'Bearer',
            expiresIn: 3600,
            user: {
                id: 1,
                email: 'user@example.com',
                name: 'Hong Gil Dong',
                nickname: 'Gil Dong',
                profileCompleted: false,
                onboardingRequired: true
            }
        });
        const router = createRouter({
            history: createMemoryHistory(),
            routes: [
                { path: '/login/callback', component: LoginCallbackPage },
                { path: '/extension/connect', component: { template: '<div>extension connect</div>' } },
                { path: '/', component: { template: '<div>main</div>' } }
            ]
        });
        router.push('/login/callback?code=google-code&state=state-123');
        await router.isReady();
        mount(LoginCallbackPage, {
            global: {
                plugins: [router]
            }
        });
        await new Promise((resolve) => setTimeout(resolve));
        expect(router.currentRoute.value.name).toBeUndefined();
        expect(router.currentRoute.value.path).toBe('/extension/connect');
        expect(router.currentRoute.value.query.sourceUrl).toBe('https://www.jasoseol.com/recruit/1');
        expect(router.currentRoute.value.query.sourceTabId).toBe('42');
    });
    it('AUTH-001: shows a clear message when Google returns an OAuth error', async () => {
        const router = makeRouter();
        router.push('/login/callback?error=access_denied&state=state-123');
        await router.isReady();
        const wrapper = mount(LoginCallbackPage, {
            global: {
                plugins: [router]
            }
        });
        await new Promise((resolve) => setTimeout(resolve));
        expect(wrapper.text()).toContain('Google 로그인이 취소되었거나 승인되지 않았습니다.');
        expect(mocks.loginWithGoogle).not.toHaveBeenCalled();
    });
});
