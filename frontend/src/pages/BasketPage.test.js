import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { describe, expect, it, vi } from 'vitest';
import BasketPage from './BasketPage.vue';

const mocks = vi.hoisted(() => ({
    listJobs: vi.fn(),
    createJob: vi.fn(),
    updateStatus: vi.fn(),
    archiveJob: vi.fn()
}));

vi.mock('@/features/basket/api/basketApi', () => ({
    basketApi: {
        listJobs: mocks.listJobs,
        createJob: mocks.createJob,
        updateStatus: mocks.updateStatus,
        archiveJob: mocks.archiveJob
    }
}));

const makeRouter = () => createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/basket', component: BasketPage },
        { path: '/basket/:basketJobId', component: { template: '<div>basket detail</div>' } },
        { path: '/', component: { template: '<div>main</div>' } },
        { path: '/main', component: { template: '<div>main</div>' } },
        { path: '/mypage', component: { template: '<div>my page</div>' } },
        { path: '/workspaces/:workspaceId', component: { template: '<div>workspace</div>' } },
        { path: '/recommendations', component: { template: '<div>recommendations</div>' } },
        { path: '/document-profile', component: { template: '<div>document profile</div>' } },
        { path: '/mypage/notion', component: { template: '<div>notion</div>' } }
    ]
});

const defaultJobs = [
    {
        id: '101',
        companyName: 'Naver',
        positionTitle: 'Backend Engineer',
        status: 'IN_PROGRESS',
        statusLabel: '진행 중',
        deadlineLabel: '2026.06.11',
        deadlineDate: '2026-06-11',
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
        deadlineLabel: '2026.06.20',
        deadlineDate: '2026-06-20',
        deadlineSoon: true,
        workspaceId: '105',
        sourceUrl: 'https://www.jasoseol.com/'
    },
    {
        id: '106',
        companyName: 'Overdue Inc',
        positionTitle: 'Platform Engineer',
        status: 'NOT_APPLIED',
        statusLabel: '미지원',
        deadlineLabel: '2026.06.01',
        deadlineDate: '2026-06-01',
        deadlineSoon: false,
        workspaceId: '107',
        sourceUrl: 'https://www.jasoseol.com/'
    }
];

