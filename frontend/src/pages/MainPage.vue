<template>
  <AppLayout>
    <section class="dashboard-page">
      <header class="dashboard-header">
        <div class="dashboard-title">
          <p class="section-kicker">오늘의 지원 흐름</p>
          <h1>지원 준비를 한 화면에서 정리하세요</h1>
          <p>저장한 공고, 오늘 마감 일정, 추천 공고를 한 화면에서 훑고 다음 작업으로 이동합니다.</p>
        </div>

        <div class="dashboard-actions">
          <RouterLink
            class="member-chip"
            data-testid="member-chip"
            to="/mypage"
            aria-label="마이페이지에서 회원 정보 수정"
          >
            <span class="member-avatar" data-testid="member-avatar" aria-hidden="true">
              {{ memberInitial }}
            </span>
            <span>
              <small>로그인 계정</small>
              <strong>{{ memberDisplayName }}</strong>
            </span>
          </RouterLink>
          <RouterLink class="ghost-button" to="/document-profile">서류 정보</RouterLink>
          <RouterLink class="primary-button" to="/basket">공고 장바구니</RouterLink>
        </div>
      </header>

      <div class="dashboard-grid">
        <aside class="dashboard-rail" aria-label="대시보드 메뉴">
          <strong>지원 현황</strong>
          <RouterLink to="/basket?status=IN_PROGRESS">진행 중</RouterLink>
          <RouterLink to="/basket?status=NOT_STARTED">지원 전</RouterLink>
          <RouterLink to="/basket?sort=deadline">마감 임박</RouterLink>
          <RouterLink to="/recommendations">추천 공고</RouterLink>
        </aside>

        <main class="dashboard-board">
          <section class="filter-bar compact" aria-label="대시보드 필터">
            <button class="filter-chip active" type="button">전체</button>
            <button class="filter-chip" type="button">오늘 마감</button>
            <button class="filter-chip" type="button">진행 중</button>
            <div class="search-field">회사명, 직무명 검색</div>
          </section>

          <section class="metric-strip" aria-label="지원 현황 숫자 요약">
            <RouterLink to="/basket">
              <span>전체 지원</span>
              <strong>{{ dashboardStore.summary?.totalApplications ?? 0 }}</strong>
            </RouterLink>
            <RouterLink to="/basket?status=IN_PROGRESS">
              <span>진행 중</span>
              <strong>{{ dashboardStore.summary?.inProgress ?? 0 }}</strong>
            </RouterLink>
            <RouterLink to="/basket?status=NOT_STARTED">
              <span>지원 전</span>
              <strong>{{ dashboardStore.summary?.notStarted ?? 0 }}</strong>
            </RouterLink>
            <RouterLink to="/basket?sort=deadline">
              <span>마감 임박</span>
              <strong>{{ dashboardStore.summary?.deadlineSoon ?? 0 }}</strong>
            </RouterLink>
          </section>

          <section
            class="dashboard-panel"
            data-testid="main-weekly-calendar"
            aria-label="이번 주 마감 캘린더"
          >
            <div class="section-heading">
              <div>
                <p class="section-kicker">주간 일정</p>
                <h2>이번 주 마감 공고</h2>
              </div>
              <RouterLink class="text-button" to="/basket?sort=deadline">마감순 보기</RouterLink>
            </div>
            <div class="weekly-deadline-calendar">
              <div v-for="day in weeklyDeadlineDays" :key="day.key" class="weekly-deadline-day">
                <span>{{ day.label }}</span>
                <RouterLink
                  v-for="job in day.jobs"
                  :key="job.workspaceId"
                  class="deadline-job-chip"
                  :data-testid="`weekly-calendar-job-${job.workspaceId}`"
                  :to="`/workspaces/${job.workspaceId}`"
                >
                  {{ job.companyName }}
                </RouterLink>
              </div>
            </div>
          </section>

          <section class="dashboard-panel" aria-label="오늘 챙겨볼 공고">
            <div class="section-heading">
              <div>
                <p class="section-kicker">마감 임박</p>
                <h2>오늘 챙겨볼 공고</h2>
              </div>
              <RouterLink class="text-button" to="/basket">전체 보기</RouterLink>
            </div>
            <p v-if="dashboardStore.status === 'loading'">대시보드 정보를 불러오는 중입니다.</p>
            <StatePanel
              v-else-if="dashboardStore.status === 'error'"
              id="main-error"
              tone="navy"
              title="대시보드 로딩 실패"
              :body="dashboardStore.errorMessage"
            />
            <div v-else class="wire-table">
              <div class="wire-row table-head">
                <span>회사</span>
                <span>직무</span>
                <span>마감</span>
              </div>
              <RouterLink
                v-for="job in deadlineSummaryJobs"
                :key="job.workspaceId"
                class="wire-row"
                :class="{ 'is-deadline-soon': isDeadlineSoon(job) }"
                data-testid="deadline-summary-job"
                :to="`/workspaces/${job.workspaceId}`"
              >
                <strong>{{ job.companyName }}</strong>
                <span>{{ job.positionTitle }}</span>
                <span class="deadline-pill">{{ job.deadlineLabel }}</span>
              </RouterLink>
            </div>
          </section>

          <section class="dashboard-panel" aria-label="추천 공고 미리보기">
            <div class="section-heading">
              <div>
                <p class="section-kicker">맞춤 추천</p>
                <h2>추천 공고</h2>
              </div>
              <RouterLink class="text-button" to="/recommendations">추천 더보기</RouterLink>
            </div>
            <div class="recommendation-grid dense">
              <article v-for="card in dashboardCards" :key="card.kicker" class="recommendation-card">
                <span class="shell-card-kicker">{{ card.kicker }}</span>
                <h3>{{ card.title }}</h3>
                <p>{{ card.body }}</p>
                <strong>{{ card.meta }}</strong>
              </article>
            </div>
          </section>
        </main>
      </div>
    </section>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { dashboardCards } from '@/data/shellContent'
