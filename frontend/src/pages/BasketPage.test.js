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
describe('BasketPage', () => {
    beforeEach(() => {
        mocks.listJobs.mockReset();
        mocks.createJob.mockReset();
        mocks.updateStatus.mockReset();
        mocks.archiveJob.mockReset();
        vi.stubGlobal('confirm', vi.fn(() => true));
        mocks.listJobs.mockResolvedValue([
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
        ]);
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
            id: '101',
            companyName: 'Naver',
            positionTitle: 'Backend Engineer',
            status: 'SUBMITTED',
            statusLabel: '지원완료',
            deadlineLabel: '2026.06.11',
            deadlineDate: '2026-06-11',
            deadlineSoon: true,
            workspaceId: '102',
            sourceUrl: 'https://www.jasoseol.com/'
        });
        mocks.archiveJob.mockResolvedValue(undefined);
    });
    it('JOB-005/JOB-012/JOB-014: renders basket jobs with filters, sorting, and workspace links', async () => {
        const router = makeRouter();
        router.push('/basket?status=IN_PROGRESS&sort=deadline');
        await router.isReady();
        const wrapper = mount(BasketPage, {
            global: {
                plugins: [createPinia(), router]
            }
        });
        await flushPromises();
        expect(mocks.listJobs).toHaveBeenCalledWith('IN_PROGRESS');
        expect(wrapper.find('img[alt="EZ One"]').exists()).toBe(true);
        expect(wrapper.text()).toContain('공고 장바구니');
        expect(wrapper.text()).toContain('Naver');
        expect(wrapper.text()).toContain('KakaoPay');
        expect(wrapper.get('[data-testid="basket-filter-IN_PROGRESS"]').classes()).toContain('active');
        const hrefs = wrapper.findAll('a').map((link) => link.attributes('href'));
        expect(hrefs).toContain('/workspaces/102');
        expect(hrefs).toContain('/workspaces/105');
    });
    it('JOB-004/JOB-010/JOB-008: creates jobs, updates status, and archives jobs', async () => {
        const router = makeRouter();
        router.push('/basket');
        await router.isReady();
        const wrapper = mount(BasketPage, {
            global: {
                plugins: [createPinia(), router]
            }
        });
        await flushPromises();
        await wrapper.get('[data-testid="manual-company"]').setValue('Line');
        await wrapper.get('[data-testid="manual-position"]').setValue('Frontend Engineer');
        await wrapper.get('[data-testid="manual-deadline"]').setValue('2026.06.28');
        await wrapper.get('[data-testid="manual-source"]').setValue('https://www.jasoseol.com/');
        await wrapper.get('[data-testid="manual-create"]').trigger('submit');
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
        await wrapper.get('[data-testid="status-104"]').setValue('NOT_APPLIED');
        await flushPromises();
        expect(mocks.updateStatus).toHaveBeenCalledWith('104', 'NOT_APPLIED');
        await wrapper.get('[data-testid="archive-101"]').trigger('click');
        await flushPromises();
        expect(mocks.archiveJob).toHaveBeenCalledWith('101');
        expect(wrapper.text()).not.toContain('Naver');
    });
    it('COMMON-002: filters basket jobs by company or position keyword', async () => {
        const router = makeRouter();
        router.push('/basket');
        await router.isReady();
        const wrapper = mount(BasketPage, {
            global: {
                plugins: [createPinia(), router]
            }
        });
        await flushPromises();
        expect(wrapper.text()).toContain('Naver');
        expect(wrapper.text()).toContain('KakaoPay');
        await wrapper.get('[data-testid="basket-search"]').setValue('server');
        expect(wrapper.text()).not.toContain('Naver');
        expect(wrapper.text()).toContain('KakaoPay');
        await wrapper.get('[data-testid="basket-search"]').setValue('naver');
        expect(wrapper.text()).toContain('Naver');
        expect(wrapper.text()).not.toContain('KakaoPay');
    });
    it('JOB-014: filters overdue basket jobs', async () => {
        const router = makeRouter();
        router.push('/basket?overdue=true');
        await router.isReady();
        const wrapper = mount(BasketPage, {
            global: {
                plugins: [createPinia(), router]
            }
        });
        await flushPromises();
        expect(wrapper.get('[data-testid="basket-filter-overdue"]').classes()).toContain('active');
        expect(wrapper.text()).toContain('Overdue Inc');
        expect(wrapper.text()).not.toContain('Naver');
        expect(wrapper.text()).not.toContain('KakaoPay');
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
        const router = makeRouter();
        router.push('/basket');
        await router.isReady();
        const wrapper = mount(BasketPage, {
            global: {
                plugins: [createPinia(), router]
            }
        });
        await flushPromises();
        const firstPageCompanies = wrapper.findAll('.basket-data-row strong').map((company) => company.text());
        expect(firstPageCompanies).toContain('Company 1');
        expect(firstPageCompanies).toContain('Company 10');
        expect(firstPageCompanies).not.toContain('Company 11');
        expect(wrapper.get('[data-testid="basket-page-status"]').text()).toContain('1 / 2');
        await wrapper.get('[data-testid="basket-page-next"]').trigger('click');
        await flushPromises();
        const secondPageCompanies = wrapper.findAll('.basket-data-row strong').map((company) => company.text());
        expect(secondPageCompanies).not.toContain('Company 1');
        expect(secondPageCompanies).toContain('Company 11');
        expect(secondPageCompanies).toContain('Company 13');
        expect(wrapper.get('[data-testid="basket-page-status"]').text()).toContain('2 / 2');
    });
});
function flushPromises() {
    return new Promise((resolve) => setTimeout(resolve));
}
