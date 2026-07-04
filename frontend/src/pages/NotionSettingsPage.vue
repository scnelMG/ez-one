<template>
  <AppLayout>
    <section class="wire-page mypage-page">
      <PageHeader
        title="Notion 연동 관리"
      />

      <MyPageNav />

      <StatePanel
        v-if="notionStore.status === 'error'"
        id="notion-error"
        tone="navy"
        title="Notion 설정 오류"
        :body="notionStore.errorMessage"
      />

      <section class="mypage-panel" aria-label="노션 연동 관리">
        <article class="account-settings-card account-identity-card notion-settings-card">
          <div class="account-setting-row">
            <span class="account-setting-label">Notion 계정</span>
            <div class="account-setting-value">
              <strong>{{ notionEmail }}</strong>
            </div>
            <button
              v-if="notionStore.connection?.connected"
              class="ghost-button danger"
              type="button"
              :disabled="notionStore.status === 'saving'"
              @click="disconnectNotion"
            >
              연결 해제
            </button>
            <button
              v-else
              class="primary-button"
              type="button"
              :disabled="notionStore.status === 'saving'"
              data-testid="connect-notion"
              @click="connectNotion"
            >
              {{ connectionLabel }}
            </button>
          </div>

          <div class="account-setting-row">
            <span class="account-setting-label">공고 자동 동기화</span>
            <div class="account-setting-value">
              <strong>공고 자동 동기화 {{ notionStore.connection?.syncEnabled ? '켜짐' : '꺼짐' }}</strong>
            </div>
            <button
              class="toggle-switch"
              type="button"
              :class="{ active: notionStore.connection?.syncEnabled }"
              :disabled="notionStore.status === 'saving' || !notionStore.connection?.connected"
              data-testid="toggle-job-only-sync"
              @click="toggleSync"
            >
              {{ notionStore.connection?.connected ? (notionStore.connection?.syncEnabled ? '켜짐' : '꺼짐') : '연결 필요' }}
            </button>
          </div>

          <div class="account-setting-row notion-target-location-row">
            <span class="account-setting-label">대상 위치</span>
            <div class="account-setting-value">
              <strong>취업 준비</strong>
            </div>
          </div>
          <p class="notion-sync-help" data-testid="notion-sync-help">
            공고 정보만 Notion 취업 준비 페이지에 동기화됩니다.
            자기소개서, 도화지, 문서 프로필은 Notion으로 보내지 않습니다.
          </p>
        </article>
        <p v-if="statusMessage" class="form-status" role="status">{{ statusMessage }}</p>
        <p v-if="statusDetail" class="form-status-detail" role="status">{{ statusDetail }}</p>

        <section class="sync-log-card" aria-label="최근 동기화 기록">
          <strong class="compact-section-title">최근 동기화</strong>
          <p v-if="notionStore.status === 'loading'">Notion 설정을 불러오는 중입니다.</p>
          <ul v-else-if="visibleSyncLogs.length > 0" class="notion-log-list">
            <li v-for="log in visibleSyncLogs" :key="log.id" class="notion-log-row">
              <div>
                <strong>{{ formatSyncTarget(log.target) }} 동기화 {{ formatSyncStatus(log.status) }}</strong>
                <p>{{ log.message }}</p>
              </div>
              <span class="status-chip" :class="{ green: log.status === 'SUCCESS' }">{{ formatSyncStatus(log.status) }}</span>
            </li>
          </ul>
          <div v-else class="mypage-empty-state">
            <strong>아직 동기화된 공고가 없습니다.</strong>
            <p>장바구니에 공고를 저장하면 회사명, 직무, 마감일만 Notion에 기록됩니다.</p>
            <p>먼저 공고 장바구니에서 저장된 공고를 확인해 주세요.</p>
          </div>
        </section>
      </section>
    </section>
  </AppLayout>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  consumeNotionOAuthState,
  createNotionOAuthState,
  getNotionRedirectUri,
  redirectToNotionOAuth
} from '@/features/notion/oauth/notionOAuth';
import { useNotionStore } from '@/stores/notionStore';
import AppLayout from '@/shared/AppLayout.vue';
import PageHeader from '@/shared/PageHeader.vue';
import StatePanel from '@/shared/StatePanel.vue';
import MyPageNav from '@/shared/MyPageNav.vue';
import { showToast } from '@/shared/useToast';
import { messageFromError } from '@/shared/errorMessage';

