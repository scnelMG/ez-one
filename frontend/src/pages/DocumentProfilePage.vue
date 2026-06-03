<template>
  <AppLayout>
    <PageHeader
      eyebrow="PROFILE-001"
      title="서류 입력 정보"
      description="반복해서 쓰는 지원서 정보를 섹션별로 저장하고 워크스페이스 기본값으로 재사용합니다."
    />

    <section class="dashboard-grid two-column" aria-label="서류 입력 정보 요약">
      <ShellCard
        v-for="card in documentProfileCards"
        :key="card.title"
        :kicker="card.kicker"
        :title="card.title"
        :body="card.body"
        :status="card.status"
      />
    </section>

    <section class="profile-sections" aria-label="서류 정보 섹션">
      <button v-for="section in sections" :key="section" class="segment-button" type="button">
        {{ section }}
      </button>
    </section>
  </AppLayout>
</template>

<script setup lang="ts">
import { documentProfileCards } from '@/data/shellContent'
import AppLayout from '@/shared/AppLayout.vue'
import PageHeader from '@/shared/PageHeader.vue'
import ShellCard from '@/shared/ShellCard.vue'

const sections = ['기본정보', '학력', '경력', '프로젝트', '자격증', '수상/활동', '커스텀']
</script>
