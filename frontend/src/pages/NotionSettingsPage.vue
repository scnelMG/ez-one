<template>
  <AppLayout>
    <PageHeader
      eyebrow="NOTION-001"
      title="노션 동기화"
      description="P1에서는 저장한 공고만 JOB_ONLY 범위로 동기화하고 지원서/캔버스 확장은 비활성화합니다."
    />

    <section class="notion-shell" aria-label="노션 동기화 설정">
      <div>
        <p class="section-kicker">동기화 범위</p>
        <h2>JOB_ONLY</h2>
        <p>공고명, 회사, 직무, 마감일, 원문 링크만 노션으로 보냅니다.</p>
      </div>
      <span class="status-chip">P1 활성</span>
    </section>

    <StatePanel
      id="notion-job-only"
      tone="green"
      title="지원서와 캔버스 동기화는 P2"
      body="JOB+ESSAY, JOB+ESSAY+CANVAS 범위는 화면에 선택 가능한 설정으로 노출하지 않습니다."
    />
  </AppLayout>
</template>

<script setup lang="ts">
import AppLayout from '@/shared/AppLayout.vue'
import PageHeader from '@/shared/PageHeader.vue'
import StatePanel from '@/shared/StatePanel.vue'
</script>
