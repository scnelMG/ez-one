<template>
  <AppLayout>
    <PageHeader
      eyebrow="REC-001"
      title="추천 공고"
      description="P1 추천은 프로필 기반으로 시작하고, API 슬라이스 구현 시 공고함 저장으로 이어집니다."
    />

    <StatePanel
      id="recommendation-empty"
      tone="navy"
      title="추천 카드 영역 준비중"
      body="Mattermost와 확장 수집원은 P2로 남기고 이 화면에서는 활성 기능으로 제공하지 않습니다."
    />
  </AppLayout>
</template>

<script setup lang="ts">
import AppLayout from '@/shared/AppLayout.vue'
import PageHeader from '@/shared/PageHeader.vue'
import StatePanel from '@/shared/StatePanel.vue'
</script>
