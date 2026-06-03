<template>
  <AppLayout>
    <PageHeader
      eyebrow="PROFILE-001"
      title="서류 입력 정보"
      description="반복해서 쓰는 지원서 정보를 한곳에 모으고 P1에서는 수동 입력 중심으로 관리합니다."
    />

    <section class="dashboard-grid two-column" aria-label="서류 입력 정보 화면 골격">
      <ShellCard
        v-for="card in documentProfileCards"
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
import { documentProfileCards } from '@/data/shellContent'
import AppLayout from '@/shared/AppLayout.vue'
import PageHeader from '@/shared/PageHeader.vue'
import ShellCard from '@/shared/ShellCard.vue'
</script>
