import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { basketApi } from '@/features/basket/api/basketApi';
import { messageFromError } from '@/shared/errorMessage';
export const useBasketStore = defineStore('basket', () => {
    const status = ref('idle');
    const jobs = ref([]);
    const activeJob = ref(null);
    const errorMessage = ref('');
    const hasJobs = computed(() => jobs.value.length > 0);
    const deadlineSoonCount = computed(() => jobs.value.filter(isDeadlineWithinWeek).length);
    async function loadJobs(filterStatus) {
        status.value = 'loading';
        errorMessage.value = '';
        try {
            jobs.value = await basketApi.listJobs(filterStatus);
            status.value = 'ready';
        }
        catch (error) {
            status.value = 'error';
            errorMessage.value = messageFromError(error, '공고함을 불러오지 못했습니다.');
        }
    }
    async function createJob(payload) {
        status.value = 'loading';
        errorMessage.value = '';
        try {
            const created = await basketApi.createJob(payload);
            jobs.value = [created, ...jobs.value];
            status.value = 'ready';
        }
        catch (error) {
            status.value = 'error';
            errorMessage.value = messageFromError(error, '공고를 저장하지 못했습니다.');
        }
    }
    async function loadJob(jobId) {
        status.value = 'loading';
        errorMessage.value = '';
        try {
            activeJob.value = await basketApi.getJob(jobId);
            status.value = 'ready';
        }
        catch (error) {
            activeJob.value = null;
            status.value = 'error';
            errorMessage.value = messageFromError(error, '공고 상세를 불러오지 못했습니다.');
        }
    }
    async function updateJob(jobId, payload) {
        status.value = 'loading';
        errorMessage.value = '';
        try {
            const updated = await basketApi.updateJob(jobId, payload);
            activeJob.value = updated;
            jobs.value = jobs.value.map((job) => (job.id === jobId ? updated : job));
            status.value = 'ready';
        }
        catch (error) {
            status.value = 'error';
            errorMessage.value = messageFromError(error, '공고 정보를 수정하지 못했습니다.');
        }
    }
    async function updateStatus(jobId, nextStatus) {
        status.value = 'loading';
        errorMessage.value = '';
        try {
            const updated = await basketApi.updateStatus(jobId, nextStatus);
            jobs.value = jobs.value.map((job) => (job.id === jobId ? updated : job));
            status.value = 'ready';
        }
        catch (error) {
            status.value = 'error';
            errorMessage.value = messageFromError(error, '지원 상태를 변경하지 못했습니다.');
        }
    }
    async function archiveJob(jobId) {
        status.value = 'loading';
        errorMessage.value = '';
        try {
            await basketApi.archiveJob(jobId);
            jobs.value = jobs.value.filter((job) => job.id !== jobId);
            status.value = 'ready';
        }
        catch (error) {
            status.value = 'error';
            errorMessage.value = messageFromError(error, '공고를 보관 처리하지 못했습니다.');
        }
    }
    function isDeadlineWithinWeek(job) {
        const source = job.deadlineDate ?? job.deadlineLabel ?? '';
        const match = source.match(/(20\d{2})[-.](\d{1,2})[-.](\d{1,2})/);
        if (!match) {
            return false;
        }
        const deadline = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const daysLeft = Math.ceil((deadline.getTime() - today.getTime()) / 86400000);
        return daysLeft >= 0 && daysLeft <= 7;
    }
    return {
        status,
        jobs,
        activeJob,
        errorMessage,
        hasJobs,
        deadlineSoonCount,
        loadJobs,
        createJob,
        loadJob,
        updateJob,
        updateStatus,
        archiveJob
    };
});
