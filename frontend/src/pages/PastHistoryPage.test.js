import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PastHistoryPage from './PastHistoryPage.vue';
import { statusLabel } from '@/shared/utils/jobUtils';

const mocks = vi.hoisted(() => ({
    listApplications: vi.fn()
}));

vi.mock('@/features/history/api/historyApi', () => ({
    historyApi: {
        listApplications: mocks.listApplications
    }
}));

vi.mock('@/features/profile/api/profileApi', () => ({
    profileApi: {
        getUserProfile: vi.fn().mockResolvedValue({
            desiredRoles: [],
            companyTypes: [],
            industries: [],
            regions: [],
            skills: [],
            ssafy: false,
            completed: true
        }),
        saveUserProfile: vi.fn()
    }
}));

const historyFixture = {
    periods: [
        { value: 'ALL', label: '전체' },
        { value: '2026-H1', label: '2026 상반기' },
        { value: '2025-H2', label: '2025 하반기' },
        { value: '2025-H1', label: '2025 상반기' }
    ],
    summary: {
        total: 194,
        completed: 79,
        notApplied: 109,
        inProgress: 6,
        ready: 0,
        documentFailed: 68,
        testFailed: 9,
        interviewFailed: 2
    },
    companyTypes: [
        { type: '스타트업', count: 24 },
        { type: '대기업', count: 52 },
        { type: '공공기관', count: 41 }
    ],
    rows: [
        {
            id: '1',
            workspaceId: '102',
            companyName: '달파',
            positionTitle: 'AI Engineer',
            applicationStatus: 'COMPLETED',
            resultStage: 'DOCUMENT_FAILED',
            resultLabel: '서류 단계 종료',
            rawResult: '서류탈락',
            deadlineLabel: '2025.03.23',
            sourceUrl: 'https://example.com/dalpha',
            companyLogoUrl: 'https://logo.example.com/dalpha.png',
            companyType: '스타트업'
        },
        {
            id: '2',
            workspaceId: '103',
            companyName: '넥슨코리아',
            positionTitle: '데이터 분석가',
            applicationStatus: 'NOT_APPLIED',
            resultStage: 'NOT_APPLIED',
            resultLabel: '미지원',
            rawResult: '미지원',
            deadlineLabel: '마감일 미기록',
            sourceUrl: 'https://example.com/nexon',
            companyType: '대기업'
        },
        {
            id: '3',
            workspaceId: '104',
            companyName: '한국전력공사',
            positionTitle: '데이터 엔지니어',
            applicationStatus: 'IN_PROGRESS',
            resultStage: 'IN_PROGRESS',
            resultLabel: '진행 중',
            rawResult: '진행중',
            deadlineLabel: '2026.02.01',
            sourceUrl: 'https://example.com/kepco',
            companyType: '공공기관'
        }
    ]
};

const makeRouter = () => createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/history', component: PastHistoryPage },
        { path: '/', component: { template: '<div>main</div>' } },
        { path: '/basket', component: { template: '<div>basket</div>' } },
        { path: '/document-profile', component: { template: '<div>document profile</div>' } },
        { path: '/study', component: { template: '<div>study</div>' } },
        { path: '/workspaces/:workspaceId', component: { template: '<div>workspace</div>' } },
        { path: '/mypage', component: { template: '<div>my page</div>' } },
        { path: '/mypage/notion', component: { template: '<div>notion</div>' } },
        { path: '/mypage/onboarding', component: { template: '<div>onboarding</div>' } },
        { path: '/mypage/terms', component: { template: '<div>terms</div>' } }
    ]
});

