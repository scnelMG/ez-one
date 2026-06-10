<template>
  <AppLayout>
    <section class="wire-page mypage-page">
      <PageHeader
        eyebrow="마이페이지"
        title="마이페이지 · 노션 연동 관리"
        description="내보내기가 아니라 계정 연동만으로 공고와 작성 자료를 자동 동기화합니다."
      />

      <nav class="settings-tab-nav" aria-label="설정 메뉴">
        <RouterLink to="/mypage">내 계정</RouterLink>
        <RouterLink to="/mypage/notion" class="active">노션 연동 관리</RouterLink>
        <RouterLink to="/mypage/onboarding">온보딩 정보</RouterLink>
        <RouterLink to="/mypage/qna">자주 묻는 질문</RouterLink>
        <RouterLink to="/mypage/inquiry">1:1 문의</RouterLink>
        <RouterLink to="/mypage/partnership">제휴 문의</RouterLink>
        <RouterLink to="/mypage/terms">이용약관</RouterLink>
      </nav>

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
            <p class="section-kicker">노션 연동 상태</p>
            <h2>Notion에 연결됨</h2>
          </div>
          <button
            class="ghost-button danger"
            type="button"
            :disabled="notionStore.status === 'saving'"
          >
            연결 해제
          </button>
        </div>

        <article class="notion-account-card">
          <div>
            <span class="service-badge">G</span>
            <small>로그인 계정 (Google)</small>
            <strong>{{ loginEmail }}</strong>
          </div>
          <div>
            <span class="service-badge notion">N</span>
            <small>연동된 노션 계정</small>
            <strong>{{ notionStore.connection?.notionAccountEmail ?? '연결된 계정 없음' }}</strong>
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
              data-testid="toggle-job-only-sync"
              @click="toggleSync"
            >
              {{ notionStore.connection?.syncEnabled ? '켜짐' : '꺼짐' }}
            </button>
          </div>
          <div class="sync-row">
            <div>
              <strong>공고 정보</strong>
              <small>공고 관리 데이터베이스로 동기화</small>
            </div>
            <span class="toggle-switch" :class="{ active: notionStore.connection?.syncEnabled }">
              {{ notionStore.connection?.syncEnabled ? '켜짐' : '꺼짐' }}
            </span>
          </div>
          <div class="sync-row">
            <div>
              <strong>자소서 · 도화지</strong>
              <small>각 공고의 노션 페이지 안에 중첩 (P2 기능)</small>
            </div>
            <span class="toggle-switch disabled">꺼짐</span>
          </div>
          <div class="sync-row">
            <div>
              <strong>과거 지원 내역</strong>
              <small>지원 결과와 기업활동 기록 (P2 기능)</small>
            </div>
            <span class="toggle-switch disabled">꺼짐</span>
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
          <ul v-else-if="notionStore.syncLogs.length > 0" class="summary-stack">
            <li v-for="log in notionStore.syncLogs" :key="log.id">
              <strong>{{ log.target }} · {{ log.status }}</strong>
              <p>{{ log.message }}</p>
            </li>
          </ul>
          <p v-else>아직 동기화 기록이 없습니다.</p>
        </section>

        <button
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
import { computed, onMounted } from 'vue';
import { getCurrentUser } from '@/features/auth/session/authSession';
import { useNotionStore } from '@/stores/notionStore';
import AppLayout from '@/shared/AppLayout.vue';
import PageHeader from '@/shared/PageHeader.vue';
import StatePanel from '@/shared/StatePanel.vue';

const notionStore = useNotionStore();
const loginEmail = computed(() => getCurrentUser()?.email ?? 'hong.gildong@gmail.com');
const connectionLabel = computed(() => {
  if (notionStore.status === 'saving') return '연결 중';
  if (notionStore.connection?.connected) return '연결됨';
  return '연결하기';
});

onMounted(() => {
  void notionStore.loadNotionSettings();
});

function toggleSync() {
  void notionStore.updateJobOnlySync(!notionStore.connection?.syncEnabled);
}

function connectNotion() {
  void notionStore.connectNotion();
}
</script>
