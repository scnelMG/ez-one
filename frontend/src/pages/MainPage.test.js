import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { basketApi } from '@/features/basket/api/basketApi';
import { dashboardApi } from '@/features/dashboard/api/dashboardApi';
import { profileApi } from '@/features/profile/api/profileApi';
import MainPage from './MainPage.vue';

vi.mock('@/features/basket/api/basketApi', () => ({
    basketApi: {
        listJobs: vi.fn(),
        archiveJob: vi.fn(),
        createJob: vi.fn()
    }
}));

vi.mock('@/features/dashboard/api/dashboardApi', () => ({
    dashboardApi: {
        getSummary: vi.fn(),
        getActivities: vi.fn(),
        getActivityLogs: vi.fn()
    }
}));

vi.mock('@/features/profile/api/profileApi', () => ({
    profileApi: {
        getUserProfile: vi.fn(),
        saveUserProfile: vi.fn()
    }
}));

const basketJobs = [
    job('101', 'Naver', 'Backend Engineer', 'IN_PROGRESS', '진행중', '2026.06.08', '102'),
    job('104', 'KakaoPay', 'Server Developer', 'NOT_STARTED', '지원 전', '2026.06.12', '105'),
    job('106', 'Line', 'Frontend Engineer', 'NOT_APPLIED', '미지원', '2026.06.20', '108'),
    job('107', 'Toss', 'Frontend Developer', 'SUBMITTED', '지원완료', '2026.06.25', '109'),
    job('108', 'Planet', 'Frontend Developer', 'NOT_STARTED', '지원 전', '2026.06.27', '110'),
    job('109', 'Overflow', 'Java Backend Engineer', 'IN_PROGRESS', '진행중', '2026.06.30', '111')
];

const makeRouter = () => createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/', component: { template: '<div>main</div>' } },
        { path: '/main', component: MainPage },
        { path: '/login', component: { template: '<div>login</div>' } },
        { path: '/basket', component: { template: '<div>basket</div>' } },
        { path: '/mypage', component: { template: '<div>mypage</div>' } },
        { path: '/study', component: { template: '<div>study</div>' } },
        { path: '/workspaces/:workspaceId', component: { template: '<div>workspace</div>' } },
        { path: '/document-profile', component: { template: '<div>document profile</div>' } },
        { path: '/mypage/notion', component: { template: '<div>notion</div>' } },
        { path: '/mypage/terms', component: { template: '<div>terms</div>' } }
    ]
});

