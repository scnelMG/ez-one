<template>
  <AppLayout>
    <section class="workspace-page">
      <header class="workspace-hero">
        <div class="workspace-title-block">
          <h1>지원 워크스페이스</h1>
          <div v-if="workspaceStore.workspace" class="workspace-title-meta">
            <span class="company-logo-badge" aria-hidden="true">
              <img
                v-if="workspaceStore.workspace.companyDetails?.logoUrl"
                :src="workspaceStore.workspace.companyDetails.logoUrl"
                :alt="`${workspaceStore.workspace.companyName} logo`"
                @error="workspaceStore.workspace.companyDetails.logoUrl = null"
              />
              <span v-else>{{ companyInitial(workspaceStore.workspace.companyName) }}</span>
            </span>
            <strong>{{ workspaceStore.workspace.companyName }}</strong>
            <span aria-hidden="true">|</span>
            <span>{{ workspaceStore.workspace.positionTitle }}</span>
          </div>
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
        </div>
      </header>

      <section v-if="workspaceStore.workspace" class="workspace-info-panel">
        <article class="workspace-info-section">
          <div class="workspace-section-title">
            <h2>지원정보</h2>
            <span class="status-chip" :class="workspaceStatusClass">{{ workspaceStore.workspace.statusLabel }}</span>
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
              <dd>
                <a
                  v-if="workspaceStore.workspace.sourceUrl"
                  class="info-link"
                  :href="workspaceStore.workspace.sourceUrl"
                  target="_blank"
                  rel="noreferrer"
                >
                  {{ workspaceStore.workspace.sourceUrl }}
                </a>
                <span v-else>-</span>
              </dd>
            </div>
          </dl>
        </article>

        <article class="workspace-info-section">
          <div class="workspace-section-title">
            <h2>기업정보</h2>
          </div>
          <dl class="info-grid compact">
            <div>
              <dt>기업유형</dt>
              <dd>{{ companyTypeLabel }}</dd>
            </div>
            <div>
              <dt>사원수</dt>
              <dd>{{ displayValue(workspaceStore.workspace.companyDetails?.employeeCount) }}</dd>
            </div>
            <div>
              <dt>설립일</dt>
              <dd>{{ displayValue(workspaceStore.workspace.companyDetails?.foundedAt) }}</dd>
            </div>
            <div>
              <dt>홈페이지</dt>
              <dd>
                <a
                  v-if="companyHomepageUrl"
                  class="info-link"
                  :href="companyHomepageUrl"
                  target="_blank"
                  rel="noreferrer"
                >
                  {{ companyHomepageLabel }}
                </a>
                <span v-else>-</span>
              </dd>
            </div>
            <div class="wide-info-row">
              <dt>주요사업</dt>
              <dd>{{ displayValue(cleanCompanyBusiness) }}</dd>
            </div>
            <div class="wide-info-row">
              <dt>주소</dt>
              <dd>{{ displayValue(workspaceStore.workspace.companyDetails?.address) }}</dd>
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
                <button
                  v-for="(question, index) in canvasQuestions"
                  :key="question.id"
                  class="question-item"
                  :class="{ active: index === activeQuestionIndex }"
                  type="button"
                  :data-testid="`question-tab-${index + 1}`"
                  @click="activeQuestionIndex = index"
                >
                  {{ index + 1 }}
                </button>
                <button
                  class="question-item add-question-item"
                  type="button"
                  aria-label="문항 추가"
                  data-testid="create-question"
                  @click="createQuestion"
                >
                  +
                </button>
              </aside>

              <article class="workspace-editor">
                <div class="editor-toolbar">
                  <div class="question-title-editor">
                    <p class="section-kicker">초안 작성</p>
                    <label class="question-field">
                      <input
                        v-model="editQuestion.prompt"
                        data-testid="edit-question-prompt"
                        aria-label="문항 제목"
                        @blur="saveQuestionSettings"
                        @keydown.enter.prevent="saveQuestionSettings"
                      />
                    </label>
                    <label class="question-limit-field">
                      <span>글자수</span>
                      <input
                        v-model.number="editQuestion.maxLength"
                        data-testid="edit-question-max"
                        type="number"
                        min="1"
                        @blur="saveQuestionSettings"
                        @keydown.enter.prevent="saveQuestionSettings"
                      />
                    </label>
                  </div>
                  <span
                    class="sr-only"
                    data-testid="auto-save-status"
                    :data-save-state="autoSaveStatus"
                  >
                    {{ editorStatusLabel }}
                  </span>
                </div>
                <MarkdownDraftEditor
                  v-model="draftBody"
                  data-testid="draft-editor"
                  :disabled="!currentQuestion"
                />
                <div class="editor-meta">
                  <div class="character-count-group">
                    <span data-testid="draft-character-count">
                      {{ draftCharacterCount }} / {{ currentQuestion?.maxLength ?? 1000 }}자
                    </span>
                    <div class="segmented-control" aria-label="글자수 계산 방식">
                      <button
                        type="button"
                        :class="{ active: characterCountMode === 'withSpaces' }"
                        data-testid="count-with-spaces"
                        @click="characterCountMode = 'withSpaces'"
                      >
                        공백 포함
                      </button>
                      <button
                        type="button"
                        :class="{ active: characterCountMode === 'withoutSpaces' }"
                        data-testid="count-without-spaces"
                        @click="characterCountMode = 'withoutSpaces'"
                      >
                        공백 제거
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            </section>

            <section v-else class="workspace-mode-surface version-mode">
              <aside class="question-rail version-question-rail" aria-label="버전관리 문항">
                <button
                  v-for="(question, index) in canvasQuestions"
                  :key="`version-${question.id}`"
                  class="question-item"
                  :class="{ active: index === activeQuestionIndex }"
                  type="button"
                  :data-testid="`version-question-tab-${index + 1}`"
                  @click="activeQuestionIndex = index"
                >
                  {{ index + 1 }}
                </button>
              </aside>

              <div class="version-workspace">
                <div class="section-heading">
                  <div>
                    <h2>{{ activeQuestionIndex + 1 }}번 문항 변경점 비교</h2>
                  </div>
                </div>

                <section class="final-essay-panel">
                  <div class="section-heading compact-heading">
                    <div>
                      <p class="section-kicker">{{ activeQuestionIndex + 1 }}번 문항</p>
                      <h3>새 버전 저장</h3>
                    </div>
                    <button
                      class="primary-button"
                      type="button"
                      data-testid="save-final-essay"
                      :disabled="!canSaveFinalEssay"
                      @click="saveFinalEssay"
                    >
                      버전 저장
                    </button>
                  </div>
                  <label>
                    버전 제목
                    <input v-model="finalEssayTitle" data-testid="final-essay-title" placeholder="예: 최종본, 기업분석 반영본" />
                  </label>
                  <label>
                    자소서 본문
                    <textarea
                      v-model="finalEssayBody"
                      data-testid="final-essay-body"
                      placeholder="도화지나 외부 문서에서 완성한 자소서를 붙여넣으면 이 문항의 새 버전으로 저장됩니다."
                    />
                  </label>
                </section>

                <div class="version-control-panel">
                  <label>
                    이전 버전
                    <select v-model="selectedLeftVersionId" data-testid="left-version-select">
                      <option
                        v-for="version in currentQuestionVersions"
                        :key="`left-${version.id}`"
                        :value="version.id"
                      >
                        {{ version.versionName }}
                      </option>
                    </select>
                  </label>
                  <label>
                    비교 버전
                    <select v-model="selectedRightVersionId" data-testid="right-version-select">
                      <option
                        v-for="version in currentQuestionVersions"
                        :key="`right-${version.id}`"
                        :value="version.id"
                      >
                        {{ version.versionName }}
                      </option>
                    </select>
                  </label>
                  <button
                    v-if="currentQuestionVersions.length >= 2"
                    class="ghost-button"
                    type="button"
                    data-testid="compare-versions"
                    @click="compareVersions"
                  >
                    버전 비교
                  </button>
                </div>

                <div v-if="currentQuestionVersions.length >= 2" class="version-diff-shell">
                  <div class="version-compare-grid">
                    <article class="version-paper">
                      <header>
                        <strong>{{ selectedLeftVersion?.versionName }}</strong>
                        <span>{{ selectedLeftVersion?.createdAt ?? '이전 저장본' }}</span>
                      </header>
                    </article>
                    <article class="version-paper">
                      <header>
                        <strong>{{ selectedRightVersion?.versionName }}</strong>
                        <span>{{ selectedRightVersion?.createdAt ?? '비교 저장본' }}</span>
                      </header>
                    </article>
                  </div>
                  <div class="version-diff-table" data-testid="version-diff">
                    <div class="diff-row diff-header" aria-hidden="true">
                      <span>이전</span>
                      <span>변경 후</span>
                    </div>
                    <div
                      v-for="(row, index) in versionDiffRows"
                      :key="`${row.type}-${index}`"
                      class="diff-row"
                      :class="`is-${row.type}`"
                    >
                      <pre>{{ row.left }}</pre>
                      <pre>{{ row.right }}</pre>
                    </div>
                  </div>
                </div>

                <div v-else class="version-empty-state">
                  <strong>비교할 버전이 아직 부족합니다.</strong>
                  <p>현재 초안을 버전으로 저장하면 이곳에서 이전 저장본과 변경점을 비교할 수 있습니다.</p>
                </div>

                <div class="version-list">
                  <article v-for="version in currentQuestionVersions" :key="version.id" class="version-list-item">
                    <header>
                      <strong>{{ version.versionName }}</strong>
                      <span>{{ version.createdAt ?? '저장됨' }}</span>
                    </header>
                    <p>{{ version.body }}</p>
                  </article>
                </div>

                <div v-if="workspaceStore.versionComparison" class="version-summary">
                  <span class="status-chip">비교 API 결과</span>
                  <p>{{ workspaceStore.versionComparison.leftBody }}</p>
                  <p>{{ workspaceStore.versionComparison.rightBody }}</p>
                </div>
              </div>
            </section>
          </template>
        </main>

        <div
          v-if="drawerOpen"
          class="workspace-panel-divider"
          role="separator"
          aria-label="보조 패널 너비 조절"
          aria-orientation="vertical"
          :aria-valuenow="drawerWidth"
          aria-valuemin="380"
          aria-valuemax="900"
          data-testid="workspace-panel-divider"
          @pointerdown="startDrawerResize"
          @keydown.left.prevent="nudgeDrawerWidth(24)"
          @keydown.right.prevent="nudgeDrawerWidth(-24)"
          tabindex="0"
        ></div>

        <aside
          v-if="drawerOpen"
          class="workspace-side-drawer"
          data-testid="workspace-side-drawer"
        >
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

          <div class="workspace-drawer-content">
            <header class="drawer-header">
              <div>
                <p class="section-kicker">참고자료</p>
                <h2>{{ activeBoardTitle }}</h2>
              </div>
              <button
                class="drawer-expand-button"
                type="button"
                aria-label="게시판 전체 보기"
                data-testid="board-full-view"
                @click="openBoardFullView"
              >
                ↗
              </button>
            </header>

            <section v-if="showReferenceCreateButton" class="drawer-reference-list">
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

            <section v-if="workspaceStore.activeReference && showReferenceCreateButton" class="reference-editor-panel">
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

            <button
              v-if="showReferenceCreateButton"
              class="ghost-button drawer-create-button is-icon"
              type="button"
              data-testid="create-reference"
              :aria-label="`${activeBoardTitle} 추가`"
              title="새 메모 추가"
              @click="createReference"
            >
              +
            </button>
          </div>
        </aside>
      </section>

      <Teleport to="body">
        <div
          v-if="boardFullViewOpen"
          class="floating-board-backdrop"
          role="presentation"
          data-testid="floating-board-backdrop"
          @click.self="closeBoardFullView"
        >
          <section
            class="floating-board-panel"
            role="dialog"
            aria-modal="true"
            :aria-label="`${activeBoardTitle} 전체 보기`"
            data-testid="floating-board-panel"
          >
            <header class="floating-board-header">
              <div>
                <p class="section-kicker">전체 보기</p>
                <h2>{{ activeBoardTitle }}</h2>
              </div>
              <button class="icon-button" type="button" aria-label="닫기" @click="closeBoardFullView">×</button>
            </header>
            <div class="floating-board-body">
              <component :is="activeBoardComponent" />
              <section v-if="workspaceStore.activeReference && showReferenceCreateButton" class="reference-editor-panel floating-editor">
                <div class="section-heading compact-heading">
                  <div>
                    <p class="section-kicker">{{ referenceTypeLabel(workspaceStore.activeReference.type) }}</p>
                    <h3>{{ workspaceStore.activeReference.title }}</h3>
                  </div>
                  <button
                    class="text-button danger"
                    type="button"
                    data-testid="floating-delete-reference"
                    @click="deleteReference"
                  >
                    삭제
                  </button>
                </div>
                <form class="reference-edit-form" @submit.prevent="saveReference">
                  <label>
                    유형
                    <select v-model="referenceForm.referenceType" data-testid="floating-reference-type">
                      <option v-for="type in creatableReferenceTypes" :key="type" :value="type">
                        {{ referenceTypeLabel(type) }}
                      </option>
                    </select>
                  </label>
                  <label>
                    제목
                    <input v-model="referenceForm.title" data-testid="floating-reference-title" required />
                  </label>
                  <label>
                    본문
                    <textarea v-model="referenceForm.body" data-testid="floating-reference-body" required />
                  </label>
                  <label>
                    URL
                    <input v-model="referenceForm.url" data-testid="floating-reference-url" />
                  </label>
                  <button class="primary-button" type="button" data-testid="floating-save-reference" @click="saveReference">
                    참고자료 저장
                  </button>
                </form>
              </section>
            </div>
          </section>
        </div>
      </Teleport>
    </section>
  </AppLayout>
