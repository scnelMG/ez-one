<template>
  <AppLayout>
    <section class="wire-page">
      <PageHeader
        eyebrow="REC-001"
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
            <RouterLink class="text-button" to="/basket">공고함에 담기</RouterLink>
          </article>
        </div>
      </section>

      <StatePanel
        id="recommendation-p2"
        tone="navy"
        title="Mattermost 추천은 P2 예약"
        body="현재 화면은 프로필 기반 추천만 보여주며 외부 채널 수집 후보는 활성화하지 않습니다."
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
