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

      <section v-if="workspaceStore.workspace?.companyDetails" class="wire-panel" aria-label="기업 세부 정보">
        <div class="section-heading">
          <div>
            <p class="section-kicker">기업 정보</p>
            <h2>{{ workspaceStore.workspace.companyName }}</h2>
          </div>
        </div>
        <dl class="info-grid">
          <div>
            <dt>도메인</dt>
            <dd>{{ workspaceStore.workspace.companyDetails.domain ?? '미입력' }}</dd>
          </div>
          <div>
            <dt>분류</dt>
            <dd>{{ workspaceStore.workspace.companyDetails.companyType ?? '미입력' }}</dd>
          </div>
          <div>
            <dt>규모</dt>
            <dd>{{ workspaceStore.workspace.companyDetails.size ?? '미입력' }}</dd>
          </div>
          <div>
            <dt>평점</dt>
            <dd>{{ workspaceStore.workspace.companyDetails.rating ?? '미입력' }}</dd>
          </div>
          <div>
            <dt>초봉</dt>
            <dd>{{ workspaceStore.workspace.companyDetails.startingSalary ?? '미입력' }}</dd>
          </div>
          <div>
            <dt>재무상태</dt>
            <dd>{{ workspaceStore.workspace.companyDetails.financialStatus ?? '미입력' }}</dd>
          </div>
        </dl>
      </section>

      <section v-if="profilePanelItems.length > 0" class="wire-panel" aria-label="서류 입력 정보 패널">
        <div class="section-heading">
          <div>
            <p class="section-kicker">내 서류 정보</p>
            <h2>워크스페이스 기본값</h2>
          </div>
        </div>
        <ul class="summary-stack">
          <li v-for="item in profilePanelItems" :key="item.label + item.title">
            <strong>{{ item.label }}</strong>
            <p>{{ item.title }}</p>
            <small v-if="item.summary">{{ item.summary }}</small>
          </li>
        </ul>
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
          <button
            v-for="question in workspaceStore.workspace?.questions ?? []"
            :key="question.id"
            class="question-item"
            :class="{ active: question.id === currentQuestion?.id }"
            type="button"
          >
            {{ question.prompt }}
          </button>
          <label>
            새 문항
            <input v-model="newQuestion.prompt" data-testid="new-question-prompt" />
          </label>
          <label>
            글자수
            <input v-model.number="newQuestion.maxLength" data-testid="new-question-max" type="number" min="1" />
          </label>
          <button class="question-item" type="button" data-testid="create-question" @click="createQuestion">
            문항 추가
          </button>
          <label>
            현재 문항
            <input v-model="editQuestion.prompt" data-testid="edit-question-prompt" />
          </label>
          <label>
            제한
            <input v-model.number="editQuestion.maxLength" data-testid="edit-question-max" type="number" min="1" />
          </label>
          <button class="question-item" type="button" data-testid="update-question" @click="updateQuestion">
            문항 수정
          </button>
          <button class="text-button danger" type="button" data-testid="delete-question" @click="deleteQuestion">
            삭제
          </button>
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
              <span
                class="status-chip"
                data-testid="auto-save-status"
                :data-save-state="autoSaveStatus"
              >
                {{ editorStatusLabel }}
              </span>
            </div>
            <textarea
              v-model="draftBody"
              class="draft-surface"
              data-testid="draft-editor"
              aria-label="자기소개서 초안"
            />
            <div class="editor-meta">
              <span data-testid="draft-character-count">{{ draftBody.length }} / {{ currentQuestion.maxLength }}자</span>
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
            <button
              class="ghost-button"
              type="button"
              :disabled="workspaceStore.status === 'saving'"
              data-testid="create-reference"
              @click="createReference"
            >
              추가
            </button>
          </div>
          <ul v-if="workspaceStore.workspace">
            <li v-for="reference in workspaceStore.workspace.references" :key="reference.id">
              <span class="status-chip">{{ reference.type }}</span>
              <strong>{{ reference.title }}</strong>
              <p>작성 중인 문항 옆에서 바로 열어볼 수 있습니다.</p>
              <button
                class="text-button"
                type="button"
                :data-testid="`open-reference-${reference.id}`"
                @click="openReference(reference.id)"
              >
                열기
              </button>
            </li>
          </ul>
        </aside>
      </section>

      <section v-if="workspaceStore.activeReference" class="wire-panel" aria-label="참고자료 상세">
        <div class="section-heading">
          <div>
            <p class="section-kicker">{{ workspaceStore.activeReference.type }}</p>
            <h2>{{ workspaceStore.activeReference.title }}</h2>
          </div>
          <button
            class="text-button danger"
            type="button"
            data-testid="delete-reference"
            @click="deleteReference"
          >
            삭제
          </button>
        </div>
        <form class="reference-edit-form" @submit.prevent="saveReference">
          <label>
            유형
            <select v-model="referenceForm.referenceType" data-testid="reference-type">
              <option v-for="type in referenceTypes" :key="type" :value="type">{{ type }}</option>
            </select>
          </label>
          <label>
            제목
            <input v-model="referenceForm.title" data-testid="reference-title" required />
          </label>
          <label>
            본문
            <textarea v-model="referenceForm.body" data-testid="reference-body" required />
          </label>
          <p class="reference-body-preview">{{ referenceForm.body }}</p>
          <label>
            URL
            <input v-model="referenceForm.url" data-testid="reference-url" />
          </label>
          <button class="primary-button" type="button" data-testid="save-reference" @click="saveReference">
            참고자료 저장
          </button>
        </form>
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
        <button
          v-if="workspaceStore.versions.length >= 2"
          class="ghost-button"
          type="button"
          data-testid="compare-versions"
          @click="compareVersions"
        >
          버전 비교
        </button>
        <div v-if="workspaceStore.versionComparison" class="summary-stack" aria-label="버전 비교 결과">
          <strong>{{ workspaceStore.versionComparison.changed ? '변경 있음' : '변경 없음' }}</strong>
          <p>{{ workspaceStore.versionComparison.leftBody }}</p>
          <p>{{ workspaceStore.versionComparison.rightBody }}</p>
        </div>
      </section>
    </section>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from '@/shared/AppLayout.vue'
