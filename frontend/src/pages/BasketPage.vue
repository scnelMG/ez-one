<template>
  <AppLayout>
    <section class="basket-page">
      <header class="basket-hero">
        <div>
          <p class="section-kicker">공고 관리</p>
          <h1>공고 장바구니</h1>
          <p>저장한 공고의 상태와 마감일을 한 번에 확인하고, 바로 지원 워크스페이스로 이동합니다.</p>
        </div>
        <RouterLink class="primary-button" to="/recommendations">추천 공고 보기</RouterLink>
      </header>

      <section class="basket-metrics" aria-label="장바구니 요약">
        <div>
          <span>전체 공고</span>
          <strong>{{ basketStore.jobs.length }}</strong>
        </div>
        <div>
          <span>진행 중</span>
          <strong>{{ statusCounts.IN_PROGRESS }}</strong>
        </div>
        <div>
          <span>지원 전</span>
          <strong>{{ statusCounts.NOT_STARTED }}</strong>
        </div>
        <div>
          <span>마감 임박</span>
          <strong>{{ basketStore.deadlineSoonCount }}</strong>
        </div>
      </section>

      <div class="basket-workspace-grid">
        <section class="basket-list-panel" aria-label="저장한 공고 목록">
          <div class="basket-title-row">
            <div>
              <p class="section-kicker">저장한 공고</p>
              <h2>지원 관리</h2>
            </div>
            <div class="basket-tools" aria-label="장바구니 도구">
              <button type="button" aria-label="필터">
                <span class="filter-icon" aria-hidden="true"></span>
              </button>
              <button type="button" aria-label="정렬">
                <span class="sort-icon" aria-hidden="true">↕</span>
              </button>
              <button type="button" aria-label="검색">
                <span class="search-icon" aria-hidden="true"></span>
              </button>
            </div>
          </div>

          <div class="filter-bar compact" aria-label="지원 상태 필터">
            <RouterLink
              v-for="filter in statusFilters"
              :key="filter.label"
              :data-testid="`basket-filter-${filter.value ?? 'ALL'}`"
              class="filter-chip"
              :class="{ active: selectedStatus === filter.value }"
              :to="filter.to"
            >
              {{ filter.label }}
            </RouterLink>
            <div class="search-field">회사명 또는 직무명 검색</div>
          </div>

          <p v-if="basketStore.status === 'loading'" class="basket-loading">공고 목록을 불러오는 중입니다.</p>
          <StatePanel
            v-else-if="basketStore.status === 'error'"
            id="basket-error"
            tone="navy"
            title="공고 목록 로딩 실패"
            :body="basketStore.errorMessage"
          />
          <div v-else class="basket-data-table">
            <div class="basket-data-head">
              <span>회사명</span>
              <span>직무</span>
              <span>상태</span>
              <span>마감일</span>
              <span>원문 링크</span>
            </div>
            <article v-for="job in sortedJobs" :key="job.id" class="basket-data-row">
              <RouterLink class="job-main-link" :to="`/workspaces/${job.workspaceId}`">
                <strong>{{ job.companyName }}</strong>
              </RouterLink>
              <RouterLink class="job-main-link" :to="`/workspaces/${job.workspaceId}`">
                {{ job.positionTitle }}
              </RouterLink>
              <RouterLink class="job-main-link" :to="`/workspaces/${job.workspaceId}`">
                <span class="status-chip" :class="statusClass(job.status)">{{ job.statusLabel }}</span>
              </RouterLink>
              <RouterLink class="job-main-link" :to="`/workspaces/${job.workspaceId}`">
                <span class="deadline-pill" :class="{ urgent: job.deadlineSoon }">{{ job.deadlineLabel }}</span>
              </RouterLink>
              <a class="source-link" :href="job.sourceUrl" target="_blank" rel="noreferrer">원문 보기</a>
            </article>
          </div>
        </section>

        <aside class="deadline-panel" aria-label="마감일 스냅샷">
          <div class="section-heading">
            <div>
              <p class="section-kicker">마감 일정</p>
              <h2>마감일 스냅샷</h2>
            </div>
            <span>2026년 6월</span>
          </div>

          <div class="deadline-calendar" aria-label="2026년 6월 마감일">
            <span v-for="weekday in weekdays" :key="weekday" class="weekday">{{ weekday }}</span>
            <div v-for="offset in firstDayOffset" :key="`offset-${offset}`" aria-hidden="true"></div>
            <div v-for="day in monthDays" :key="day" class="deadline-day">
              <span>{{ day }}</span>
              <RouterLink
                v-for="job in jobsByDay[day] ?? []"
                :key="job.id"
                class="deadline-job-chip"
                :to="`/workspaces/${job.workspaceId}`"
              >
                {{ job.companyName }}
              </RouterLink>
            </div>
          </div>
        </aside>
      </div>
    </section>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from '@/shared/AppLayout.vue'
import StatePanel from '@/shared/StatePanel.vue'
import { useBasketStore } from '@/stores/basketStore'
import type { BasketJob, BasketJobStatus } from '@/features/basket/api/basketApi'

const route = useRoute()
const basketStore = useBasketStore()
const weekdays = ['일', '월', '화', '수', '목', '금', '토']
const monthDays = Array.from({ length: 30 }, (_, index) => index + 1)
const firstDayOffset = 1
const statusFilters: Array<{ label: string; value?: BasketJobStatus; to: string }> = [
  { label: '전체', value: undefined, to: '/basket' },
  { label: '지원 전', value: 'NOT_STARTED', to: '/basket?status=NOT_STARTED' },
  { label: '진행 중', value: 'IN_PROGRESS', to: '/basket?status=IN_PROGRESS' },
  { label: '지원 완료', value: 'SUBMITTED', to: '/basket?status=SUBMITTED' }
]

const selectedStatus = computed<BasketJobStatus | undefined>(() => {
  const status = route.query.status

  return status === 'NOT_STARTED' || status === 'IN_PROGRESS' || status === 'SUBMITTED'
    ? status
    : undefined
})

const sortedJobs = computed(() =>
  [...basketStore.jobs].sort((left, right) => {
    if (route.query.sort === 'deadline') {
      return deadlineDay(left) - deadlineDay(right)
    }

    return Number(left.id) - Number(right.id)
  })
)

const statusCounts = computed<Record<BasketJobStatus, number>>(() => ({
  NOT_STARTED: basketStore.jobs.filter((job) => job.status === 'NOT_STARTED').length,
  IN_PROGRESS: basketStore.jobs.filter((job) => job.status === 'IN_PROGRESS').length,
  SUBMITTED: basketStore.jobs.filter((job) => job.status === 'SUBMITTED').length
}))

const jobsByDay = computed<Record<number, BasketJob[]>>(() =>
  sortedJobs.value.reduce<Record<number, BasketJob[]>>((groups, job) => {
    const day = deadlineDay(job)

    if (!groups[day]) {
      groups[day] = []
    }

    groups[day].push(job)
    return groups
  }, {})
)

function deadlineDay(job: BasketJob) {
  const source = job.deadlineDate ?? job.deadlineLabel
  const match = source.match(/(?:2026[-.])?06[-.](\d{1,2})/)

  return match ? Number(match[1]) : 99
}

function statusClass(status: BasketJobStatus) {
  return {
    'not-started': status === 'NOT_STARTED',
    'in-progress': status === 'IN_PROGRESS',
    submitted: status === 'SUBMITTED'
  }
}

onMounted(() => {
  void basketStore.loadJobs(selectedStatus.value)
})

watch(selectedStatus, (nextStatus) => {
  void basketStore.loadJobs(nextStatus)
})
</script>
