import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  dashboardApi,
  type DashboardJob,
  type DashboardSummary
} from '@/features/dashboard/api/dashboardApi'

export const useDashboardStore = defineStore('dashboard', () => {
  const status = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const summary = ref<DashboardSummary | null>(null)
  const todayJobs = ref<DashboardJob[]>([])
  const errorMessage = ref('')

  const hasJobs = computed(() => todayJobs.value.length > 0)

  async function loadSummary() {
    status.value = 'loading'
    errorMessage.value = ''

    try {
      const response = await dashboardApi.getSummary()
      summary.value = response.summary
      todayJobs.value = response.todayJobs
      status.value = 'ready'
    } catch {
      status.value = 'error'
      errorMessage.value = '대시보드 정보를 불러오지 못했습니다.'
    }
  }

  return { status, summary, todayJobs, errorMessage, hasJobs, loadSummary }
})
