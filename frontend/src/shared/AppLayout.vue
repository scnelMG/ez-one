<template>
  <div class="app-frame">
    <header class="app-shell-nav">
      <RouterLink class="brand-lockup" to="/" aria-label="EZ-ONE 메인">
        <img class="brand-mark" :src="logoUrl" alt="EZ-ONE" />
        <strong>EZ-ONE</strong>
      </RouterLink>

      <nav class="primary-nav" aria-label="주요 메뉴">
        <RouterLink to="/basket">공고 장바구니</RouterLink>
        <RouterLink to="/document-profile">서류 입력 정보</RouterLink>
        <RouterLink to="/recommendations">추천 공고</RouterLink>
        <span class="nav-disabled" aria-disabled="true">과거 지원 내역</span>
      </nav>

      <div class="header-actions">
        <div
          class="profile-menu"
          @mouseenter="openProfileMenu"
          @mouseleave="scheduleProfileMenuClose"
        >
          <button
            type="button"
            class="profile-menu-trigger"
            data-testid="mypage-menu-trigger"
            aria-haspopup="menu"
            :aria-expanded="isProfileMenuOpen ? 'true' : 'false'"
            @mouseenter="openProfileMenu"
            @click="isProfileMenuOpen = !isProfileMenuOpen"
          >
            <img
              v-if="profileImageUrl"
              class="profile-photo"
              data-testid="profile-photo"
              :src="profileImageUrl"
              :alt="`${profileDisplayName} 프로필 사진`"
            />
            <span v-else class="profile-avatar-fallback" data-testid="profile-avatar">{{ profileInitial }}</span>
            <span class="profile-menu-copy">
              <strong>{{ profileDisplayName }}</strong>
            </span>
            <span class="profile-menu-chevron" aria-hidden="true">⌄</span>
          </button>

          <div
            v-if="isProfileMenuOpen"
            class="profile-dropdown mypage-dropdown"
            data-testid="mypage-dropdown"
            role="menu"
            @mouseenter="openProfileMenu"
            @mouseleave="scheduleProfileMenuClose"
          >
            <div class="mypage-dropdown-account">
              <strong>{{ currentUser?.email ?? '계정 정보 없음' }}</strong>
              <small>Google 간편 가입</small>
            </div>
            <RouterLink data-testid="mypage-link-account" role="menuitem" to="/mypage" @click="isProfileMenuOpen = false">
              내 계정
            </RouterLink>
            <RouterLink data-testid="mypage-link-notion" role="menuitem" to="/mypage/notion" @click="isProfileMenuOpen = false">
              노션 연동 관리
            </RouterLink>
            <RouterLink data-testid="mypage-link-onboarding" role="menuitem" to="/mypage/onboarding" @click="isProfileMenuOpen = false">
              온보딩 정보
            </RouterLink>
            <button type="button" role="menuitem" data-testid="account-switch" @click="switchAccount">
              다른 계정으로 로그인
            </button>
            <button type="button" role="menuitem" @click="logout">로그아웃</button>
          </div>
        </div>

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
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import logoUrl from '@/assets/ez-one-logo.svg';
import { authApi } from '@/features/auth/api/authApi';
import { clearAuthSession, getCurrentUser, getRefreshToken } from '@/features/auth/session/authSession';

const router = useRouter();
const isProfileMenuOpen = ref(false);
let profileMenuCloseTimer = null;
const currentUser = computed(() => getCurrentUser());

const profileDisplayName = computed(() => {
  const user = currentUser.value;
  return user?.nickname?.trim() || user?.name?.trim() || user?.email || 'EZ-ONE 사용자';
});

const profileImageUrl = computed(() => {
  const user = currentUser.value;
  return user?.pictureUrl || user?.photoUrl || user?.profileImageUrl || user?.avatarUrl || '';
});

const profileInitial = computed(() => profileDisplayName.value.trim().charAt(0).toUpperCase() || 'E');

function openProfileMenu() {
  if (profileMenuCloseTimer) {
    clearTimeout(profileMenuCloseTimer);
    profileMenuCloseTimer = null;
  }
  isProfileMenuOpen.value = true;
}

function scheduleProfileMenuClose() {
  if (profileMenuCloseTimer) {
    clearTimeout(profileMenuCloseTimer);
  }
  profileMenuCloseTimer = setTimeout(() => {
    isProfileMenuOpen.value = false;
    profileMenuCloseTimer = null;
  }, 180);
}

async function logout() {
  await endCurrentSession('/login');
}

async function switchAccount() {
  await endCurrentSession('/login?switch=account');
}

async function endCurrentSession(nextPath) {
  const refreshToken = getRefreshToken();
  try {
    if (refreshToken) {
      await authApi.logout(refreshToken);
    }
  } finally {
    if (profileMenuCloseTimer) {
      clearTimeout(profileMenuCloseTimer);
      profileMenuCloseTimer = null;
    }
    isProfileMenuOpen.value = false;
    clearAuthSession();
    await router.push(nextPath);
  }
}
</script>
