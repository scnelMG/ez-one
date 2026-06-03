<template>
  <AppLayout>
    <PageHeader
      eyebrow="JOB-001"
      title="공고함"
      description="저장한 공고를 확인하고 비교, 필터링한 뒤 지원 워크스페이스로 이동합니다."
    />

    <section class="dashboard-grid two-column" aria-label="공고함 화면 골격">
      <ShellCard
        v-for="card in basketCards"
        :key="card.kicker"
        :kicker="card.kicker"
        :title="card.title"
        :body="card.body"
        :status="card.status"
      />
    </section>
  </AppLayout>
</template>

<script setup lang="ts">
import { basketCards } from '@/data/shellContent'
import AppLayout from '@/shared/AppLayout.vue'
import PageHeader from '@/shared/PageHeader.vue'
import ShellCard from '@/shared/ShellCard.vue'
</script>