import StatePanel from '@/shared/StatePanel.vue'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import type { ReferenceType } from '@/features/workspace/api/workspaceApi'

const route = useRoute()
const workspaceStore = useWorkspaceStore()
const workspaceId = computed(() => String(route.params.workspaceId ?? '102'))
const draftBody = ref('')
const autoSaveStatus = ref<'idle' | 'waiting' | 'saving' | 'saved' | 'failed'>('idle')
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null
let suppressNextDraftWatch = false
const referenceTypes: ReferenceType[] = ['FREE_MEMO', 'JD', 'NEWS', 'DART', 'TALENT_PROFILE', 'PROMPT', 'CUSTOM']
const referenceForm = reactive({
  referenceType: 'FREE_MEMO' as ReferenceType,
  title: '',
  body: '',
  url: ''
})
const newQuestion = reactive({
  prompt: '',
  maxLength: 1000
})
const editQuestion = reactive({
  prompt: '',
  maxLength: 1000
})
const currentQuestion = computed(() => workspaceStore.workspace?.questions[0] ?? null)
const profilePanelItems = computed(() => [
  ...sectionItems('projects', '프로젝트'),
  ...sectionItems('awards', '수상')
])
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
const editorStatusLabel = computed(() => {
  if (autoSaveStatus.value === 'waiting') {
    return '자동 저장 대기'
  }

  if (autoSaveStatus.value === 'saving' || workspaceStore.status === 'saving') {
    return '저장중'
  }

  if (autoSaveStatus.value === 'saved') {
    return '저장완료'
  }

  if (autoSaveStatus.value === 'failed') {
    return '저장실패'
  }

  return '편집 가능'
})

