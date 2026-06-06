<template>
  <div class="app-frame">
    <header class="app-shell-nav">
      <RouterLink class="brand-lockup" to="/" aria-label="EZ One 메인">
        <img class="brand-mark" :src="logoUrl" alt="EZ One" />
        <strong>EZ One</strong>
      </RouterLink>

      <nav class="primary-nav" aria-label="주요 메뉴">
        <RouterLink to="/">메인</RouterLink>
        <RouterLink to="/basket">공고함</RouterLink>
        <RouterLink to="/recommendations">추천공고</RouterLink>
        <RouterLink to="/document-profile">서류정보</RouterLink>
        <RouterLink to="/mypage/notion">Notion</RouterLink>
        <span class="nav-disabled" aria-disabled="true">이전 지원</span>
      </nav>

      <div class="header-actions">
        <button type="button" class="ghost-button small" @click="logout">로그아웃</button>
        <RouterLink class="header-icon-action" to="/mypage" aria-label="마이페이지">
          <span class="user-icon" aria-hidden="true"></span>
          <small>마이페이지</small>
        </RouterLink>
        <span
          class="header-icon-action disabled"
          aria-disabled="true"
          aria-label="알림"
          data-testid="reserved-alerts"
        >
          <span class="bell-icon" aria-hidden="true"></span>
          <small>알림</small>
        </span>
      </div>
    </header>

    <main class="app-main">
      <slot />
    </main>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import logoUrl from '@/assets/ez-one-logo.svg';
import { authApi } from '@/features/auth/api/authApi';
import { clearAuthSession, getRefreshToken } from '@/features/auth/session/authSession';

const router = useRouter();

async function logout() {
    const refreshToken = getRefreshToken();
    try {
        if (refreshToken) {
            await authApi.logout(refreshToken);
        }
    }
    finally {
        clearAuthSession();
        await router.push('/login');
    }
}
</script>
