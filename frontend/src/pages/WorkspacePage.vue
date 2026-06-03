<template>
  <AppLayout>
    <PageHeader
      eyebrow="WS-001 / WS-002 / REF-001"
      title="지원 워크스페이스"
      :description="`워크스페이스 ${workspaceId}에서 자기소개서, 참고자료, 서류 기본값을 함께 관리합니다.`"
    />

    <section class="workspace-layout" aria-label="워크스페이스 주요 영역">
      <ShellCard
        v-for="card in workspaceCards"
        :key="card.kicker"
        :kicker="card.kicker"
        :title="card.title"
        :body="card.body"
        :status="card.status"
      />
    </section>

    <section class="editor-shell" aria-label="자기소개서 작성 영역">
      <div class="essay-panel">
        <p class="section-kicker">WS-002</p>
        <h2>문항 1. 지원 동기</h2>
        <p>회사의 제품 경험과 백엔드 운영 경험을 연결해 초안을 작성합니다.</p>
      </div>
      <aside class="reference-panel">
        <p class="section-kicker">REF-002</p>
        <h2>참고자료</h2>
        <ul>
          <li>JD 핵심 역량</li>
          <li>DART 사업보고서 메모</li>
          <li>인재상 키워드</li>
        </ul>
      </aside>
    </section>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { workspaceCards } from '@/data/shellContent'
import AppLayout from '@/shared/AppLayout.vue'
import PageHeader from '@/shared/PageHeader.vue'
import ShellCard from '@/shared/ShellCard.vue'

const route = useRoute()
const workspaceId = computed(() => String(route.params.workspaceId ?? 'new'))
</script>
