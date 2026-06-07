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
    },
    {
        id: '107',
        companyName: 'Toss',
        positionTitle: 'Frontend Developer',
        status: 'SUBMITTED',
        statusLabel: '지원완료',
        deadlineLabel: '2026.06.25',
        deadlineDate: '2026-06-25',
        deadlineSoon: false,
        workspaceId: '109',
        sourceUrl: 'https://www.jasoseol.com/recruit/107'
    },
    {
        id: '108',
        companyName: 'Planet',
        positionTitle: 'Frontend Developer',
        status: 'NOT_STARTED',
        statusLabel: '지원 전',
        deadlineLabel: '2026.06.27',
        deadlineDate: '2026-06-27',
        deadlineSoon: false,
        workspaceId: '110',
        sourceUrl: 'https://www.jasoseol.com/recruit/108'
    },
    {
        id: '109',
        companyName: 'Overflow',
        positionTitle: 'Java Backend Engineer',
        status: 'IN_PROGRESS',
        statusLabel: '진행 중',
        deadlineLabel: '2026.06.30',
        deadlineDate: '2026-06-30',
        deadlineSoon: false,
        workspaceId: '111',
        sourceUrl: 'https://www.jasoseol.com/recruit/109'
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
        companyName: '우리은행',
        positionTitle: '일반 (하계 체험형)',
        deadlineLabel: '22시간 남음',
        deadlineDate: '2026-06-08',
        participantCount: 2135,
        companyLogoUrl: 'https://www.google.com/s2/favicons?domain=wooribank.com&sz=128',
        workspaceId: null
    },
    {
        id: 'r-2',
        companyName: 'SK하이닉스',
        positionTitle: '청년 Hy-Five 15기',
        deadlineLabel: '4일 남음',
        deadlineDate: '2026-06-11',
        participantCount: 485,
        companyLogoUrl: 'https://www.google.com/s2/favicons?domain=skhynix.com&sz=128',
        workspaceId: null
    },
    {
        id: 'r-3',
        companyName: '손해보험협회',
        positionTitle: '일반사무',
        deadlineLabel: '8시간 남음',
        deadlineDate: '2026-06-08',
        participantCount: 544,
        companyLogoUrl: 'https://www.google.com/s2/favicons?domain=knia.or.kr&sz=128',
        workspaceId: null
    },
    {
        id: 'r-4',
        companyName: '아이마켓코리아',
        positionTitle: '경영지원',
        deadlineLabel: '8시간 남음',
        deadlineDate: '2026-06-08',
        participantCount: 488,
        companyLogoUrl: 'https://www.google.com/s2/favicons?domain=imarketkorea.com&sz=128',
        workspaceId: null
    },
    {
        id: 'r-5',
        companyName: '롯데그룹',
        positionTitle: '[롯데월드] HR',
        deadlineLabel: '8일 남음',
        deadlineDate: '2026-06-15',
        participantCount: 1485,
        companyLogoUrl: 'https://www.google.com/s2/favicons?domain=lotte.co.kr&sz=128',
        workspaceId: null
    },
    {
        id: 'r-6',
        companyName: '홍익대학교',
        positionTitle: '일반행정 사무직(8급)',
        deadlineLabel: '8시간 남음',
        deadlineDate: '2026-06-08',
        participantCount: 150,
        companyLogoUrl: 'https://www.google.com/s2/favicons?domain=hongik.ac.kr&sz=128',
        workspaceId: null
    },
    {
        id: 'r-7',
        companyName: '인천공항시설관리',
        positionTitle: '정규직(신입)_경영지원',
        deadlineLabel: '2일 남음',
        deadlineDate: '2026-06-09',
        participantCount: 362,
        companyLogoUrl: 'https://www.google.com/s2/favicons?domain=airportfc.co.kr&sz=128',
        workspaceId: null
    },
    {
        id: 'r-8',
        companyName: '국가보안기술연구소',
        positionTitle: '행정직',
        deadlineLabel: '10일 남음',
        deadlineDate: '2026-06-17',
        participantCount: 194,
        companyLogoUrl: 'https://www.google.com/s2/favicons?domain=nsr.re.kr&sz=128',
        workspaceId: null
    },
    {
        id: 'r-no-logo',
        companyName: '로고없는회사',
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
        vi.mocked(recommendationApi.saveJob).mockResolvedValue({
            basketJobId: 'r-1',
            workspaceId: '201',
            companyName: '우리은행',
            positionTitle: '일반 (하계 체험형)'
        });
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

        expect(wrapper.get('.main-basket-title-row').text()).toBe('공고 장바구니마감 임박순으로 제공됩니다.');
        expect(wrapper.findAll('.main-basket-head span').map((cell) => cell.text())).toEqual([
            '회사명',
            '직무',
            '상태',
            '마감일',
            '지원',
            '최근 작업'
        ]);
        const rows = wrapper.findAll('[data-testid="main-basket-preview-job"]');
        expect(rows).toHaveLength(5);
        expect(rows.map((row) => row.get('[data-testid="main-basket-company"]').text())).toEqual([
            'Naver',
            'KakaoPay',
            'Line',
            'Toss',
            'Planet'
        ]);
        expect(wrapper.text()).not.toContain('Overflow');
        expect(rows.map((row) => row.get('[data-testid="main-basket-status"]').classes())).toEqual([
            expect.arrayContaining(['status-tag', 'status-in-progress']),
            expect.arrayContaining(['status-tag', 'status-not-started']),
            expect.arrayContaining(['status-tag', 'status-not-applied']),
            expect.arrayContaining(['status-tag', 'status-submitted']),
            expect.arrayContaining(['status-tag', 'status-not-started'])
        ]);
        expect(rows[0].get('[data-testid="main-basket-apply-link"]').attributes('href')).toBe('https://www.jasoseol.com/');
        expect(rows[0].get('[data-testid="main-basket-apply-link"]').attributes('target')).toBe('_blank');
        expect(rows[0].text()).toContain('최근 작업');
        expect(wrapper.text()).not.toContain('최근 방문');
    });

    it('REC-001/DASH-001/JOB-005: renders eight logo-backed recommendation jobs and saves from main', async () => {
        const wrapper = await mountMain();

        expect(recommendationApi.listJobs).toHaveBeenCalled();
        const cards = wrapper.findAll('[data-testid="main-recommendation-preview-job"]');
        expect(cards).toHaveLength(8);
        expect(cards.map((card) => card.text())).toEqual([
            '우리은행일반 (하계 체험형)22시간 남음 · 2135명 작성  담기',
            'SK하이닉스청년 Hy-Five 15기4일 남음 · 485명 작성  담기',
            '손해보험협회일반사무8시간 남음 · 544명 작성  담기',
            '아이마켓코리아경영지원8시간 남음 · 488명 작성  담기',
            '롯데그룹[롯데월드] HR8일 남음 · 1485명 작성  담기',
            '홍익대학교일반행정 사무직(8급)8시간 남음 · 150명 작성  담기',
            '인천공항시설관리정규직(신입)_경영지원2일 남음 · 362명 작성  담기',
            '국가보안기술연구소행정직10일 남음 · 194명 작성  담기'
        ]);
        expect(wrapper.text()).not.toContain('상시');
        expect(wrapper.text()).not.toContain('로고없는회사');
        expect(wrapper.findAll('[data-testid="main-recommendation-logo"]')).toHaveLength(8);

        await wrapper.get('[data-testid="main-save-recommendation-r-1"]').trigger('click');
        await flushPromises();
        expect(recommendationApi.saveJob).toHaveBeenCalledWith('r-1');
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
            profileCompleted: false
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
