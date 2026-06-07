import { defineStore } from 'pinia';
import { ref } from 'vue';
import { recommendationApi } from '@/features/recommendations/api/recommendationApi';
import { messageFromError } from '@/shared/errorMessage';
export const useRecommendationStore = defineStore('recommendation', () => {
    const status = ref('idle');
    const jobs = ref([]);
    const savedJob = ref(null);
    const errorMessage = ref('');
    async function loadRecommendations() {
        status.value = 'loading';
        errorMessage.value = '';
        try {
            jobs.value = await recommendationApi.listJobs();
            status.value = 'ready';
        }
        catch (error) {
            if (jobs.value.length === 0) {
                jobs.value = [];
            }
            status.value = 'error';
            errorMessage.value = messageFromError(error, '추천 공고를 불러오지 못했습니다.');
        }
    }
    async function saveRecommendation(recommendationId) {
        status.value = 'saving';
        errorMessage.value = '';
        try {
            savedJob.value = await recommendationApi.saveJob(recommendationId);
            status.value = 'ready';
        }
        catch (error) {
            status.value = 'error';
            errorMessage.value = messageFromError(error, '추천 공고를 저장하지 못했습니다.');
        }
    }
    return { status, jobs, savedJob, errorMessage, loadRecommendations, saveRecommendation };
});