describe('BasketPage', () => {
    beforeEach(() => {
        localStorage.clear();
        mocks.listJobs.mockReset();
        mocks.createJob.mockReset();
        mocks.updateStatus.mockReset();
        mocks.archiveJob.mockReset();
        vi.stubGlobal('confirm', vi.fn(() => true));
        mocks.listJobs.mockResolvedValue(defaultJobs);
        mocks.createJob.mockResolvedValue({
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
        mocks.updateStatus.mockResolvedValue({
            ...defaultJobs[0],
            status: 'SUBMITTED',
            statusLabel: '지원완료'
        });
        mocks.archiveJob.mockResolvedValue(undefined);
    });

    it('JOB-005/JOB-014: keeps dashboard metrics, moves the job calendar above the basket table, and removes weekly/manual panels', async () => {
        const wrapper = await mountBasket('/basket?sort=deadline');

        expect(wrapper.find('img[alt="EZ-ONE"]').exists()).toBe(true);
        expect(wrapper.get('[data-testid="metric-all"]').text()).toContain('3');
        expect(wrapper.get('[data-testid="metric-progress"]').text()).toContain('1');
        expect(wrapper.get('[data-testid="metric-not-started"]').text()).toContain('1');
        expect(wrapper.get('[data-testid="metric-deadline"]').text()).toContain('2');
        expect(wrapper.find('[data-testid="manual-create"]').exists()).toBe(false);
        expect(wrapper.text()).not.toContain('주간 일정');
        expect(wrapper.text()).toContain('공고 캘린더');

        const calendarIndex = wrapper.html().indexOf('data-testid="basket-calendar"');
        const listIndex = wrapper.html().indexOf('data-testid="basket-list-panel"');
        expect(calendarIndex).toBeGreaterThan(-1);
        expect(listIndex).toBeGreaterThan(calendarIndex);
        const disclaimer = wrapper.get('[data-testid="basket-trademark-disclaimer"]');
        expect(disclaimer.text()).toContain('채용공고 식별 목적');
        expect(disclaimer.text()).toContain('제휴 또는 후원');
    });

    it('JOB-014: renders only saved job deadlines on the calendar with company, position, status, and workspace links', async () => {
        const wrapper = await mountBasket('/basket?sort=deadline');

        const calendarJobs = wrapper.findAll('[data-testid="calendar-job"]');
        expect(calendarJobs).toHaveLength(3);
        expect(calendarJobs.map((job) => job.text())).toEqual([
            'Overdue IncPlatform Engineer미지원',
            'NaverBackend Engineer진행 중',
            'KakaoPayServer Developer지원 전'
        ]);
        expect(calendarJobs.map((job) => job.attributes('href'))).toEqual([
            '/workspaces/107',
            '/workspaces/102',
            '/workspaces/105'
        ]);
    });

    it('JOB-005/JOB-012: filters jobs and switches between deadline and saved order', async () => {
        const deadlineWrapper = await mountBasket('/basket?sort=deadline');
        expect(deadlineWrapper.get('[data-testid="basket-sort-deadline"]').classes()).toContain('active');
        expect(rowCompanies(deadlineWrapper)).toEqual(['Overdue Inc', 'Naver', 'KakaoPay']);

        const savedWrapper = await mountBasket('/basket?sort=saved');
        expect(savedWrapper.get('[data-testid="basket-sort-saved"]').classes()).toContain('active');
        expect(rowCompanies(savedWrapper)).toEqual(['Naver', 'KakaoPay', 'Overdue Inc']);

        await savedWrapper.get('[data-testid="basket-search"]').setValue('server');
        expect(rowCompanies(savedWrapper)).toEqual(['KakaoPay']);
    });

    it('JOB-004/JOB-010/JOB-008: creates jobs from the inline table row, updates status, and archives jobs', async () => {
        const wrapper = await mountBasket('/basket');

        await wrapper.get('[data-testid="inline-company"]').setValue('Line');
        await wrapper.get('[data-testid="inline-position"]').setValue('Frontend Engineer');
        await wrapper.get('[data-testid="inline-deadline"]').setValue('2026.06.28');
        await wrapper.get('[data-testid="inline-source"]').setValue('https://www.jasoseol.com/');
        await wrapper.get('[data-testid="inline-create-row"]').trigger('submit');
        await flushPromises();

        expect(mocks.createJob).toHaveBeenCalledWith({
            companyName: 'Line',
            positionTitle: 'Frontend Engineer',
            deadlineLabel: '2026.06.28',
            sourceUrl: 'https://www.jasoseol.com/',
            savedSource: 'MANUAL'
        });
        expect(wrapper.text()).toContain('Line');

        await wrapper.get('[data-testid="status-101"]').setValue('SUBMITTED');
        await flushPromises();
        expect(mocks.updateStatus).toHaveBeenCalledWith('101', 'SUBMITTED');
        expect(wrapper.text()).toContain('지원완료');

        await wrapper.get('[data-testid="archive-101"]').trigger('click');
        await flushPromises();
        expect(mocks.archiveJob).toHaveBeenCalledWith('101');
        expect(wrapper.text()).not.toContain('Naver');
    });

    it('JOB-014: filters overdue basket jobs', async () => {
        const wrapper = await mountBasket('/basket?overdue=true');

        expect(wrapper.get('[data-testid="basket-filter-overdue"]').classes()).toContain('active');
        expect(rowCompanies(wrapper)).toEqual(['Overdue Inc']);
    });

    it('COMMON-001: paginates basket jobs after filtering and sorting', async () => {
        mocks.listJobs.mockResolvedValue(Array.from({ length: 13 }, (_, index) => ({
            id: String(300 + index),
            companyName: `Company ${index + 1}`,
            positionTitle: 'Backend Engineer',
            status: 'NOT_STARTED',
            statusLabel: '지원 전',
            deadlineLabel: `D-${index + 1}`,
            deadlineDate: '2026-06-20',
            deadlineSoon: index < 3,
            workspaceId: String(400 + index),
            sourceUrl: 'https://www.jasoseol.com/'
        })));
        const wrapper = await mountBasket('/basket?sort=saved');

        expect(rowCompanies(wrapper)).toContain('Company 1');
        expect(rowCompanies(wrapper)).toContain('Company 10');
        expect(rowCompanies(wrapper)).not.toContain('Company 11');
        expect(wrapper.get('[data-testid="basket-page-status"]').text()).toContain('1 / 2');
        await wrapper.get('[data-testid="basket-page-next"]').trigger('click');
        await flushPromises();
        expect(rowCompanies(wrapper)).not.toContain('Company 1');
        expect(rowCompanies(wrapper)).toContain('Company 11');
        expect(rowCompanies(wrapper)).toContain('Company 13');
        expect(wrapper.get('[data-testid="basket-page-status"]').text()).toContain('2 / 2');
    });
});

async function mountBasket(path) {
    const router = makeRouter();
    router.push(path);
    await router.isReady();
    const wrapper = mount(BasketPage, {
        global: {
            plugins: [createPinia(), router]
        }
    });
    await flushPromises();
    return wrapper;
}

function rowCompanies(wrapper) {
    return wrapper.findAll('[data-testid="basket-job-row"] [data-testid="basket-row-company"]')
        .map((company) => company.text());
}

function flushPromises() {
    return new Promise((resolve) => setTimeout(resolve));
}