</template>

<script setup>
import { computed, h, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
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
const activeQuestionIndex = ref(0);
const drawerOpen = ref(true);
const drawerWidth = ref(440);
const boardFullViewOpen = ref(false);
const selectedLeftVersionId = ref('');
const selectedRightVersionId = ref('');
const characterCountMode = ref('withSpaces');
const finalEssayTitle = ref('');
const finalEssayBody = ref('');
let autoSaveTimer = null;
let suppressNextDraftWatch = false;
let resizeStartX = 0;
let resizeStartWidth = 0;
let resizeLayoutWidth = 0;
let syncActiveMarkdownEditor = () => {};

const boards = [
  { type: 'JD', shortLabel: 'JD', title: 'JD 게시판' },
  { type: 'NEWS', shortLabel: '뉴스', title: '뉴스기사 게시판' },
  { type: 'DART', shortLabel: 'DART', title: 'DART 게시판' },
  { type: 'TALENT_PROFILE', shortLabel: '인재상', title: '인재상 게시판' },
  { type: 'AWARDS_PROJECTS', shortLabel: '수상/프로젝트', title: '수상/프로젝트' },
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
const boardDrafts = reactive({});
const newQuestion = reactive({
  prompt: '새 문항',
  maxLength: 1000
});
const editQuestion = reactive({
  prompt: '',
  maxLength: 1000
});

const defaultQuestions = [
  { id: 'default-1', prompt: '문항1.', draft: '', maxLength: 1000, localOnly: true },
  { id: 'default-2', prompt: '문항2.', draft: '', maxLength: 1000, localOnly: true },
  { id: 'default-3', prompt: '문항3.', draft: '', maxLength: 1000, localOnly: true }
];
const localQuestions = ref([]);
const localDrafts = reactive({});
const localQuestionEdits = reactive({});
const localVersions = ref([]);
const canvasQuestions = computed(() => {
  const sourceQuestions = workspaceStore.workspace?.questions ?? [];
  const merged = sourceQuestions.map((question) => applyLocalQuestionEdit(question));
  while (merged.length < 3) {
    merged.push(applyLocalQuestionEdit(defaultQuestions[merged.length]));
  }
  return [...merged, ...localQuestions.value.map((question) => applyLocalQuestionEdit(question))];
});
const currentQuestion = computed(() => canvasQuestions.value[activeQuestionIndex.value] ?? canvasQuestions.value[0] ?? null);
const drawerStyle = computed(() => ({ '--drawer-width': `${drawerWidth.value}px` }));
const activeBoardTitle = computed(() => boards.find((board) => board.type === activeBoard.value)?.title ?? '참고자료');
const boardsWithInlineCreate = new Set(['JD', 'NEWS', 'DART', 'TALENT_PROFILE', 'AWARDS_PROJECTS', 'PROMPT', 'FREE_MEMO']);
const showReferenceCreateButton = computed(() => !boardsWithInlineCreate.has(activeBoard.value));
const companyDetails = computed(() => workspaceStore.workspace?.companyDetails ?? {});
const companyTypeLabel = computed(() => {
  const type = normalizeCompanyValue(companyDetails.value.companyType);
  if (type && !['Y', 'N'].includes(type.toUpperCase())) return type;
  return displayValue(companyDetails.value.size);
});
const companyHomepageLabel = computed(() => normalizeCompanyValue(companyDetails.value.homepage ?? companyDetails.value.domain));
const companyHomepageUrl = computed(() => {
  const homepage = companyHomepageLabel.value;
  if (!homepage || homepage === '-') return '';
  return /^https?:\/\//i.test(homepage) ? homepage : `https://${homepage}`;
});
const cleanCompanyBusiness = computed(() => {
  const business = normalizeCompanyValue(companyDetails.value.business);
  if (!business) return '';
  const looksLikeMetadataOnly = /대표자\s*:|설립일\s*:|주소\s*:|홈페이지\s*:/u.test(business);
  return looksLikeMetadataOnly ? '' : business;
});
const workspaceStatusClass = computed(() => statusClassFromLabel(workspaceStore.workspace?.statusLabel));
const currentQuestionVersions = computed(() => {
  if (!currentQuestion.value) return [];
  return [
    ...localVersions.value,
    ...workspaceStore.versions
  ].filter((version) => version.questionId === currentQuestion.value.id);
});
const selectedLeftVersion = computed(() => currentQuestionVersions.value.find((version) => version.id === selectedLeftVersionId.value) ?? null);
const selectedRightVersion = computed(() => currentQuestionVersions.value.find((version) => version.id === selectedRightVersionId.value) ?? null);
const versionDiffRows = computed(() => buildLineDiff(selectedLeftVersion.value?.body ?? '', selectedRightVersion.value?.body ?? ''));
const canSaveFinalEssay = computed(() => Boolean(
  currentQuestion.value
  && finalEssayTitle.value.trim()
  && finalEssayBody.value.trim()
));
const draftCharacterCount = computed(() => (
  characterCountMode.value === 'withoutSpaces' ? draftBody.value.replace(/\s/g, '').length : draftBody.value.length
));
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
const editorStatusLabel = computed(() => {
  if (autoSaveStatus.value === 'waiting') return '자동 저장 대기';
  if (autoSaveStatus.value === 'saving' || workspaceStore.status === 'saving') return '저장중';
  if (autoSaveStatus.value === 'saved') return '저장완료';
  if (autoSaveStatus.value === 'failed') return '저장실패';
  return '편집 가능';
});
const activeBoardComponent = computed(() => {
  return MarkdownBoard;
});

watch(currentQuestionVersions, (versions) => {
  if (versions.length < 2) {
    selectedLeftVersionId.value = versions[0]?.id ?? '';
    selectedRightVersionId.value = versions[0]?.id ?? '';
    return;
  }
  if (!versions.some((version) => version.id === selectedLeftVersionId.value)) {
    selectedLeftVersionId.value = versions[0].id;
  }
  if (!versions.some((version) => version.id === selectedRightVersionId.value)) {
    selectedRightVersionId.value = versions[1].id;
  }
  if (selectedLeftVersionId.value === selectedRightVersionId.value) {
    selectedRightVersionId.value = versions[1].id;
  }
}, { immediate: true });

watch(currentQuestion, (question) => {
  suppressNextDraftWatch = true;
  draftBody.value = localDrafts[question?.id] ?? question?.draft ?? '';
  autoSaveStatus.value = 'idle';
  editQuestion.prompt = question?.prompt ?? '';
  editQuestion.maxLength = question?.maxLength ?? 1000;
}, { immediate: true });

watch(draftBody, () => {
  if (suppressNextDraftWatch) {
    suppressNextDraftWatch = false;
    return;
  }
  if (currentQuestion.value?.localOnly) {
    localDrafts[currentQuestion.value.id] = draftBody.value;
    autoSaveStatus.value = 'saved';
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

function applyLocalQuestionEdit(question) {
  const edit = localQuestionEdits[question.id];
  if (!edit) return question;
  return {
    ...question,
    prompt: edit.prompt ?? question.prompt,
    maxLength: edit.maxLength ?? question.maxLength
  };
}

function companyInitial(companyName) {
  return (companyName ?? '?').trim().charAt(0).toUpperCase() || '?';
}

function normalizeCompanyValue(value) {
  if (value === null || value === undefined) return '';
  const text = String(value).trim();
  if (!text || text === '미입력' || text === 'null' || text === 'undefined') return '';
  return text;
}

function displayValue(value) {
  return normalizeCompanyValue(value) || '-';
}

function statusClassFromLabel(label) {
  const text = String(label ?? '').trim();
  if (text.includes('진행')) return 'in-progress';
  if (text.includes('제출') || text.includes('완료')) return 'submitted';
  if (text.includes('미지원') || text.includes('지원전') || text.includes('지원 전')) return 'not-started';
  if (text.includes('포기') || text.includes('제외')) return 'not-applied';
  return 'not-started';
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

function createQuestion() {
  const nextIndex = canvasQuestions.value.length;
  const nextNumber = canvasQuestions.value.length + 1;
  localQuestions.value = [...localQuestions.value, {
    id: `local-${Date.now()}`,
    prompt: `문항${nextNumber}.`,
    draft: '',
    maxLength: 1000,
    localOnly: true
  }];
  activeQuestionIndex.value = nextIndex;
  rememberCurrentWorkspaceIfSaved();
}

async function saveQuestionSettings() {
  if (!currentQuestion.value || !editQuestion.prompt.trim()) return;
  const payload = {
    prompt: editQuestion.prompt,
    maxLength: editQuestion.maxLength
  };
  if (currentQuestion.value.localOnly) {
    localQuestionEdits[currentQuestion.value.id] = payload;
    const localIndex = localQuestions.value.findIndex((question) => question.id === currentQuestion.value.id);
    if (localIndex >= 0) {
      localQuestions.value = localQuestions.value.map((question, index) => (
        index === localIndex ? { ...question, ...payload } : question
      ));
    }
    rememberCurrentWorkspaceIfSaved();
    return;
  }
  await workspaceStore.updateQuestion(workspaceId.value, currentQuestion.value.id, payload);
  rememberCurrentWorkspaceIfSaved();
}

async function deleteQuestion() {
  if (!currentQuestion.value) return;
  await workspaceStore.deleteQuestion(workspaceId.value, currentQuestion.value.id);
  rememberCurrentWorkspaceIfSaved();
}

async function createVersion() {
  if (!currentQuestion.value || currentQuestion.value.localOnly) return;
  await saveDraft();
  await workspaceStore.createVersion(workspaceId.value, currentQuestion.value.id, `v${currentQuestionVersions.value.length + 1}`);
  rememberCurrentWorkspaceIfSaved();
}

function compareVersions() {
  const left = selectedLeftVersion.value;
  const right = selectedRightVersion.value;
  if (!left || !right) return;
  void workspaceStore.compareVersions(workspaceId.value, left.id, right.id);
}

function buildLineDiff(leftBody, rightBody) {
  const leftLines = splitLines(leftBody);
  const rightLines = splitLines(rightBody);
  const table = Array.from({ length: leftLines.length + 1 }, () => Array(rightLines.length + 1).fill(0));
  for (let leftIndex = leftLines.length - 1; leftIndex >= 0; leftIndex -= 1) {
    for (let rightIndex = rightLines.length - 1; rightIndex >= 0; rightIndex -= 1) {
      table[leftIndex][rightIndex] = leftLines[leftIndex] === rightLines[rightIndex]
        ? table[leftIndex + 1][rightIndex + 1] + 1
        : Math.max(table[leftIndex + 1][rightIndex], table[leftIndex][rightIndex + 1]);
    }
  }

  const rows = [];
  let leftIndex = 0;
  let rightIndex = 0;
  while (leftIndex < leftLines.length || rightIndex < rightLines.length) {
    if (leftLines[leftIndex] === rightLines[rightIndex]) {
      rows.push({ type: 'same', left: leftLines[leftIndex] ?? '', right: rightLines[rightIndex] ?? '' });
      leftIndex += 1;
      rightIndex += 1;
    } else if (rightIndex < rightLines.length && (leftIndex === leftLines.length || table[leftIndex][rightIndex + 1] >= table[leftIndex + 1][rightIndex])) {
      rows.push({ type: 'add', left: '', right: rightLines[rightIndex] });
      rightIndex += 1;
    } else if (leftIndex < leftLines.length) {
      rows.push({ type: 'remove', left: leftLines[leftIndex], right: '' });
      leftIndex += 1;
    }
  }
  return rows.length ? rows : [{ type: 'same', left: '', right: '' }];
}

function splitLines(body) {
  if (!body) return [];
  return body.replace(/\r\n/g, '\n').split('\n');
}

function openBoard(type) {
  activeBoard.value = type;
  drawerOpen.value = true;
  workspaceStore.clearActiveReference();
}

function openBoardFullView() {
  boardFullViewOpen.value = true;
}

function closeBoardFullView() {
  boardFullViewOpen.value = false;
}

function startDrawerResize(event) {
  resizeStartX = event.clientX;
  resizeStartWidth = drawerWidth.value;
  resizeLayoutWidth = event.currentTarget?.parentElement?.getBoundingClientRect?.().width ?? 0;
  event.currentTarget?.setPointerCapture?.(event.pointerId);
  window.addEventListener('pointermove', resizeDrawer);
  window.addEventListener('pointerup', stopDrawerResize, { once: true });
}

function resizeDrawer(event) {
  const nextWidth = resizeStartWidth - (event.clientX - resizeStartX);
  drawerWidth.value = clampDrawerWidth(nextWidth, resizeLayoutWidth);
}

function stopDrawerResize() {
  window.removeEventListener('pointermove', resizeDrawer);
}

function nudgeDrawerWidth(delta) {
  drawerWidth.value = clampDrawerWidth(drawerWidth.value + delta);
}

function clampDrawerWidth(width, layoutWidth = null) {
  const maxByLayout = layoutWidth ? Math.max(380, layoutWidth - 620) : 760;
  return Math.min(900, maxByLayout, Math.max(380, Math.round(width)));
}

async function saveFinalEssay() {
  if (!canSaveFinalEssay.value) return;
  const previousNewestVersion = currentQuestionVersions.value[0] ?? null;
  if (currentQuestion.value.localOnly) {
    const version = {
      id: `local-version-${Date.now()}`,
      questionId: currentQuestion.value.id,
      versionName: finalEssayTitle.value.trim(),
      body: finalEssayBody.value,
      createdAt: new Date().toLocaleString('ko-KR')
    };
    localVersions.value = [version, ...localVersions.value];
    selectedRightVersionId.value = version.id;
    selectedLeftVersionId.value = previousNewestVersion?.id ?? version.id;
    finalEssayTitle.value = '';
    finalEssayBody.value = '';
    rememberCurrentWorkspaceIfSaved();
    return;
  }
  const version = await workspaceStore.createVersion(
    workspaceId.value,
    currentQuestion.value.id,
    finalEssayTitle.value.trim(),
    finalEssayBody.value
  );
  if (version?.id) {
    selectedRightVersionId.value = version.id;
    selectedLeftVersionId.value = previousNewestVersion?.id ?? version.id;
  }
  finalEssayTitle.value = '';
  finalEssayBody.value = '';
  rememberCurrentWorkspaceIfSaved();
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
    AWARDS_PROJECTS: '수상/프로젝트',
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
      title: '뉴스기사',
      body: ''
    },
    DART: {
      title: 'DART 분석 메모',
      body: '사업보고서의 주요 제품 및 서비스, 연구개발활동, 기타 참고사항을 정리하세요.'
    },
    TALENT_PROFILE: {
      title: '인재상',
      body: ''
    },
    AWARDS_PROJECTS: {
      title: '수상/프로젝트 근거',
      body: '서류 입력 정보에서 가져온 수상과 프로젝트를 자기소개서 근거로 정리하세요.'
    },
    PROMPT: {
      title: '프롬프트',
      body: ''
    },
    FREE_MEMO: {
      title: '면접 예상 질문 정리',
      body: '면접 질문, 키워드, 아이디어를 자유롭게 기록하세요.'
    }
  }[type];
}

function ensureBoardDraft(type = activeBoard.value) {
  if (!boardDrafts[type]) {
    boardDrafts[type] = createBoardDraft(type);
  }
  return boardDrafts[type];
}

function createBoardDraft(type) {
  const template = referenceTemplate(type) ?? {
    title: activeBoardTitle.value,
    body: ''
  };
  return {
    title: template.title,
    body: template.body,
    selectedPromptCategory: '전체',
    keywordInput: '',
    keywords: [],
    articleTitle: '',
    articleUrl: '',
    articleBody: '',
    articles: [],
    entries: [],
    dartSections: {
      products: '주요 제품 및 서비스 내용을 정리하세요.',
      contracts: '주요 계약 및 연구 개발 활동 내용을 정리하세요.',
      notes: '기타 참고사항을 정리하세요.'
    },
    dartEntries: [],
    profileSections: createProfileSections(),
    prompts: [],
    isAddingPrompt: false,
    newPrompt: {
      title: '',
      category: '',
      purpose: '',
      body: ''
    }
  };
}

function createProfileSections() {
  const awards = profilePanelItems.value
    .filter((item) => item.label === '수상')
    .map((item) => ({
      id: `award-${item.title}`,
      title: item.title,
      organization: '',
      date: '',
      description: item.summary
    }));
  const projects = profilePanelItems.value
    .filter((item) => item.label === '프로젝트')
    .map((item) => ({
      id: `project-${item.title}`,
      title: item.title,
      period: '',
      role: '',
      skills: '',
      description: item.summary,
      link: ''
    }));
  return {
    awards: awards.length ? awards : [emptyAward()],
    projects: projects.length ? projects : [emptyProject()]
  };
}

function emptyAward() {
  return {
    id: `award-${Date.now()}-${Math.random()}`,
    title: '',
    organization: '',
    date: '',
    description: ''
  };
}

function emptyProject() {
  return {
    id: `project-${Date.now()}-${Math.random()}`,
    title: '',
    period: '',
    role: '',
    skills: '',
    description: '',
    link: ''
  };
}

function addAward(draft) {
  draft.profileSections.awards = [...draft.profileSections.awards, emptyAward()];
}

function addProject(draft) {
  draft.profileSections.projects = [...draft.profileSections.projects, emptyProject()];
}

function addKeyword(draft) {
  const keyword = draft.keywordInput.trim();
  if (!keyword || draft.keywords.includes(keyword)) return;
  draft.keywords = [...draft.keywords, keyword];
  draft.keywordInput = '';
}

function removeKeyword(draft, keyword) {
  draft.keywords = draft.keywords.filter((item) => item !== keyword);
}

function addArticle(draft) {
  const title = draft.articleTitle.trim();
  const url = draft.articleUrl.trim();
  const body = draft.articleBody.trim();
  if (!title || !url || !body) return;
  draft.articles = [{
    id: `article-${Date.now()}`,
    title,
    body,
    source: '직접 추가',
    date: new Date().toLocaleDateString('ko-KR'),
    url
  }, ...draft.articles];
  draft.articleTitle = '';
  draft.articleUrl = '';
  draft.articleBody = '';
}

function resetBoardDraft(draft, type = activeBoard.value) {
  const template = referenceTemplate(type) ?? { title: activeBoardTitle.value, body: '' };
  draft.title = template.title;
  draft.body = '';
  if (type === 'NEWS') {
    draft.articleTitle = '';
    draft.articleUrl = '';
    draft.articleBody = '';
  }
  if (type === 'TALENT_PROFILE') {
    draft.keywordInput = '';
    draft.keywords = [];
  }
  nextTick(() => syncActiveMarkdownEditor());
}

function saveBoardEntry(draft, type = activeBoard.value) {
  const label = referenceTypeLabel(type);
  const title = draft.title.trim() || `${label} 메모`;
  const body = normalizeCompanyValue(draft.body);
  if (!title && !body && type !== 'TALENT_PROFILE') return;
  draft.entries = [{
    id: `${type.toLowerCase()}-${Date.now()}`,
    title,
    body,
    keywords: [...(draft.keywords ?? [])],
    createdAt: new Date().toLocaleString('ko-KR')
  }, ...draft.entries];
}

function saveDartEntry(draft) {
  const title = draft.title.trim() || 'DART 메모';
  draft.dartEntries = [{
    id: `dart-${Date.now()}`,
    title,
    createdAt: new Date().toLocaleString('ko-KR'),
    sections: { ...draft.dartSections }
  }, ...draft.dartEntries];
}

function addDartEntry(draft) {
  draft.title = 'DART 분석 메모';
  draft.dartSections = {
    products: '',
    contracts: '',
    notes: ''
  };
}

function addPromptCard(draft) {
  if (!draft.newPrompt.title.trim() || !draft.newPrompt.body.trim()) return;
  const category = typeof draft.newPrompt.category === 'string' ? draft.newPrompt.category.trim() : '';
  draft.prompts = [...draft.prompts, {
    id: `prompt-${Date.now()}`,
    title: draft.newPrompt.title.trim(),
    category,
    purpose: draft.newPrompt.purpose.trim(),
    body: draft.newPrompt.body
  }];
  draft.newPrompt.title = '';
  draft.newPrompt.category = '';
  draft.newPrompt.purpose = '';
  draft.newPrompt.body = '';
  draft.isAddingPrompt = false;
}

const MarkdownBoard = {
  name: 'MarkdownBoard',
  setup() {
    const editorRef = ref(null);
    const isEmpty = ref(true);

    function updateEmptyState() {
      const text = editorRef.value?.innerText?.replace(/\u200B/g, '').trim() ?? '';
      const hasMedia = Boolean(editorRef.value?.querySelector('img'));
      isEmpty.value = !text && !hasMedia;
    }

    function focusEditor() {
      editorRef.value?.focus();
    }

    function syncEditorFromDraft() {
      const editor = editorRef.value;
      if (!editor) return;
      const draft = ensureBoardDraft();
      editor.innerHTML = plainTextToEditorHtml(draft.body);
      updateEmptyState();
    }

    syncActiveMarkdownEditor = syncEditorFromDraft;
    onMounted(syncEditorFromDraft);
    watch(activeBoard, () => nextTick(syncEditorFromDraft));

    function handlePaste(event) {
      const items = [...(event.clipboardData?.items ?? [])];
      const imageItem = items.find((item) => item.type.startsWith('image/'));
      if (imageItem) {
        event.preventDefault();
        insertImageFile(imageItem.getAsFile(), updateEmptyState);
        return;
      }

      const markdown = event.clipboardData?.getData('text/plain') ?? '';
      if (!markdown.trim()) return;
      event.preventDefault();
      insertHtmlAtCursor(markdownToHtml(markdown));
      ensureBoardDraft().body = editorToPlainText(editorRef.value);
      updateEmptyState();
    }

    function handleDrop(event) {
      const file = [...(event.dataTransfer?.files ?? [])].find((item) => item.type.startsWith('image/'));
      if (!file) return;
      event.preventDefault();
      focusEditor();
      insertImageFile(file, () => {
        ensureBoardDraft().body = editorToPlainText(editorRef.value);
        updateEmptyState();
      });
    }

    function handleKeydown(event) {
      if (event.key !== ' ' && event.key !== 'Enter') return;
      nextTick(() => {
        applyMarkdownShortcuts();
        ensureBoardDraft().body = editorToPlainText(editorRef.value);
        updateEmptyState();
      });
    }

    function handleInput() {
      ensureBoardDraft().body = editorToPlainText(editorRef.value);
      updateEmptyState();
    }

    function applyMarkdownShortcuts() {
      const selection = window.getSelection();
      const node = selection?.anchorNode?.nodeType === Node.TEXT_NODE
        ? selection.anchorNode.parentElement
        : selection?.anchorNode;
      const block = node?.closest?.('p, div, h1, h2, h3, li, blockquote, pre');
      if (!block || block.classList?.contains('markdown-placeholder')) return;
      const text = block.textContent ?? '';
      const trimmed = text.trim();
      if (trimmed === '#') {
        transformCurrentBlock(block, 'h2');
      } else if (trimmed === '##') {
        transformCurrentBlock(block, 'h3');
      } else if (trimmed === '-') {
        block.textContent = '';
        document.execCommand('insertUnorderedList');
      } else if (trimmed === '>') {
        transformCurrentBlock(block, 'blockquote');
      } else if (trimmed === '```') {
        block.replaceWith(createCodeBlock(''));
      }
    }

    function transformCurrentBlock(block, tagName) {
      const replacement = document.createElement(tagName);
      replacement.innerHTML = '<br>';
      block.replaceWith(replacement);
      placeCursorAtEnd(replacement);
    }

    function renderBoardActions(draft, type, addLabel, saveHandler = () => saveBoardEntry(draft, type)) {
      return h('div', { class: 'board-save-actions' }, [
        h('button', {
          type: 'button',
          class: 'ghost-button board-add-button',
          onClick: () => resetBoardDraft(draft, type)
        }, addLabel),
        h('button', {
          type: 'button',
          class: 'primary-button board-save-button',
          onClick: saveHandler
        }, '저장')
      ]);
    }

    function renderBoardEntryList(draft, emptyLabel = '저장한 메모가 없습니다.') {
      return h('section', { class: 'board-entry-list' }, [
        draft.entries.length ? h('h3', '저장한 목록') : null,
        ...(draft.entries.length ? draft.entries.map((entry) => h('article', { class: 'board-entry-card', key: entry.id }, [
          h('header', [
            h('strong', entry.title),
            h('span', entry.createdAt)
          ]),
          entry.keywords?.length ? h('div', { class: 'entry-keyword-list' }, entry.keywords.map((keyword) => h('span', keyword))) : null,
          entry.body ? h('p', entry.body) : null
        ])) : [h('p', { class: 'empty-board-message' }, emptyLabel)])
      ]);
    }

    function renderProfileBoard(draft) {
      const fieldInput = (item, key, placeholder, testId) => h('input', {
        value: item[key],
        'data-testid': testId,
        placeholder,
        onInput: (event) => {
          item[key] = event.target.value;
        }
      });
      const fieldText = (item, key, placeholder, testId) => h('textarea', {
        value: item[key],
        'data-testid': testId,
        placeholder,
        onInput: (event) => {
          item[key] = event.target.value;
        }
      });
      return h('section', { class: 'drawer-board profile-board-page' }, [
        h('div', { class: 'board-title-field' }, [
          h('span', '제목'),
          h('input', {
            value: draft.title,
            'data-testid': 'board-title-input',
            placeholder: '서류 게시판 제목',
            onInput: (event) => {
              draft.title = event.target.value;
            }
          })
        ]),
        h('p', { class: 'profile-board-note' }, '서류 입력 정보에 등록한 수상·프로젝트가 자동으로 불러와집니다. 이 화면에서 수정한 내용은 이 게시판 안에서만 유지됩니다.'),
        h('section', { class: 'profile-board-section' }, [
          h('h3', '수상'),
          ...draft.profileSections.awards.map((award, index) => h('article', { class: 'profile-board-form-card', key: award.id }, [
            h('label', ['수상명', fieldInput(award, 'title', '수상명', `award-title-${index}`)]),
            h('label', ['수상기관', fieldInput(award, 'organization', '수상기관', `award-organization-${index}`)]),
            h('label', ['수상일자', fieldInput(award, 'date', '수상일자', `award-date-${index}`)]),
            h('label', ['수상내용', fieldText(award, 'description', '수상내용', `award-description-${index}`)])
          ])),
          h('button', { type: 'button', class: 'dashed-add-button', onClick: () => addAward(draft) }, '+ 수상 추가')
        ]),
        h('section', { class: 'profile-board-section' }, [
          h('h3', '프로젝트'),
          ...draft.profileSections.projects.map((project, index) => h('article', { class: 'profile-board-form-card project-card', key: project.id }, [
            h('label', ['프로젝트명', fieldInput(project, 'title', '프로젝트명', `project-title-${index}`)]),
            h('label', ['진행 기간', fieldInput(project, 'period', '진행 기간', `project-period-${index}`)]),
            h('label', ['역할', fieldInput(project, 'role', '역할', `project-role-${index}`)]),
            h('label', ['사용 기술', fieldInput(project, 'skills', '사용 기술', `project-skills-${index}`)]),
            h('label', ['주요 내용', fieldText(project, 'description', '주요 내용', `project-description-${index}`)]),
            h('label', ['링크', fieldInput(project, 'link', '링크', `project-link-${index}`)])
          ])),
          h('button', { type: 'button', class: 'dashed-add-button', onClick: () => addProject(draft) }, '+ 프로젝트 추가')
        ])
      ]);
    }

    function renderPromptBoard(draft) {
      const userCategories = [...new Set(draft.prompts
        .map((prompt) => (typeof prompt.category === 'string' ? prompt.category.trim() : ''))
        .filter(Boolean))];
      const categories = ['전체', ...userCategories];
      if (!categories.includes(draft.selectedPromptCategory)) {
        draft.selectedPromptCategory = '전체';
      }
      const visiblePrompts = draft.selectedPromptCategory === '전체'
        ? draft.prompts
        : draft.prompts.filter((prompt) => prompt.category === draft.selectedPromptCategory);
      return h('section', { class: 'drawer-board prompt-board-page' }, [
        h('div', { class: 'board-title-field' }, [
          h('span', '제목'),
          h('input', {
            value: draft.title,
            'data-testid': 'board-title-input',
            placeholder: '프롬프트 게시판 제목',
            onInput: (event) => {
              draft.title = event.target.value;
            }
          })
        ]),
        h('div', { class: 'prompt-board-tools' }, [
          h('input', { placeholder: '프롬프트 내용', 'aria-label': '프롬프트 내용' }),
          h('div', { class: 'prompt-filter-pills', key: `prompt-filters-${categories.join('|')}` }, categories.map((label) => (
            h('button', {
              key: `prompt-filter-${label}`,
              type: 'button',
              class: { active: draft.selectedPromptCategory === label },
              onClick: () => {
                draft.selectedPromptCategory = label;
              }
            }, label)
          ))),
          h('button', {
            type: 'button',
            class: 'primary-button prompt-add-shortcut',
            onClick: () => {
              draft.isAddingPrompt = true;
            }
          }, '+ 프롬프트 추가')
        ]),
        h('div', { class: 'prompt-card-list' }, visiblePrompts.length ? visiblePrompts.map((prompt) => h('article', { class: 'prompt-board-card', key: prompt.id }, [
          h('header', [
            h('div', [
              h('strong', prompt.title),
              prompt.category ? h('span', prompt.category) : null
            ])
          ]),
          h('p', [h('b', '용도'), ' ', prompt.purpose]),
          h('pre', prompt.body),
          h('button', { type: 'button', class: 'ghost-button prompt-copy-button' }, '복사')
        ])) : [
          h('p', { class: 'empty-board-message' }, '저장한 프롬프트가 없습니다.')
        ]),
        draft.isAddingPrompt ? h('section', { class: 'prompt-add-form' }, [
          h('h3', '새 프롬프트 추가'),
          h('label', ['제목', h('input', {
            value: draft.newPrompt.title,
            placeholder: '프롬프트 이름',
            onInput: (event) => {
              draft.newPrompt.title = event.target.value;
            }
          })]),
          h('label', ['용도 설명', h('input', {
            value: draft.newPrompt.purpose,
            placeholder: '이 프롬프트를 언제·왜 쓰는지',
            onInput: (event) => {
              draft.newPrompt.purpose = event.target.value;
            }
          })]),
          h('label', ['프롬프트', h(MarkdownDraftEditor, {
            modelValue: draft.newPrompt.body,
            'onUpdate:modelValue': (value) => {
              draft.newPrompt.body = value;
            },
            'data-placeholder': '실제 프롬프트 내용을 입력 (변수는 [JD] [내 경험] 처럼 표시)',
            'aria-label': '프롬프트 내용',
            'data-testid': 'prompt-body-editor'
          })]),
          h('div', { class: 'prompt-form-actions' }, [
            h('button', { type: 'button', class: 'ghost-button board-add-button', onClick: () => {
              draft.newPrompt.title = '';
              draft.newPrompt.category = '';
              draft.newPrompt.purpose = '';
              draft.newPrompt.body = '';
              draft.isAddingPrompt = false;
            } }, '취소'),
            h('button', { type: 'button', class: 'primary-button board-save-button', onClick: () => addPromptCard(draft) }, '저장')
          ])
        ]) : null
      ]);
    }

    function renderTalentBoard(draft) {
      return h('section', { class: 'drawer-board talent-board-page' }, [
        h('div', { class: 'board-title-field' }, [
          h('span', '제목'),
          h('input', {
            value: draft.title,
            'data-testid': 'board-title-input',
            placeholder: '인재상 게시판 제목',
            onInput: (event) => {
              draft.title = event.target.value;
            }
          })
        ]),
        h('div', { class: 'markdown-editor-wrap' }, [
          isEmpty.value ? h('p', { class: 'markdown-placeholder' }, '인재상 문장, 이미지, 메모를 붙여넣으세요.') : null,
          h('div', {
            ref: editorRef,
            class: 'markdown-empty-page',
            contenteditable: 'true',
            'aria-label': '인재상 게시판 편집 영역',
            'data-testid': 'markdown-editor',
            onInput: handleInput,
            onPaste: handlePaste,
            onDrop: handleDrop,
            onDragover: (event) => event.preventDefault(),
            onKeydown: handleKeydown
          })
        ]),
        h('section', { class: 'keyword-panel' }, [
          h('strong', '핵심 가치 / 키워드 (직접 입력)'),
          h('div', { class: 'keyword-chip-list' }, [
            ...draft.keywords.map((keyword) => h('button', {
              type: 'button',
              class: 'keyword-chip',
              'aria-label': `${keyword} 키워드 삭제`,
              onClick: () => removeKeyword(draft, keyword)
            }, [
              h('span', keyword),
              h('span', { class: 'keyword-remove-mark', 'aria-hidden': 'true' }, '×')
            ])),
            h('form', {
              class: 'keyword-add-form',
              onSubmit: (event) => {
                event.preventDefault();
                addKeyword(draft);
              }
            }, [
              h('input', {
                value: draft.keywordInput,
                'aria-label': '새 키워드',
                placeholder: '키워드',
                onInput: (event) => {
                  draft.keywordInput = event.target.value;
                }
              }),
              h('button', { type: 'submit', 'aria-label': '키워드 추가' }, '+')
            ])
          ])
        ]),
        renderBoardActions(draft, 'TALENT_PROFILE', '+ 인재상 추가'),
        renderBoardEntryList(draft, '저장한 인재상 메모가 없습니다.')
      ]);
    }

    function renderDartBoard(draft) {
      const sectionMeta = [
        ['products', '주요 제품 및 서비스'],
        ['contracts', '주요 계약 및 연구 개발 활동'],
        ['notes', '기타 참고사항']
      ];
      return h('section', { class: 'drawer-board dart-board-page' }, [
        h('div', { class: 'board-source-path' }, [
          h('p', '전자공시(DART)에서 타깃기업 정보를 가져와 자유롭게 정리'),
          h('div', { class: 'dart-route-box' }, [
            h('div', [h('b', '확인 경로'), h('span', '전자공시 · 정기공시 검색 › 사업보고서 · 반기/분기보고서 › II. 사업의 내용')]),
            h('a', { href: 'https://dart.fss.or.kr/', target: '_blank', rel: 'noreferrer' }, 'DART 바로가기 ↗'),
            h('div', [h('b', '확인 항목'), ...sectionMeta.map(([key, label]) => h('button', {
              type: 'button',
              class: ''
            }, label))])
          ])
        ]),
        h('div', { class: 'board-title-field' }, [
          h('span', '제목'),
          h('input', {
            value: draft.title,
            'data-testid': 'board-title-input',
            placeholder: 'DART 게시판 제목',
            onInput: (event) => {
              draft.title = event.target.value;
            }
          })
        ]),
        h('div', { class: 'dart-section-list' }, sectionMeta.map(([key, label]) => h('label', {
          class: 'dart-section-card',
          key
        }, [
          h('span', label),
          h(MarkdownDraftEditor, {
            modelValue: draft.dartSections[key],
            'onUpdate:modelValue': (value) => {
              draft.dartSections[key] = value;
            },
            'data-placeholder': `${label} 내용을 마크다운으로 정리하세요.`,
            'aria-label': `${label} 내용`,
            'data-testid': `dart-section-${key}`
          })
        ]))),
        h('div', { class: 'dart-board-actions' }, [
          h('button', {
            type: 'button',
            class: 'ghost-button board-add-button',
            onClick: () => addDartEntry(draft)
          }, '+ DART 메모 추가'),
          h('button', {
            type: 'button',
            class: 'primary-button board-save-button',
            'data-testid': 'save-dart-entry',
            onClick: () => saveDartEntry(draft)
          }, '저장')
        ]),
        draft.dartEntries.length ? h('section', { class: 'dart-entry-list' }, [
          h('h3', '저장한 DART 메모'),
          ...draft.dartEntries.map((entry) => h('article', { class: 'dart-entry-card', key: entry.id }, [
            h('header', [
              h('strong', entry.title),
              h('span', entry.createdAt)
            ]),
            ...sectionMeta.map(([key, label]) => h('p', [h('b', label), ' ', entry.sections[key] || '미입력']))
          ]))
        ]) : null
      ]);
    }

    function renderNewsBoard(draft) {
      return h('section', { class: 'drawer-board news-board-page' }, [
        h('div', { class: 'board-title-field' }, [
          h('span', '제목'),
          h('input', {
            value: draft.title,
            'data-testid': 'board-title-input',
            placeholder: '뉴스 게시판 제목',
            onInput: (event) => {
              draft.title = event.target.value;
            }
          })
        ]),
        h('form', {
          class: 'article-link-form',
          onSubmit: (event) => {
            event.preventDefault();
            addArticle(draft);
          }
        }, [
          h('label', '기사 제목'),
          h('input', {
            value: draft.articleTitle,
            placeholder: '기사 제목',
            'data-testid': 'article-title-input',
            onInput: (event) => {
              draft.articleTitle = event.target.value;
            }
          }),
          h('label', '기사 링크'),
          h('input', {
            value: draft.articleUrl,
            type: 'url',
            placeholder: 'https://기사 URL 붙여넣기',
            'data-testid': 'article-url-input',
            onInput: (event) => {
              draft.articleUrl = event.target.value;
            }
          }),
          h('label', '내용'),
          h(MarkdownDraftEditor, {
            modelValue: draft.articleBody,
            'onUpdate:modelValue': (value) => {
              draft.articleBody = value;
            },
            'data-placeholder': '기사에서 자소서에 활용할 내용을 마크다운으로 정리하세요.',
            'aria-label': '기사 내용',
            'data-testid': 'article-body-input'
          })
        ]),
        renderBoardActions(draft, 'NEWS', '+ 뉴스 기사 추가', () => addArticle(draft)),
        h('section', { class: 'article-embed-list' }, [
          h('h3', '수집한 기사 목록'),
          ...(draft.articles.length ? draft.articles.map((article) => h('a', {
            key: article.id,
            class: 'article-embed-card',
            href: article.url,
            target: '_blank',
            rel: 'noreferrer'
          }, [
            h('span', '🔗'),
            h('strong', article.title),
            h('p', article.body),
            h('em', article.url),
            h('small', article.date)
          ])) : [h('p', { class: 'empty-board-message' }, '수집한 기사가 없습니다.')])
        ])
      ]);
    }

    return () => {
      const draft = ensureBoardDraft();
      if (activeBoard.value === 'AWARDS_PROJECTS') return renderProfileBoard(draft);
      if (activeBoard.value === 'PROMPT') return renderPromptBoard(draft);
      if (activeBoard.value === 'TALENT_PROFILE') return renderTalentBoard(draft);
      if (activeBoard.value === 'DART') return renderDartBoard(draft);
      if (activeBoard.value === 'NEWS') return renderNewsBoard(draft);
      const addLabel = activeBoard.value === 'JD' ? '+ JD 추가' : '+ 메모 추가';
      return h('section', { class: 'drawer-board markdown-board-page' }, [
        h('div', { class: 'board-title-field' }, [
          h('span', '제목'),
          h('input', {
            value: draft.title,
            'data-testid': 'board-title-input',
            placeholder: `${activeBoardTitle.value} 제목`,
            onInput: (event) => {
              draft.title = event.target.value;
            }
          })
        ]),
      h('div', { class: 'markdown-editor-wrap' }, [
        isEmpty.value ? h('p', { class: 'markdown-placeholder' }, '마크다운으로 입력하거나 이미지를 붙여넣으세요.') : null,
        h('div', {
          ref: editorRef,
          class: 'markdown-empty-page',
          contenteditable: 'true',
          'aria-label': '마크다운 게시판 편집 영역',
          'data-testid': 'markdown-editor',
          onInput: handleInput,
          onPaste: handlePaste,
          onDrop: handleDrop,
          onDragover: (event) => event.preventDefault(),
          onKeydown: handleKeydown
        })
      ]),
      renderBoardActions(draft, activeBoard.value, addLabel),
      renderBoardEntryList(draft, '저장한 메모가 없습니다.')
      ]);
    };
  }
};

const MarkdownDraftEditor = {
  name: 'MarkdownDraftEditor',
  props: {
    modelValue: {
      type: String,
      default: ''
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:modelValue'],
  setup(props, { emit, attrs }) {
    const editorRef = ref(null);
    let syncingFromModel = false;

    onMounted(() => {
      if (editorRef.value) {
        editorRef.value.innerHTML = plainTextToEditorHtml(props.modelValue);
      }
    });

    watch(() => props.modelValue, (value) => {
      const editor = editorRef.value;
      if (!editor || document.activeElement === editor) return;
      syncingFromModel = true;
      editor.innerHTML = plainTextToEditorHtml(value);
      syncingFromModel = false;
    }, { immediate: true });

    function emitPlainText() {
      if (syncingFromModel) return;
      emit('update:modelValue', editorToPlainText(editorRef.value));
    }

    function handlePaste(event) {
      const items = [...(event.clipboardData?.items ?? [])];
      const imageItem = items.find((item) => item.type.startsWith('image/'));
      if (imageItem) {
        event.preventDefault();
        insertImageFile(imageItem.getAsFile(), emitPlainText);
        return;
      }

      const markdown = event.clipboardData?.getData('text/plain') ?? '';
      if (!markdown.trim()) return;
      event.preventDefault();
      insertHtmlAtCursor(markdownToHtml(markdown));
      emitPlainText();
    }

    function handleDrop(event) {
      const file = [...(event.dataTransfer?.files ?? [])].find((item) => item.type.startsWith('image/'));
      if (!file) return;
      event.preventDefault();
      editorRef.value?.focus();
      insertImageFile(file, emitPlainText);
    }

    function handleKeydown(event) {
      if (event.key !== ' ' && event.key !== 'Enter') return;
      nextTick(() => {
        applyCanvasMarkdownShortcut();
        emitPlainText();
      });
    }

    function applyCanvasMarkdownShortcut() {
      const block = currentEditableBlock();
      if (!block) return;
      const trimmed = block.textContent?.trim() ?? '';
      if (trimmed === '#') {
        transformBlock(block, 'h2');
      } else if (trimmed === '##') {
        transformBlock(block, 'h3');
      } else if (trimmed === '-') {
        block.textContent = '';
        document.execCommand('insertUnorderedList');
      } else if (trimmed === '>') {
        const details = document.createElement('details');
        details.open = true;
        details.className = 'draft-toggle-block';
        details.innerHTML = '<summary>토글 제목</summary><p><br></p>';
        block.replaceWith(details);
        placeCursorAtEnd(details.querySelector('p'));
      } else if (trimmed === '```') {
        block.replaceWith(createCodeBlock(''));
      }
    }

    return () => h('div', {
      ref: editorRef,
      class: ['draft-surface', 'draft-markdown-editor', { disabled: props.disabled }],
      contenteditable: String(!props.disabled),
      role: 'textbox',
      'aria-label': '자기소개서 초안',
      'data-testid': 'draft-editor',
      'data-placeholder': '자기소개서 초안을 작성하세요.',
      ...attrs,
      onInput: emitPlainText,
      onPaste: handlePaste,
      onDrop: handleDrop,
      onDragover: (event) => event.preventDefault(),
      onKeydown: handleKeydown
    });
  }
};

function markdownToHtml(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const html = [];
  let inList = false;
  let inCode = false;
  let codeLines = [];

  const closeList = () => {
    if (!inList) return;
    html.push('</ul>');
    inList = false;
  };
  const closeCode = () => {
    if (!inCode) return;
    html.push(`<pre class="markdown-code-block"><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
    codeLines = [];
    inCode = false;
  };

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      if (inCode) closeCode();
      else {
        closeList();
        inCode = true;
        codeLines = [];
      }
      continue;
    }
    if (inCode) {
      codeLines.push(line);
      continue;
    }
    if (/^-\s+/.test(line)) {
      if (!inList) {
        html.push('<ul>');
        inList = true;
      }
      html.push(`<li>${inlineMarkdown(line.replace(/^-\s+/, ''))}</li>`);
      continue;
    }
    closeList();
    if (/^###\s+/.test(line)) html.push(`<h3>${inlineMarkdown(line.replace(/^###\s+/, ''))}</h3>`);
    else if (/^##\s+/.test(line)) html.push(`<h2>${inlineMarkdown(line.replace(/^##\s+/, ''))}</h2>`);
    else if (/^#\s+/.test(line)) html.push(`<h2>${inlineMarkdown(line.replace(/^#\s+/, ''))}</h2>`);
    else if (/^>\s+/.test(line)) html.push(`<blockquote>${inlineMarkdown(line.replace(/^>\s+/, ''))}</blockquote>`);
    else if (!line.trim()) html.push('<p><br></p>');
    else html.push(`<p>${inlineMarkdown(line)}</p>`);
  }
  closeCode();
  closeList();
  return html.join('');
}

function plainTextToEditorHtml(value) {
  if (!value?.trim()) return '<p><br></p>';
  return markdownToHtml(value);
}

function editorToPlainText(editor) {
  const text = editor?.innerText ?? editor?.textContent ?? '';
  return text
    .replace(/\u00A0/g, ' ')
    .replace(/\u200B/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd();
}

function inlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img class="markdown-pasted-image" alt="$1" src="$2">')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function insertHtmlAtCursor(html) {
  document.execCommand('insertHTML', false, html);
}

function insertNodeAtCursor(node) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    document.execCommand('insertHTML', false, node.outerHTML || node.textContent || '');
    return;
  }
  const range = selection.getRangeAt(0);
  range.deleteContents();
  range.insertNode(node);
  placeCursorAfter(node);
}

function insertImageFile(file, afterInsert = () => {}) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const image = document.createElement('img');
    image.src = String(reader.result);
    image.alt = file.name || '붙여넣은 이미지';
    image.className = 'markdown-pasted-image';
    insertNodeAtCursor(image);
    insertNodeAtCursor(document.createElement('p'));
    afterInsert();
  };
  reader.readAsDataURL(file);
}

function currentEditableBlock() {
  const selection = window.getSelection();
  const node = selection?.anchorNode?.nodeType === Node.TEXT_NODE
    ? selection.anchorNode.parentElement
    : selection?.anchorNode;
  return node?.closest?.('p, div, h1, h2, h3, li, blockquote, pre, summary');
}

function transformBlock(block, tagName) {
  const replacement = document.createElement(tagName);
  replacement.innerHTML = '<br>';
  block.replaceWith(replacement);
  placeCursorAtEnd(replacement);
}

function createCodeBlock(text) {
  const block = document.createElement('pre');
  block.className = 'markdown-code-block';
  block.textContent = text;
  return block;
}

function placeCursorAfter(node) {
  const range = document.createRange();
  range.setStartAfter(node);
  range.collapse(true);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function placeCursorAtEnd(node) {
  const range = document.createRange();
  range.selectNodeContents(node);
  range.collapse(false);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

onMounted(loadCurrentWorkspace);
watch(workspaceId, loadCurrentWorkspace);
onBeforeUnmount(() => {
  clearAutoSaveTimer();
  window.removeEventListener('pointermove', resizeDrawer);
});
</script>
