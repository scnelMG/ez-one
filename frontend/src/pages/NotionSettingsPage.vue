<template>
  <AppLayout>
    <section class="wire-page notion-wire">
      <header class="wire-toolbar">
        <div>
          <p class="section-kicker">NOTION-001</p>
          <h1>Notion 동기화</h1>
          <p>저장한 공고 정보만 Notion으로 보내고 자기소개서 작성 내용은 동기화하지 않습니다.</p>
        </div>
        <button
          class="primary-button"
          type="button"
          :disabled="notionStore.status === 'saving' || notionStore.connection?.connected"
          data-testid="connect-notion"
          @click="connectNotion"
        >
          {{ connectionLabel }}
        </button>
      </header>

      <StatePanel
        v-if="notionStore.status === 'error'"
        id="notion-error"
        tone="navy"
        title="Notion 설정 오류"
        :body="notionStore.errorMessage"
      />

      <div class="settings-grid">
        <main class="wire-board">
          <section class="notion-shell" aria-label="Notion 동기화 설정">
            <div>
              <p class="section-kicker">동기화 범위</p>
              <h2>공고만 동기화</h2>
              <p>공고명, 회사, 직무, 마감일, 원문 링크만 Notion으로 보냅니다.</p>
            </div>
            <span class="status-chip">{{ syncScopeLabel }}</span>
          </section>

          <section class="wire-panel" aria-label="Notion 계정 카드">
            <div class="section-heading">
              <div>
                <p class="section-kicker">Connection</p>
                <h2>Notion 계정</h2>
              </div>
              <button
                class="ghost-button"
                type="button"
                :disabled="notionStore.status === 'saving'"
                data-testid="toggle-job-only-sync"
                @click="toggleSync"
              >
                {{ syncToggleLabel }}
              </button>
            </div>
            <div class="notion-preview">
              <strong>{{ notionStore.connection?.notionAccountEmail ?? '연결된 계정 없음' }}</strong>
              <p>현재 P1 동기화 범위는 JOB_ONLY로 고정됩니다.</p>
              <div class="mini-lines" aria-hidden="true">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </section>

          <section class="wire-panel" aria-label="Notion 동기화 로그">
            <div class="section-heading">
              <div>
                <p class="section-kicker">Sync logs</p>
                <h2>최근 동기화 기록</h2>
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
        </main>

        <aside class="wire-side-panel">
          <StatePanel
            id="notion-job-only"
            tone="green"
            title="작성 내용은 동기화하지 않음"
            body="현재는 저장한 공고 정보만 Notion에 보냅니다. 자기소개서 초안과 개인 작성 내용은 서비스 안에 남습니다."
          />
        </aside>
      </div>
    </section>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useNotionStore } from '@/stores/notionStore'
import AppLayout from '@/shared/AppLayout.vue'
import StatePanel from '@/shared/StatePanel.vue'

const notionStore = useNotionStore()

const connectionLabel = computed(() => {
  if (notionStore.status === 'saving') {
    return '연결 중'
  }

  if (notionStore.connection?.connected) {
    return '연결됨'
  }

  return '연결하기'
})
const syncScopeLabel = computed(() => notionStore.connection?.syncScope ?? 'JOB_ONLY')
const syncToggleLabel = computed(() => {
  if (notionStore.status === 'saving') {
    return '저장 중'
  }

  return notionStore.connection?.syncEnabled ? '동기화 끄기' : '동기화 켜기'
})

onMounted(() => {
  void notionStore.loadNotionSettings()
})

function toggleSync() {
  void notionStore.updateJobOnlySync(!notionStore.connection?.syncEnabled)
}

function connectNotion() {
  void notionStore.connectNotion()
}
</script>
