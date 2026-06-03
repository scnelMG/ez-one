<template>
  <div class="app-frame">
    <header class="global-header">
      <RouterLink class="brand-lockup" to="/" aria-label="EZ One 메인">
        <img src="../assets/ez-one-logo.svg" alt="" class="brand-mark" />
        <span>EZ One</span>
      </RouterLink>

      <nav class="primary-nav" aria-label="주요 메뉴">
        <RouterLink v-for="item in navItems" :key="item.to" :to="item.to">
          {{ item.label }}
        </RouterLink>
      </nav>
    </header>

    <main class="app-main">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const navItems = [
  { to: '/', label: '메인' },
  { to: '/basket', label: '공고함' },
  { to: '/recommendations', label: '추천공고' },
  { to: '/document-profile', label: '서류정보' },
  { to: '/mypage/notion', label: '노션' }
]
</script>
