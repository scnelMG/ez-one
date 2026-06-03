<template>
  <AppLayout>
    <PageHeader
      eyebrow="ONB-001 / ONB-002"
      title="온보딩"
      description="추천 공고와 마이페이지 수정에 함께 쓰는 선호 정보를 먼저 정리합니다."
    />

    <section class="form-shell" aria-label="온보딩 입력 항목">
      <label>
        선호 직무
        <input value="백엔드 개발자" readonly />
      </label>
      <label>
        선호 기업 유형
        <input value="대기업, 스타트업" readonly />
      </label>
      <label>
        기술 스택
        <input value="Java, Spring Boot, MyBatis" readonly />
      </label>
      <label>
        근무 지역
        <input value="서울, 경기" readonly />
      </label>
      <label>
        SSAFY 여부
        <input value="예" readonly />
      </label>
      <label>
        관심 산업
        <input value="핀테크, 생산성 도구" readonly />
      </label>
    </section>
  </AppLayout>
</template>

<script setup lang="ts">
import AppLayout from '@/shared/AppLayout.vue'
import PageHeader from '@/shared/PageHeader.vue'
</script>
