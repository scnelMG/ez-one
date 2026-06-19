<template>
  <AppLayout>
    <section class="wire-page mypage-page">
      <PageHeader
        eyebrow="마이페이지"
        title="마이페이지 · 노션 연동 관리"
        description="내보내기가 아니라 계정 연동만으로 공고와 작성 자료를 자동 동기화합니다."
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
        <div class="section-heading">
          <div>
            <p class="section-kicker">Notion 연동 상태</p>
            <h2>{{ connectionTitle }}</h2>
          </div>
          <button
            v-if="notionStore.connection?.connected"
            class="ghost-button danger"
            type="button"
            :disabled="notionStore.status === 'saving' || !notionStore.connection?.connected"
            @click="disconnectNotion"
          >
            연결 해제
          </button>
        </div>
        <div class="mypage-summary-strip" aria-label="Notion 연결 요약">
          <div>
            <span>Google 계정</span>
            <strong>{{ loginEmail }}</strong>
            <p>EZ-ONE 로그인에 사용하는 계정입니다.</p>
          </div>
          <div>
            <span>Notion 계정</span>
            <strong>{{ notionEmail }}</strong>
            <p>Notion OAuth로 연결된 계정입니다.</p>
          </div>
          <div>
            <span>동기화 상태</span>
            <strong>공고 자동 동기화 {{ notionStore.connection?.syncEnabled ? '켜짐' : '꺼짐' }}</strong>
            <p>P1 범위는 저장 공고 JOB_ONLY 동기화입니다.</p>
          </div>
        </div>
        <p v-if="statusMessage" class="form-status" role="status">{{ statusMessage }}</p>

        <article class="notion-account-card">
          <div>
            <span class="service-badge">G</span>
            <small>로그인 계정 (Google)</small>
            <strong>{{ loginEmail }}</strong>
          </div>
          <div>
            <span class="service-badge notion">N</span>
            <small>연동된 노션 계정</small>
            <strong>{{ notionEmail }}</strong>
          </div>
          <p>로그인 이메일과 노션 이메일이 서로 달라도 연동돼요. 가입 시 노션과 같은 계정을 쓰면 더 편해요.</p>
        </article>

        <section class="sync-settings-card" aria-label="자동 동기화">
          <div class="section-heading compact-heading">
            <div>
              <p class="section-kicker">자동 동기화</p>
              <h3>자동 동기화</h3>
              <p>노션 계정만 연동하면 아래 데이터가 노션에 자동으로 동기화돼요.</p>
            </div>
            <button
              class="toggle-switch"
              type="button"
              :class="{ active: notionStore.connection?.syncEnabled }"
              :disabled="notionStore.status === 'saving' || !notionStore.connection?.connected"
              data-testid="toggle-job-only-sync"
              @click="toggleSync"
            >
              {{ notionStore.connection?.connected ? (notionStore.connection?.syncEnabled ? '켜짐' : '꺼짐') : '연결 후 사용' }}
            </button>
          </div>
          <div class="sync-row">
            <div>
              <strong>공고 정보</strong>
              <small>공고 관리 데이터베이스로 동기화</small>
            </div>
            <span class="toggle-switch" :class="{ active: notionStore.connection?.syncEnabled }">
              {{ notionStore.connection?.connected ? (notionStore.connection?.syncEnabled ? '켜짐' : '꺼짐') : '대기' }}
            </span>
          </div>
          <div class="sync-row">
            <div>
              <strong>자소서 · 도화지</strong>
              <small>각 공고의 노션 페이지 안에 중첩 (P2 기능)</small>
            </div>
            <span class="toggle-switch disabled" aria-disabled="true">준비 중</span>
          </div>
          <div class="sync-row">
            <div>
              <strong>과거 지원 내역</strong>
              <small>지원 결과와 기업활동 기록 (P2 기능)</small>
            </div>
            <span class="toggle-switch disabled" aria-disabled="true">준비 중</span>
          </div>
          <label class="sync-location">
            대상 위치
            <select>
              <option>취업 준비 (자동 생성)</option>
            </select>
            <a href="https://www.notion.so/" target="_blank" rel="noreferrer">노션에서 열기 ↗</a>
          </label>
        </section>

        <section class="sync-log-card" aria-label="최근 동기화 기록">
          <div class="section-heading compact-heading">
            <div>
              <p class="section-kicker">동기화 기록</p>
              <h3>최근 동기화 기록</h3>
            </div>
          </div>
          <p v-if="notionStore.status === 'loading'">Notion 설정을 불러오는 중입니다.</p>
          <ul v-else-if="notionStore.syncLogs.length > 0" class="notion-log-list">
            <li v-for="log in notionStore.syncLogs" :key="log.id" class="notion-log-row">
              <div>
                <strong>{{ formatSyncTarget(log.target) }} 동기화 {{ formatSyncStatus(log.status) }}</strong>
                <p>{{ log.message }}</p>
              </div>
              <span class="status-chip" :class="{ green: log.status === 'SUCCESS' }">{{ formatSyncStatus(log.status) }}</span>
            </li>
          </ul>
          <div v-else class="mypage-empty-state">
            <strong>아직 동기화된 공고가 없습니다.</strong>
            <p>장바구니에 공고를 저장하면 JOB_ONLY 범위로 기록됩니다.</p>
          </div>
        </section>

        <button
          v-if="!notionStore.connection?.connected"
          class="primary-button"
          type="button"
          :disabled="notionStore.status === 'saving' || notionStore.connection?.connected"
          data-testid="connect-notion"
          @click="connectNotion"
        >
          {{ connectionLabel }}
        </button>
      </section>
    </section>
  </AppLayout>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { getCurrentUser } from '@/features/auth/session/authSession';
