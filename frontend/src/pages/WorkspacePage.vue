<template>
  <AppLayout>
    <section class="workspace-page">
      <header class="workspace-hero">
        <div>
          <p class="section-kicker">WS-002 · WS-004 · REF-001</p>
          <h1>지원 워크스페이스</h1>
          <p>{{ headerDescription }}</p>
        </div>
        <div class="workspace-hero-actions">
          <a
            v-if="workspaceStore.workspace?.sourceUrl"
            class="ghost-button"
            :href="workspaceStore.workspace.sourceUrl"
            target="_blank"
            rel="noreferrer"
          >
            채용 사이트
          </a>
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

      <section v-if="workspaceStore.workspace" class="workspace-info-grid">
        <article class="workspace-info-card">
          <div class="section-heading">
            <div>
              <p class="section-kicker">지원정보</p>
              <h2>{{ workspaceStore.workspace.companyName }}</h2>
            </div>
            <span class="status-chip">{{ workspaceStore.workspace.statusLabel }}</span>
          </div>
          <dl class="info-grid compact">
            <div>
              <dt>기업명</dt>
              <dd>{{ workspaceStore.workspace.companyName }}</dd>
            </div>
            <div>
              <dt>직무</dt>
              <dd>{{ workspaceStore.workspace.positionTitle }}</dd>
            </div>
            <div>
              <dt>마감날짜</dt>
              <dd>{{ workspaceStore.workspace.deadlineLabel }}</dd>
            </div>
            <div>
              <dt>채용 사이트</dt>
              <dd>{{ workspaceStore.workspace.sourceUrl ?? '미입력' }}</dd>
            </div>
          </dl>
        </article>

        <article class="workspace-info-card">
          <div class="section-heading">
            <div>
              <p class="section-kicker">기업정보</p>
              <h2>공고 작성 근거</h2>
            </div>
            <span class="company-logo-badge" aria-hidden="true">
              <img
                v-if="workspaceStore.workspace.companyDetails?.logoUrl"
                :src="workspaceStore.workspace.companyDetails.logoUrl"
                :alt="`${workspaceStore.workspace.companyName} logo`"
                @error="workspaceStore.workspace.companyDetails.logoUrl = null"
              />
              <span v-else>{{ companyInitial(workspaceStore.workspace.companyName) }}</span>
            </span>
          </div>
          <dl class="info-grid compact">
            <div>
              <dt>기업유형</dt>
              <dd>{{ workspaceStore.workspace.companyDetails?.companyType ?? '미입력' }}</dd>
            </div>
            <div>
              <dt>도메인</dt>
              <dd>{{ workspaceStore.workspace.companyDetails?.domain ?? '미입력' }}</dd>
            </div>
            <div>
              <dt>대졸초임</dt>
              <dd>{{ workspaceStore.workspace.companyDetails?.startingSalary ?? '미입력' }}</dd>
            </div>
            <div>
              <dt>평점</dt>
              <dd>{{ workspaceStore.workspace.companyDetails?.rating ?? '미입력' }}</dd>
            </div>
          </dl>
        </article>
      </section>

      <section
        class="workspace-push-layout"
        :class="{ 'drawer-open': drawerOpen }"
        :style="drawerStyle"
        data-testid="workspace-push-layout"
      >
        <main class="workspace-main-pane" :style="drawerStyle" data-testid="workspace-main-pane">
          <div class="workspace-bottom-tabs is-fixed" data-testid="workspace-bottom-tabs">
            <button
              class="tab-button"
              :class="{ active: activeMode === 'canvas' }"
              type="button"
              data-testid="mode-canvas"
              @click="activeMode = 'canvas'"
            >
              도화지
            </button>
            <button
              class="tab-button"
              :class="{ active: activeMode === 'versions' }"
              type="button"
              data-testid="mode-versions"
              @click="activeMode = 'versions'"
            >
              자소서 버전관리
            </button>
          </div>

          <StatePanel
            v-if="workspaceStore.status === 'error'"
            id="workspace-error"
            tone="navy"
            title="워크스페이스 오류"
            :body="workspaceStore.errorMessage"
          />
          <p v-else-if="workspaceStore.status === 'loading'" class="workspace-loading">
            워크스페이스를 불러오는 중입니다.
          </p>
          <template v-else-if="workspaceStore.workspace">
            <section v-if="activeMode === 'canvas'" class="workspace-mode-surface">
              <aside class="question-rail">
                <div class="section-heading compact-heading">
                  <div>
                    <p class="section-kicker">도화지</p>
                    <h2>문항 작성</h2>
                  </div>
                </div>
                <button
                  v-for="question in workspaceStore.workspace.questions"
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
                <div class="question-actions">
                  <button class="ghost-button" type="button" data-testid="update-question" @click="updateQuestion">
                    수정
                  </button>
                  <button class="text-button danger" type="button" data-testid="delete-question" @click="deleteQuestion">
                    삭제
                  </button>
                </div>
              </aside>

              <article class="workspace-editor">
                <div class="editor-toolbar">
                  <div>
                    <p class="section-kicker">초안 작성</p>
                    <h2>{{ currentQuestion?.prompt ?? '문항을 추가해 주세요' }}</h2>
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
                  :disabled="!currentQuestion"
                />
                <div class="editor-meta">
                  <span data-testid="draft-character-count">
                    {{ draftBody.length }} / {{ currentQuestion?.maxLength ?? 0 }}자
                  </span>
                  <div>
                    <button class="ghost-button" type="button" :disabled="!currentQuestion" @click="saveDraft">
                      저장
                    </button>
                    <button class="primary-button" type="button" :disabled="!currentQuestion" @click="createVersion">
                      버전 만들기
                    </button>
                  </div>
                </div>
              </article>
            </section>

            <section v-else class="workspace-mode-surface version-mode">
              <div class="section-heading">
                <div>
                  <p class="section-kicker">자소서 버전관리</p>
                  <h2>변경점 비교</h2>
                </div>
                <button
                  v-if="workspaceStore.versions.length >= 2"
                  class="ghost-button"
                  type="button"
                  data-testid="compare-versions"
                  @click="compareVersions"
                >
                  버전 비교
                </button>
              </div>
              <div class="version-compare-grid">
                <article
                  v-for="version in comparableVersions"
                  :key="version.id"
                  class="version-paper"
                >
                  <header>
                    <strong>{{ version.versionName }}</strong>
                    <span>{{ version.createdAt ?? '저장됨' }}</span>
                  </header>
                  <p>{{ version.body }}</p>
                </article>
              </div>
              <div v-if="workspaceStore.versionComparison" class="version-summary">
                <span class="status-chip">AI 변경점 요약</span>
                <p>{{ workspaceStore.versionComparison.leftBody }}</p>
                <p>{{ workspaceStore.versionComparison.rightBody }}</p>
              </div>
            </section>
          </template>
        </main>

        <nav class="workspace-side-rail" aria-label="참고자료 게시판">
          <button
            v-for="board in boards"
            :key="board.type"
            type="button"
            :class="{ active: activeBoard === board.type }"
            :data-testid="`panel-trigger-${board.type}`"
            @click="openBoard(board.type)"
          >
            {{ board.shortLabel }}
          </button>
        </nav>

        <aside
          v-if="drawerOpen"
          class="workspace-side-drawer"
          :style="{ width: `${drawerWidth}px` }"
          data-testid="workspace-side-drawer"
        >
          <header class="drawer-header">
            <div>
              <p class="section-kicker">참고자료</p>
              <h2>{{ activeBoardTitle }}</h2>
            </div>
            <label class="drawer-resize-control">
              너비
              <input
                v-model.number="drawerWidth"
                type="range"
                min="360"
                max="720"
                step="20"
                data-testid="drawer-width"
              />
            </label>
          </header>

          <section class="drawer-reference-list">
            <button
              v-for="reference in filteredReferences"
              :key="reference.id"
              class="reference-list-item"
              type="button"
              :data-testid="`open-reference-${reference.id}`"
              @click="openReference(reference.id)"
            >
              <span>{{ referenceTypeLabel(reference.type) }}</span>
              <strong>{{ reference.title }}</strong>
            </button>
          </section>

          <component :is="activeBoardComponent" />

          <section v-if="workspaceStore.activeReference" class="reference-editor-panel">
            <div class="section-heading compact-heading">
              <div>
                <p class="section-kicker">{{ referenceTypeLabel(workspaceStore.activeReference.type) }}</p>
                <h3>{{ workspaceStore.activeReference.title }}</h3>
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
                  <option v-for="type in creatableReferenceTypes" :key="type" :value="type">
                    {{ referenceTypeLabel(type) }}
                  </option>
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

          <button class="ghost-button drawer-create-button" type="button" data-testid="create-reference" @click="createReference">
            {{ activeBoardTitle }} 추가
          </button>
        </aside>
      </section>
    </section>
  </AppLayout>