describe('MainPage', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.mocked(basketApi.listJobs).mockReset();
        vi.mocked(basketApi.listJobs).mockResolvedValue(basketJobs);
        vi.mocked(basketApi.archiveJob).mockReset();
        vi.mocked(basketApi.archiveJob).mockResolvedValue(undefined);
        vi.mocked(basketApi.createJob).mockReset();
        vi.mocked(basketApi.createJob).mockResolvedValue({
            id: '201',
            companyName: 'Line',
            positionTitle: 'Frontend Engineer',
            status: 'NOT_STARTED',
            statusLabel: '지원 전',
            deadlineLabel: '2026.06.28',
            deadlineDate: '2026-06-28',
            deadlineSoon: false,
            workspaceId: '202',
            sourceUrl: 'https://www.jasoseol.com/'
        });
        vi.mocked(dashboardApi.getSummary).mockReset();
        vi.mocked(dashboardApi.getSummary).mockResolvedValue({
            summary: {
                totalApplications: 6,
                inProgress: 2,
                notStarted: 2,
                deadlineSoon: 2
            },
            todayJobs: []
        });
        vi.mocked(dashboardApi.getActivities).mockReset();
        vi.mocked(dashboardApi.getActivities).mockResolvedValue([]);
        vi.mocked(dashboardApi.getActivityLogs).mockReset();
        vi.mocked(dashboardApi.getActivityLogs).mockResolvedValue([]);

        vi.mocked(profileApi.getUserProfile).mockReset();
        vi.mocked(profileApi.getUserProfile).mockResolvedValue({
            desiredRoles: [],
            companyTypes: [],
            industries: [],
            regions: [],
            skills: [],
            ssafy: false,
            completed: false
        });
        vi.mocked(profileApi.saveUserProfile).mockReset();
        vi.mocked(profileApi.saveUserProfile).mockResolvedValue({
            desiredRoles: ['프론트엔드'],
            companyTypes: ['중견기업'],
            industries: ['IT/플랫폼'],
            regions: ['서울'],
            skills: ['React'],
            ssafy: false,
            completed: true
        });
        vi.stubGlobal('confirm', vi.fn(() => true));
    });

    it('renders the dashboard without the old rail or top filters', async () => {
        localStorage.setItem('ezone.currentUser', JSON.stringify({
            id: 1,
            email: 'user@example.com',
            name: '홍길동',
            nickname: '길동',
            profileCompleted: true
        }));
        const wrapper = await mountMain();

        expect(wrapper.text()).toContain('지원 현황');
        expect(wrapper.text()).toContain('공고 장바구니');
        expect(wrapper.text()).not.toContain('추천 공고');
        expect(wrapper.find('[data-testid="main-recommendation-preview-job"]').exists()).toBe(false);
        expect(wrapper.find('.dashboard-rail').exists()).toBe(false);
        expect(wrapper.find('.filter-bar').exists()).toBe(false);
        expect(wrapper.find('[data-testid="member-chip"]').exists()).toBe(false);
    });

    it('uses basket page columns and renders recent work as a row label', async () => {
        localStorage.setItem('ezone.recentWorkspaces', JSON.stringify(['102']));
        const wrapper = await mountMain();

        expect(wrapper.get('.main-basket-title-row').text()).toBe('공고 장바구니마감 임박순으로 제공됩니다.');
        expect(wrapper.findAll('.main-basket-head span').map((cell) => cell.text())).toEqual([
            '중요',
            '회사명',
            '직무',
            '상태',
            '마감일',
            '채용 사이트 링크',
            '최근 작업',
            ''
        ]);
        const rows = wrapper.findAll('[data-testid="main-basket-preview-job"]');
        expect(rows).toHaveLength(5);
        expect(rows[0].get('[data-testid="main-basket-company"]').text()).toContain('Naver');
        expect(rows[0].get('[data-testid="main-recent-work-101"]').text()).toBe('최근 작업');
        expect(rows[0].get('[data-testid="main-basket-apply-link"]').text()).toBe('바로가기');
        expect(wrapper.find('[data-testid="main-archive-101"]').exists()).toBe(true);
    });

    it('JOB-008: prompts confirm and reloads summary stats after deleting job in basket preview', async () => {
        vi.stubGlobal('confirm', vi.fn(() => true));
        const wrapper = await mountMain();
        vi.mocked(basketApi.archiveJob).mockClear();
        vi.mocked(dashboardApi.getSummary).mockClear();

        await wrapper.get('[data-testid="main-archive-101"]').trigger('click');
        await flushPromises();

        expect(window.confirm).toHaveBeenCalledWith('Naver Backend Engineer 공고를 삭제하시겠습니까?');
        expect(basketApi.archiveJob).toHaveBeenCalledWith('101');
        expect(dashboardApi.getSummary).toHaveBeenCalled();
    });

    it('JOB-008: does not delete job if confirm is rejected', async () => {
        vi.stubGlobal('confirm', vi.fn(() => false));
        const wrapper = await mountMain();
        vi.mocked(basketApi.archiveJob).mockClear();
        vi.mocked(dashboardApi.getSummary).mockClear();

        await wrapper.get('[data-testid="main-archive-101"]').trigger('click');
        await flushPromises();

        expect(window.confirm).toHaveBeenCalled();
        expect(basketApi.archiveJob).not.toHaveBeenCalled();
        expect(dashboardApi.getSummary).not.toHaveBeenCalled();
    });

    it('opens onboarding only for first-login users', async () => {
        localStorage.setItem('ezone.currentUser', JSON.stringify({
            id: 1,
            email: 'first@example.com',
            name: 'First User',
            nickname: '',
            profileCompleted: false,
            onboardingRequired: true
        }));
        const wrapper = await mountMain();

        expect(wrapper.find('[data-testid="onboarding-modal"]').exists()).toBe(true);
        await wrapper.get('[data-testid="onboarding-skill-input"]').setValue('React');
        await wrapper.get('[data-testid="onboarding-skill-input"]').trigger('keyup.enter');
        await wrapper.get('[data-testid="save-onboarding"]').trigger('click');
        await flushPromises();
        expect(profileApi.saveUserProfile).toHaveBeenCalledWith(expect.objectContaining({
            skills: expect.arrayContaining(['React'])
        }));
        expect(wrapper.find('[data-testid="onboarding-modal"]').exists()).toBe(false);
    });

    it('ONB-001: does not show onboarding after the profile is completed', async () => {
        localStorage.setItem('ezone.currentUser', JSON.stringify({
            id: 1,
            email: 'done@example.com',
            name: 'Done User',
            nickname: '',
            profileCompleted: true
        }));
        const wrapper = await mountMain();

        expect(wrapper.find('[data-testid="onboarding-modal"]').exists()).toBe(false);
        expect(profileApi.getUserProfile).toHaveBeenCalledTimes(1);
    });

    it('ONB-001: does not reopen onboarding for existing users who have not filled preferences', async () => {
        localStorage.setItem('ezone.currentUser', JSON.stringify({
            id: 1,
            email: 'returning@example.com',
            name: 'Returning User',
            nickname: '',
            profileCompleted: false,
            onboardingRequired: false
        }));
        const wrapper = await mountMain();

        expect(wrapper.find('[data-testid="onboarding-modal"]').exists()).toBe(false);
        expect(profileApi.getUserProfile).toHaveBeenCalledTimes(1);
    });
});

async function mountMain() {
    const router = makeRouter();
    router.push('/main');
    await router.isReady();
    const wrapper = mount(MainPage, {
        global: {
            plugins: [createPinia(), router]
        }
    });
    await flushPromises();
    return wrapper;
}

function job(id, companyName, positionTitle, status, statusLabel, deadlineDate, workspaceId) {
    return {
        id,
        companyName,
        positionTitle,
        status,
        statusLabel,
        deadlineLabel: deadlineDate.replaceAll('-', '.'),
        deadlineDate,
        deadlineSoon: deadlineDate <= '2026-06-12',
        workspaceId,
        sourceUrl: `https://www.jasoseol.com/recruit/${id}`
    };
}

function flushPromises() {
    return new Promise((resolve) => setTimeout(resolve));
}
