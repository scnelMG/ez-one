<template>
  <AppLayout>
    <PageHeader
      eyebrow="WS-001 / WS-002 / REF-001"
      title="지원 워크스페이스"
      :description="`워크스페이스 ${workspaceId}에서 자기소개서 초안, 버전, 참고자료, 지원 정보를 관리합니다.`"
    />

    <section class="workspace-layout" aria-label="지원 워크스페이스 화면 골격">
      <ShellCard
        v-for="card in workspaceCards"
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
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { workspaceCards } from '@/data/shellContent'
import AppLayout from '@/shared/AppLayout.vue'
import PageHeader from '@/shared/PageHeader.vue'
import ShellCard from '@/shared/ShellCard.vue'

const route = useRoute()
const workspaceId = computed(() => String(route.params.workspaceId ?? 'new'))
</script>
