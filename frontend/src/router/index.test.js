import { router } from './index';
describe('router', () => {
    beforeEach(() => {
        localStorage.clear();
    });
    it('registers P1 route shells before API-backed slices', () => {
        const routeNames = router.getRoutes().map((route) => route.name);
        expect(routeNames).toContain('login');
        expect(routeNames).toContain('extension-connect');
        expect(routeNames).not.toContain('onboarding');
        expect(routeNames).toContain('main');
        expect(routeNames).toContain('basket');
        expect(routeNames).toContain('basket-detail');
        expect(routeNames).toContain('workspace');
        expect(routeNames).toContain('document-profile');
        expect(routeNames).toContain('recommendations-mattermost');
        expect(routeNames).toContain('history');
        expect(routeNames).toContain('mypage-account');
        expect(routeNames).toContain('mypage-notion');
        expect(routeNames).toContain('mypage-onboarding');
        expect(routeNames).toContain('mypage-qna');
        expect(routeNames).toContain('mypage-inquiry');
        expect(routeNames).not.toContain(['mypage', 'partner', 'ship'].join('-'));
        expect(routeNames).toContain('mypage-terms');
    });
    it('uses / as the authenticated dashboard and /login as the public login page', () => {
        const routes = router.getRoutes();
        expect(routes.find((route) => route.path === '/')?.name).toBe('main');
        expect(routes.find((route) => route.path === '/login')?.name).toBe('login');
        expect(routes.find((route) => route.path === '/main')?.redirect).toBe('/');
        expect(routes.find((route) => route.path === '/basket/:basketJobId')?.name).toBe('basket-detail');
        expect(routes.find((route) => route.path === '/recommendations/mattermost')?.name).toBe('recommendations-mattermost');
    });
    it('uses the login page as the default start page when the user is not authenticated', async () => {
        await router.push('/');
        expect(router.currentRoute.value.name).toBe('login');
        expect(router.currentRoute.value.query.redirect).toBeUndefined();
    });
    it('preserves extension connect redirects when the extension starts login from the main route', async () => {
        await router.push('/?redirect=%2Fextension%2Fconnect%3FsourceUrl%3Dhttps%253A%252F%252Fwww.jasoseol.com%252Frecruit%252F1%26sourceTabId%3D42');
        expect(router.currentRoute.value.name).toBe('login');
        expect(router.currentRoute.value.query.redirect).toBe('/extension/connect?sourceUrl=https%3A%2F%2Fwww.jasoseol.com%2Frecruit%2F1&sourceTabId=42');
    });
    it('preserves extension connect redirects from the current local extension handoff URL', async () => {
        await router.push('/?redirect=%2Fextension%2Fconnect%3FsourceUrl%3Dhttps%253A%252F%252Fjasoseol.com%252Frecruit%26sourceTabId%3D1361782977');
        expect(router.currentRoute.value.name).toBe('login');
        expect(router.currentRoute.value.query.redirect).toBe('/extension/connect?sourceUrl=https%3A%2F%2Fjasoseol.com%2Frecruit&sourceTabId=1361782977');
    });
    it('redirects protected P1 pages to login when the user is not authenticated', async () => {
        await router.push('/basket');
        expect(router.currentRoute.value.name).toBe('login');
        expect(router.currentRoute.value.query.redirect).toBe('/basket');
    });
    it('allows protected P1 pages when an access token exists', async () => {
        localStorage.setItem('ezone.accessToken', 'test-token');
        localStorage.setItem('ezone.currentUser', JSON.stringify({
            id: 1,
            email: 'user@example.com',
            name: 'Hong Gil Dong',
            nickname: 'Gil Dong',
            profileCompleted: true,
            onboardingRequired: false
        }));
        await router.push('/basket');
        expect(router.currentRoute.value.name).toBe('basket');
    });
    it('redirects users with a new-account onboarding prompt to the main page modal host', async () => {
        localStorage.setItem('ezone.accessToken', 'test-token');
        localStorage.setItem('ezone.currentUser', JSON.stringify({
            id: 1,
            email: 'user@example.com',
            name: 'Hong Gil Dong',
            nickname: 'Gil Dong',
            profileCompleted: false,
            onboardingRequired: true
        }));
        await router.push('/document-profile');
        expect(router.currentRoute.value.name).toBe('main');
    });

    it('allows returning users with incomplete preferences to use protected P1 pages', async () => {
        localStorage.setItem('ezone.accessToken', 'test-token');
        localStorage.setItem('ezone.currentUser', JSON.stringify({
            id: 1,
            email: 'user@example.com',
            name: 'Hong Gil Dong',
            nickname: 'Gil Dong',
            profileCompleted: false,
            onboardingRequired: false
        }));
        await router.push('/document-profile');
        expect(router.currentRoute.value.name).toBe('document-profile');
    });
    it('sends authenticated first-login users from login to the main page modal host', async () => {
        localStorage.setItem('ezone.accessToken', 'test-token');
        localStorage.setItem('ezone.currentUser', JSON.stringify({
            id: 1,
            email: 'user@example.com',
            name: 'Hong Gil Dong',
            nickname: 'Gil Dong',
            profileCompleted: false,
            onboardingRequired: true
        }));
        await router.push('/login');
        expect(router.currentRoute.value.name).toBe('main');
    });
    it('keeps extension login redirects on the extension connect page even when onboarding is pending', async () => {
        localStorage.setItem('ezone.accessToken', 'test-token');
        localStorage.setItem('ezone.currentUser', JSON.stringify({
            id: 1,
            email: 'user@example.com',
            name: 'Hong Gil Dong',
            nickname: 'Gil Dong',
            profileCompleted: false,
            onboardingRequired: true
        }));
        await router.push('/login?redirect=%2Fextension%2Fconnect%3FsourceUrl%3Dhttps%253A%252F%252Fwww.jasoseol.com%252Frecruit%252F1%26sourceTabId%3D42');
        expect(router.currentRoute.value.name).toBe('extension-connect');
        expect(router.currentRoute.value.query.sourceUrl).toBe('https://www.jasoseol.com/recruit/1');
        expect(router.currentRoute.value.query.sourceTabId).toBe('42');
    });
    it('sends authenticated users from extension login redirect to the extension connect page', async () => {
        localStorage.setItem('ezone.accessToken', 'test-token');
        localStorage.setItem('ezone.currentUser', JSON.stringify({
            id: 1,
            email: 'user@example.com',
            name: 'Hong Gil Dong',
            nickname: 'Gil Dong',
            profileCompleted: true,
            onboardingRequired: false
        }));
        await router.push('/?redirect=/extension/connect?sourceUrl=https%3A%2F%2Fwww.jasoseol.com%2Frecruit%2F1');
        expect(router.currentRoute.value.name).toBe('extension-connect');
        expect(router.currentRoute.value.query.sourceUrl).toBe('https://www.jasoseol.com/recruit/1');
    });
    it('activates approved history and keeps remaining P2-only route shells disabled', () => {
        const routePaths = router.getRoutes().map((route) => route.path);
        expect(routePaths).toContain('/history');
        expect(routePaths).toContain('/recommendations/mattermost');
        expect(routePaths).not.toContain('/alerts');
        expect(routePaths).not.toContain('/basket/calendar');
        expect(routePaths).not.toContain('/mypage/support');
        expect(routePaths).not.toContain(['/mypage', 'partner', 'ship'].join('/'));
    });
});
