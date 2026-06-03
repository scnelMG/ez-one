<template>
  <AppLayout>
    <PageHeader
      eyebrow="NOTION-001"
      title="노션 동기화"
      description="P1에서는 동기화 범위를 JOB_ONLY로 고정하고 외부 연동 실패가 핵심 저장 흐름을 막지 않게 합니다."
    />

    <StatePanel
      id="notion-job-only"
      tone="green"
      title="JOB_ONLY"
      body="자기소개서나 작성 캔버스 동기화 확장은 P2로 남기며, 현재 화면에서는 활성 설정으로 노출하지 않습니다."
    />
  </AppLayout>
</template>

<script setup lang="ts">
import AppLayout from '@/shared/AppLayout.vue'
import PageHeader from '@/shared/PageHeader.vue'
import StatePanel from '@/shared/StatePanel.vue'
</script>