watch(
  currentQuestion,
  (question) => {
    suppressNextDraftWatch = true
    draftBody.value = question?.draft ?? ''
    autoSaveStatus.value = 'idle'
    editQuestion.prompt = question?.prompt ?? ''
    editQuestion.maxLength = question?.maxLength ?? 1000
  },
  { immediate: true }
)

watch(draftBody, () => {
  if (suppressNextDraftWatch) {
    suppressNextDraftWatch = false
    return
  }

  scheduleAutoSave()
})

watch(
  () => workspaceStore.activeReference,
  (reference) => {
    referenceForm.referenceType = reference?.type ?? 'FREE_MEMO'
    referenceForm.title = reference?.title ?? ''
    referenceForm.body = reference?.body ?? ''
    referenceForm.url = reference?.url ?? ''
  },
  { immediate: true }
)

function loadCurrentWorkspace() {
  void workspaceStore.loadWorkspace(workspaceId.value)
}

function sectionItems(sectionName: string, label: string) {
  const section = workspaceStore.defaults?.sections[sectionName]

  if (!Array.isArray(section)) {
    return []
  }

  return section.map((item, index) => {
    const record = isRecord(item) ? item : {}
    return {
      label,
      title: String(record.title ?? record.name ?? `${label} ${index + 1}`),
      summary: record.summary ? String(record.summary) : ''
    }
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function saveDraft() {
  if (!currentQuestion.value) {
    return
  }

  clearAutoSaveTimer()
  autoSaveStatus.value = 'saving'
  await workspaceStore.saveDraft(workspaceId.value, currentQuestion.value.id, draftBody.value)
  autoSaveStatus.value = workspaceStore.status === 'error' ? 'failed' : 'saved'
}

function scheduleAutoSave() {
  if (!currentQuestion.value) {
    return
  }

  clearAutoSaveTimer()
  autoSaveStatus.value = 'waiting'
  autoSaveTimer = setTimeout(() => {
    void saveDraft()
  }, 2000)
}

function clearAutoSaveTimer() {
  if (!autoSaveTimer) {
    return
  }

  clearTimeout(autoSaveTimer)
  autoSaveTimer = null
}

function createQuestion() {
  if (!newQuestion.prompt.trim()) {
    return
  }

  void workspaceStore.createQuestion(workspaceId.value, {
    prompt: newQuestion.prompt,
    maxLength: newQuestion.maxLength
  })
  newQuestion.prompt = ''
  newQuestion.maxLength = 1000
}

function updateQuestion() {
  if (!currentQuestion.value || !editQuestion.prompt.trim()) {
    return
  }

  void workspaceStore.updateQuestion(workspaceId.value, currentQuestion.value.id, {
    prompt: editQuestion.prompt,
    maxLength: editQuestion.maxLength
  })
}

function deleteQuestion() {
  if (!currentQuestion.value) {
    return
  }

  void workspaceStore.deleteQuestion(workspaceId.value, currentQuestion.value.id)
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

function compareVersions() {
  const [left, right] = workspaceStore.versions

  if (!left || !right) {
    return
  }

  void workspaceStore.compareVersions(workspaceId.value, left.id, right.id)
}

function createReference() {
  void workspaceStore.createReference(workspaceId.value, {
    boardName: 'MEMO',
    referenceType: 'FREE_MEMO',
    title: '새 참고 메모',
    body: '직접 입력한 참고자료입니다.',
    url: ''
  })
}

function openReference(referenceId: string) {
  void workspaceStore.openReference(referenceId)
}

function saveReference() {
  const reference = workspaceStore.activeReference

  if (!reference) {
    return
  }

  void workspaceStore.updateReference(reference.id, {
    boardName: referenceForm.referenceType,
    referenceType: referenceForm.referenceType,
    title: referenceForm.title,
    body: referenceForm.body,
    url: referenceForm.url
  })
}

function deleteReference() {
  const reference = workspaceStore.activeReference

  if (!reference) {
    return
  }

  void workspaceStore.deleteReference(reference.id)
}

onMounted(loadCurrentWorkspace)
watch(workspaceId, loadCurrentWorkspace)
onBeforeUnmount(clearAutoSaveTimer)
</script>
