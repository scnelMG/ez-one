import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  recommendationApi,
  type RecommendationJob,
  type SavedRecommendationJob
} from '@/features/recommendations/api/recommendationApi'

export const useRecommendationStore = defineStore('recommendation', () => {
  const status = ref<'idle' | 'loading' | 'ready' | 'saving' | 'error'>('idle')
  const jobs = ref<RecommendationJob[]>([])
  const savedJob = ref<SavedRecommendationJob | null>(null)
  const errorMessage = ref('')

  async function loadRecommendations() {
    status.value = 'loading'
    errorMessage.value = ''

    try {
      jobs.value = await recommendationApi.listJobs()
      status.value = 'ready'
    } catch {
      jobs.value = []
      status.value = 'error'
      errorMessage.value = '추천 공고를 불러오지 못했습니다.'
    }
  }

  async function saveRecommendation(recommendationId: string) {
    status.value = 'saving'
    errorMessage.value = ''

    try {
      savedJob.value = await recommendationApi.saveJob(recommendationId)
      status.value = 'ready'
    } catch {
      status.value = 'error'
      errorMessage.value = '추천 공고를 저장하지 못했습니다.'
    }
  }

  return { status, jobs, savedJob, errorMessage, loadRecommendations, saveRecommendation }
})