import { useNotionStore } from '@/stores/notionStore';
import AppLayout from '@/shared/AppLayout.vue';
import PageHeader from '@/shared/PageHeader.vue';
import StatePanel from '@/shared/StatePanel.vue';
import MyPageNav from '@/shared/MyPageNav.vue';
import { showToast } from '@/shared/useToast';

const notionStore = useNotionStore();
const statusMessage = ref('');
const loginEmail = computed(() => getCurrentUser()?.email ?? '로그인 정보 없음');
const notionEmail = computed(() => notionStore.connection?.notionAccountEmail ?? '연결된 계정 없음');
const connectionTitle = computed(() => notionStore.connection?.connected ? 'Notion에 연결됨' : 'Notion 연결이 필요합니다');

async function disconnectNotion() {
  if (window.confirm('Notion 연동을 해제하시겠습니까?')) {
    statusMessage.value = '';
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

onMounted(() => {
  void notionStore.loadNotionSettings();
});

async function toggleSync() {
  const nextEnabled = !notionStore.connection?.syncEnabled;
  statusMessage.value = '';
  await notionStore.updateJobOnlySync(nextEnabled);
  if (notionStore.status === 'ready') {
    statusMessage.value = `공고 자동 동기화가 ${nextEnabled ? '켜졌습니다.' : '꺼졌습니다.'}`;
    showToast(statusMessage.value);
    return;
  }
  statusMessage.value = 'Notion 동기화 설정을 저장하지 못했습니다.';
  showToast(statusMessage.value, { tone: 'red' });
}

async function connectNotion() {
  statusMessage.value = '';
  await notionStore.connectNotion();
  if (notionStore.status === 'ready') {
    statusMessage.value = 'Notion 계정이 연결되었습니다.';
    showToast('Notion 계정이 연결되었습니다.');
    return;
  }
  statusMessage.value = 'Notion 계정을 연결하지 못했습니다.';
  showToast(statusMessage.value, { tone: 'red' });
}

function formatSyncTarget(target) {
  if (target === 'JOB') return '공고';
  if (target === 'ESSAY') return '자소서';
  if (target === 'CANVAS') return '도화지';
  return target || '항목';
}

function formatSyncStatus(status) {
  if (status === 'SUCCESS') return '성공';
  if (status === 'FAILED') return '실패';
  if (status === 'PENDING') return '대기';
  return status || '확인 중';
}
</script>
