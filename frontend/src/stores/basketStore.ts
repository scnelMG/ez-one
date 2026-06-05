import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  basketApi,
  type BasketJob,
  type CreateBasketJobPayload
} from '@/features/basket/api/basketApi'

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

  async function createJob(payload: CreateBasketJobPayload) {
    status.value = 'loading'
    errorMessage.value = ''

    try {
      const created = await basketApi.createJob(payload)
      jobs.value = [created, ...jobs.value]
      status.value = 'ready'
    } catch {
      status.value = 'error'
      errorMessage.value = '공고를 저장하지 못했습니다.'
    }
  }

  async function updateStatus(jobId: string, nextStatus: BasketJob['status']) {
    status.value = 'loading'
    errorMessage.value = ''

    try {
      const updated = await basketApi.updateStatus(jobId, nextStatus)
      jobs.value = jobs.value.map((job) => (job.id === jobId ? updated : job))
      status.value = 'ready'
    } catch {
      status.value = 'error'
      errorMessage.value = '지원 상태를 변경하지 못했습니다.'
    }
  }

  async function archiveJob(jobId: string) {
    status.value = 'loading'
    errorMessage.value = ''

    try {
      await basketApi.archiveJob(jobId)
      jobs.value = jobs.value.filter((job) => job.id !== jobId)
      status.value = 'ready'
    } catch {
      status.value = 'error'
      errorMessage.value = '공고를 보관 처리하지 못했습니다.'
    }
  }

  return {
    status,
    jobs,
    errorMessage,
    hasJobs,
    deadlineSoonCount,
    loadJobs,
    createJob,
    updateStatus,
    archiveJob
  }
})