describe('PastHistoryPage', () => {
    beforeEach(() => {
        localStorage.clear();
        mocks.listApplications.mockReset();
        mocks.listApplications.mockResolvedValue(historyFixture);
    });

    it('HISTORY-003/HISTORY-006: renders past history as a basket-connected job list', async () => {
        const wrapper = await mountHistory('/history');

        expect(mocks.listApplications).toHaveBeenCalledWith({ period: 'ALL' });
        expect(wrapper.get('[data-testid="history-period-select"]').text()).toContain('2026 상반기');
        expect(wrapper.get('[data-testid="metric-total"]').text()).toContain('194');
        expect(wrapper.get('[data-testid="metric-ready"]').text()).toContain('0');
        expect(wrapper.get('[data-testid="metric-not-applied"]').text()).toContain('109');
        expect(wrapper.get('[data-testid="metric-in-progress"]').text()).toContain('6');
        expect(wrapper.get('[data-testid="metric-completed"]').text()).toContain('79');
        expect(wrapper.findAll('.history-summary .history-metric span').map((metric) => metric.text())).toEqual([
            '전체 공고',
            '지원전',
            '진행 중',
            '지원완료',
            '미지원'
        ]);
        expect(wrapper.findAll('.filter-bar .filter-chip').map((chip) => chip.text())).toEqual([
            '전체',
            '지원전',
            '진행 중',
            '지원완료',
            '미지원'
        ]);
        expect(wrapper.find('[data-testid="history-result-label-filter"]').exists()).toBe(false);
        expect(rowCompanies(wrapper)).toEqual(['달파', '넥슨코리아', '한국전력공사']);
    });

    it('HISTORY-006/HISTORY-008: shows readable charts without mixing raw CSV labels into row status', async () => {
        const wrapper = await mountHistory('/history');

        expect(wrapper.get('[data-testid="history-insight-dashboard"]').exists()).toBe(true);
        expect(wrapper.get('[data-testid="history-execution-rate"]').text()).toContain('44%');
        expect(wrapper.get('[data-testid="history-status-stack"]').text()).toContain('지원완료 79');
        expect(wrapper.get('[data-testid="history-status-stack"]').text()).toContain('미지원 109');
        expect(wrapper.get('[data-testid="history-stage-chart"]').text()).toContain('결과');
        expect(wrapper.get('[data-testid="history-stage-chart"]').text()).toContain('서류 탈락');
        expect(wrapper.get('[data-testid="history-stage-chart"]').text()).toContain('필기 탈락');
        expect(wrapper.get('[data-testid="history-stage-chart"]').text()).toContain('면접 탈락');
        expect(wrapper.get('[data-testid="history-stage-chart"]').text()).toContain('68');
        expect(wrapper.get('[data-testid="history-company-chart"]').text()).toContain('스타트업');
        expect(wrapper.get('[data-testid="history-company-chart"]').text()).toContain('대기업');
        expect(wrapper.get('[data-testid="history-action-insight"]').text()).toContain('지원완료+진행 중 / 전체');
        expect(wrapper.get('[data-testid="history-action-insight"]').text()).not.toContain('가장 많이 멈췄어요');
        expect(wrapper.get('[data-testid="history-status-stack"]').text()).not.toContain('장바구니와 같은 라벨');
        expect(wrapper.get('[data-testid="history-stage-chart"]').text()).not.toContain('회고용 지표');
        expect(wrapper.get('[data-testid="history-company-chart"]').text()).not.toContain('상위 4개');
        expect(wrapper.text()).toContain('서류 탈락');
        expect(wrapper.text()).not.toContain('서류탈락');
    });

    it('HISTORY-004: reloads the page data when a half-year period is selected', async () => {
        const wrapper = await mountHistory('/history');

        await wrapper.get('[data-testid="history-period-select"]').setValue('2026-H1');
        await flushPromises();

        expect(mocks.listApplications).toHaveBeenLastCalledWith({ period: '2026-H1' });
    });

    it('HISTORY-001: keeps workspace navigation and the original posting as separate links', async () => {
        const wrapper = await mountHistory('/history');

        expect(wrapper.findAll('.history-table-head span').map((cell) => cell.text())).toEqual([
            '회사명',
            '직무',
            '상태',
            '지원 결과',
            '마감일',
            '채용 사이트 링크'
        ]);
        const firstRow = wrapper.get('[data-testid="history-row"]');
        expect(firstRow.text()).toContain('달파');
        expect(firstRow.text()).toContain(statusLabel('COMPLETED'));
        expect(firstRow.text()).toContain('서류 탈락');
        expect(firstRow.text()).not.toContain('서류 단계 종료');
        expect(firstRow.text()).not.toContain('서류탈락');
        expect(firstRow.element.children.length).toBe(wrapper.get('.history-table-head').element.children.length);
        expect(firstRow.get('.company-cell').attributes('href')).toBe('/workspaces/102');
        expect(firstRow.get('.company-logo-badge img').attributes('src')).toBe('https://logo.example.com/dalpha.png');
        expect(wrapper.get('[data-testid="history-source-1"]').attributes('href')).toBe('https://example.com/dalpha');
        expect(wrapper.get('[data-testid="history-source-1"]').text()).toBe('바로가기');
        expect(wrapper.find('[data-testid="history-workspace-1"]').exists()).toBe(false);
    });

    it('filters the visible rows by search keyword without exposing raw result labels as searchable UI copy', async () => {
        const wrapper = await mountHistory('/history');

        await wrapper.get('[data-testid="history-search"]').setValue('전력');
        expect(rowCompanies(wrapper)).toEqual(['한국전력공사']);
        expect(wrapper.get('[data-testid="history-visible-count"]').text()).toContain('1건 표시');
        expect(wrapper.get('[data-testid="history-visible-count"]').text()).toContain('전체 194건');

        await wrapper.get('[data-testid="history-search"]').setValue('서류탈락');
        expect(rowCompanies(wrapper)).toEqual([]);

        await wrapper.get('[data-testid="history-reset-filters"]').trigger('click');
        expect(rowCompanies(wrapper)).toEqual(['달파', '넥슨코리아', '한국전력공사']);
    });

    it('filters by standard application status and sorts rows independently from search', async () => {
        const wrapper = await mountHistory('/history');

        await wrapper.get('[data-testid="history-status-filter"]').setValue('COMPLETED');
        expect(rowCompanies(wrapper)).toEqual(['달파']);

        await wrapper.get('[data-testid="history-reset-filters"]').trigger('click');
        await wrapper.get('[data-testid="history-sort-select"]').setValue('DEADLINE_DESC');
        expect(rowCompanies(wrapper)).toEqual(['한국전력공사', '달파', '넥슨코리아']);

        await wrapper.get('[data-testid="history-sort-select"]').setValue('DEADLINE_ASC');
        expect(rowCompanies(wrapper)).toEqual(['달파', '한국전력공사', '넥슨코리아']);

        await wrapper.get('[data-testid="history-sort-select"]').setValue('COMPANY_ASC');
        expect(rowCompanies(wrapper)).toEqual(['넥슨코리아', '달파', '한국전력공사']);
    });
});

async function mountHistory(path) {
    const router = makeRouter();
    router.push(path);
    await router.isReady();
    const wrapper = mount(PastHistoryPage, {
        global: {
            plugins: [createPinia(), router]
        }
    });
    await flushPromises();
    return wrapper;
}

function rowCompanies(wrapper) {
    return wrapper.findAll('[data-testid="history-row-company"]').map((company) => company.text());
}

function flushPromises() {
    return new Promise((resolve) => setTimeout(resolve));
}
