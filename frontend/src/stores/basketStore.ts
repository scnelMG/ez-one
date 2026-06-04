import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { basketApi, type BasketJob } from '@/features/basket/api/basketApi'

export const useBasketStore = defineStore('basket', () => {
  const status = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const jobs = ref<BasketJob[]>([])
  const errorMessage = ref('')

  const hasJobs = computed(() => jobs.value.length > 0)
  const deadlineSoonCount = computed(() => jobs.value.filter((job) => job.deadlineSoon).length)

  async function loadJobs(filterStatus?: BasketJob['status']) {
    status.value = 'loading'
    errorMessage.value = ''

    try {
      jobs.value = await basketApi.listJobs(filterStatus)
      status.value = 'ready'
    } catch {
      status.value = 'error'
      errorMessage.value = '공고함을 불러오지 못했습니다.'
    }
  }

  return { status, jobs, errorMessage, hasJobs, deadlineSoonCount, loadJobs }
})