import type { DashboardJob } from '@/features/dashboard/api/dashboardApi'
import { getCurrentUser } from '@/features/auth/session/authSession'
import AppLayout from '@/shared/AppLayout.vue'
import StatePanel from '@/shared/StatePanel.vue'
import { useDashboardStore } from '@/stores/dashboardStore'

const dashboardStore = useDashboardStore()
const millisecondsPerDay = 24 * 60 * 60 * 1000
const currentUser = computed(() => getCurrentUser())
const memberDisplayName = computed(() => {
  const user = currentUser.value
  return user?.nickname?.trim() || user?.name?.trim() || user?.email || 'EZ One 사용자'
})
const memberInitial = computed(() => memberDisplayName.value.trim().charAt(0).toUpperCase())
const deadlineSummaryJobs = computed(() => {
  const today = startOfDay(new Date())

  return [...dashboardStore.todayJobs]
    .sort((left, right) => {
      const deadlineDifference = deadlineOffsetDays(left, today) - deadlineOffsetDays(right, today)
      return deadlineDifference === 0 ? left.workspaceId.localeCompare(right.workspaceId) : deadlineDifference
    })
    .slice(0, 5)
})
const weeklyDeadlineDays = computed(() => {
  const today = startOfDay(new Date())

  return Array.from({ length: 7 }, (_, offset) => {
    const date = addDays(today, offset)
    const key = toDateKey(date)

    return {
      key,
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      jobs: dashboardStore.todayJobs.filter((job) => toDateKey(parseDeadlineDate(job, today)) === key)
    }
  })
})

onMounted(() => {
  void dashboardStore.loadSummary()
})

function parseDeadlineDate(job: DashboardJob, today: Date) {
  const label = job.deadlineLabel
  const explicit = label.match(/(20\d{2})[-.](\d{1,2})[-.](\d{1,2})/)

  if (explicit) {
    return startOfDay(new Date(Number(explicit[1]), Number(explicit[2]) - 1, Number(explicit[3])))
  }

  const dayOnly = label.match(/(?:^|\D)(\d{1,2})일/)
  if (dayOnly) {
    return startOfDay(new Date(today.getFullYear(), today.getMonth(), Number(dayOnly[1])))
  }

  const dDay = label.match(/D-(\d+)/i)
  if (dDay) {
    return addDays(today, Number(dDay[1]))
  }

  if (label.includes('오늘')) {
    return today
  }

  return addDays(today, 99)
}

function isDeadlineSoon(job: DashboardJob) {
  const days = deadlineOffsetDays(job, startOfDay(new Date()))
  return days >= 0 && days <= 7
}

function deadlineOffsetDays(job: DashboardJob, today: Date) {
  return Math.round((parseDeadlineDate(job, today).getTime() - today.getTime()) / millisecondsPerDay)
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function toDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-')
}
</script>