const notionStore = useNotionStore();
const route = useRoute();
const router = useRouter();
const statusMessage = ref('');
const statusDetail = ref('');
const notionEmail = computed(() => notionStore.connection?.notionAccountEmail ?? '연결된 계정 없음');
const visibleSyncLogs = computed(() => {
  const seenBasketJobIds = new Set();
  return notionStore.syncLogs.filter((log) => {
    if (log.target !== 'JOB') {
      return false;
    }
    if (log.basketJobId == null) {
      return true;
    }
    if (seenBasketJobIds.has(log.basketJobId)) {
      return false;
    }
    seenBasketJobIds.add(log.basketJobId);
    return true;
  });
});

async function disconnectNotion() {
  if (window.confirm('Notion 연동을 해제하시겠습니까?')) {
    statusMessage.value = '';
    statusDetail.value = '';
    await notionStore.disconnectNotion();
    if (notionStore.status === 'ready') {
      statusMessage.value = 'Notion 연동이 해제되었습니다.';
      showToast('Notion 연동이 해제되었습니다.');
      return;
    }
    statusMessage.value = 'Notion 연동을 해제하지 못했습니다.';
    showToast(statusMessage.value, { tone: 'red' });
  }
}
const connectionLabel = computed(() => {
  if (notionStore.status === 'saving') return '연결 중';
  if (notionStore.connection?.connected) return '연결됨';
  return '연결하기';
});

onMounted(async () => {
  if (route.query.code) {
    await completeNotionConnection();
    return;
  }
  void notionStore.loadNotionSettings();
});

async function toggleSync() {
  const nextEnabled = !notionStore.connection?.syncEnabled;
  statusMessage.value = '';
  statusDetail.value = '';
  await notionStore.updateJobOnlySync(nextEnabled);
  if (notionStore.status === 'ready') {
    statusMessage.value = `공고 자동 동기화가 ${nextEnabled ? '켜졌습니다.' : '꺼졌습니다.'}`;
    showToast(statusMessage.value);
    return;
  }
  statusMessage.value = 'Notion 동기화 설정을 저장하지 못했습니다.';
  statusDetail.value = 'Notion 연결 상태와 네트워크를 확인한 뒤 다시 시도해 주세요.';
  showToast(statusMessage.value, { tone: 'red' });
}

async function connectNotion() {
  statusMessage.value = '';
  statusDetail.value = '';
  const redirectUri = getNotionRedirectUri();
  const state = createNotionOAuthState();
  try {
    const authorizationUrl = await notionStore.getNotionOAuthUrl({ redirectUri, state });
    redirectToNotionOAuth(new URL(authorizationUrl));
  } catch (error) {
    statusMessage.value = messageFromError(error, 'Notion OAuth URL could not be created.');
    statusDetail.value = 'Notion 연결 설정을 확인한 뒤 다시 시도해 주세요.';
    showToast(statusMessage.value, { tone: 'red' });
  }
}

async function completeNotionConnection() {
  statusMessage.value = '';
  statusDetail.value = '';
  try {
    consumeNotionOAuthState(String(route.query.state ?? ''));
    await notionStore.connectNotion({
      authorizationCode: String(route.query.code),
      redirectUri: getNotionRedirectUri()
    });
    await router.replace({ path: '/mypage/notion' });
  } catch (error) {
    if (isNotionOAuthStateError(error)) {
      await router.replace({ path: '/mypage/notion' });
      await notionStore.loadNotionSettings();
      statusMessage.value = 'Notion 연결 상태를 다시 확인했습니다.';
      return;
    }
    notionStore.status = 'error';
    notionStore.errorMessage = error instanceof Error ? error.message : 'Notion OAuth failed.';
  }
  if (notionStore.status === 'ready') {
    statusMessage.value = 'Notion 계정이 연결되었습니다.';
    showToast('Notion 계정이 연결되었습니다.');
    return;
  }
  statusMessage.value = 'Notion 계정을 연결하지 못했습니다.';
  showToast(statusMessage.value, { tone: 'red' });
}

function isNotionOAuthStateError(error) {
  return error instanceof Error && (
    error.message === 'Notion OAuth state was not found.' ||
    error.message === 'Notion OAuth state is invalid.'
  );
}

function formatSyncTarget(target) {
  if (target === 'JOB') return '공고';
  return target || '항목';
}

function formatSyncStatus(status) {
  if (status === 'SUCCESS') return '성공';
  if (status === 'FAILED' || status === 'FAILURE') return '실패';
  if (status === 'PENDING') return '대기';
  return status || '확인 중';
}
</script>

<style scoped>
.notion-sync-help,
.form-status-detail {
  color: #64748b;
  font-size: 0.9rem;
  line-height: 1.6;
  margin: 0;
}

.notion-sync-help {
  border-top: 1px solid #e2e8f0;
  padding-top: 14px;
}

.form-status-detail {
  margin-top: -8px;
}
</style>
