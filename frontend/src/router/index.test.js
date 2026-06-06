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
        expect(routeNames).toContain('recommendations');
        expect(routeNames).toContain('mypage-account');
        expect(routeNames).toContain('mypage-notion');
        expect(routeNames).toContain('mypage-onboarding');
        expect(routeNames).toContain('mypage-qna');
        expect(routeNames).toContain('mypage-inquiry');
        expect(routeNames).toContain('mypage-partnership');
        expect(routeNames).toContain('mypage-terms');
    });
    it('uses / as the authenticated dashboard and /login as the public login page', () => {
        const routes = router.getRoutes();
        expect(routes.find((route) => route.path === '/')?.name).toBe('main');
        expect(routes.find((route) => route.path === '/login')?.name).toBe('login');
        expect(routes.find((route) => route.path === '/main')?.redirect).toBe('/');
        expect(routes.find((route) => route.path === '/basket/:basketJobId')?.name).toBe('basket-detail');
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
            profileCompleted: true
        }));
        await router.push('/basket');
        expect(router.currentRoute.value.name).toBe('basket');
    });
    it('redirects first-login users to the main page so onboarding can open as a modal', async () => {
        localStorage.setItem('ezone.accessToken', 'test-token');
        localStorage.setItem('ezone.currentUser', JSON.stringify({
            id: 1,
            email: 'user@example.com',
            name: 'Hong Gil Dong',
            nickname: 'Gil Dong',
            profileCompleted: false
        }));
        await router.push('/document-profile');
        expect(router.currentRoute.value.name).toBe('main');
    });
    it('sends authenticated first-login users from login to the main page modal host', async () => {
        localStorage.setItem('ezone.accessToken', 'test-token');
        localStorage.setItem('ezone.currentUser', JSON.stringify({
            id: 1,
            email: 'user@example.com',
            name: 'Hong Gil Dong',
            nickname: 'Gil Dong',
            profileCompleted: false
        }));
        await router.push('/login');
        expect(router.currentRoute.value.name).toBe('main');
    });
    it('sends authenticated users from extension login redirect to the extension connect page', async () => {
        localStorage.setItem('ezone.accessToken', 'test-token');
        localStorage.setItem('ezone.currentUser', JSON.stringify({
            id: 1,
            email: 'user@example.com',
            name: 'Hong Gil Dong',
            nickname: 'Gil Dong',
            profileCompleted: true
        }));
        await router.push('/?redirect=/extension/connect?sourceUrl=https%3A%2F%2Fwww.jasoseol.com%2Frecruit%2F1');
        expect(router.currentRoute.value.name).toBe('extension-connect');
        expect(router.currentRoute.value.query.sourceUrl).toBe('https://www.jasoseol.com/recruit/1');
    });
    it('does not activate P2-only route shells', () => {
        const routePaths = router.getRoutes().map((route) => route.path);
        expect(routePaths).not.toContain('/history');
        expect(routePaths).not.toContain('/alerts');
        expect(routePaths).not.toContain('/basket/calendar');
        expect(routePaths).not.toContain('/mypage/support');
    });
});
