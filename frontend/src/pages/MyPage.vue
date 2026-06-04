<template>
  <AppLayout>
    <section class="wire-page narrow">
      <PageHeader
        eyebrow="PROFILE-025"
        title="마이페이지"
        description="계정 정보와 온보딩 선호 정보를 같은 프로필 모델에서 확인하고 수정합니다."
      />

      <section class="form-shell" aria-label="마이페이지 기본 정보">
        <label>
          닉네임
          <input value="EZ One 사용자" readonly />
        </label>
        <label>
          로그인 방식
          <input value="Google" readonly />
        </label>
        <label>
          선호 근무 지역
          <input value="서울, 경기" readonly />
        </label>
      </section>
    </section>
  </AppLayout>
</template>

<script setup lang="ts">
import AppLayout from '@/shared/AppLayout.vue'
import PageHeader from '@/shared/PageHeader.vue'
</script>
