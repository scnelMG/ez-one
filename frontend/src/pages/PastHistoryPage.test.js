import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { describe, expect, it, vi } from 'vitest';
import PastHistoryPage from './PastHistoryPage.vue';

const mocks = vi.hoisted(() => ({
    listApplications: vi.fn()
}));

vi.mock('@/features/history/api/historyApi', () => ({
    historyApi: {
        listApplications: mocks.listApplications
    }
}));

const historyFixture = {
    periods: [
        { value: 'ALL', label: 'All' },
        { value: '2026-H1', label: '2026 H1' },
        { value: '2025-H2', label: '2025 H2' },
        { value: '2025-H1', label: '2025 H1' }
    ],
    summary: {
        total: 194,
        completed: 0,
        notApplied: 109,
        inProgress: 6,
        ready: 0,
        documentFailed: 68,
        testFailed: 9,
        interviewFailed: 2
    },
    companyTypes: [
        { type: 'Enterprise', count: 52 },
        { type: 'Public/Finance', count: 41 },
        { type: 'Startup', count: 24 }
    ],
    rows: [
        {
            id: '1',
            workspaceId: '102',
            companyName: 'Dalpha',
            positionTitle: 'AI Engineer',
            applicationStatus: 'NOT_APPLIED',
            resultStage: 'DOCUMENT_FAILED',
            resultLabel: 'Document stage ended',
            rawResult: 'Document failed',
            deadlineLabel: '2025.03.23',
            sourceUrl: 'https://example.com/dalpha',
            companyType: 'Startup'
        },
        {
            id: '2',
            workspaceId: '103',
            companyName: 'Nexon Korea',
            positionTitle: 'Data Analyst',
            applicationStatus: 'NOT_APPLIED',
            resultStage: 'NOT_APPLIED',
            resultLabel: 'Not applied',
            rawResult: 'Not applied',
            deadlineLabel: 'No deadline',
            sourceUrl: 'https://example.com/nexon',
            companyType: 'Enterprise'
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
        { path: '/recommendations', component: { template: '<div>recommendations</div>' } },
        { path: '/mypage', component: { template: '<div>my page</div>' } },
        { path: '/mypage/notion', component: { template: '<div>notion</div>' } },
        { path: '/mypage/onboarding', component: { template: '<div>onboarding</div>' } },
        { path: '/mypage/terms', component: { template: '<div>terms</div>' } }
    ]
});

describe('PastHistoryPage', () => {
    beforeEach(() => {
        mocks.listApplications.mockReset();
        mocks.listApplications.mockResolvedValue(historyFixture);
    });

    it('HISTORY-003/HISTORY-006/HISTORY-008: renders imported application history dashboard and table', async () => {
        const wrapper = await mountHistory('/history');

        expect(mocks.listApplications).toHaveBeenCalledWith({ period: 'ALL', resultStage: undefined });
        expect(wrapper.get('[data-testid="history-period-select"]').text()).toContain('2026 H1');
        expect(wrapper.get('[data-testid="metric-total"]').text()).toContain('194');
        expect(wrapper.get('[data-testid="metric-document"]').text()).toContain('68');
        expect(wrapper.get('[data-testid="metric-missing"]').text()).toContain('109');
        expect(wrapper.get('[data-testid="company-type-chart"]').text()).toContain('Enterprise');
        expect(rowCompanies(wrapper)).toEqual(['Dalpha', 'Nexon Korea']);
    });

    it('HISTORY-004: reloads the page data when a half-year period is selected', async () => {
        const wrapper = await mountHistory('/history');

        await wrapper.get('[data-testid="history-period-select"]').setValue('2026-H1');
        await flushPromises();

        expect(mocks.listApplications).toHaveBeenLastCalledWith({ period: '2026-H1', resultStage: undefined });
    });

    it('HISTORY-001: links each past application row to the matching workspace', async () => {
        const wrapper = await mountHistory('/history');

        const firstRow = wrapper.get('[data-testid="history-row"]');
        expect(firstRow.attributes('href')).toBe('/workspaces/102');
        expect(firstRow.text()).toContain('Dalpha');
        expect(firstRow.text()).toContain('Document failed');
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
