import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { basketApi } from '@/features/basket/api/basketApi';
import { dashboardApi } from '@/features/dashboard/api/dashboardApi';
import { profileApi } from '@/features/profile/api/profileApi';
import { recommendationApi } from '@/features/recommendations/api/recommendationApi';
import MainPage from './MainPage.vue';

vi.mock('@/features/basket/api/basketApi', () => ({
    basketApi: {
        listJobs: vi.fn()
    }
}));

vi.mock('@/features/dashboard/api/dashboardApi', () => ({
    dashboardApi: {
        getSummary: vi.fn()
    }
}));

vi.mock('@/features/profile/api/profileApi', () => ({
    profileApi: {
        getUserProfile: vi.fn(),
        saveUserProfile: vi.fn()
    }
}));

vi.mock('@/features/recommendations/api/recommendationApi', () => ({
    recommendationApi: {
        listJobs: vi.fn(),
        saveJob: vi.fn()
    }
}));

const defaultBasketJobs = [
    {
        id: '101',
        companyName: 'Naver',
        positionTitle: 'Backend Engineer',
        status: 'IN_PROGRESS',
        statusLabel: '진행 중',
        deadlineLabel: '2026.06.07',
        deadlineDate: '2026-06-07',
        deadlineSoon: true,
        workspaceId: '102',
        sourceUrl: 'https://www.jasoseol.com/'
    },
    {
        id: '104',
        companyName: 'KakaoPay',
        positionTitle: 'Server Developer',
        status: 'NOT_STARTED',
        statusLabel: '지원 전',
        deadlineLabel: '2026.06.12',
        deadlineDate: '2026-06-12',
        deadlineSoon: true,
        workspaceId: '105',
        sourceUrl: 'https://www.jasoseol.com/'
    },
    {
        id: '106',
        companyName: 'Line',
        positionTitle: 'Frontend Engineer',
        status: 'NOT_APPLIED',
        statusLabel: '미지원',
        deadlineLabel: '2026.06.20',
        deadlineDate: '2026-06-20',
        deadlineSoon: false,
        workspaceId: '108',
        sourceUrl: 'https://www.jasoseol.com/'
    }
];

const defaultDashboardResponse = {
    summary: {
        totalApplications: 3,
        inProgress: 1,
        notStarted: 1,
        deadlineSoon: 2
    },
    todayJobs: []
};

const defaultRecommendationJobs = [
    {
        id: 'r-1',
        companyName: 'Toss',
        positionTitle: 'Frontend Developer',
        deadlineLabel: 'D-3',
        companyLogoUrl: 'https://logo.clearbit.com/toss.im',
        workspaceId: null
    },
    {
        id: 'r-2',
        companyName: 'Danggeun',
        positionTitle: 'Server Engineer',
        deadlineLabel: 'D-5',
        companyLogoUrl: 'https://logo.clearbit.com/daangn.com',
        workspaceId: null
    },
    {
        id: 'r-3',
        companyName: 'Coupang',
        positionTitle: 'Platform Engineer',
        deadlineLabel: 'D-7',
        companyLogoUrl: 'https://logo.clearbit.com/coupang.com',
        workspaceId: null
    },
    {
        id: 'r-4',
        companyName: 'Woowa Bros',
        positionTitle: 'Product Engineer',
        deadlineLabel: 'D-9',
        companyLogoUrl: 'https://logo.clearbit.com/woowahan.com',
        workspaceId: null
    }
];

const makeRouter = () => createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/main', component: MainPage },
        { path: '/login', component: { template: '<div>login</div>' } },
        { path: '/basket', component: { template: '<div>basket</div>' } },
        { path: '/mypage', component: { template: '<div>mypage</div>' } },
        { path: '/workspaces/:workspaceId', component: { template: '<div>workspace</div>' } },
        { path: '/recommendations', component: { template: '<div>recommendations</div>' } },
        { path: '/document-profile', component: { template: '<div>document profile</div>' } },
        { path: '/mypage/notion', component: { template: '<div>notion</div>' } }
    ]
});

