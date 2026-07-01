<template>
  <div class="app-frame">
    <header class="app-shell-nav">
      <RouterLink class="brand-lockup" to="/" aria-label="EZ-ONE 메인">
        <img class="brand-mark brand-mark-final" :src="logoUrl" alt="EZ-ONE" />
      </RouterLink>

      <nav class="primary-nav" aria-label="주요 메뉴">
        <RouterLink to="/basket">공고 장바구니</RouterLink>
        <RouterLink to="/document-profile">서류 입력 정보</RouterLink>
        <RouterLink to="/study">취업 스터디</RouterLink>
        <RouterLink v-if="isSsafyUser" to="/recommendations/mattermost">MM 추천공고</RouterLink>
        <RouterLink to="/history">과거 지원 내역</RouterLink>
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
            <span class="profile-portrait" aria-hidden="true">
              <img
                v-if="profileImageUrl"
                class="profile-photo"
                data-testid="profile-photo"
                :src="profileImageUrl"
                :alt="`${profileDisplayName} 프로필 사진`"
              />
              <span v-else class="profile-avatar-fallback" data-testid="profile-avatar">{{ profileInitial }}</span>
            </span>
            <span class="profile-menu-copy">
              <strong class="profile-name-label">{{ profileDisplayName }}</strong>
              <span class="profile-email-label">{{ profileEmailLabel }}</span>
            </span>
            <span class="profile-menu-chevron" aria-hidden="true"></span>
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
              <strong>{{ profileDisplayName }}</strong>
              <small>{{ profileEmailLabel }}</small>
            </div>
            <RouterLink data-testid="mypage-link-account" role="menuitem" to="/mypage" @click="isProfileMenuOpen = false">
              내 계정
            </RouterLink>
            <RouterLink data-testid="mypage-link-notion" role="menuitem" to="/mypage/notion" @click="isProfileMenuOpen = false">
              Notion 연동 관리
            </RouterLink>
            <RouterLink data-testid="mypage-link-onboarding" role="menuitem" to="/mypage/onboarding" @click="isProfileMenuOpen = false">
              온보딩 정보
            </RouterLink>
            <button type="button" role="menuitem" @click="logout">로그아웃</button>
          </div>
        </div>

        <span
          class="header-icon-action disabled"
          aria-disabled="true"
          aria-label="알림은 준비 중입니다"
          title="알림은 준비 중입니다"
          data-testid="reserved-alerts"
        >
          <img class="bell-icon" data-testid="reserved-alerts-icon" :src="bellIconUrl" alt="" aria-hidden="true" />
        </span>
      </div>
    </header>

    <main class="app-main">
      <slot />
    </main>

    <footer class="app-footer" aria-label="서비스 정보">
      <div class="app-footer-main">
        <div class="app-footer-brand">
          <strong>EZ-ONE</strong>
          <p>채용 공고 저장부터 지원 자료 관리까지 한곳에서 정리하는 취업 준비 워크스페이스입니다.</p>
        </div>

        <nav class="app-footer-links" aria-label="서비스 하단 링크">
          <RouterLink to="/mypage/terms">이용약관</RouterLink>
          <RouterLink :to="{ path: '/mypage/terms', hash: '#privacy' }">개인정보 처리 기준</RouterLink>
        </nav>

        <address class="app-footer-contact" aria-label="운영 문의">
          <strong>운영 문의</strong>
          <a href="mailto:qkralsrb4407@naver.com">qkralsrb4407@naver.com</a>
          <a href="mailto:eunjaelee058@gmail.com">eunjaelee058@gmail.com</a>
        </address>
      </div>

      <p class="app-footer-disclaimer" data-testid="global-trademark-notice">
        표시되는 회사명과 로고는 채용공고 식별 목적으로만 사용되며, 각 상표와 로고는 해당 소유자의 자산입니다.
        EZ-ONE은 표시된 기업과 제휴 또는 후원을 의미하지 않습니다.
      </p>

      <p class="app-footer-bottom">
        <span>© 2026 EZ-ONE. All rights reserved.</span>
      </p>
    </footer>
    <ToastNotification />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import bellIconUrl from '@/assets/bell.svg';
import logoUrl from '@/assets/ez-one-logo-final.png';
import { authApi } from '@/features/auth/api/authApi';
import { clearAuthSession, getCurrentUser } from '@/features/auth/session/authSession';
import ToastNotification from './ToastNotification.vue';
import { useProfileStore } from '@/stores/profileStore';

const router = useRouter();
const profileStore = useProfileStore();
const isProfileMenuOpen = ref(false);
let profileMenuCloseTimer = null;
const currentUser = ref(getCurrentUser());
const isSsafyUser = computed(() => profileStore.profile?.ssafy === true);

onMounted(async () => {
  if (currentUser.value && !profileStore.profile && profileStore.status === 'idle') {
    await profileStore.loadProfile();
  }
  window.addEventListener('ezone:current-user-updated', syncCurrentUser);
  window.addEventListener('storage', syncCurrentUser);
});

onBeforeUnmount(() => {
  window.removeEventListener('ezone:current-user-updated', syncCurrentUser);
  window.removeEventListener('storage', syncCurrentUser);
});

const profileDisplayName = computed(() => {
  const user = currentUser.value;
  return user?.name?.trim() || user?.nickname?.trim() || user?.email || 'EZ-ONE 사용자';
});

const profileEmailLabel = computed(() => currentUser.value?.email ?? 'Google 계정');

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

function syncCurrentUser() {
  currentUser.value = getCurrentUser();
}

async function logout() {
  await endCurrentSession('/login');
}

async function endCurrentSession(nextPath) {
  try {
    await authApi.logout();
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
