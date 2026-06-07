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

const basketJobs = [
    job('101', 'Naver', 'Backend Engineer', 'IN_PROGRESS', '진행중', '2026.06.08', '102'),
    job('104', 'KakaoPay', 'Server Developer', 'NOT_STARTED', '지원 전', '2026.06.12', '105'),
    job('106', 'Line', 'Frontend Engineer', 'NOT_APPLIED', '미지원', '2026.06.20', '108'),
    job('107', 'Toss', 'Frontend Developer', 'SUBMITTED', '지원완료', '2026.06.25', '109'),
    job('108', 'Planet', 'Frontend Developer', 'NOT_STARTED', '지원 전', '2026.06.27', '110'),
    job('109', 'Overflow', 'Java Backend Engineer', 'IN_PROGRESS', '진행중', '2026.06.30', '111')
];

const recommendationJobs = [
    recommendation('r-1', '우리은행', '일반 (하계 체험형)', '2026-06-08', '22시간 남음', 'wooribank.com', 2135),
    recommendation('r-2', 'SK하이닉스', '청년 Hy-Five 15기', '2026-06-11', '4일 남음', 'skhynix.com', 485),
    recommendation('r-3', '손해보험협회', '일반사무', '2026-06-08', '8시간 남음', 'knia.or.kr', 544),
    recommendation('r-4', '아이마켓코리아', '경영지원', '2026-06-08', '8시간 남음', 'imarketkorea.com', 488),
    recommendation('r-5', '롯데그룹', '[롯데월드] HR', '2026-06-15', '8일 남음', 'lotte.co.kr', 1485),
    {
        id: 'r-always',
        companyName: '상시회사',
        positionTitle: '상시 채용',
        deadlineLabel: '상시',
        deadlineDate: null,
        participantCount: 0,
        companyLogoUrl: '',
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
        { path: '/mypage/notion', component: { template: '<div>notion</div>' } },
        { path: '/mypage/terms', component: { template: '<div>terms</div>' } }
    ]
});

describe('MainPage', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.mocked(basketApi.listJobs).mockReset();
        vi.mocked(basketApi.listJobs).mockResolvedValue(basketJobs);
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
        vi.mocked(recommendationApi.listJobs).mockResolvedValue(recommendationJobs);
        vi.mocked(recommendationApi.saveJob).mockReset();
        vi.mocked(recommendationApi.saveJob).mockResolvedValue({
            basketJobId: 'r-1',
            workspaceId: '201',
            companyName: '우리은행',
            positionTitle: '일반 (하계 체험형)'
        });
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
        expect(wrapper.text()).toContain('추천 공고');
        expect(wrapper.find('.dashboard-rail').exists()).toBe(false);
        expect(wrapper.find('.filter-bar').exists()).toBe(false);
        expect(wrapper.find('[data-testid="member-chip"]').exists()).toBe(false);
    });

    it('uses basket page columns and renders recent work as a row label', async () => {
        localStorage.setItem('ezone.recentWorkspaces', JSON.stringify(['102']));
        const wrapper = await mountMain();

        expect(wrapper.get('.main-basket-title-row').text()).toBe('공고 장바구니마감 임박순으로 제공됩니다.');
        expect(wrapper.findAll('.main-basket-head span').map((cell) => cell.text())).toEqual([
            '회사명',
            '직무',
            '상태',
            '마감일',
            '채용 사이트 링크'
        ]);
        const rows = wrapper.findAll('[data-testid="main-basket-preview-job"]');
        expect(rows).toHaveLength(5);
        expect(rows[0].get('[data-testid="main-basket-company"]').text()).toContain('Naver');
        expect(rows[0].get('[data-testid="main-basket-company"]').text()).toContain('최근 작업');
        expect(rows[0].get('[data-testid="main-basket-apply-link"]').text()).toBe('바로가기');
        expect(wrapper.findAll('.main-basket-head span').map((cell) => cell.text())).not.toContain('최근 작업');
    });

    it('renders four recommendation page preview cards and saves from main', async () => {
        const wrapper = await mountMain();

        expect(recommendationApi.listJobs).toHaveBeenCalled();
        const cards = wrapper.findAll('[data-testid="main-recommendation-preview-job"]');
        expect(cards).toHaveLength(4);
        expect(cards[0].text()).toContain('우리은행');
        expect(cards[0].text()).toContain('담기');
        expect(cards[0].text()).toContain('명 작성');
        expect(wrapper.text()).not.toContain('상시회사');
        expect(wrapper.findAll('[data-testid="main-recommendation-logo"]')).toHaveLength(4);

        await wrapper.get('[data-testid="main-save-recommendation-r-1"]').trigger('click');
        await flushPromises();
        expect(recommendationApi.saveJob).toHaveBeenCalledWith('r-1');
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

function recommendation(id, companyName, positionTitle, deadlineDate, deadlineLabel, domain, participantCount) {
    return {
        id,
        companyName,
        positionTitle,
        deadlineLabel,
        deadlineDate,
        participantCount,
        companyLogoUrl: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
        workspaceId: null
    };
}

function flushPromises() {
    return new Promise((resolve) => setTimeout(resolve));
}
