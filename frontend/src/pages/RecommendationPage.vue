<template>
  <AppLayout>
    <section class="wire-page">
      <PageHeader
        eyebrow="맞춤 추천"
        title="추천 공고"
        description="온보딩 프로필과 저장 이력을 기준으로 지금 확인할 만한 공고 후보를 보여줍니다."
      />

      <section class="filter-bar" aria-label="추천 공고 필터">
        <button class="filter-chip active" type="button">전체</button>
        <button class="filter-chip" type="button">백엔드</button>
        <button class="filter-chip" type="button">Java/Spring</button>
        <button class="filter-chip" type="button">서울</button>
        <div class="search-field">추천 공고 검색</div>
      </section>

      <section class="wire-section" aria-label="추천 공고 목록">
        <div class="recommendation-grid">
          <article v-for="item in recommendations" :key="item.company" class="recommendation-card">
            <span class="shell-card-kicker">{{ item.match }}</span>
            <h3>{{ item.company }}</h3>
            <p>{{ item.role }}</p>
            <RouterLink class="text-button" :to="`/basket?from=recommendation&company=${encodeURIComponent(item.company)}`">
              공고함에 담기
            </RouterLink>
          </article>
        </div>
      </section>

      <StatePanel
        id="recommendation-p2"
        tone="navy"
        title="프로필 기반 추천만 제공 중"
        body="지금은 사용자가 입력한 선호 조건과 저장 이력을 기준으로 추천 공고를 보여줍니다."
      />
    </section>
  </AppLayout>
</template>

<script setup lang="ts">
import AppLayout from '@/shared/AppLayout.vue'
import PageHeader from '@/shared/PageHeader.vue'
import StatePanel from '@/shared/StatePanel.vue'

const recommendations = [
  { company: '라인', role: 'Server Platform Engineer', match: 'Java/Spring 일치' },
  { company: '오늘의집', role: 'Commerce Backend Developer', match: '백엔드 선호' }
]
</script>