</template>

<script setup>
import { computed, h, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { rememberRecentWorkspace } from '@/features/basket/recentWorkspaces';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import AppLayout from '@/shared/AppLayout.vue';
import StatePanel from '@/shared/StatePanel.vue';

const route = useRoute();
const workspaceStore = useWorkspaceStore();
const workspaceId = computed(() => String(route.params.workspaceId ?? '102'));
const draftBody = ref('');
const autoSaveStatus = ref('idle');
const activeMode = ref('canvas');
const activeBoard = ref('JD');
const drawerOpen = ref(true);
const drawerWidth = ref(420);
let autoSaveTimer = null;
let suppressNextDraftWatch = false;

const boards = [
  { type: 'JD', shortLabel: 'JD', title: 'JD 게시판' },
  { type: 'NEWS', shortLabel: '뉴스', title: '뉴스기사 게시판' },
  { type: 'DART', shortLabel: 'DART', title: 'DART 게시판' },
  { type: 'TALENT_PROFILE', shortLabel: '인재상', title: '인재상 게시판' },
  { type: 'AWARDS_PROJECTS', shortLabel: '서류', title: '서류 / 프로젝트' },
  { type: 'PROMPT', shortLabel: '프롬프트', title: '프롬프트 게시판' },
  { type: 'FREE_MEMO', shortLabel: '메모', title: '메모 게시판' }
];
const creatableReferenceTypes = ['JD', 'NEWS', 'DART', 'TALENT_PROFILE', 'AWARDS_PROJECTS', 'PROMPT', 'FREE_MEMO'];
const referenceForm = reactive({
  referenceType: 'JD',
  title: '',
  body: '',
  url: ''
});
const newQuestion = reactive({
  prompt: '',
  maxLength: 1000
});
const editQuestion = reactive({
  prompt: '',
  maxLength: 1000
});

const currentQuestion = computed(() => workspaceStore.workspace?.questions[0] ?? null);
const drawerStyle = computed(() => ({ '--drawer-width': `${drawerWidth.value}px` }));
const activeBoardTitle = computed(() => boards.find((board) => board.type === activeBoard.value)?.title ?? '참고자료');
const comparableVersions = computed(() => workspaceStore.versions.slice(0, 2));
const filteredReferences = computed(() => {
  const references = workspaceStore.workspace?.references ?? [];
  if (activeBoard.value === 'AWARDS_PROJECTS') {
    return references.filter((reference) => ['AWARDS_PROJECTS', 'CUSTOM'].includes(reference.type));
  }
  return references.filter((reference) => reference.type === activeBoard.value || reference.boardName === activeBoard.value);
});
const profilePanelItems = computed(() => [
  ...sectionItems('awards', '수상'),
  ...sectionItems('projects', '프로젝트')
]);
const headerDescription = computed(() => {
  const workspace = workspaceStore.workspace;
  if (!workspace) {
    return `워크스페이스 ${workspaceId.value}에서 자기소개서, 참고자료, 서류 기본값을 함께 관리합니다.`;
  }
  return `${workspace.companyName} ${workspace.positionTitle} 지원을 위한 작성 공간입니다.`;
});
const draftButtonLabel = computed(() => (workspaceStore.status === 'saving' ? '저장 중' : '초안 저장'));
const editorStatusLabel = computed(() => {
  if (autoSaveStatus.value === 'waiting') return '자동 저장 대기';
  if (autoSaveStatus.value === 'saving' || workspaceStore.status === 'saving') return '저장중';
  if (autoSaveStatus.value === 'saved') return '저장완료';
  if (autoSaveStatus.value === 'failed') return '저장실패';
  return '편집 가능';
});
const activeBoardComponent = computed(() => {
  const map = {
    JD: JdBoard,
    NEWS: NewsBoard,
    DART: DartBoard,
    TALENT_PROFILE: TalentProfileBoard,
    AWARDS_PROJECTS: AwardsProjectsBoard,
    PROMPT: PromptBoard,
    FREE_MEMO: FreeMemoBoard
  };
  return map[activeBoard.value] ?? JdBoard;
});

watch(currentQuestion, (question) => {
  suppressNextDraftWatch = true;
  draftBody.value = question?.draft ?? '';
  autoSaveStatus.value = 'idle';
  editQuestion.prompt = question?.prompt ?? '';
  editQuestion.maxLength = question?.maxLength ?? 1000;
}, { immediate: true });

watch(draftBody, () => {
  if (suppressNextDraftWatch) {
    suppressNextDraftWatch = false;
    return;
  }
  scheduleAutoSave();
});

watch(() => workspaceStore.activeReference, (reference) => {
  referenceForm.referenceType = reference?.type ?? activeBoard.value;
  referenceForm.title = reference?.title ?? '';
  referenceForm.body = reference?.body ?? '';
  referenceForm.url = reference?.url ?? '';
}, { immediate: true });

function loadCurrentWorkspace() {
  void workspaceStore.loadWorkspace(workspaceId.value);
}

function sectionItems(sectionName, label) {
  const section = workspaceStore.defaults?.sections[sectionName];
  if (!Array.isArray(section)) return [];
  return section.map((item, index) => {
    const record = isRecord(item) ? item : {};
    return {
      label,
      title: String(record.title ?? record.name ?? `${label} ${index + 1}`),
      summary: record.summary ? String(record.summary) : ''
    };
  });
}

function isRecord(value) {
  return typeof value === 'object' && value !== null;
}

function companyInitial(companyName) {
  return (companyName ?? '?').trim().charAt(0).toUpperCase() || '?';
}

async function saveDraft() {
  if (!currentQuestion.value) return;
  clearAutoSaveTimer();
  autoSaveStatus.value = 'saving';
  await workspaceStore.saveDraft(workspaceId.value, currentQuestion.value.id, draftBody.value);
  rememberCurrentWorkspaceIfSaved();
  autoSaveStatus.value = workspaceStore.status === 'error' ? 'failed' : 'saved';
}

function scheduleAutoSave() {
  if (!currentQuestion.value) return;
  clearAutoSaveTimer();
  autoSaveStatus.value = 'waiting';
  autoSaveTimer = setTimeout(() => {
    void saveDraft();
  }, 2000);
}

function clearAutoSaveTimer() {
  if (!autoSaveTimer) return;
  clearTimeout(autoSaveTimer);
  autoSaveTimer = null;
}

async function createQuestion() {
  if (!newQuestion.prompt.trim()) return;
  await workspaceStore.createQuestion(workspaceId.value, {
    prompt: newQuestion.prompt,
    maxLength: newQuestion.maxLength
  });
  rememberCurrentWorkspaceIfSaved();
  newQuestion.prompt = '';
  newQuestion.maxLength = 1000;
}

async function updateQuestion() {
  if (!currentQuestion.value || !editQuestion.prompt.trim()) return;
  await workspaceStore.updateQuestion(workspaceId.value, currentQuestion.value.id, {
    prompt: editQuestion.prompt,
    maxLength: editQuestion.maxLength
  });
  rememberCurrentWorkspaceIfSaved();
}

async function deleteQuestion() {
  if (!currentQuestion.value) return;
  await workspaceStore.deleteQuestion(workspaceId.value, currentQuestion.value.id);
  rememberCurrentWorkspaceIfSaved();
}

async function createVersion() {
  if (!currentQuestion.value) return;
  await workspaceStore.createVersion(workspaceId.value, currentQuestion.value.id, `v${workspaceStore.versions.length + 1}`);
  rememberCurrentWorkspaceIfSaved();
}

function compareVersions() {
  const [left, right] = workspaceStore.versions;
  if (!left || !right) return;
  void workspaceStore.compareVersions(workspaceId.value, left.id, right.id);
}

function openBoard(type) {
  activeBoard.value = type;
  drawerOpen.value = true;
}

async function createReference() {
  const type = activeBoard.value === 'AWARDS_PROJECTS' ? 'AWARDS_PROJECTS' : activeBoard.value;
  const template = referenceTemplate(type);
  await workspaceStore.createReference(workspaceId.value, {
    boardName: type,
    referenceType: type,
    title: template.title,
    body: template.body,
    url: ''
  });
  rememberCurrentWorkspaceIfSaved();
}

function openReference(referenceId) {
  const reference = workspaceStore.workspace?.references.find((item) => item.id === referenceId);
  if (reference?.type) {
    activeBoard.value = reference.type;
  }
  drawerOpen.value = true;
  void workspaceStore.openReference(referenceId);
}

async function saveReference() {
  const reference = workspaceStore.activeReference;
  if (!reference) return;
  await workspaceStore.updateReference(reference.id, {
    boardName: referenceForm.referenceType,
    referenceType: referenceForm.referenceType,
    title: referenceForm.title,
    body: referenceForm.body,
    url: referenceForm.url
  });
  rememberCurrentWorkspaceIfSaved();
}

async function deleteReference() {
  const reference = workspaceStore.activeReference;
  if (!reference) return;
  await workspaceStore.deleteReference(reference.id);
  rememberCurrentWorkspaceIfSaved();
}

function rememberCurrentWorkspaceIfSaved() {
  if (workspaceStore.status !== 'error') {
    rememberRecentWorkspace(workspaceId.value);
  }
}

function referenceTypeLabel(type) {
  return {
    FREE_MEMO: '자유 메모',
    JD: 'JD',
    NEWS: '뉴스기사',
    DART: 'DART',
    TALENT_PROFILE: '인재상',
    AWARDS_PROJECTS: '서류/프로젝트',
    PROMPT: '프롬프트',
    CUSTOM: '작성 팁'
  }[type] ?? type;
}

function referenceTemplate(type) {
  return {
    JD: {
      title: 'JD 핵심 정리',
      body: '공고의 주요 업무, 자격요건, 우대사항을 자유롭게 정리하세요.'
    },
    NEWS: {
      title: '산업 뉴스 메모',
      body: '기업이나 산업 관련 기사 링크와 요약을 정리하세요.'
    },
    DART: {
      title: 'DART 분석 메모',
      body: '사업보고서의 주요 제품 및 서비스, 연구개발활동, 기타 참고사항을 정리하세요.'
    },
    TALENT_PROFILE: {
      title: '인재상 키워드',
      body: '채용 홈페이지의 인재상 이미지와 핵심 가치를 정리하세요.'
    },
    AWARDS_PROJECTS: {
      title: '서류 / 프로젝트 근거',
      body: '서류 입력 정보에서 가져온 수상과 프로젝트를 자기소개서 근거로 정리하세요.'
    },
    PROMPT: {
      title: '자소서 문항 초안 생성',
      body: '공고 JD와 내 경험을 바탕으로 문항별 초안을 만들 프롬프트를 정리하세요.'
    },
    FREE_MEMO: {
      title: '면접 예상 질문 정리',
      body: '면접 질문, 키워드, 아이디어를 자유롭게 기록하세요.'
    }
  }[type];
}

function toolbarButtons() {
  return ['B', 'I', 'H', '≡', '이미지', '링크', '</>'].map((label) => h('button', { type: 'button' }, label));
}

const JdBoard = {
  name: 'JdBoard',
  setup() {
    return () => h('section', { class: 'drawer-board' }, [
      h('p', { class: 'drawer-hint' }, '채용공고 원문을 붙여넣고 마크다운으로 자유롭게 정리'),
      h('h3', 'JD 원문 · 자유 작성'),
      h('div', { class: 'mini-toolbar' }, toolbarButtons()),
      h('div', { class: 'image-dropzone' }, '채용공고 캡처 이미지 붙여넣기 / 드래그'),
      h('div', { class: 'note-lines' }, [h('span'), h('span'), h('span'), h('span')])
    ]);
  }
};

const NewsBoard = {
  name: 'NewsBoard',
  setup() {
    return () => h('section', { class: 'drawer-board' }, [
      h('p', { class: 'drawer-hint' }, '기업·산업 관련 뉴스를 링크와 캡처로 모아 정리'),
      h('h3', '뉴스기사 · 자유 작성'),
      h('div', { class: 'link-add-row' }, [h('input', { placeholder: 'https:// 기사 URL 붙여넣기' }), h('button', { type: 'button' }, '추가')]),
      h('div', { class: 'collected-list' }, [h('span', '수집한 기사'), h('span', '출처 · 날짜')]),
      h('div', { class: 'mini-toolbar' }, toolbarButtons()),
      h('div', { class: 'split-note' }, [h('div', { class: 'image-dropzone' }, '기사 캡처'), h('div', { class: 'note-lines' }, [h('span'), h('span'), h('span')])])
    ]);
  }
};

const DartBoard = {
  name: 'DartBoard',
  setup() {
    return () => h('section', { class: 'drawer-board dart-board' }, [
      h('p', { class: 'drawer-hint' }, '전자공시(DART)에서 타깃기업 정보를 가져와 자유롭게 정리'),
      h('div', { class: 'dart-guide' }, [
        h('strong', '확인 경로'),
        h('span', '전자공시 > 정기공시 검색 > 사업보고서 > 사업의 내용'),
        h('a', { href: 'https://dart.fss.or.kr/', target: '_blank', rel: 'noreferrer' }, 'DART 바로가기')
      ]),
      h('div', { class: 'dart-chips' }, ['주요 제품 및 서비스', '기타 참고사항', '주요계약 및 연구개발활동'].map((label) => h('span', label))),
      h('h3', 'DART 정보 · 자유 작성'),
      h('div', { class: 'mini-toolbar' }, toolbarButtons()),
      h('div', { class: 'dart-field highlighted' }, [h('strong', '주요계약 및 연구개발활동'), h('div', { class: 'note-lines' }, [h('span'), h('span')])]),
      h('div', { class: 'dart-field' }, [h('strong', '기타 참고사항'), h('div', { class: 'note-lines' }, [h('span'), h('span')])])
    ]);
  }
};

const TalentProfileBoard = {
  name: 'TalentProfileBoard',
  setup() {
    return () => h('section', { class: 'drawer-board' }, [
      h('p', { class: 'drawer-hint' }, '채용 홈페이지의 인재상 캡처 이미지를 붙여넣고 마크다운으로 자유롭게 정리'),
      h('h3', '인재상 · 자유 작성'),
      h('div', { class: 'mini-toolbar' }, toolbarButtons()),
      h('div', { class: 'image-dropzone wide' }, '채용 홈페이지 인재상 캡처'),
      h('div', { class: 'note-lines' }, [h('span'), h('span'), h('span')]),
      h('div', { class: 'keyword-row' }, ['도전', '협업', '고객 중심', '자율', '성장', '+ 추가'].map((label) => h('span', label)))
    ]);
  }
};

const AwardsProjectsBoard = {
  name: 'AwardsProjectsBoard',
  setup() {
    return () => h('section', { class: 'drawer-board' }, [
      h('p', { class: 'drawer-hint' }, '서류 입력 정보에서 가져온 수상·프로젝트가 자동으로 표시됩니다. 이 화면에서 바로 수정·추가할 수 있어요.'),
      h('h3', '수상'),
      h('div', { class: 'profile-form-preview' }, profilePanelItems.value.filter((item) => item.label === '수상').map((item) => h('label', [h('span', item.label), h('input', { value: item.title, readonly: true })]))),
      h('button', { type: 'button', class: 'dashed-add' }, '+ 수상 추가'),
      h('h3', '프로젝트'),
      h('div', { class: 'profile-form-preview' }, profilePanelItems.value.filter((item) => item.label === '프로젝트').map((item) => h('label', [h('span', item.label), h('input', { value: item.title, readonly: true })]))),
      h('button', { type: 'button', class: 'dashed-add' }, '+ 프로젝트 추가')
    ]);
  }
};

const PromptBoard = {
  name: 'PromptBoard',
  setup() {
    return () => h('section', { class: 'drawer-board prompt-board' }, [
      h('p', { class: 'drawer-hint' }, '자주 쓰는 프롬프트를 모아두고, 각 게시판·문제지에서 바로 복사해 사용'),
      h('div', { class: 'board-filter-row' }, ['전체', '자소서', '지원동기', '입사 포부', '요약'].map((label) => h('span', label))),
      h('article', { class: 'prompt-card' }, [h('strong', '자소서 문항 초안 생성'), h('p', '공고 JD와 내 경험을 바탕으로 문항별 자소서 초안을 만들어주는 프롬프트'), h('button', { type: 'button' }, '복사')]),
      h('article', { class: 'prompt-card' }, [h('strong', '지원동기 포인트 정리'), h('p', '기업 뉴스·인재상에서 지원동기에 쓸 핵심 포인트를 뽑아주는 프롬프트'), h('button', { type: 'button' }, '복사')]),
      h('div', { class: 'prompt-add-form' }, [h('input', { placeholder: '프롬프트 이름' }), h('textarea', { placeholder: '실제 프롬프트 내용 입력' }), h('button', { type: 'button' }, '저장')])
    ]);
  }
};

const FreeMemoBoard = {
  name: 'FreeMemoBoard',
  setup() {
    return () => h('section', { class: 'drawer-board memo-board' }, [
      h('p', { class: 'drawer-hint' }, '면접 질문, 키워드, 아이디어를 자유롭게 기록합니다. 마크다운·이미지를 지원합니다.'),
      h('div', { class: 'memo-layout' }, [
        h('aside', [h('button', { type: 'button' }, '+ 새 메모'), h('span', '면접 예상 질문 정리'), h('span', '연봉·복지 메모'), h('span', '지원 동기 키워드')]),
        h('article', [h('h3', '면접 예상 질문 정리'), h('div', { class: 'mini-toolbar' }, toolbarButtons()), h('div', { class: 'note-lines' }, [h('span'), h('span'), h('span')]), h('div', { class: 'image-dropzone' }, '이미지 붙여넣기')])
      ])
    ]);
  }
};

onMounted(loadCurrentWorkspace);
watch(workspaceId, loadCurrentWorkspace);
onBeforeUnmount(clearAutoSaveTimer);
</script>
