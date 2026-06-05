<template>
  <AppLayout>
    <section class="wire-page workspace-wire">
      <header class="wire-toolbar">
        <div>
          <p class="section-kicker">WS-002 · WS-004</p>
          <h1>지원 워크스페이스</h1>
          <p>{{ headerDescription }}</p>
        </div>
        <div class="toolbar-actions">
          <button
            class="ghost-button"
            type="button"
            :disabled="!currentQuestion || workspaceStore.status === 'saving'"
            data-testid="save-draft"
            @click="saveDraft"
          >
            {{ draftButtonLabel }}
          </button>
          <button
            class="primary-button"
            type="button"
            :disabled="!currentQuestion || workspaceStore.status === 'saving'"
            data-testid="create-version"
            @click="createVersion"
          >
            버전 저장
          </button>
        </div>
      </header>

      <section v-if="workspaceStore.workspace" class="workspace-summary" aria-label="공고 기본 정보">
        <div>
          <span>회사</span>
          <strong>{{ workspaceStore.workspace.companyName }}</strong>
        </div>
        <div>
          <span>직무</span>
          <strong>{{ workspaceStore.workspace.positionTitle }}</strong>
        </div>
        <div>
          <span>마감</span>
          <strong>{{ workspaceStore.workspace.deadlineLabel }}</strong>
        </div>
        <div>
          <span>상태</span>
          <strong>{{ workspaceStore.workspace.statusLabel }}</strong>
        </div>
      </section>

      <section class="workspace-tabs" aria-label="워크스페이스 탭">
        <button class="tab-button active" type="button">초안 작성</button>
        <button class="tab-button" type="button">참고자료</button>
        <button class="tab-button" type="button">버전관리</button>
        <button class="tab-button" type="button">서류정보</button>
      </section>

      <section class="workspace-canvas" aria-label="자기소개서 작성 영역">
        <aside class="question-rail">
          <strong>문항</strong>
          <button class="question-item active" type="button">{{ currentQuestion?.prompt ?? '문항 없음' }}</button>
          <button class="question-item" type="button">문항 추가</button>
          <div class="mini-lines" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </aside>

        <main class="essay-panel">
          <p v-if="workspaceStore.status === 'loading'">워크스페이스를 불러오는 중입니다.</p>
          <StatePanel
            v-else-if="workspaceStore.status === 'error'"
            id="workspace-error"
            tone="navy"
            title="워크스페이스 오류"
            :body="workspaceStore.errorMessage"
          />
          <template v-else-if="workspaceStore.workspace && currentQuestion">
            <div class="editor-toolbar">
              <div>
                <p class="section-kicker">초안 작성</p>
                <h2>{{ currentQuestion.prompt }}</h2>
              </div>
              <span class="status-chip">{{ editorStatusLabel }}</span>
            </div>
            <textarea
              v-model="draftBody"
              class="draft-surface"
              data-testid="draft-editor"
              aria-label="자기소개서 초안"
            />
            <div class="editor-meta">
              <span>{{ draftBody.length }} / {{ currentQuestion.maxLength }}자</span>
              <button
                class="ghost-button"
                type="button"
                :disabled="workspaceStore.status === 'saving'"
                @click="saveDraft"
              >
                저장
              </button>
            </div>
          </template>
        </main>

        <aside class="reference-side-panel">
          <div class="section-heading">
            <div>
              <p class="section-kicker">작성 중 참고자료</p>
              <h2>참고자료</h2>
            </div>
            <button class="ghost-button" type="button">추가</button>
          </div>
          <ul v-if="workspaceStore.workspace">
            <li v-for="reference in workspaceStore.workspace.references" :key="reference.id">
              <span class="status-chip">{{ reference.type }}</span>
              <strong>{{ reference.title }}</strong>
              <p>작성 중인 문항 옆에서 바로 열어볼 수 있습니다.</p>
            </li>
          </ul>
        </aside>
      </section>

      <section class="wire-panel" aria-label="버전 목록">
        <div class="section-heading">
          <div>
            <p class="section-kicker">버전관리</p>
            <h2>저장된 버전</h2>
          </div>
        </div>
        <ul v-if="workspaceStore.versions.length > 0" class="summary-stack">
          <li v-for="version in workspaceStore.versions" :key="version.id">
            <strong>{{ version.versionName }}</strong>
            <p>{{ version.body }}</p>
          </li>
        </ul>
        <p v-else>아직 저장된 버전이 없습니다.</p>
      </section>
    </section>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from '@/shared/AppLayout.vue'
import StatePanel from '@/shared/StatePanel.vue'
import { useWorkspaceStore } from '@/stores/workspaceStore'

const route = useRoute()
const workspaceStore = useWorkspaceStore()
const workspaceId = computed(() => String(route.params.workspaceId ?? '102'))
const draftBody = ref('')
const currentQuestion = computed(() => workspaceStore.workspace?.questions[0] ?? null)
const headerDescription = computed(() => {
  const workspace = workspaceStore.workspace

  if (!workspace) {
    return `워크스페이스 ${workspaceId.value}에서 자기소개서, 참고자료, 서류 기본값을 함께 관리합니다.`
  }

  return `${workspace.companyName} ${workspace.positionTitle} 지원을 위한 작성 공간입니다.`
})
const draftButtonLabel = computed(() => (
  workspaceStore.status === 'saving' ? '저장 중' : '초안 저장'
))
const editorStatusLabel = computed(() => (
  workspaceStore.status === 'saving' ? '저장 중' : '편집 가능'
))

watch(
  currentQuestion,
  (question) => {
    draftBody.value = question?.draft ?? ''
  },
  { immediate: true }
)

function loadCurrentWorkspace() {
  void workspaceStore.loadWorkspace(workspaceId.value)
}

function saveDraft() {
  if (!currentQuestion.value) {
    return
  }

  void workspaceStore.saveDraft(workspaceId.value, currentQuestion.value.id, draftBody.value)
}

function createVersion() {
  if (!currentQuestion.value) {
    return
  }

  void workspaceStore.createVersion(
    workspaceId.value,
    currentQuestion.value.id,
    `v${workspaceStore.versions.length + 1}`
  )
}

onMounted(loadCurrentWorkspace)
watch(workspaceId, loadCurrentWorkspace)
</script>
