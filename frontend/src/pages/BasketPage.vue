<template>
  <AppLayout>
    <PageHeader
      eyebrow="JOB-001 / JOB-014"
      title="공고함"
      description="저장한 공고를 마감일과 지원 상태 기준으로 정리하고 각 워크스페이스로 이동합니다."
    />

    <section class="dashboard-grid two-column" aria-label="공고함 요약">
      <ShellCard
        v-for="card in basketCards"
        :key="card.kicker"
        :kicker="card.kicker"
        :title="card.title"
        :body="card.body"
        :status="card.status"
        :meta="card.meta"
      />
    </section>

    <section class="table-shell" aria-label="저장 공고 목록">
      <div class="table-row table-head">
        <span>회사</span>
        <span>직무</span>
        <span>상태</span>
        <span>마감</span>
      </div>
      <RouterLink
        v-for="job in jobs"
        :key="job.company"
        class="table-row"
        :to="job.to"
      >
        <strong>{{ job.company }}</strong>
        <span>{{ job.role }}</span>
        <span class="status-chip">{{ job.status }}</span>
        <span>{{ job.deadline }}</span>
      </RouterLink>
    </section>
  </AppLayout>
</template>

<script setup lang="ts">
import { basketCards } from '@/data/shellContent'
import AppLayout from '@/shared/AppLayout.vue'
import PageHeader from '@/shared/PageHeader.vue'
import ShellCard from '@/shared/ShellCard.vue'

const jobs = [
  { company: '네이버', role: 'Backend Engineer', status: '진행 중', deadline: '오늘', to: '/workspaces/naver-backend' },
  { company: '카카오페이', role: 'Server Developer', status: '미지원', deadline: 'D-2', to: '/workspaces/kakaopay-server' },
  { company: '토스', role: 'Platform Engineer', status: '지원 완료', deadline: 'D-5', to: '/workspaces/toss-platform' }
]
</script>
