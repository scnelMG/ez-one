import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBasketStore } from './basketStore';
const mocks = vi.hoisted(() => ({
    listJobs: vi.fn(),
    createJob: vi.fn(),
    getJob: vi.fn(),
    updateJob: vi.fn(),
    updateStatus: vi.fn(),
    archiveJob: vi.fn()
}));
vi.mock('@/features/basket/api/basketApi', () => ({
    basketApi: {
        listJobs: mocks.listJobs,
        createJob: mocks.createJob,
        getJob: mocks.getJob,
        updateJob: mocks.updateJob,
        updateStatus: mocks.updateStatus,
        archiveJob: mocks.archiveJob
    }
}));
describe('basketStore', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 5, 7));
        setActivePinia(createPinia());
        mocks.listJobs.mockReset();
        mocks.createJob.mockReset();
        mocks.getJob.mockReset();
        mocks.updateJob.mockReset();
        mocks.updateStatus.mockReset();
        mocks.archiveJob.mockReset();
        mocks.listJobs.mockResolvedValue([
            {
                id: '101',
                companyName: 'Naver',
                positionTitle: 'Backend Engineer',
                status: 'IN_PROGRESS',
                statusLabel: '진행 중',
                deadlineLabel: '2026.06.11',
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
                deadlineLabel: '2026.06.13',
                deadlineSoon: true,
                workspaceId: '105',
                sourceUrl: 'https://www.jasoseol.com/'
            },
            {
                id: '107',
                companyName: 'Toss',
                positionTitle: 'Platform Engineer',
                status: 'SUBMITTED',
                statusLabel: '지원완료',
                deadlineLabel: '2026.06.20',
                deadlineSoon: false,
                workspaceId: '108',
                sourceUrl: 'https://www.jasoseol.com/'
            }
        ]);
    });
    afterEach(() => {
        vi.useRealTimers();
    });
    it('JOB-005/JOB-014: loads P1 basket jobs from the backend API contract', async () => {
        const store = useBasketStore();
        await store.loadJobs();
        expect(store.status).toBe('ready');
        expect(store.jobs).toHaveLength(3);
        expect(store.jobs[0]).toMatchObject({
            companyName: 'Naver',
            positionTitle: 'Backend Engineer',
            workspaceId: '102'
        });
        expect(store.deadlineSoonCount).toBe(2);
    });
    it('JOB-004/JOB-010/JOB-008: creates, updates, and archives jobs in local state', async () => {
        const store = useBasketStore();
        await store.loadJobs();
        mocks.createJob.mockResolvedValue({
            id: '201',
            companyName: 'Line',
            positionTitle: 'Frontend Engineer',
            status: 'NOT_STARTED',
            statusLabel: '지원 전',
            deadlineLabel: '2026.06.28',
            deadlineSoon: false,
            workspaceId: '202',
            sourceUrl: 'https://www.jasoseol.com/'
        });
        await store.createJob({
            companyName: 'Line',
            positionTitle: 'Frontend Engineer',
            deadlineLabel: '2026.06.28',
            sourceUrl: 'https://www.jasoseol.com/',
            savedSource: 'MANUAL'
        });
        expect(store.jobs[0].companyName).toBe('Line');
        mocks.updateStatus.mockResolvedValue({
            ...store.jobs[0],
            status: 'SUBMITTED',
            statusLabel: '지원완료'
        });
        await store.updateStatus('201', 'SUBMITTED');
        expect(store.jobs[0]).toMatchObject({ id: '201', status: 'SUBMITTED' });
        mocks.archiveJob.mockResolvedValue(undefined);
        await store.archiveJob('201');
        expect(store.jobs.some((job) => job.id === '201')).toBe(false);
    });
    it('JOB-006/JOB-007: loads detail and updates editable job fields', async () => {
        const store = useBasketStore();
        mocks.getJob.mockResolvedValue({
            id: '101',
            companyName: 'Naver',
            positionTitle: 'Backend Engineer',
            status: 'IN_PROGRESS',
            statusLabel: '진행 중',
            deadlineLabel: '2026.06.11',
            deadlineSoon: true,
            workspaceId: '102',
            sourceUrl: 'https://www.jasoseol.com/'
        });
        mocks.updateJob.mockResolvedValue({
            id: '101',
            companyName: 'Naver Cloud',
            positionTitle: 'Platform Engineer',
            status: 'IN_PROGRESS',
            statusLabel: '진행 중',
            deadlineLabel: '2026.07.01',
            deadlineSoon: false,
            workspaceId: '102',
            sourceUrl: 'https://www.jasoseol.com/jobs/101'
        });
        await store.loadJob('101');
        await store.updateJob('101', {
            companyName: 'Naver Cloud',
            positionTitle: 'Platform Engineer',
            deadlineLabel: '2026.07.01',
            sourceUrl: 'https://www.jasoseol.com/jobs/101'
        });
        expect(store.activeJob).toMatchObject({
            id: '101',
            companyName: 'Naver Cloud',
            positionTitle: 'Platform Engineer'
        });
    });
    it('COMMON-007: preserves API failure reasons when creating a job fails', async () => {
        const store = useBasketStore();
        mocks.createJob.mockRejectedValue(new Error('채용공고 URL 형식을 확인해 주세요.'));
        await store.createJob({
            companyName: 'Invalid URL Company',
            positionTitle: 'Backend Engineer',
            deadlineLabel: 'D-3',
            sourceUrl: 'not-a-url',
            savedSource: 'MANUAL'
        });
        expect(store.status).toBe('error');
        expect(store.errorMessage).toBe('채용공고 URL 형식을 확인해 주세요.');
    });
});