describe('MainPage', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.mocked(basketApi.listJobs).mockReset();
        vi.mocked(basketApi.listJobs).mockResolvedValue(defaultBasketJobs);
        vi.mocked(dashboardApi.getSummary).mockReset();
        vi.mocked(dashboardApi.getSummary).mockResolvedValue(defaultDashboardResponse);
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
        vi.mocked(recommendationApi.listJobs).mockReset();
        vi.mocked(recommendationApi.listJobs).mockResolvedValue(defaultRecommendationJobs);
        vi.mocked(recommendationApi.saveJob).mockReset();
    });

    it('DASH-001/MAIN-013: renders the wireframe dashboard without the left rail or top filters', async () => {
        localStorage.setItem('ezone.currentUser', JSON.stringify({
            id: 1,
            email: 'user@example.com',
            name: '홍길동',
            nickname: '길동',
            profileCompleted: true
        }));
        const wrapper = await mountMain();

        expect(wrapper.text()).not.toContain('오늘의 지원 흐름');
        expect(wrapper.text()).toContain('공고 장바구니');
        expect(wrapper.text()).toContain('추천공고');
        expect(wrapper.find('.dashboard-rail').exists()).toBe(false);
        expect(wrapper.find('.filter-bar').exists()).toBe(false);
        expect(wrapper.find('[data-testid="member-chip"]').exists()).toBe(false);
        expect(wrapper.text()).not.toContain('오늘 챙겨볼 공고');
        expect(wrapper.text()).not.toContain('이번 주 마감 공고');
        expect(wrapper.text()).not.toContain('진행 상황 요약');
        expect(wrapper.text()).not.toContain('마감 관리');
        expect(wrapper.text()).not.toContain('프로필 기반');

        const links = wrapper.findAll('a').map((link) => link.attributes('href'));
        expect(links).toContain('/basket');
        expect(links).toContain('/basket?sort=deadline');
        expect(links).not.toContain('/basket?status=IN_PROGRESS');
        expect(links).toContain('/workspaces/102');
    });

    it('MAIN-006/MAIN-007: fixes the main basket preview to nearest deadlines and marks recent workspaces', async () => {
        localStorage.setItem('ezone.recentWorkspaces', JSON.stringify(['102']));
        const wrapper = await mountMain();

        expect(wrapper.text()).toContain('마감 임박순으로 제공됩니다');
        const rows = wrapper.findAll('[data-testid="main-basket-preview-job"]');
        expect(rows).toHaveLength(3);
        expect(rows.map((row) => row.text())).toEqual([
            'NaverBackend Engineer진행 중2026.06.07최근 방문',
            'KakaoPayServer Developer지원 전2026.06.12',
            'LineFrontend Engineer미지원2026.06.20'
        ]);
    });

    it('REC-001/DASH-001: previews a few jobs from the recommendation page data', async () => {
        const wrapper = await mountMain();

        expect(recommendationApi.listJobs).toHaveBeenCalled();
        const cards = wrapper.findAll('[data-testid="main-recommendation-preview-job"]');
        expect(cards).toHaveLength(4);
        expect(cards.map((card) => card.text())).toEqual([
            'D-3TossFrontend Developer',
            'D-5DanggeunServer Engineer',
            'D-7CoupangPlatform Engineer',
            'D-9Woowa BrosProduct Engineer'
        ]);
        expect(wrapper.text()).not.toContain('지원 현황');
        expect(wrapper.text()).not.toContain('오늘 마감');
        expect(wrapper.text()).not.toContain('프로필 기반');
    });

    it('DASH-001: shows dummy-backed dashboard statistics from the API summary', async () => {
        const wrapper = await mountMain();

        expect(wrapper.get('[data-testid="metric-total"]').text()).toContain('3');
        expect(wrapper.get('[data-testid="metric-deadline"]').text()).toContain('2');
        expect(wrapper.get('[data-testid="metric-progress"]').text()).toContain('1');
        expect(wrapper.get('[data-testid="metric-not-started"]').text()).toContain('1');
        expect(wrapper.findAll('.main-metric-strip small')).toHaveLength(0);
    });

    it('ONB-001: opens onboarding as a floating modal only for first-login users', async () => {
        localStorage.setItem('ezone.currentUser', JSON.stringify({
            id: 1,
            email: 'first@example.com',
            name: 'First User',
            nickname: '',
            profileCompleted: false,
            onboardingRequired: true
        }));
        const wrapper = await mountMain();

        const modal = wrapper.get('[data-testid="onboarding-modal"]');
        expect(modal.text()).toContain('맞춤 공고 추천 정보 입력');
        expect(modal.text()).toContain('희망 직무');
        expect(modal.text()).toContain('보유 스킬');
        expect(wrapper.find('.onboarding-modal-backdrop').exists()).toBe(true);
        await wrapper.get('[data-testid="onboarding-skill-input"]').setValue('React');
        await wrapper.get('[data-testid="onboarding-skill-input"]').trigger('keyup.enter');
        await wrapper.get('[data-testid="save-onboarding"]').trigger('click');
        await flushPromises();
        expect(profileApi.saveUserProfile).toHaveBeenCalledWith(expect.objectContaining({
            desiredRoles: expect.arrayContaining(['프론트엔드']),
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
        expect(profileApi.getUserProfile).not.toHaveBeenCalled();
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
        expect(profileApi.getUserProfile).not.toHaveBeenCalled();
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

function flushPromises() {
    return new Promise((resolve) => setTimeout(resolve));
}
