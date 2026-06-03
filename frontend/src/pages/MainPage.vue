<template>
  <AppLayout>
    <PageHeader
      eyebrow="DASH-001"
      title="지원 현황 대시보드"
      description="저장한 공고, 마감일, 추천 공고, 다음 서류 작업을 한눈에 보는 대시보드입니다."
    >
      <template #action>
        <RouterLink class="primary-button" to="/basket">공고함 열기</RouterLink>
      </template>
    </PageHeader>

    <section class="dashboard-grid" aria-label="대시보드 화면 골격">
      <ShellCard
        v-for="card in dashboardCards"
        :key="card.kicker"
        :kicker="card.kicker"
        :title="card.title"
        :body="card.body"
        :status="card.status"
      />
    </section>

    <StatePanel
      id="main-empty"
      tone="purple"
      title="아직 연결된 데이터가 없습니다"
      body="첫 API 슬라이스를 붙일 때 사용할 로딩, 빈 상태, 오류, 미인증, 권한 없음 상태를 준비해둔 화면입니다."
    />
  </AppLayout>
</template>

<script setup lang="ts">
import { dashboardCards } from '@/data/shellContent'
import AppLayout from '@/shared/AppLayout.vue'
import PageHeader from '@/shared/PageHeader.vue'
import ShellCard from '@/shared/ShellCard.vue'
import StatePanel from '@/shared/StatePanel.vue'
</script>
