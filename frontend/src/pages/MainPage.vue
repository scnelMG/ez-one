<template>
  <AppLayout>
    <section class="wire-page dashboard-wire">
      <header class="wire-toolbar">
        <div>
          <p class="section-kicker">DASH-001</p>
          <h1>메인 대시보드</h1>
          <p>저장한 공고, 오늘 마감 일정, 추천 공고를 한 화면에서 훑고 다음 작업으로 이동합니다.</p>
        </div>
        <div class="toolbar-actions">
          <RouterLink class="ghost-button" to="/document-profile">서류 정보</RouterLink>
          <RouterLink class="primary-button" to="/basket">공고함 열기</RouterLink>
        </div>
      </header>

      <div class="wire-app-grid">
        <aside class="wire-side-rail" aria-label="대시보드 메뉴">
          <strong>지원 현황</strong>
          <RouterLink to="/basket?status=IN_PROGRESS">진행 중</RouterLink>
          <RouterLink to="/basket?status=NOT_STARTED">지원 전</RouterLink>
          <RouterLink to="/basket?sort=deadline">마감 임박</RouterLink>
          <RouterLink to="/recommendations">추천 공고</RouterLink>
        </aside>

        <main class="wire-board">
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

          <section class="wire-panel" aria-label="오늘 챙겨볼 공고">
            <div class="section-heading">
              <div>
                <p class="section-kicker">JOB-001 / WS-001</p>
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
                v-for="job in dashboardStore.todayJobs"
                :key="job.workspaceId"
                class="wire-row"
                :to="`/workspaces/${job.workspaceId}`"
              >
                <strong>{{ job.companyName }}</strong>
                <span>{{ job.positionTitle }}</span>
                <span class="deadline-pill">{{ job.deadlineLabel }}</span>
              </RouterLink>
            </div>
          </section>

          <section class="wire-panel" aria-label="추천 공고 미리보기">
            <div class="section-heading">
              <div>
                <p class="section-kicker">REC-001</p>
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
import { onMounted } from 'vue'
import { dashboardCards } from '@/data/shellContent'
import AppLayout from '@/shared/AppLayout.vue'
import StatePanel from '@/shared/StatePanel.vue'
import { useDashboardStore } from '@/stores/dashboardStore'

const dashboardStore = useDashboardStore()

onMounted(() => {
  void dashboardStore.loadSummary()
})
</script>
