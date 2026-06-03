<template>
  <AppLayout>
    <PageHeader
      eyebrow="DASH-001"
      title="지원 현황 대시보드"
      description="저장한 공고, 마감일, 추천 공고, 다음 서류 작업을 한눈에 확인합니다."
    >
      <template #action>
        <RouterLink class="primary-button" to="/basket">공고함 열기</RouterLink>
      </template>
    </PageHeader>

    <section class="dashboard-grid" aria-label="대시보드 핵심 지표">
      <ShellCard
        v-for="card in dashboardCards"
        :key="card.kicker"
        :kicker="card.kicker"
        :title="card.title"
        :body="card.body"
        :status="card.status"
        :meta="card.meta"
      />
    </section>

    <section class="content-band" aria-label="오늘의 지원 작업">
      <div>
        <p class="section-kicker">JOB-001 / WS-001</p>
        <h2>오늘 이어서 볼 공고</h2>
      </div>
      <div class="job-list">
        <RouterLink
          v-for="job in todayJobs"
          :key="job.company"
          class="job-row"
          :to="job.to"
        >
          <span>
            <strong>{{ job.company }}</strong>
            <small>{{ job.role }}</small>
          </span>
          <span class="deadline-pill">{{ job.deadline }}</span>
        </RouterLink>
      </div>
    </section>

    <StatePanel
      id="main-p2-boundary"
      tone="navy"
      title="P2 화면은 활성화하지 않음"
      body="알림, 과거 지원 이력, 주간 캘린더는 IA에만 남기고 P1 라우트로 등록하지 않습니다."
    />
  </AppLayout>
</template>

<script setup lang="ts">
import { dashboardCards } from '@/data/shellContent'
import AppLayout from '@/shared/AppLayout.vue'
import PageHeader from '@/shared/PageHeader.vue'
import ShellCard from '@/shared/ShellCard.vue'
import StatePanel from '@/shared/StatePanel.vue'

const todayJobs = [
  { company: '네이버', role: 'Backend Engineer', deadline: '오늘 18:00', to: '/workspaces/naver-backend' },
  { company: '카카오페이', role: 'Server Developer', deadline: 'D-2', to: '/workspaces/kakaopay-server' },
  { company: '토스', role: 'Platform Engineer', deadline: 'D-5', to: '/workspaces/toss-platform' }
]
</script>
