<template>
  <AppLayout>
    <PageHeader
      eyebrow="MY-001 / MY-003"
      title="마이페이지"
      description="계정 정보와 선호 정보 수정은 온보딩과 같은 프로필 모델을 사용합니다."
    />

    <section class="form-shell" aria-label="마이페이지 화면 골격">
      <label>
        닉네임
        <input value="EZ One 사용자" readonly />
      </label>
      <label>
        희망 근무 지역
        <input value="서울, 원격" readonly />
      </label>
    </section>
  </AppLayout>
</template>

<script setup lang="ts">
import AppLayout from '@/shared/AppLayout.vue'
import PageHeader from '@/shared/PageHeader.vue'
</script>
