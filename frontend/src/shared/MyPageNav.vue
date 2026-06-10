<template>
  <nav class="settings-tab-nav" aria-label="설정 메뉴">
    <RouterLink to="/mypage" :class="{ active: activeSection === 'account' }">내 계정</RouterLink>
    <RouterLink to="/mypage/notion" :class="{ active: activeSection === 'notion' }">노션 연동 관리</RouterLink>
    <RouterLink to="/mypage/onboarding" :class="{ active: activeSection === 'onboarding' }">온보딩 정보</RouterLink>
    <RouterLink to="/mypage/qna" :class="{ active: activeSection === 'qna' }">자주 묻는 질문</RouterLink>
    <RouterLink to="/mypage/inquiry" :class="{ active: activeSection === 'inquiry' }">1:1 문의</RouterLink>
    <RouterLink to="/mypage/partnership" :class="{ active: activeSection === 'partnership' }">제휴 문의</RouterLink>
    <RouterLink to="/mypage/terms" :class="{ active: activeSection === 'terms' }">이용약관</RouterLink>
  </nav>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const activeSection = computed(() => {
  if (route.path === '/mypage/notion') {
    return 'notion';
  }
  return route.meta.mypageSection ?? 'account';
});
</script>
