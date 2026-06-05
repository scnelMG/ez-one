import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dashboardApi } from '@/features/dashboard/api/dashboardApi';
import MainPage from './MainPage.vue';
vi.mock('@/features/dashboard/api/dashboardApi', () => ({
    dashboardApi: {
        getSummary: vi.fn()
    }
}));
const defaultDashboardResponse = {
    summary: {
        totalApplications: 3,
        inProgress: 1,
        notStarted: 1,
        deadlineSoon: 2
    },
    todayJobs: [
        {
            companyName: '네이버',
            positionTitle: 'Backend Engineer',
            deadlineLabel: '2026.06.06',
            workspaceId: '102'
        },
        {
            companyName: 'Future Corp',
            positionTitle: 'Platform Engineer',
            deadlineLabel: '2026.06.20',
            workspaceId: '108'
        }
    ]
};
const makeRouter = () => createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/main', component: MainPage },
        { path: '/login', component: { template: '<div>로그인</div>' } },
        { path: '/basket', component: { template: '<div>공고 장바구니</div>' } },
        { path: '/mypage', component: { template: '<div>마이페이지</div>' } },
        { path: '/workspaces/:workspaceId', component: { template: '<div>워크스페이스</div>' } },
        { path: '/recommendations', component: { template: '<div>추천 공고</div>' } },
        { path: '/document-profile', component: { template: '<div>서류 정보</div>' } },
        { path: '/mypage/notion', component: { template: '<div>Notion</div>' } }
    ]
});
describe('MainPage', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.mocked(dashboardApi.getSummary).mockReset();
        vi.mocked(dashboardApi.getSummary).mockResolvedValue(defaultDashboardResponse);
    });
    it('DASH-001: renders the Korean P1 dashboard route shell with core flow links', async () => {
        localStorage.setItem('ezone.currentUser', JSON.stringify({
            id: 1,
            email: 'user@example.com',
            name: '홍길동',
            nickname: '길동',
            profileCompleted: true
        }));
        const router = makeRouter();
        router.push('/main');
        await router.isReady();
        const wrapper = mount(MainPage, {
            global: {
                plugins: [createPinia(), router]
            }
        });
        await new Promise((resolve) => setTimeout(resolve));
        expect(wrapper.text()).toContain('오늘의 지원 흐름');
        expect(wrapper.text()).toContain('오늘 마감');
        expect(wrapper.text()).toContain('공고 장바구니');
        expect(wrapper.text()).not.toMatch(/DASH-|JOB-|REC-/);
        const links = wrapper.findAll('a').map((link) => link.attributes('href'));
        expect(links).toContain('/basket');
        expect(links).toContain('/basket?status=IN_PROGRESS');
        expect(links).toContain('/basket?sort=deadline');
        expect(links).toContain('/workspaces/102');
    });
    it('AUTH-013: shows the signed-in member chip with nickname before name', async () => {
        localStorage.setItem('ezone.currentUser', JSON.stringify({
            id: 1,
            email: 'user@example.com',
            name: '홍길동',
            nickname: '길동',
            profileCompleted: true
        }));
        const router = makeRouter();
        router.push('/main');
        await router.isReady();
        const wrapper = mount(MainPage, {
            global: {
                plugins: [createPinia(), router]
            }
        });
        expect(wrapper.get('[data-testid="member-chip"]').text()).toContain('길동');
        expect(wrapper.get('[data-testid="member-avatar"]').text()).toBe('길');
        expect(wrapper.get('[data-testid="member-chip"]').attributes('href')).toBe('/mypage');
    });
    it('AUTH-013: falls back to the Google account name when nickname is empty', async () => {
        localStorage.setItem('ezone.currentUser', JSON.stringify({
            id: 1,
            email: 'user@example.com',
            name: 'Hong Gil Dong',
            nickname: '',
            profileCompleted: true
        }));
        const router = makeRouter();
        router.push('/main');
        await router.isReady();
        const wrapper = mount(MainPage, {
            global: {
                plugins: [createPinia(), router]
            }
        });
        expect(wrapper.get('[data-testid="member-chip"]').text()).toContain('Hong Gil Dong');
        expect(wrapper.get('[data-testid="member-avatar"]').text()).toBe('H');
    });
    it('MAIN-014/MAIN-015: shows this week deadline jobs and links them to workspaces', async () => {
        const router = makeRouter();
        router.push('/main');
        await router.isReady();
        const wrapper = mount(MainPage, {
            global: {
                plugins: [createPinia(), router]
            }
        });
        await new Promise((resolve) => setTimeout(resolve));
        const calendar = wrapper.get('[data-testid="main-weekly-calendar"]');
        expect(calendar.text()).toContain('네이버');
        expect(calendar.text()).not.toContain('Future Corp');
        expect(wrapper.get('[data-testid="weekly-calendar-job-102"]').attributes('href')).toBe('/workspaces/102');
    });
    it('MAIN-006/MAIN-007: shows five nearest deadline jobs and highlights jobs due within a week', async () => {
        vi.mocked(dashboardApi.getSummary).mockResolvedValueOnce({
            summary: {
                totalApplications: 6,
                inProgress: 2,
                notStarted: 4,
                deadlineSoon: 4
            },
            todayJobs: [
                { companyName: 'D9 Corp', positionTitle: 'Backend', deadlineLabel: 'D-9', workspaceId: '109' },
                { companyName: 'D1 Corp', positionTitle: 'Backend', deadlineLabel: 'D-1', workspaceId: '101' },
                { companyName: 'D10 Corp', positionTitle: 'Backend', deadlineLabel: 'D-10', workspaceId: '110' },
                { companyName: 'D3 Corp', positionTitle: 'Backend', deadlineLabel: 'D-3', workspaceId: '103' },
                { companyName: 'D7 Corp', positionTitle: 'Backend', deadlineLabel: 'D-7', workspaceId: '107' },
                { companyName: 'D2 Corp', positionTitle: 'Backend', deadlineLabel: 'D-2', workspaceId: '102' }
            ]
        });
        const router = makeRouter();
        router.push('/main');
        await router.isReady();
        const wrapper = mount(MainPage, {
            global: {
                plugins: [createPinia(), router]
            }
        });
        await new Promise((resolve) => setTimeout(resolve));
        const rows = wrapper.findAll('[data-testid="deadline-summary-job"]');
        expect(rows).toHaveLength(5);
        expect(rows.map((row) => row.text())).toEqual([
            'D1 CorpBackendD-1',
            'D2 CorpBackendD-2',
            'D3 CorpBackendD-3',
            'D7 CorpBackendD-7',
            'D9 CorpBackendD-9'
        ]);
        expect(rows.filter((row) => row.classes('is-deadline-soon'))).toHaveLength(4);
    });
});
