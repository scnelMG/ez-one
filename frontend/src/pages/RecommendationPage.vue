<template>
  <AppLayout>
    <PageHeader
      eyebrow="REC-001"
      title="추천공고"
      description="온보딩 프로필과 저장 이력을 기준으로 확인할 만한 공고 후보를 보여줍니다."
    />

    <section class="recommendation-list" aria-label="추천 공고 목록">
      <article v-for="item in recommendations" :key="item.company" class="recommendation-card">
        <span class="shell-card-kicker">{{ item.match }}</span>
        <h2>{{ item.company }}</h2>
        <p>{{ item.role }}</p>
        <RouterLink class="text-button" to="/basket">공고함에 담기</RouterLink>
      </article>
    </section>

    <StatePanel
      id="recommendation-p2"
      tone="navy"
      title="Mattermost 추천은 P2 예약"
      body="현재 화면은 프로필 기반 추천만 보여주며 외부 채널 수집 후보는 활성화하지 않습니다."
    />
  </AppLayout>
</template>

<script setup lang="ts">
import AppLayout from '@/shared/AppLayout.vue'
import PageHeader from '@/shared/PageHeader.vue'
import StatePanel from '@/shared/StatePanel.vue'

const recommendations = [
  { company: '라인', role: 'Server Platform Engineer', match: 'Java/Spring 일치' },
  { company: '우아한형제들', role: 'Commerce Backend Developer', match: '백엔드 선호' }
]
</script>
