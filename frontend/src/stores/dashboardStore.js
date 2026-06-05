import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { dashboardApi } from '@/features/dashboard/api/dashboardApi';
import { messageFromError } from '@/shared/errorMessage';
export const useDashboardStore = defineStore('dashboard', () => {
    const status = ref('idle');
    const summary = ref(null);
    const todayJobs = ref([]);
    const errorMessage = ref('');
    const hasJobs = computed(() => todayJobs.value.length > 0);
    async function loadSummary() {
        status.value = 'loading';
        errorMessage.value = '';
        try {
            const response = await dashboardApi.getSummary();
            summary.value = response.summary;
            todayJobs.value = response.todayJobs;
            status.value = 'ready';
        }
        catch (error) {
            status.value = 'error';
            errorMessage.value = messageFromError(error, '대시보드 정보를 불러오지 못했습니다.');
        }
    }
    return { status, summary, todayJobs, errorMessage, hasJobs, loadSummary };
});
