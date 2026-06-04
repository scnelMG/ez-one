<template>
  <div class="app-frame">
    <header class="app-shell-nav">
      <RouterLink class="brand-lockup" to="/main" aria-label="EZ One 메인">
        <img class="brand-mark" :src="logoUrl" alt="EZ One" />
        <strong>EZ One</strong>
      </RouterLink>

      <nav class="primary-nav" aria-label="주요 메뉴">
        <RouterLink to="/basket">공고 장바구니</RouterLink>
        <RouterLink to="/document-profile">서류 입력 정보</RouterLink>
        <RouterLink to="/recommendations">추천 공고</RouterLink>
        <span class="nav-disabled" aria-disabled="true">과거 지원 이력</span>
      </nav>

      <div class="header-actions">
        <button type="button" class="ghost-button small" @click="logout">로그아웃</button>
        <RouterLink class="header-icon-action" to="/mypage" aria-label="마이페이지">
          <span class="user-icon" aria-hidden="true"></span>
          <small>마이페이지</small>
        </RouterLink>
        <button type="button" class="header-icon-action" aria-label="알림">
          <span class="bell-icon" aria-hidden="true"></span>
          <small>알림</small>
        </button>
      </div>
    </header>

    <main class="app-main">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import logoUrl from '@/assets/ez-one-logo.svg'
import { authApi } from '@/features/auth/api/authApi'
import { clearAuthSession, getRefreshToken } from '@/features/auth/session/authSession'

const router = useRouter()

async function logout() {
  const refreshToken = getRefreshToken()

  try {
    if (refreshToken) {
      await authApi.logout(refreshToken)
    }
  } finally {
    clearAuthSession()
    await router.push('/')
  }
}
</script>
