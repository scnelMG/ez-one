<template>
  <AppLayout>
    <PageHeader
      eyebrow="ONB-001 / ONB-002"
      title="온보딩"
      description="추천 기준과 마이페이지 수정이 같은 프로필 모델을 쓰도록 선호 정보를 먼저 배치합니다."
    />

    <section class="form-shell" aria-label="온보딩 입력 항목">
      <label>
        희망 직무
        <input value="백엔드 개발자" readonly />
      </label>
      <label>
        희망 기업 유형
        <input value="대기업, 스타트업" readonly />
      </label>
      <label>
        기술 스택
        <input value="Java, Spring Boot, MyBatis" readonly />
      </label>
    </section>
  </AppLayout>
</template>

<script setup lang="ts">
import AppLayout from '@/shared/AppLayout.vue'
import PageHeader from '@/shared/PageHeader.vue'
</script>
