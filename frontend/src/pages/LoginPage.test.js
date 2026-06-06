import { mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from './LoginPage.vue';
const mocks = vi.hoisted(() => ({
    buildGoogleOAuthUrl: vi.fn(() => new URL('https://accounts.google.com/o/oauth2/v2/auth?state=state-123')),
    loginWithEmail: vi.fn(),
    signup: vi.fn(),
    saveAuthSession: vi.fn()
}));
vi.mock('@/features/auth/api/authApi', () => ({
    authApi: {
        loginWithEmail: mocks.loginWithEmail,
        signup: mocks.signup
    }
}));
vi.mock('@/features/auth/session/authSession', () => ({
    saveAuthSession: mocks.saveAuthSession
}));
vi.mock('@/features/auth/oauth/googleOAuth', () => ({
    buildGoogleOAuthUrl: mocks.buildGoogleOAuthUrl,
    createOAuthState: vi.fn(() => 'state-123'),
    getGoogleClientId: vi.fn(() => 'google-client-id'),
    getGoogleRedirectUri: vi.fn(() => 'http://localhost:5173/login/callback')
}));
const makeRouter = () => createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/login', component: LoginPage }]
});
describe('LoginPage', () => {
    beforeEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
        mocks.loginWithEmail.mockReset();
        mocks.signup.mockReset();
        mocks.buildGoogleOAuthUrl.mockClear();
        mocks.saveAuthSession.mockReset();
    });
    it('AUTH-001: starts real Google OAuth with the protected redirect target', async () => {
        vi.stubGlobal('location', { assign: vi.fn(), origin: 'http://localhost:5173' });
        const router = makeRouter();
        router.push('/login?redirect=/basket');
        await router.isReady();
        const wrapper = mount(LoginPage, {
            global: {
                plugins: [router]
            }
        });
        await wrapper.get('button[data-testid="google-login"]').trigger('click');
        expect(mocks.buildGoogleOAuthUrl).toHaveBeenCalledWith(expect.not.objectContaining({
            selectAccount: true
        }));
        expect(location.assign).toHaveBeenCalledWith('https://accounts.google.com/o/oauth2/v2/auth?state=state-123');
    });
    it('AUTH-004: hides account switching from the default login entry', async () => {
        const router = makeRouter();
        router.push('/login');
        await router.isReady();
        const wrapper = mount(LoginPage, {
            global: {
                plugins: [router]
            }
        });
        expect(wrapper.find('button[data-testid="google-account-switch"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="account-switch-callout"]').exists()).toBe(false);
    });
    it('AUTH-004: starts Google OAuth account selection when the user chooses another account', async () => {
        vi.stubGlobal('location', { assign: vi.fn(), origin: 'http://localhost:5173' });
        const router = makeRouter();
        router.push('/login?switch=account&redirect=/basket');
        await router.isReady();
        const wrapper = mount(LoginPage, {
            global: {
                plugins: [router]
            }
        });
        expect(wrapper.get('[data-testid="account-switch-callout"]').text()).toContain('다른 Google 계정으로 전환');
        await wrapper.get('button[data-testid="google-account-switch"]').trigger('click');
        expect(mocks.buildGoogleOAuthUrl).toHaveBeenCalledWith(expect.objectContaining({
            selectAccount: true
        }));
        expect(location.assign).toHaveBeenCalledWith('https://accounts.google.com/o/oauth2/v2/auth?state=state-123');
    });
    it('EXT-024: exposes local Chrome extension install guidance from the public entry page', async () => {
        const router = makeRouter();
        router.push('/login');
        await router.isReady();
        const wrapper = mount(LoginPage, {
            global: {
                plugins: [router]
            }
        });
        expect(wrapper.text()).toContain('Chrome 웹 스토어에서 설치');
        expect(wrapper.text()).toContain('Chrome 웹 스토어에서 설치하기');
        expect(wrapper.text()).toContain('EZ-ONE에 저장');
        expect(wrapper.find('a[href="#extension-install"]').exists()).toBe(true);
    });
    it('AUTH-003: logs in with email credentials and redirects to the protected target', async () => {
        mocks.loginWithEmail.mockResolvedValue({
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
            user: { id: 1, email: 'local@example.com' }
        });
        const router = makeRouter();
        router.addRoute({ path: '/basket', component: { template: '<div>Basket</div>' } });
        router.push('/login?redirect=/basket');
        await router.isReady();
        const wrapper = mount(LoginPage, {
            global: {
                plugins: [router]
            }
        });
        expect(wrapper.find('[data-testid="email-login-submit"]').exists()).toBe(false);
        await wrapper.get('[data-testid="email-auth-open"]').trigger('click');
        await wrapper.get('[data-testid="email-input"]').setValue('local@example.com');
        await wrapper.get('[data-testid="password-input"]').setValue('password123!');
        await wrapper.get('[data-testid="email-login-submit"]').trigger('submit');
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(mocks.loginWithEmail).toHaveBeenCalledWith({
            email: 'local@example.com',
            password: 'password123!'
        });
        expect(mocks.saveAuthSession).toHaveBeenCalledWith(expect.objectContaining({ accessToken: 'access-token' }));
        expect(router.currentRoute.value.path).toBe('/basket');
    });
    it('AUTH-002: signs up with email credentials from the login page', async () => {
        mocks.signup.mockResolvedValue({
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
            user: { id: 2, email: 'local@example.com' }
        });
        const router = makeRouter();
        router.addRoute({ path: '/', component: { template: '<div>Main</div>' } });
        router.push('/login');
        await router.isReady();
        const wrapper = mount(LoginPage, {
            global: {
                plugins: [router]
            }
        });
        await wrapper.get('[data-testid="email-auth-open"]').trigger('click');
        await wrapper.get('[data-testid="signup-mode"]').trigger('click');
        await wrapper.get('[data-testid="name-input"]').setValue('Local User');
        await wrapper.get('[data-testid="email-input"]').setValue('local@example.com');
        await wrapper.get('[data-testid="password-input"]').setValue('password123!');
        await wrapper.get('[data-testid="email-login-submit"]').trigger('submit');
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(mocks.signup).toHaveBeenCalledWith({
            name: 'Local User',
            email: 'local@example.com',
            password: 'password123!'
        });
        expect(mocks.saveAuthSession).toHaveBeenCalled();
        expect(router.currentRoute.value.path).toBe('/');
    });
});
