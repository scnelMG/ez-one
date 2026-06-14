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
        <span class="nav-disabled" aria-disabled="true">과거 지원 내역</span>
        <RouterLink v-if="profileStore.profile?.ssafy" to="/recommendations">MM 추천 공고</RouterLink>
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
              노션 연동 관리
            </RouterLink>
            <RouterLink data-testid="mypage-link-onboarding" role="menuitem" to="/mypage/onboarding" @click="isProfileMenuOpen = false">
              온보딩 정보
            </RouterLink>
            <button type="button" role="menuitem" @click="logout">로그아웃</button>
          </div>
        </div>

        <div 
          class="notification-menu"
          @mouseenter="openNotificationMenu"
          @mouseleave="scheduleNotificationMenuClose"
        >
          <button
            type="button"
            class="header-icon-action"
            :class="{ 'has-alerts': studyStore.myInvites.length > 0 }"
            aria-label="알림"
            data-testid="reserved-alerts"
            :aria-expanded="isNotificationMenuOpen ? 'true' : 'false'"
            @mouseenter="openNotificationMenu"
            @click="isNotificationMenuOpen = !isNotificationMenuOpen"
          >
            <!-- Modern Bell SVG -->
            <svg class="bell-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <span v-if="studyStore.myInvites.length > 0" class="notification-badge">{{ studyStore.myInvites.length }}</span>
          </button>

          <div
            v-if="isNotificationMenuOpen"
            class="notification-dropdown mypage-dropdown"
            role="menu"
            @mouseenter="openNotificationMenu"
            @mouseleave="scheduleNotificationMenuClose"
          >
            <div class="notification-header">알림</div>
            <div v-if="studyStore.myInvites.length === 0" class="notification-empty">새로운 알림이 없습니다.</div>
            <div v-else class="notification-list">
              <div v-for="invite in studyStore.myInvites" :key="invite.id" class="notification-item">
                <p><strong>{{ invite.inviterEmail }}</strong>님이 <strong>{{ invite.studyName }}</strong> 스터디에 초대했습니다.</p>
                <div class="notification-actions">
                  <button class="primary-button" @click="handleInvite(invite.id, true)">수락</button>
                  <button class="ghost-button" @click="handleInvite(invite.id, false)">거절</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>

    <main class="app-main">
      <slot />
    </main>

    <footer class="app-footer" aria-label="서비스 고지">
      <p data-testid="global-trademark-notice">
        표시된 회사명과 로고는 채용공고 식별 목적으로만 사용하며, 각 상표는 해당 소유자의 자산입니다.
        EZ-ONE은 표시된 기업과 제휴 또는 후원 관계가 아닙니다.
      </p>
      <RouterLink to="/mypage/terms">이용약관</RouterLink>
    </footer>
    <ToastNotification />
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import bellIconUrl from '@/assets/bell.svg';
import logoUrl from '@/assets/ez-one-logo-final.png';
import { authApi } from '@/features/auth/api/authApi';
import { clearAuthSession, getCurrentUser, getRefreshToken } from '@/features/auth/session/authSession';
import ToastNotification from './ToastNotification.vue';
import { useProfileStore } from '@/stores/profileStore';
import { useStudyStore } from '@/stores/studyStore';

const router = useRouter();
const profileStore = useProfileStore();
const studyStore = useStudyStore();
const isProfileMenuOpen = ref(false);
const isNotificationMenuOpen = ref(false);
let profileMenuCloseTimer = null;
let notificationMenuCloseTimer = null;
const currentUser = computed(() => getCurrentUser());

onMounted(async () => {
  if (currentUser.value) {
    if (!profileStore.profile && profileStore.status === 'idle') {
      profileStore.loadProfile();
    }
    studyStore.loadMyInvites();
  }
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
  // 알림창 닫기
  if (isNotificationMenuOpen.value) {
    isNotificationMenuOpen.value = false;
  }
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

function openNotificationMenu() {
  if (notificationMenuCloseTimer) {
    clearTimeout(notificationMenuCloseTimer);
    notificationMenuCloseTimer = null;
  }
  isNotificationMenuOpen.value = true;
  // 마이페이지 닫기
  if (isProfileMenuOpen.value) {
    isProfileMenuOpen.value = false;
  }
}

function scheduleNotificationMenuClose() {
  if (notificationMenuCloseTimer) {
    clearTimeout(notificationMenuCloseTimer);
  }
  notificationMenuCloseTimer = setTimeout(() => {
    isNotificationMenuOpen.value = false;
    notificationMenuCloseTimer = null;
  }, 180);
}

async function logout() {
  await endCurrentSession('/login');
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

async function handleInvite(inviteId, accept) {
  try {
    await studyStore.respondToInvite(inviteId, accept);
    if (studyStore.myInvites.length === 0) {
      isNotificationMenuOpen.value = false;
    }
    if (accept) {
      alert('스터디에 합류했습니다!');
    }
  } catch (error) {
    alert('초대 응답 중 오류가 발생했습니다.');
  }
}
</script>

<style scoped>
.notification-menu {
  position: relative;
}
.header-icon-action {
  position: relative;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  transition: color 0.2s;
}
.header-icon-action:hover, .header-icon-action.has-alerts {
  color: var(--primary);
}
.bell-icon {
  width: 24px;
  height: 24px;
}
.notification-badge {
  position: absolute;
  top: 4px;
  right: 6px;
  background-color: #ef4444;
  color: white;
  font-size: 10px;
  font-weight: bold;
  border-radius: 50%;
  min-width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}
.notification-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  width: 320px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  z-index: 100;
  margin-top: 8px;
  overflow: hidden;
}
.notification-header {
  padding: 16px;
  font-weight: 600;
  border-bottom: 1px solid var(--line);
  background: var(--surface-hover);
}
.notification-empty {
  padding: 32px 16px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.9rem;
}
.notification-list {
  max-height: 400px;
  overflow-y: auto;
}
.notification-item {
  padding: 16px;
  border-bottom: 1px solid var(--line);
  font-size: 0.9rem;
  line-height: 1.4;
}
.notification-item:last-child {
  border-bottom: none;
}
.notification-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
.notification-actions button {
  padding: 6px 12px;
  font-size: 0.85rem;
  border-radius: 6px;
}
</style>
