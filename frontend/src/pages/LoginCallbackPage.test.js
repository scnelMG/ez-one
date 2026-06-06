import { mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginCallbackPage from './LoginCallbackPage.vue';
import { getAccessToken } from '@/features/auth/session/authSession';
const mocks = vi.hoisted(() => ({
    loginWithGoogle: vi.fn()
}));
vi.mock('@/features/auth/api/authApi', () => ({
    authApi: {
        loginWithGoogle: mocks.loginWithGoogle
    }
}));
vi.mock('@/features/auth/oauth/googleOAuth', () => ({
    consumeOAuthState: vi.fn(() => '/basket'),
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
                profileCompleted: true
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
    it('ONB-001: sends first-login users to the main page where onboarding opens as a modal', async () => {
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
                profileCompleted: false
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
});
