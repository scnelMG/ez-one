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
            <div class="company-source-meta">
              <span class="company-source-status">{{ companySourceStatusLabel }}</span>
              <span v-if="companySourceNamesLabel" class="company-source-names">{{ companySourceNamesLabel }}</span>
            </div>
          </div>
          <dl v-if="availableCompanyInfoRows.length" class="info-grid compact">
            <div
              v-for="row in availableCompanyInfoRows"
              :key="row.key"
              :class="{ 'wide-info-row': row.wide }"
            >
              <dt>{{ row.label }}</dt>
              <dd>
                <a
                  v-if="row.href"
                  class="info-link"
                  :href="row.href"
                  target="_blank"
                  rel="noreferrer"
                >
                  {{ row.value }}
                </a>
                <span v-else>{{ row.value }}</span>
              </dd>
            </div>
          </dl>
          <p v-else class="company-info-empty">{{ companySourceStatusLabel }} · 공식 API에서 확인된 기업 상세 정보가 아직 없습니다.</p>
        </article>
      </section>

      <div
        class="workspace-layout-wrapper"
        :class="{ 'drawer-open': !isMinimized }"
        data-testid="workspace-push-layout"
      >
        <main class="workspace-main-pane" data-testid="workspace-main-pane">
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
                      <textarea
                        v-model="editQuestion.prompt"
                        data-testid="edit-question-prompt"
                        aria-label="문항 제목"
                        rows="2"
                        @blur="saveQuestionSettings"
                        @keydown.enter.prevent="saveQuestionSettings"
                      />
                    </label>
                  </div>
                  <div class="editor-status-column">
                    <span
                      class="auto-save-badge"
                      data-testid="auto-save-status"
                      :data-save-state="autoSaveStatus"
                    >
                      {{ editorStatusLabel }}
                    </span>
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
                  <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                    <h2 class="version-section-title">{{ activeQuestionIndex + 1 }}번 문항 {{ isCreatingNewVersion ? '새 버전 저장' : '변경점 비교' }}</h2>
                    <button
                      v-if="!isCreatingNewVersion"
                      class="primary-button"
                      style="background: #8b5cf6; border-color: #8b5cf6;"
                      type="button"
                      @click="isCreatingNewVersion = true"
                    >
                      새 버전 저장하기
                    </button>
                    <button
                      v-else
                      class="ghost-button"
                      type="button"
                      @click="isCreatingNewVersion = false"
                    >
                      비교 화면으로 돌아가기
                    </button>
                  </div>
                </div>

                <section v-if="isCreatingNewVersion" class="final-essay-panel">
                  <div class="section-heading compact-heading">
                    <div>
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

                <template v-else>
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
                  <div class="version-diff-table github-split-diff" data-testid="version-diff">
                    <template v-for="(row, index) in versionDiffRows.leftRows" :key="index">
                      <div class="diff-row diff-row-line left-cell" :class="`is-${row.type}`">
                        <span class="diff-indicator">{{ row.type === 'remove' ? '-' : ' ' }}</span>
                        <pre>{{ row.content }}</pre>
                      </div>
                      <div class="diff-row diff-row-line right-cell" :class="`is-${versionDiffRows.rightRows[index].type}`">
                        <span class="diff-indicator">{{ versionDiffRows.rightRows[index].type === 'add' ? '+' : ' ' }}</span>
                        <pre>{{ versionDiffRows.rightRows[index].content }}</pre>
                      </div>
                    </template>
                  </div>
                  <div class="diff-legend">
                    <span class="legend-item remove"><span class="box"></span> 삭제됨</span>
                    <span class="legend-item add"><span class="box"></span> 추가됨</span>
                    <span class="legend-item same"><span class="box"></span> 변경없음</span>
                  </div>
                </div>

                <div v-else class="version-empty-state">
                  <strong>비교할 버전이 아직 부족합니다.</strong>
                  <p>현재 초안을 버전으로 저장하면 이곳에서 이전 저장본과 변경점을 비교할 수 있습니다.</p>
                </div>

                </template>

                <div class="version-summary ai-summary" style="margin-top: 24px; padding: 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                  <div class="section-heading compact-heading" style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
                    <h3 class="version-section-title">
                      AI 변경점 요약
                    </h3>
                    <div class="ai-summary-actions">
                      <button
                        v-if="selectedLeftVersionId && selectedRightVersionId"
                        class="ai-summary-refresh-button"
                        type="button"
                        @click="compareVersions"
                        :disabled="workspaceStore.isComparingVersions"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M20 12a8 8 0 0 1-13.66 5.66M4 12A8 8 0 0 1 17.66 6.34" />
                          <path d="M20 5v5h-5M4 19v-5h5" />
                        </svg>
                        <span>새로고침</span>
                      </button>
                    </div>
                  </div>

                  <div v-if="workspaceStore.isComparingVersions" class="ai-summary-loading" data-testid="ai-summary-loading">
                    <span class="ai-summary-spinner" aria-hidden="true"></span>
                    <span>AI가 자소서 변경점을 요약하는 중입니다.</span>
                  </div>
                  <div v-else-if="activeComparisonSummary" class="ai-summary-content" style="white-space: pre-wrap; line-height: 1.6; color: #334155; padding-top: 16px; border-top: 1px solid #e2e8f0;">
                    {{ activeComparisonSummary }}
                  </div>
                  <div v-else class="ai-summary-content" style="padding: 16px; color: #64748b; text-align: center;">
                    두 버전을 비교하시면 AI가 변경점을 요약해 드립니다.
                  </div>
                </div>
              </div>
            </section>
          </template>
        </main>

        <Teleport to="body">
          <button
            v-if="isMinimized"
            class="bee-minimize-button"
            :style="beeStyle"
            @click="onBeeClick"
            title="참고자료 열기"
          >
            <img src="/bee-mascot.png" alt="참고자료 열기" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; pointer-events: none;" />
          </button>
        </Teleport>

        <aside
          v-show="!isMinimized"
          class="floating-side-panel"
          data-testid="workspace-side-drawer"
          data-panel-testid="workspace-floating-panel"
        >
          <header class="floating-panel-header">
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
            <button class="panel-collapse-button minimize-btn" type="button" @click.stop="isMinimized = true" aria-label="사이드 패널 접기">
              <span aria-hidden="true">−</span>
              <span>접기</span>
            </button>
          </header>
          <div class="floating-panel-body">
            <div class="workspace-drawer-content">
              <button
                class="drawer-expand-button drawer-floating-expand"
                type="button"
                aria-label="게시판 전체 보기"
                data-testid="board-full-view"
                @click="openBoardFullView"
              >
                ↗
              </button>

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
                  <button class="primary-button small-button" type="button" data-testid="save-reference" @click="saveReference">
                    저장
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
          </div>
        </aside>
      </div>

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
              <p class="sr-only">마크다운으로 입력하거나 이미지를 붙여넣으세요.</p>
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
                  <button class="primary-button small-button" type="button" data-testid="floating-save-reference" @click="saveReference">
                    저장
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
import { diffArrays } from 'diff';
import { useRoute } from 'vue-router';
import { rememberRecentWorkspace } from '@/features/basket/recentWorkspaces';
import { workspaceApi } from '@/features/workspace/api/workspaceApi';
import { useWorkspaceStore } from '@/stores/workspaceStore';

const isCreatingNewVersion = ref(false);
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
const boardFullViewOpen = ref(false);
const selectedLeftVersionId = ref('');
const selectedRightVersionId = ref('');
const characterCountMode = ref('withSpaces');
const finalEssayTitle = ref('');
const finalEssayBody = ref('');
let autoSaveTimer = null;
let suppressNextDraftWatch = false;
let syncActiveMarkdownEditor = () => {};

const isMinimized = ref(false);
const beeStyle = reactive({ top: 'auto', left: 'auto', bottom: '40px', right: '40px' });

function onBeeClick() {
  isMinimized.value = false;
}

const boards = [
  { type: 'JD', shortLabel: 'JD', title: 'JD 게시판' },
  { type: 'NEWS', shortLabel: '뉴스', title: '뉴스기사 게시판' },
  { type: 'DART', shortLabel: 'DART', title: 'DART 게시판' },
  { type: 'TALENT_PROFILE', shortLabel: '인재상', title: '인재상 게시판' },
  { type: 'AWARDS_PROJECTS', shortLabel: '수상/프로젝트', title: '수상/프로젝트' },
  { type: 'PROMPT', shortLabel: '프롬프트', title: '프롬프트 게시판' },
  { type: 'FREE_MEMO', shortLabel: '메모', title: '메모 게시판' }
];
const dartSectionMeta = [
  {
    legacyKey: 'products',
    analysisKey: 'mainProductsAndServices',
    title: '주요 제품 및 서비스',
    shortTitle: '제품/서비스'
  },
  {
    legacyKey: 'contracts',
    analysisKey: 'contractsAndRAndD',
    title: '주요 계약 및 연구 개발 활동',
    shortTitle: '계약/R&D'
  },
  {
    legacyKey: 'notes',
    analysisKey: 'otherNotes',
    title: '기타 참고사항',
    shortTitle: '참고사항'
  }
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
const activeBoardTitle = computed(() => boards.find((board) => board.type === activeBoard.value)?.title ?? '참고자료');
const boardsWithInlineCreate = new Set(['JD', 'NEWS', 'DART', 'TALENT_PROFILE', 'AWARDS_PROJECTS', 'PROMPT', 'FREE_MEMO']);
const showReferenceCreateButton = computed(() => !boardsWithInlineCreate.has(activeBoard.value));
const companyDetails = computed(() => workspaceStore.workspace?.companyDetails ?? {});
const companyTypeLabel = computed(() => {
  const category = normalizeCompanyValue(companyDetails.value.companyCategory);
  if (category) return category;
  const type = normalizeCompanyValue(companyDetails.value.companyType);
  if (type && !['Y', 'N'].includes(type.toUpperCase())) return type;
  return displayValue(companyDetails.value.size);
});
const companyHomepageLabel = computed(() => normalizeCompanyValue(companyDetails.value.homepage ?? companyDetails.value.domain));
const companyHomepageUrl = computed(() => {
  const homepage = companyHomepageLabel.value;
  if (!visibleCompanyInfoValue(homepage)) return '';
  return /^https?:\/\//i.test(homepage) ? homepage : `https://${homepage}`;
});
const cleanCompanyBusiness = computed(() => {
  const business = normalizeCompanyValue(companyDetails.value.business);
  if (!business) return '';
  const looksLikeMetadataOnly = /대표자\s*:|설립일\s*:|주소\s*:|홈페이지\s*:/u.test(business);
  return looksLikeMetadataOnly ? '' : business;
});
const companySourceStatusLabel = computed(() => {
  const status = String(companyDetails.value.sourceStatus ?? '').toUpperCase();
  if (status === 'OFFICIAL') return '공식 확인됨';
  if (status === 'PARTIAL') return '일부 확인됨';
  return '미확인';
});
const companySourceNamesLabel = computed(() => {
  const names = companyDetails.value.sourceNames;
  if (Array.isArray(names)) {
    return names.filter(Boolean).join(', ');
  }
  return normalizeCompanyValue(names);
});
const availableCompanyInfoRows = computed(() => [
  {
    key: 'type',
    label: '기업유형',
    value: companyTypeLabel.value
  },
  {
    key: 'employeeCount',
    label: '사원수',
    value: formatEmployeeCount(companyDetails.value.employeeCount)
  },
  {
    key: 'foundedAt',
    label: '설립일',
    value: normalizeCompanyValue(companyDetails.value.foundedAt)
  },
  {
    key: 'homepage',
    label: '홈페이지',
    value: companyHomepageLabel.value,
    href: companyHomepageUrl.value
  },
  {
    key: 'business',
    label: '주요정보',
    value: cleanCompanyBusiness.value,
    wide: true
  },
  {
    key: 'address',
    label: '주소',
    value: normalizeCompanyValue(companyDetails.value.address),
    wide: true
  }
]
  .map((row) => ({ ...row, value: visibleCompanyInfoValue(row.value) }))
  .filter((row) => row.value));
const workspaceStatusClass = computed(() => statusClassFromLabel(workspaceStore.workspace?.statusLabel));
function versionSortKey(version) {
  const numericId = Number(version.id);
  if (Number.isFinite(numericId)) return numericId;
  const timestamp = String(version.id).match(/(\d+)$/)?.[1];
  return timestamp ? Number(timestamp) : 0;
}
const currentQuestionVersions = computed(() => {
  if (!currentQuestion.value) return [];
  return [
    ...localVersions.value,
    ...workspaceStore.versions
  ]
    .filter((version) => version.questionId === currentQuestion.value.id)
    .sort((left, right) => versionSortKey(left) - versionSortKey(right));
});
const selectedLeftVersion = computed(() => currentQuestionVersions.value.find((version) => version.id === selectedLeftVersionId.value) ?? null);
const selectedRightVersion = computed(() => currentQuestionVersions.value.find((version) => version.id === selectedRightVersionId.value) ?? null);
const activeComparison = computed(() => {
  const comparison = workspaceStore.versionComparison;
  if (!comparison) return null;
  if (String(comparison.leftVersionId) !== String(selectedLeftVersionId.value)) return null;
  if (String(comparison.rightVersionId) !== String(selectedRightVersionId.value)) return null;
  return comparison;
});
const activeComparisonSummary = computed(() => {
  if (!activeComparison.value?.aiSummary) return '';
  return normalizeComparisonSummaryText(
    activeComparison.value.aiSummary,
    selectedLeftVersion.value?.versionName || activeComparison.value.leftVersionName || '이전 저장본',
    selectedRightVersion.value?.versionName || activeComparison.value.rightVersionName || '비교 저장본'
  );
});
const versionDiffRows = computed(() => buildLineDiff(
  activeComparison.value?.leftBody ?? selectedLeftVersion.value?.body ?? '',
  activeComparison.value?.rightBody ?? selectedRightVersion.value?.body ?? ''
));
const canSaveFinalEssay = computed(() => Boolean(
  currentQuestion.value
  && finalEssayTitle.value.trim()
  && finalEssayBody.value.trim()
));
const draftCountText = computed(() => extractVisibleText(draftBody.value));
const draftCharacterCount = computed(() => (
  characterCountMode.value === 'withoutSpaces'
    ? draftCountText.value.replace(/\s/g, '').length
    : draftCountText.value.length
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

function visibleCompanyInfoValue(value) {
  const normalized = normalizeCompanyValue(value);
  if (!normalized) return '';
  const lowered = normalized.toLowerCase();
  if (['-', '미확인', 'unverified', 'unknown'].includes(lowered)) return '';
  return normalized;
}

function formatEmployeeCount(value) {
  const normalized = normalizeCompanyValue(value);
  if (!normalized) return '';
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? `${numeric.toLocaleString('ko-KR')}명` : normalized;
}

function statusClassFromLabel(label) {
  const text = String(label ?? '').trim();
  if (text.includes('진행')) return 'is-in-progress';
  if (text.includes('제출') || text.includes('완료')) return 'is-submitted';
  if (text.includes('미지원') || text.includes('지원전') || text.includes('지원 전')) return 'is-not-started';
  if (text.includes('포기') || text.includes('제외')) return 'is-not-applied';
  return 'is-not-started';
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
  isCreatingNewVersion.value = true;
  await workspaceStore.createVersion(workspaceId.value, currentQuestion.value.id, `v${currentQuestionVersions.value.length + 1}`);
  rememberCurrentWorkspaceIfSaved();
}

async function compareVersions() {
  const left = selectedLeftVersion.value;
  const right = selectedRightVersion.value;
  if (!left || !right || left.id === right.id) return null;
  return workspaceStore.compareVersions(workspaceId.value, left.id, right.id);
}

function buildLineDiff(leftBody, rightBody) {
  let diffs = [];
  try {
    diffs = diffArrays(toDiffLineArray(leftBody), toDiffLineArray(rightBody));
  } catch (error) {
    console.error('Diff calculation failed:', error);
    return {
      leftRows: toDiffLineArray(leftBody).map((line) => ({ type: 'same', content: line })),
      rightRows: toDiffLineArray(rightBody).map((line) => ({ type: 'same', content: line }))
    };
  }

  const leftRows = [];
  const rightRows = [];

  for (let i = 0; i < diffs.length; i++) {
    const part = diffs[i];

    if (part.removed && i + 1 < diffs.length && diffs[i+1].added) {
      const addedPart = diffs[i+1];
      const removedLines = part.value;
      const addedLines = addedPart.value;

      const maxLines = Math.max(removedLines.length, addedLines.length);
      for (let j = 0; j < maxLines; j++) {
        leftRows.push({ type: j < removedLines.length ? 'remove' : 'empty', content: j < removedLines.length ? removedLines[j] : '' });
        rightRows.push({ type: j < addedLines.length ? 'add' : 'empty', content: j < addedLines.length ? addedLines[j] : '' });
      }
      i++;
      continue;
    }

    if (part.added && i + 1 < diffs.length && diffs[i+1].removed) {
      const removedPart = diffs[i+1];
      const addedLines = part.value;
      const removedLines = removedPart.value;

      const maxLines = Math.max(removedLines.length, addedLines.length);
      for (let j = 0; j < maxLines; j++) {
        leftRows.push({ type: j < removedLines.length ? 'remove' : 'empty', content: j < removedLines.length ? removedLines[j] : '' });
        rightRows.push({ type: j < addedLines.length ? 'add' : 'empty', content: j < addedLines.length ? addedLines[j] : '' });
      }
      i++;
      continue;
    }

    const lines = part.value;

    lines.forEach((line) => {
      if (part.added) {
        leftRows.push({ type: 'empty', content: '' });
        rightRows.push({ type: 'add', content: line });
      } else if (part.removed) {
        leftRows.push({ type: 'remove', content: line });
        rightRows.push({ type: 'empty', content: '' });
      } else {
        leftRows.push({ type: 'same', content: line });
        rightRows.push({ type: 'same', content: line });
      }
    });
  }

  if (!leftRows.length) {
    leftRows.push({ type: 'same', content: '' });
    rightRows.push({ type: 'same', content: '' });
  }

  return { leftRows, rightRows };
}

function splitLines(body) {
  if (!body) return [];
  return body.replace(/\r\n/g, '\n').split('\n');
}

function normalizeDiffText(body) {
  return extractVisibleText(body)
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd();
}

function toDiffLineArray(body) {
  const text = normalizeDiffText(body);
  if (!text) return [''];
  return text
    .split('\n')
    .flatMap((line) => splitLongDiffLine(line.trimEnd()))
    .filter((line, index, lines) => line || lines.length === 1);
}

function splitLongDiffLine(line) {
  if (line.length <= 120) return [line];
  const chunks = (line.match(/[^.!?。！？]+[.!?。！？]?/g) ?? [])
    .map((chunk) => chunk.trim())
    .filter(Boolean);
  return chunks.length > 1 ? chunks : [line];
}

function normalizeComparisonSummaryText(summary, leftName, rightName) {
  const normalized = String(summary || '')
    .replace(/version\s*1/gi, leftName)
    .replace(/version\s*2/gi, rightName)
    .replace(/버전\s*1/g, leftName)
    .replace(/버전\s*2/g, rightName)
    .replace(/1번\s*버전/g, leftName)
    .replace(/2번\s*버전/g, rightName)
    .replaceAll('첫 번째 버전', leftName)
    .replaceAll('두 번째 버전', rightName)
    .replaceAll('첫번째 버전', leftName)
    .replaceAll('두번째 버전', rightName)
    .replaceAll('이전 버전', leftName)
    .replaceAll('비교 버전', rightName);
  return enforceComparisonBulletFormat(normalized);
}

function enforceComparisonBulletFormat(summary) {
  const text = String(summary || '').trim();
  if (!text) return '';
  const hasFactSection = text.includes('1. 변경된 사실');
  const hasFeedbackSection = text.includes('2. 채용담당자 관점 피드백');
  const hasBullets = text.split('\n').some((line) => line.trim().startsWith('- '));
  if (hasFactSection && hasFeedbackSection && hasBullets) return text;

  const sentences = splitSummarySentences(text);
  if (!sentences.length) return text;
  const splitIndex = Math.max(1, Math.ceil(sentences.length / 2));
  const facts = sentences.slice(0, splitIndex);
  const feedback = sentences.slice(splitIndex);
  const fallbackFeedback = feedback.length
    ? feedback
    : ['지원 기업, 직무, JD, 작성 문항과 연결되는 역량 표현을 더 구체화하면 채용담당자가 지원 적합성을 판단하기 쉬워집니다.'];

  return [
    '1. 변경된 사실',
    ...facts.map((sentence) => `- ${sentence}`),
    '',
    '2. 채용담당자 관점 피드백',
    ...fallbackFeedback.map((sentence) => `- ${sentence}`)
  ].join('\n');
}

function splitSummarySentences(text) {
  const cleaned = String(text || '')
    .replace(/^\s*\d+\.\s*(변경된 사실|변경된 내용|채용담당자 관점 피드백)\s*$/gm, '')
    .replace(/^\s*[-•]\s*/gm, '')
    .replace(/(\d)\.(\d)/g, '$1<decimal>$2')
    .replace(/\s+/g, ' ')
    .trim();
  return (cleaned.match(/[^.!?。！？]+[.!?。！？]?/g) ?? [])
    .map((sentence) => sentence.replace(/<decimal>/g, '.').trim())
    .filter(Boolean);
}

function extractVisibleText(body) {
  const raw = String(body || '');
  if (!raw) return '';
  const htmlLike = /<[^>]+>/.test(raw);
  if (!htmlLike) return raw.replace(/\r\n/g, '\n');
  if (typeof document === 'undefined') {
    return raw
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|h[1-6]|blockquote|pre|summary|details|figure)>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#039;/gi, "'");
  }
  const container = document.createElement('div');
  container.innerHTML = raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|blockquote|pre|summary|details|figure)>/gi, '\n');
  container.querySelectorAll('img').forEach((image) => image.remove());
  container.querySelectorAll('figure').forEach((figure) => {
    if (!figure.textContent?.trim()) {
      figure.remove();
    }
  });
  return (container.innerText || container.textContent || '')
    .replace(/\u00A0/g, ' ')
    .replace(/\u200B/g, '')
    .replace(/^\n+|\n+$/g, '');
}

function openBoard(type) {
  activeBoard.value = type;
  isMinimized.value = false;
  workspaceStore.activeReference = null;
  if (type === 'DART') {
    const draft = ensureBoardDraft('DART');
    if (shouldRunDartAutoAnalysis(draft)) {
      void fillDartSectionsFromApi(draft);
    }
  }
}

function shouldRunDartAutoAnalysis(draft) {
  if (!draft) return false;
  if (draft.dartAutoFillStatus === 'loading' || draft.dartAnalysisStatus === 'loading') return false;
  if (draft.dartAutoFillStatus === 'ready' && draft.dartAnalysis?.status === 'COMPLETED') return false;
  return true;
}

function openBoardFullView() {
  boardFullViewOpen.value = true;
}

function closeBoardFullView() {
  boardFullViewOpen.value = false;
}

async function saveFinalEssay() {
  if (!canSaveFinalEssay.value) return;
  const previousNewestVersion = currentQuestionVersions.value[currentQuestionVersions.value.length - 1] ?? null;
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
    isCreatingNewVersion.value = false;
    rememberCurrentWorkspaceIfSaved();
    await nextTick();
    await compareVersions();
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
  isCreatingNewVersion.value = false;
  rememberCurrentWorkspaceIfSaved();
  if (version?.id && previousNewestVersion?.id) {
    await nextTick();
    await compareVersions();
  }
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
  isMinimized.value = false;
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
  alert('저장 되었습니다.');
  nextTick(() => {
    document.querySelector('.workspace-side-rail')?.scrollIntoView({ behavior: 'smooth' });
  });
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
      body: '',
      placeholder: '공고의 주요 업무, 자격요건, 우대사항을 자유롭게 정리하세요.'
    },
    NEWS: {
      title: '뉴스기사',
      body: '',
      placeholder: '뉴스 기사의 주요 내용을 요약하세요.'
    },
    DART: {
      title: 'DART 분석 메모',
      body: '',
      placeholder: '사업보고서의 주요 제품 및 서비스, 연구개발활동, 기타 참고사항을 정리하세요.'
    },
    TALENT_PROFILE: {
      title: '인재상',
      body: '',
      placeholder: '인재상 문장, 이미지, 메모를 붙여넣으세요.'
    },
    AWARDS_PROJECTS: {
      title: '수상/프로젝트 근거',
      body: '',
      placeholder: '서류 입력 정보에서 가져온 수상과 프로젝트를 자기소개서 근거로 정리하세요.'
    },
    PROMPT: {
      title: '프롬프트',
      body: '',
      placeholder: '프롬프트 내용을 입력하세요.'
    },
    FREE_MEMO: {
      title: '자유 메모',
      body: '',
      placeholder: '면접 질문, 키워드, 아이디어를 자유롭게 기록하세요.'
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
      products: '',
      contracts: '',
      notes: ''
    },
    dartStructuredSections: {},
    activeDartSectionKey: 'products',
    dartEntries: [],
    dartDisclosures: [],
    dartDisclosureStatus: 'idle',
    dartDisclosureMessage: '',
    selectedDartRceptNo: '',
    dartSectionSources: {},
    dartAnalysisStatus: 'idle',
    dartAnalysis: null,
    dartAnalysisMessage: '',
    dartSaveStatus: 'idle',
    dartAutoFillStatus: 'idle',
    dartAutoFillMessage: '',
    dartEssayGuide: null,
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
  const title = draft.articleTitle?.trim() || '';
  const url = draft.articleUrl?.trim() || '';
  const body = draft.articleBody?.trim() || '';
  if (!title || !body) {
    alert('제목과 내용을 모두 입력해주세요.');
    return;
  }
  draft.articles = [{
    id: `article-${Date.now()}`,
    title,
    body,
    source: '직접 추가',
    date: new Date().toLocaleDateString('ko-KR'),
    url
  }, ...(draft.articles || [])];
  draft.articleTitle = '';
  draft.articleUrl = '';
  draft.articleBody = '';
  alert('저장되었습니다.');
  nextTick(() => {
    scrollDrawerBoardToBottom();
  });
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
    draft.title = '';
    draft.keywordInput = '';
    draft.keywords = [];
  }
  nextTick(() => syncActiveMarkdownEditor());
}

watch([selectedLeftVersionId, selectedRightVersionId], ([leftId, rightId]) => {
  if (leftId && rightId && leftId !== rightId) {
    compareVersions();
  }
});

function saveBoardEntry(draft, type = activeBoard.value) {
  const label = referenceTypeLabel(type);
  const title = draft.title?.trim() || `${label} 메모`;
  const body = normalizeCompanyValue(draft.body || '');
  if (!title && !body && type !== 'TALENT_PROFILE') {
    alert('내용을 입력해주세요.');
    return;
  }
  draft.entries = [{
    id: `${type.toLowerCase()}-${Date.now()}`,
    title,
    body,
    keywords: [...(draft.keywords ?? [])],
    createdAt: new Date().toLocaleString('ko-KR')
  }, ...(draft.entries || [])];
  draft.title = '';
  draft.body = '';
  if (type === 'TALENT_PROFILE') {
    draft.keywordInput = '';
    draft.keywords = [];
  }
  syncActiveMarkdownEditor();
  alert('저장되었습니다.');
  nextTick(() => {
    scrollDrawerBoardToBottom();
  });
}

function saveDartEntry(draft) {
  const title = draft.title.trim() || 'DART 메모';
  draft.dartEntries = [{
    id: `dart-${Date.now()}`,
    title,
    createdAt: new Date().toLocaleString('ko-KR'),
    sections: { ...draft.dartSections },
    structuredSections: { ...(draft.dartStructuredSections || {}) }
  }, ...draft.dartEntries];
}

function addDartEntry(draft) {
  draft.title = 'DART 분석 메모';
  draft.dartSections = {
    products: '',
    contracts: '',
    notes: ''
  };
  draft.dartStructuredSections = {};
  draft.dartSectionSources = {};
  draft.activeDartSectionKey = 'products';
  draft.dartEssayGuide = null;
}

function generateDartEssayGuide(draft) {
  const companyName = workspaceStore.workspace?.companyName || '지원 기업';
  const positionTitle = workspaceStore.workspace?.positionTitle || '지원 직무';
  const filledSections = dartSectionMeta
    .map((meta) => ({
      key: meta.legacyKey,
      label: meta.title,
      analysis: draft.dartStructuredSections?.[meta.legacyKey] || null,
      text: plainTextFromMarkdown(draft.dartSections?.[meta.legacyKey] || '')
    }))
    .filter((section) => section.text.trim() || section.analysis?.coreSummary);
  const sourceSections = filledSections.length
    ? filledSections
    : dartSectionMeta.map((meta) => ({
      key: meta.legacyKey,
      label: meta.title,
      analysis: draft.dartStructuredSections?.[meta.legacyKey] || null,
      text: ''
    }));

  const questionRecommendations = canvasQuestions.value.slice(0, 5).map((question, index) => {
    const prompt = question.prompt || `${index + 1}번 문항`;
    const intent = inferEssayQuestionIntent(prompt);
    const basis = selectDartBasis(intent, sourceSections);
    return {
      id: question.id || `question-${index + 1}`,
      questionNumber: index + 1,
      prompt,
      fit: intent.fit,
      basisLabel: basis.label,
      basisText: basis.analysis?.coreSummary || summarizeDartSnippet(basis.text, fallbackBasisText(intent, companyName, positionTitle)),
      competency: intent.competency,
      sentence: firstNonBlank(basis.analysis?.sentenceCandidates) || buildDartEssaySentence(intent, companyName, positionTitle, basis)
    };
  });

  draft.dartEssayGuide = {
    generatedAt: new Date().toLocaleString('ko-KR'),
    companyName,
    positionTitle,
    points: sourceSections.slice(0, 3).map((section) => ({
      label: section.label,
      meaning: section.analysis?.coreSummary || summarizeDartSnippet(section.text, fallbackPointMeaning(section.label, companyName)),
      direction: firstNonBlank(section.analysis?.jobFitPoints) || buildDartPointDirection(section.label, positionTitle)
    })),
    recommendations: questionRecommendations,
    cautions: [
      {
        risk: 'DART 내용을 회사 설명으로만 길게 쓰면 자기소개서 설득력이 약해질 수 있습니다.',
        rewrite: '공시 근거를 한 문장으로 짚고, 바로 본인의 경험과 직무 기여로 연결하세요.'
      },
      {
        risk: '계약, 투자, 연구개발 내용을 확정적 성과처럼 과장하면 위험합니다.',
        rewrite: '강화하고 있다, 확인했다, 주목했다처럼 근거 중심 표현을 사용하세요.'
      }
    ]
  };
}

function plainTextFromMarkdown(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]+]\([^)]*\)/g, (match) => match.replace(/\[|\]\([^)]*\)/g, ''))
    .replace(/[#>*_`-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstNonBlank(values) {
  return (values || []).find((value) => String(value || '').trim()) || '';
}

function summarizeDartSnippet(text, fallback) {
  const normalized = plainTextFromMarkdown(text);
  if (!normalized) return fallback;
  const firstSentence = normalized.match(/^.{1,140}?(?:[.!?。]|다\.|요\.|\s{2,}|$)/)?.[0]?.trim() || normalized;
  return firstSentence.length > 110 ? `${firstSentence.slice(0, 110)}...` : firstSentence;
}

function inferEssayQuestionIntent(prompt) {
  const normalized = String(prompt || '');
  if (/지원\s*동기|동기|왜|관심/.test(normalized)) {
    return {
      fit: '높음',
      type: 'motivation',
      competency: '기업 이해도와 직무 관심도'
    };
  }
  if (/포부|입사\s*후|기여|계획|성장/.test(normalized)) {
    return {
      fit: '높음',
      type: 'aspiration',
      competency: '사업 방향을 이해한 기여 계획'
    };
  }
  if (/역량|강점|경험|프로젝트|문제|해결|성과/.test(normalized)) {
    return {
      fit: '보통',
      type: 'competency',
      competency: '직무 역량과 경험 근거'
    };
  }
  return {
    fit: '보통',
    type: 'general',
    competency: '기업 분석 기반의 지원 논리'
  };
}

function selectDartBasis(intent, sections) {
  const byKey = Object.fromEntries(sections.map((section) => [section.key, section]));
  if (intent.type === 'motivation') {
    return byKey.products || byKey.contracts || sections[0];
  }
  if (intent.type === 'aspiration') {
    return byKey.contracts || byKey.products || sections[0];
  }
  if (intent.type === 'competency') {
    return byKey.contracts || byKey.products || byKey.notes || sections[0];
  }
  return byKey.notes || byKey.products || sections[0];
}

function fallbackBasisText(intent, companyName, positionTitle) {
  if (intent.type === 'motivation') {
    return `${companyName}의 사업 방향과 ${positionTitle} 직무의 연결 지점을 지원동기에 활용하세요.`;
  }
  if (intent.type === 'aspiration') {
    return `${companyName}의 연구개발 및 사업 확장 흐름을 입사 후 기여 계획으로 연결하세요.`;
  }
  return `${positionTitle} 직무에서 요구되는 역량과 DART 근거를 함께 연결하세요.`;
}

function fallbackPointMeaning(label, companyName) {
  return `${companyName}의 ${label} 항목에서 자소서에 활용할 기업 이해 포인트를 정리하세요.`;
}

function buildDartPointDirection(label, positionTitle) {
  if (label.includes('제품') || label.includes('서비스')) {
    return `${positionTitle} 직무 관점에서 어떤 고객 가치나 서비스 개선에 기여할 수 있는지 연결하기 좋습니다.`;
  }
  if (label.includes('계약') || label.includes('연구')) {
    return '입사 후 포부나 직무역량 문항에서 성장 방향, 기술 이해도, 문제 해결 경험과 연결하기 좋습니다.';
  }
  return '지원동기 말미나 포부 문항에서 회사 이해도를 보여주는 보조 근거로 쓰기 좋습니다.';
}

function buildDartEssaySentence(intent, companyName, positionTitle, basis) {
  const basisLabel = basis?.label || 'DART 정보';
  if (intent.type === 'motivation') {
    return `${companyName}의 ${basisLabel}에서 확인한 사업 방향을 보며, ${positionTitle} 직무에서 제 경험을 실제 고객 가치로 연결할 수 있다고 판단했습니다.`;
  }
  if (intent.type === 'aspiration') {
    return `입사 후에는 ${basisLabel}에서 드러난 성장 방향을 이해하고, ${positionTitle} 직무에서 실행 가능한 개선 과제를 찾아 기여하고 싶습니다.`;
  }
  if (intent.type === 'competency') {
    return `${basisLabel}에서 요구되는 방향과 제 경험을 연결해, ${positionTitle} 직무에서 문제를 구조화하고 실행까지 이어가는 강점을 보여줄 수 있습니다.`;
  }
  return `${companyName}의 ${basisLabel}을 근거로 회사의 방향성을 이해하고 있음을 보여준 뒤, 제 경험이 그 방향에 어떻게 기여하는지 연결해보세요.`;
}

function selectedDartDisclosure(draft) {
  return (draft.dartDisclosures || []).find((item) => item.rceptNo === draft.selectedDartRceptNo) ?? null;
}

async function loadDartDisclosures(draft) {
  draft.dartDisclosureStatus = 'loading';
  draft.dartDisclosureMessage = '';
  draft.dartSaveStatus = 'idle';
  try {
    const response = await workspaceApi.listDartDisclosures(workspaceId.value);
    draft.dartDisclosures = sortDartDisclosures(response.disclosures || []);
    draft.dartDisclosureStatus = response.available ? 'ready' : 'error';
    draft.dartDisclosureMessage = response.message || '';
    const recommended = draft.dartDisclosures.find((item) => item.recommended) || draft.dartDisclosures[0];
    draft.selectedDartRceptNo = recommended?.rceptNo || '';
  } catch (error) {
    draft.dartDisclosures = [];
    draft.selectedDartRceptNo = '';
    draft.dartDisclosureStatus = 'error';
    draft.dartDisclosureMessage = 'DART disclosures are unavailable. You can still write a manual memo.';
  }
}

function sortDartDisclosures(disclosures) {
  return [...disclosures].sort((left, right) => {
    const leftDate = String(left?.receivedDate || '');
    const rightDate = String(right?.receivedDate || '');
    if (leftDate !== rightDate) return rightDate.localeCompare(leftDate);
    return String(right?.rceptNo || '').localeCompare(String(left?.rceptNo || ''));
  });
}

async function createDartAnalysis(draft) {
  const disclosure = selectedDartDisclosure(draft);
  if (!disclosure) return;
  return createDartAnalysisForDisclosure(draft, disclosure);
}

async function createDartAnalysisForDisclosure(draft, disclosure) {
  draft.dartAnalysisStatus = 'loading';
  draft.dartAnalysisMessage = '';
  draft.dartSaveStatus = 'idle';
  try {
    const analysis = await workspaceApi.createDartAnalysis(workspaceId.value, {
      rceptNo: disclosure.rceptNo,
      reportName: disclosure.reportName,
      companyName: workspaceStore.workspace?.companyName || disclosure.corpName || '',
      positionTitle: workspaceStore.workspace?.positionTitle || '',
      essayQuestions: dartAnalysisContextItems()
    });
    draft.dartAnalysis = analysis;
    draft.dartAnalysisStatus = analysis.status === 'COMPLETED' ? 'completed' : 'error';
    draft.dartAnalysisMessage = analysis.errorMessage || '';
    return analysis;
  } catch (error) {
    draft.dartAnalysis = null;
    draft.dartAnalysisStatus = 'error';
    draft.dartAnalysisMessage = 'AI 분석을 완료하지 못했습니다. DART 수동 메모 작성과 저장은 계속 사용할 수 있어요.';
    return null;
  }
}

async function fillDartSectionsFromApi(draft) {
  draft.dartAutoFillStatus = 'loading';
  draft.dartAutoFillMessage = 'DART에서 지원 기업에 맞는 공시를 찾고, JD 맞춤 자소서 포인트를 만들고 있습니다.';
  draft.dartAnalysisMessage = '';
  try {
    if (!draft.dartDisclosures.length) {
      await loadDartDisclosures(draft);
    }
    const recommended = draft.dartDisclosures.find((item) => item.recommended) || draft.dartDisclosures[0];
    if (!recommended) {
      draft.dartAutoFillStatus = 'error';
      draft.dartAutoFillMessage = 'DART에서 이 기업의 사업/반기/분기보고서를 찾지 못했습니다. 기업명 또는 계열사명을 확인해주세요.';
      return;
    }
    const candidateDisclosures = buildDartDisclosureFallbackQueue(draft.dartDisclosures, recommended);
    let firstAnalysis = null;
    let firstAnalysisIndex = -1;
    for (let index = 0; index < candidateDisclosures.length; index += 1) {
      const disclosure = candidateDisclosures[index];
      draft.selectedDartRceptNo = disclosure.rceptNo;
      draft.dartAutoFillMessage = `${disclosure.corpName || workspaceStore.workspace?.companyName || '기업'} · ${disclosure.reportName} 분석 중`;
      const analysis = await createDartAnalysisForDisclosure(draft, disclosure);
      if (analysis?.status === 'COMPLETED') {
        firstAnalysis = analysis;
        firstAnalysisIndex = index;
        break;
      }
    }
    if (!firstAnalysis) {
      draft.dartAutoFillStatus = 'error';
      draft.dartAutoFillMessage = 'DART 공시 분석을 완료하지 못했습니다. 잠시 후 다시 열거나 JD 저장 내용을 확인해주세요.';
      return;
    }
    const merged = await buildDartSectionsWithFallback(draft, firstAnalysis, candidateDisclosures.slice(Math.max(firstAnalysisIndex, 0)));
    draft.dartSections = merged.sections;
    draft.dartStructuredSections = merged.structuredSections;
    draft.dartSectionSources = merged.sectionSources;
    draft.dartAnalysis = firstAnalysis;
    draft.dartAnalysisStatus = 'completed';
    draft.activeDartSectionKey = dartSectionMeta[0].legacyKey;
    draft.dartAutoFillStatus = 'ready';
    const fallbackCount = Object.values(merged.sectionSources || {})
      .filter((source) => source?.rceptNo && source.rceptNo !== firstAnalysis.rceptNo)
      .length;
    draft.dartAutoFillMessage = `${firstAnalysis.companyName || recommended.corpName || workspaceStore.workspace?.companyName || '선택 기업'} · ${firstAnalysis.reportName || recommended.reportName} 기준 분석 완료${fallbackCount ? ` · 이전 보고서 ${fallbackCount}개 항목 보강` : ''}`;
    generateDartEssayGuide(draft);
  } catch (error) {
    draft.dartAutoFillStatus = 'error';
    draft.dartAutoFillMessage = 'DART API 또는 AI 분석 연결에 실패했습니다. 설정과 네트워크 상태를 확인해주세요.';
  }
}

function refreshDartAnalysis(draft) {
  if (draft.dartAutoFillStatus === 'loading' || draft.dartAnalysisStatus === 'loading') return;
  draft.dartSections = {
    products: '',
    contracts: '',
    notes: ''
  };
  draft.dartStructuredSections = {};
  draft.dartSectionSources = {};
  draft.dartAnalysis = null;
  draft.dartAnalysisStatus = 'idle';
  draft.dartAnalysisMessage = '';
  draft.dartSaveStatus = 'idle';
  draft.dartAutoFillStatus = 'idle';
  draft.dartAutoFillMessage = '';
  draft.dartEssayGuide = null;
  void fillDartSectionsFromApi(draft);
}

function buildDartDisclosureFallbackQueue(disclosures, recommended) {
  const sorted = sortDartDisclosures(disclosures);
  const head = recommended || sorted[0];
  const byReceipt = new Map();
  [head, ...sorted].filter(Boolean).forEach((item) => {
    if (!byReceipt.has(item.rceptNo)) byReceipt.set(item.rceptNo, item);
  });
  return Array.from(byReceipt.values()).slice(0, 4);
}

async function buildDartSectionsWithFallback(draft, firstAnalysis, candidateDisclosures) {
  const initial = sectionsFromDartAnalysis(firstAnalysis);
  const structuredSections = { ...initial.structuredSections };
  const sections = { ...initial.sections };
  const sectionSources = Object.fromEntries(dartSectionMeta.map((meta) => [
    meta.legacyKey,
    dartSourceFromAnalysis(firstAnalysis)
  ]));
  let missingKeys = missingDartSectionKeys(structuredSections);

  for (const disclosure of candidateDisclosures.slice(1)) {
    if (!missingKeys.length) break;
    const fallbackAnalysis = await createDartAnalysisForDisclosure(draft, disclosure);
    if (fallbackAnalysis?.status !== 'COMPLETED') continue;
    const fallback = sectionsFromDartAnalysis(fallbackAnalysis);
    missingKeys.forEach((key) => {
      const section = fallback.structuredSections[key];
      if (!hasDartSectionContent(section)) return;
      structuredSections[key] = section;
      sections[key] = fallback.sections[key];
      sectionSources[key] = dartSourceFromAnalysis(fallbackAnalysis);
    });
    missingKeys = missingDartSectionKeys(structuredSections);
  }

  return { structuredSections, sections, sectionSources };
}

function missingDartSectionKeys(structuredSections) {
  return dartSectionMeta
    .filter((meta) => !hasMeaningfulDartSectionContent(structuredSections?.[meta.legacyKey]))
    .map((meta) => meta.legacyKey);
}

function hasMeaningfulDartSectionContent(section) {
  return Boolean(
    section?.coreSummary
    || section?.rawText
    || section?.evidencePoints?.length
    || section?.jobFitPoints?.length
    || section?.resumeUsePoints?.length
    || section?.sentenceCandidates?.length
  );
}

function dartSourceFromAnalysis(analysis) {
  return {
    rceptNo: analysis?.rceptNo || '',
    reportName: analysis?.reportName || '',
    sourceUrl: analysis?.sourceUrl || ''
  };
}

function dartAnalysisContextItems() {
  const questionItems = (workspaceStore.workspace?.questions || [])
    .map((question, index) => `${index + 1}번 문항: ${question.prompt}`)
    .filter(Boolean);
  const jdContext = collectJdContext();
  return [
    ...questionItems,
    jdContext ? `사용자가 입력한 JD 참고자료: ${jdContext}` : ''
  ].filter(Boolean);
}

function collectJdContext() {
  const savedJdReferences = (workspaceStore.workspace?.references || [])
    .filter((reference) => reference.type === 'JD')
    .map((reference) => [reference.title, reference.body].filter(Boolean).join('\n'))
    .filter(Boolean);
  const jdDraft = boardDrafts.JD
    ? [boardDrafts.JD.title, boardDrafts.JD.body].filter(Boolean).join('\n')
    : '';
  return [...savedJdReferences, jdDraft]
    .map((value) => normalizeCompanyValue(value))
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 3000);
}

function sectionsFromDartAnalysis(analysis) {
  const result = analysis.result || {};
  const structuredSections = Object.fromEntries(dartSectionMeta.map((meta) => [
    meta.legacyKey,
    normalizeDartSectionAnalysis(result[meta.analysisKey], meta.title)
  ]));
  const hasStructuredContent = Object.values(structuredSections).some((section) => hasDartSectionContent(section));
  if (hasStructuredContent) {
    return {
      structuredSections,
      sections: Object.fromEntries(dartSectionMeta.map((meta) => [
        meta.legacyKey,
        formatStructuredDartSection(structuredSections[meta.legacyKey], analysis)
      ]))
    };
  }
  const cards = result.evidenceCards || [];
  const products = cards.filter((card) => /제품|서비스|사업|고객|매출|플랫폼/i.test(`${card.title} ${card.summary} ${card.sourceSection}`));
  const contracts = cards.filter((card) => /계약|연구|개발|R&D|투자|신사업|기술/i.test(`${card.title} ${card.summary} ${card.sourceSection}`));
  const used = new Set([...products, ...contracts]);
  const notes = cards.filter((card) => !used.has(card));
  return {
    structuredSections,
    sections: {
      products: formatDartAnalysisSection(products.length ? products : cards.slice(0, 3), result.appealPoints || [], analysis),
      contracts: formatDartAnalysisSection(contracts.length ? contracts : cards.slice(0, 3), result.suggestedSentences || [], analysis),
      notes: formatDartAnalysisSection(notes.length ? notes : cards.slice(0, 3), [...(result.cautions || []), ...(result.missingInfo || [])], analysis)
    }
  };
}

function normalizeDartSectionAnalysis(section, fallbackTitle) {
  if (!section || typeof section !== 'object') {
    return {
      sectionTitle: fallbackTitle,
      coreSummary: '',
      evidencePoints: [],
      jobFitPoints: [],
      resumeUsePoints: [],
      sentenceCandidates: [],
      cautionPoints: [],
      rawText: ''
    };
  }
  return {
    sectionTitle: section.sectionTitle || fallbackTitle,
    coreSummary: section.coreSummary || '',
    evidencePoints: Array.isArray(section.evidencePoints) ? section.evidencePoints : [],
    jobFitPoints: Array.isArray(section.jobFitPoints) ? section.jobFitPoints : [],
    resumeUsePoints: Array.isArray(section.resumeUsePoints) ? section.resumeUsePoints : [],
    sentenceCandidates: Array.isArray(section.sentenceCandidates) ? section.sentenceCandidates : [],
    cautionPoints: Array.isArray(section.cautionPoints) ? section.cautionPoints : [],
    rawText: section.rawText || ''
  };
}

function hasDartSectionContent(section) {
  return Boolean(
    section?.coreSummary
    || section?.rawText
    || section?.evidencePoints?.length
    || section?.jobFitPoints?.length
    || section?.resumeUsePoints?.length
    || section?.sentenceCandidates?.length
    || section?.cautionPoints?.length
  );
}

function formatStructuredDartSection(section, analysis) {
  const lines = [];
  if (section.coreSummary) lines.push(`## 핵심 요약\n${section.coreSummary}`);
  if (section.evidencePoints.length) lines.push(`## DART 근거\n${section.evidencePoints.map((item) => `- ${item}`).join('\n')}`);
  if (section.jobFitPoints.length) lines.push(`## 지원 직무와 연결\n${section.jobFitPoints.map((item) => `- ${item}`).join('\n')}`);
  if (section.resumeUsePoints.length) {
    lines.push(`## 자소서 활용 포인트\n${section.resumeUsePoints.map((item) => `- **${item.useCase || '활용'}**: ${item.recommendation || ''}`).join('\n')}`);
  }
  if (section.sentenceCandidates.length) lines.push(`## 삽입 문장 후보\n${section.sentenceCandidates.map((item) => `- ${item}`).join('\n')}`);
  if (section.cautionPoints.length) lines.push(`## 주의할 표현\n${section.cautionPoints.map((item) => `- ${item}`).join('\n')}`);
  if (section.rawText) lines.push(`## 원문 메모\n${section.rawText}`);
  if (analysis?.sourceUrl) lines.push(`\n출처: ${analysis.sourceUrl}`);
  return lines.join('\n\n').trim();
}

function formatDartAnalysisSection(cards, extras, analysis) {
  const lines = [];
  const source = analysis?.sourceUrl ? `출처: ${analysis.sourceUrl}` : '';
  cards.slice(0, 4).forEach((card) => {
    lines.push(`- **${card.title || 'DART 근거'}**: ${card.summary || ''}`);
    if (card.sourceSection || card.rceptNo) {
      lines.push(`  - 근거: ${[card.sourceSection, card.rceptNo].filter(Boolean).join(' · ')}`);
    }
  });
  extras.slice(0, 4).forEach((item) => {
    lines.push(`- ${item}`);
  });
  if (source) {
    lines.push(`\n${source}`);
  }
  return lines.join('\n').trim();
}

async function saveDartAnalysisReference(draft) {
  if (!draft.dartAnalysis?.id || draft.dartAnalysis.status !== 'COMPLETED') return;
  draft.dartSaveStatus = 'saving';
  try {
    const reference = await workspaceApi.saveDartAnalysisReference(workspaceId.value, draft.dartAnalysis.id);
    if (workspaceStore.workspace) {
      workspaceStore.workspace = {
        ...workspaceStore.workspace,
        references: [reference, ...(workspaceStore.workspace.references || [])]
      };
    }
    workspaceStore.activeReference = reference;
    draft.dartSaveStatus = 'saved';
  } catch (error) {
    draft.dartSaveStatus = 'error';
  }
}

function dartManualContext(draft) {
  return Object.values(draft.dartSections || {})
    .map((value) => normalizeCompanyValue(value || ''))
    .filter(Boolean)
    .join('\n\n');
}

function addPromptCard(draft) {
  if (!draft.newPrompt.title.trim() || !draft.newPrompt.body.trim()) {
    alert('제목과 내용을 모두 입력해주세요.');
    return;
  }
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
  alert('저장되었습니다.');
  nextTick(() => {
    scrollDrawerBoardToBottom();
  });
}

function scrollDrawerBoardToBottom() {
  const board = document.querySelector('.drawer-board');
  if (typeof board?.scrollTo !== 'function') return;
  board.scrollTo({ top: board.scrollHeight, behavior: 'smooth' });
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
      wrapLooseEditorImages(editor);
      updateEmptyState();
    }

    syncActiveMarkdownEditor = syncEditorFromDraft;
    onMounted(syncEditorFromDraft);
    watch(activeBoard, () => nextTick(syncEditorFromDraft));

    function handlePaste(event) {
      const items = [...(event.clipboardData?.items ?? [])];
      const imageItems = items.filter((item) => item.type.startsWith('image/'));
      if (imageItems.length) {
        event.preventDefault();
        insertImageFiles(imageItems.map((item) => item.getAsFile()).filter(Boolean), () => {
          ensureBoardDraft().body = editorToPlainText(editorRef.value);
          updateEmptyState();
        });
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
      const files = [...(event.dataTransfer?.files ?? [])].filter((item) => item.type.startsWith('image/'));
      if (!files.length) return;
      event.preventDefault();
      focusEditor();
      insertImageFiles(files, () => {
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
          entry.body ? h('div', {
            class: 'board-entry-body markdown-empty-page',
            innerHTML: savedEntryBodyHtml(entry.body)
          }) : null
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
            h('label', ['링크', fieldInput(project, 'link', '링크', `project-link-${index}`)])
          ])),
          h('button', { type: 'button', class: 'dashed-add-button', onClick: () => addProject(draft) }, '+ 프로젝트 추가')
        ]),
        renderBoardActions(draft, 'AWARDS_PROJECTS', '+ 추가')
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
        visiblePrompts.length ? h('div', { class: 'prompt-card-list' }, visiblePrompts.map((prompt) => h('article', { class: 'prompt-board-card', key: prompt.id }, [
          h('header', [
            h('div', [
              h('strong', prompt.title),
              prompt.category ? h('span', prompt.category) : null
            ])
          ]),
          h('p', [h('b', '용도'), ' ', prompt.purpose]),
          h('pre', prompt.body),
          h('button', {
            type: 'button',
            class: 'ghost-button prompt-copy-button',
            onClick: () => {
              navigator.clipboard.writeText(prompt.body)
                .then(() => alert('복사되었습니다.'))
                .catch(() => alert('복사 실패'));
            }
          }, '복사')
        ]))) : null,
        draft.isAddingPrompt ? h('section', { class: 'prompt-add-form' }, [
          h('h3', '프롬프트 추가'),
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
        ]) : null,
        h('div', { class: 'prompt-board-bottom' }, [
          !draft.isAddingPrompt ? h('button', {
            type: 'button',
            class: 'ghost-button board-add-button',
            onClick: () => {
              draft.isAddingPrompt = true;
            }
          }, '+ 프롬프트 추가') : null,
          visiblePrompts.length ? null : h('p', { class: 'empty-board-message' }, '저장한 프롬프트가 없습니다.')
        ])
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
          h('div', {
            ref: editorRef,
            class: 'markdown-empty-page',
            contenteditable: 'true',
            'aria-label': '인재상 게시판 편집 영역',
            'data-testid': 'markdown-editor',
            'data-placeholder': '마크다운으로 입력하거나 이미지를 붙여넣으세요.',
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

    function renderDartLinkedText(text, sourceUrl) {
      return text;
    }

    function renderDartStructuredList(title, items, sourceUrl) {
      const normalizedItems = (items || []).filter((item) => String(item || '').trim()).slice(0, 3);
      if (!normalizedItems.length) return null;
      return h('div', { class: 'dart-section-list-group' }, [
        h('b', title),
        h('ul', normalizedItems.map((item) => h('li', renderDartLinkedText(item, sourceUrl))))
      ]);
    }

    function renderDartUsePoints(points, sourceUrl) {
      const normalizedPoints = (points || []).filter((item) => item?.useCase || item?.recommendation).slice(0, 3);
      if (!normalizedPoints.length) return null;
      return h('div', { class: 'dart-use-grid' }, [
        h('div', { class: 'dart-section-title' }, [h('span', { class: 'dart-dot' }), '자소서 활용방안']),
        ...normalizedPoints.map((item, index) => h('article', { key: `${item.useCase || 'use'}-${index}` }, [
          h('span', item.useCase || '활용 포인트'),
          h('p', renderDartLinkedText(item.recommendation || '', sourceUrl))
        ]))
      ]);
    }

    function dartSectionSubtitle(meta) {
      if (meta.legacyKey === 'products') {
        return '회사의 서비스 구조와 고객가치를 직무 관점으로 해석했습니다.';
      }
      if (meta.legacyKey === 'contracts') {
        return '계약, 연구개발, 투자 흐름을 지원동기와 역량 근거로 정리했습니다.';
      }
      return '공시에서 확인한 보조 근거와 주의해서 써야 할 표현을 정리했습니다.';
    }

    function renderDartSourceButton(source) {
      if (!source?.sourceUrl) return null;
      const label = source.reportName ? `${source.reportName} 원문 확인` : 'DART 원문 확인';
      return h('a', {
        class: 'dart-source-button',
        href: source.sourceUrl,
        target: '_blank',
        rel: 'noreferrer'
      }, [
        h('span', label),
        h('small', source.rceptNo || '')
      ]);
    }

    function renderDartStructuredSection(draft, meta) {
      const section = normalizeDartSectionAnalysis(draft.dartStructuredSections?.[meta.legacyKey], meta.title);
      const hasStructured = hasDartSectionContent(section);
      const source = draft.dartSectionSources?.[meta.legacyKey] || dartSourceFromAnalysis(draft.dartAnalysis);
      const sourceUrl = source?.sourceUrl;
      return h('section', { class: 'dart-section-panel dart-analysis-card', key: meta.legacyKey }, [
        h('header', { class: 'dart-card-head' }, [
          h('div', [
            h('h3', section.sectionTitle || meta.title),
            h('p', dartSectionSubtitle(meta))
          ]),
          renderDartSourceButton(source)
        ]),
        hasStructured ? h('div', { class: 'dart-section-insight' }, [
          section.coreSummary ? h('section', { class: 'dart-card-section' }, [
            h('div', { class: 'dart-section-title' }, [h('span', { class: 'dart-dot' }), '핵심 요약']),
            h('p', { class: 'dart-section-summary' }, renderDartLinkedText(section.coreSummary, sourceUrl))
          ]) : null,
          h('section', { class: 'dart-card-section' }, [
            renderDartStructuredList('자소서에 쓸 핵심 근거', section.evidencePoints, sourceUrl),
            renderDartStructuredList('JD 맞춤 연결 포인트', section.jobFitPoints, sourceUrl)
          ]),
          h('section', { class: 'dart-card-section' }, [
            renderDartUsePoints(section.resumeUsePoints, sourceUrl),
            renderDartStructuredList('삽입 문장 후보', section.sentenceCandidates, sourceUrl),
            renderDartStructuredList('주의할 표현', section.cautionPoints, sourceUrl)
          ])
        ]) : null,
        h('details', { class: 'dart-raw-details', open: !hasStructured }, [
          h('summary', '정리된 원문 메모 보기'),
          h(MarkdownDraftEditor, {
            modelValue: draft.dartSections[meta.legacyKey],
            'onUpdate:modelValue': (value) => {
              draft.dartSections[meta.legacyKey] = value;
            },
            'data-placeholder': '마크다운으로 입력하거나 이미지를 붙여넣으세요.',
            'aria-label': `${meta.title} 내용`,
            'data-testid': `dart-section-${meta.legacyKey}`
          })
        ])
      ]);
    }

    function renderDartBoard(draft) {
      const activeSectionMeta = dartSectionMeta.find((meta) => meta.legacyKey === draft.activeDartSectionKey) || dartSectionMeta[0];
      return h('section', { class: 'drawer-board dart-board-page dart-auto-ai-panel' }, [
        h('header', { class: 'dart-panel-hero' }, [
          h('div', [
            h('h2', 'DART 자소서 활용 포인트')
          ])
        ]),
        h('section', { class: 'dart-route-box' }, [
          h('div', { class: 'dart-route-left' }, [
            h('span', { class: 'dart-route-icon', 'aria-hidden': 'true' }, '📄'),
            h('div', [
              h('b', '확인 경로'),
              h('span', '전자공시 › 정기공시 › 사업보고서/반기보고서 › II. 사업의 내용')
            ])
          ]),
          h('a', { href: 'https://dart.fss.or.kr/', target: '_blank', rel: 'noreferrer' }, 'DART 바로가기 ↗')
        ]),
        h('section', { class: 'dart-api-fill-panel dart-auto-status-panel' }, [
          h('div', { class: 'dart-api-fill-copy' }, [
            h('strong', draft.dartAutoFillStatus === 'loading' || draft.dartAnalysisStatus === 'loading'
              ? 'DART 공시를 자동 분석 중입니다'
              : draft.dartAutoFillStatus === 'ready'
                ? 'DART 기반 자소서 활용 포인트가 준비됐습니다'
                : 'DART 게시판을 열면 자동으로 분석합니다'),
            h('p', [
              h('span', { class: 'dart-context-chip' }, workspaceStore.workspace?.companyName || '지원 기업'),
              h('span', { class: 'dart-context-chip' }, workspaceStore.workspace?.positionTitle || '지원 직무'),
              ' 기준으로 JD를 참고하여 분석'
            ])
          ]),
          h('div', { class: 'dart-auto-status-actions' }, [
            draft.dartAutoFillStatus === 'loading' || draft.dartAnalysisStatus === 'loading'
              ? h('span', { class: 'dart-auto-spinner', 'aria-label': '분석 중' })
              : h('span', { class: ['dart-auto-state-chip', { ready: draft.dartAutoFillStatus === 'ready' }] }, draft.dartAutoFillStatus === 'ready' ? '완료' : '자동'),
            h('button', {
              type: 'button',
              class: 'dart-refresh-button',
              disabled: draft.dartAutoFillStatus === 'loading' || draft.dartAnalysisStatus === 'loading',
              'aria-label': 'JD 기준으로 DART 다시 분석',
              title: 'JD 기준으로 다시 분석',
              onClick: () => refreshDartAnalysis(draft)
            }, [
              h('span', { 'aria-hidden': 'true' }, '↻'),
              h('span', '재분석')
            ])
          ])
        ]),
        draft.dartAutoFillMessage ? h('p', {
          class: ['dart-api-status', { error: draft.dartAutoFillStatus === 'error', ready: draft.dartAutoFillStatus === 'ready' }],
          'data-testid': 'dart-auto-fill-status'
        }, draft.dartAutoFillMessage) : null,
        h('div', { class: 'dart-section-tabs', role: 'tablist', 'aria-label': 'DART 항목' }, dartSectionMeta.map((meta) => h('button', {
          type: 'button',
          key: meta.legacyKey,
          role: 'tab',
          class: { active: meta.legacyKey === activeSectionMeta.legacyKey },
          'aria-selected': meta.legacyKey === activeSectionMeta.legacyKey ? 'true' : 'false',
          onClick: () => {
            draft.activeDartSectionKey = meta.legacyKey;
          }
        }, meta.shortTitle))),
        renderDartStructuredSection(draft, activeSectionMeta),
        draft.dartEssayGuide ? renderDartEssayGuide(draft.dartEssayGuide) : null,
        h('div', { class: 'board-title-field dart-save-title-field' }, [
          h('span', '저장 제목'),
          h('input', {
            value: draft.title,
            'data-testid': 'board-title-input',
            placeholder: 'DART 게시판 제목',
            onInput: (event) => {
              draft.title = event.target.value;
            }
          })
        ]),
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
            ...dartSectionMeta.map((meta) => h('p', [h('b', meta.title), ' ', entry.sections[meta.legacyKey] || '미입력']))
          ]))
        ]) : null
      ]);
    }

    function renderDartEssayGuide(guide) {
      return h('section', { class: 'dart-essay-guide', 'data-testid': 'dart-essay-guide' }, [
        h('header', [
          h('div', [
            h('strong', `${guide.companyName} · ${guide.positionTitle}`),
            h('span', `${guide.generatedAt} 생성`)
          ])
        ]),
        h('article', { class: 'dart-guide-block' }, [
          h('h3', '1. 자소서에 활용하기 좋은 DART 포인트'),
          ...guide.points.map((point) => h('div', { class: 'dart-guide-card', key: point.label }, [
            h('b', point.label),
            h('p', [h('span', '의미'), point.meaning]),
            h('p', [h('span', '활용 방향'), point.direction])
          ]))
        ]),
        h('article', { class: 'dart-guide-block' }, [
          h('h3', '2. 문항별 추천'),
          ...guide.recommendations.map((item) => h('div', { class: 'dart-question-match-card', key: item.id }, [
            h('header', [
              h('strong', `${item.questionNumber}번 문항`),
              h('span', `추천도 ${item.fit}`)
            ]),
            h('p', { class: 'dart-question-prompt' }, item.prompt),
            h('dl', [
              h('dt', '활용할 DART 근거'),
              h('dd', `${item.basisLabel} · ${item.basisText}`),
              h('dt', '연결하기 좋은 역량'),
              h('dd', item.competency),
              h('dt', '삽입 문장 후보'),
              h('dd', item.sentence)
            ])
          ]))
        ]),
        h('article', { class: 'dart-guide-block' }, [
          h('h3', '3. 주의할 표현'),
          ...guide.cautions.map((item, index) => h('div', { class: 'dart-caution-card', key: index }, [
            h('p', [h('span', '주의'), item.risk]),
            h('p', [h('span', '권장'), item.rewrite])
          ]))
        ])
      ]);
    }

    function renderNewsBoard(draft) {
      return h('section', { class: 'drawer-board news-board-page' }, [
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
            'data-placeholder': '마크다운으로 입력하거나 이미지를 붙여넣으세요.',
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
        h('div', {
          ref: editorRef,
          class: 'markdown-empty-page',
          contenteditable: 'true',
          'aria-label': '마크다운 게시판 편집 영역',
          'data-testid': 'markdown-editor',
          'data-placeholder': '마크다운으로 입력하거나 이미지를 붙여넣으세요.',
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
  inheritAttrs: false,
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
    const selectedColor = ref('#334155');
    const selectedFontSize = ref('3');
    let syncingFromModel = false;
    let savedSelectionRange = null;

    onMounted(() => {
      if (editorRef.value) {
        editorRef.value.innerHTML = plainTextToEditorHtml(props.modelValue);
        wrapLooseEditorImages(editorRef.value);
      }
    });

    watch(() => props.modelValue, (value) => {
      const editor = editorRef.value;
      if (!editor || document.activeElement === editor) return;
      syncingFromModel = true;
      editor.innerHTML = plainTextToEditorHtml(value);
      wrapLooseEditorImages(editor);
      syncingFromModel = false;
    }, { immediate: true });

    function emitPlainText() {
      if (syncingFromModel) return;
      emit('update:modelValue', editorToPlainText(editorRef.value));
    }

    function rememberSelection() {
      const editor = editorRef.value;
      const selection = window.getSelection();
      if (!editor || !selection || selection.rangeCount === 0) return;
      const anchor = selection.anchorNode;
      const focus = selection.focusNode;
      if (!anchor || !focus || !editor.contains(anchor) || !editor.contains(focus)) return;
      savedSelectionRange = selection.getRangeAt(0).cloneRange();
    }

    function restoreSelection() {
      const selection = window.getSelection();
      if (!selection || !savedSelectionRange) {
        editorRef.value?.focus();
        return;
      }
      selection.removeAllRanges();
      selection.addRange(savedSelectionRange);
    }

    function emitAndRemember() {
      rememberSelection();
      emitPlainText();
    }

    function handlePaste(event) {
      const items = [...(event.clipboardData?.items ?? [])];
      const imageItems = items.filter((item) => item.type.startsWith('image/'));
      if (imageItems.length) {
        event.preventDefault();
        insertImageFiles(imageItems.map((item) => item.getAsFile()).filter(Boolean), emitAndRemember);
        return;
      }

      const markdown = event.clipboardData?.getData('text/plain') ?? '';
      if (!markdown.trim()) return;
      event.preventDefault();
      insertHtmlAtCursor(markdownToHtml(markdown));
      emitAndRemember();
    }

    function handleDrop(event) {
      const files = [...(event.dataTransfer?.files ?? [])].filter((item) => item.type.startsWith('image/'));
      if (!files.length) return;
      event.preventDefault();
      editorRef.value?.focus();
      insertImageFiles(files, emitAndRemember);
    }

    function handleKeydown(event) {
      if (event.key !== ' ' && event.key !== 'Enter') return;
      nextTick(() => {
        applyCanvasMarkdownShortcut();
        emitAndRemember();
      });
    }

    function runFormat(command, value = null) {
      if (props.disabled) return;
      restoreSelection();
      document.execCommand(command, false, value);
      emitAndRemember();
    }

    function applyColor(event) {
      selectedColor.value = event.target.value;
      runFormat('foreColor', selectedColor.value);
    }

    function applyFontSize(event) {
      selectedFontSize.value = event.target.value;
      if (props.disabled) return;
      restoreSelection();
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && !selection.getRangeAt(0).collapsed) {
        document.execCommand('fontSize', false, selectedFontSize.value);
      } else {
        const block = currentEditableBlock();
        if (block && editorRef.value?.contains(block)) {
          block.style.fontSize = fontSizeCss(selectedFontSize.value);
          block.dataset.fontSize = selectedFontSize.value;
        } else {
          document.execCommand('fontSize', false, selectedFontSize.value);
        }
      }
      emitAndRemember();
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

    return () => h('div', { class: ['rich-draft-editor', { disabled: props.disabled }] }, [
      h('div', { class: 'rich-editor-toolbar', 'aria-label': '글 편집 도구' }, [
        h('button', { type: 'button', title: '굵게', onMousedown: (event) => event.preventDefault(), onClick: () => runFormat('bold') }, 'B'),
        h('button', { type: 'button', title: '기울임', onMousedown: (event) => event.preventDefault(), onClick: () => runFormat('italic') }, 'I'),
        h('button', { type: 'button', title: '밑줄', onMousedown: (event) => event.preventDefault(), onClick: () => runFormat('underline') }, 'U'),
        h('button', { type: 'button', title: '취소선', onMousedown: (event) => event.preventDefault(), onClick: () => runFormat('strikeThrough') }, 'S'),
        h('span', { class: 'rich-toolbar-divider', 'aria-hidden': 'true' }),
        h('label', { class: 'rich-toolbar-select' }, [
          h('span', '크기'),
          h('select', { value: selectedFontSize.value, onFocus: rememberSelection, onChange: applyFontSize }, [
            h('option', { value: '2' }, '작게'),
            h('option', { value: '3' }, '보통'),
            h('option', { value: '4' }, '크게'),
            h('option', { value: '5' }, '제목')
          ])
        ]),
        h('label', { class: 'rich-toolbar-color' }, [
          h('span', '색상'),
          h('input', { type: 'color', value: selectedColor.value, onMousedown: (event) => event.preventDefault(), onInput: applyColor })
        ]),
        h('span', { class: 'rich-toolbar-divider', 'aria-hidden': 'true' }),
        h('button', { type: 'button', title: '글머리 기호', onMousedown: (event) => event.preventDefault(), onClick: () => runFormat('insertUnorderedList') }, '•'),
        h('button', { type: 'button', title: '왼쪽 정렬', onMousedown: (event) => event.preventDefault(), onClick: () => runFormat('justifyLeft') }, '≡'),
        h('button', { type: 'button', title: '가운데 정렬', onMousedown: (event) => event.preventDefault(), onClick: () => runFormat('justifyCenter') }, '☰')
      ]),
      h('div', {
        ref: editorRef,
        class: ['draft-surface', 'draft-markdown-editor', { disabled: props.disabled }],
        contenteditable: String(!props.disabled),
        role: 'textbox',
        'aria-label': '자기소개서 초안',
        'data-testid': 'draft-editor',
        'data-placeholder': '자기소개서 초안을 작성하세요.',
        ...attrs,
        onInput: emitAndRemember,
        onPaste: handlePaste,
        onDrop: handleDrop,
        onDragover: (event) => event.preventDefault(),
        onKeydown: handleKeydown,
        onKeyup: rememberSelection,
        onMouseup: rememberSelection
      })
    ]);
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
  if (!value?.trim()) return '';
  if (/<(?:p|div|figure|br|span|font|b|strong|i|em|u|ul|ol|li|h[1-6]|blockquote|details|pre|img)\b/i.test(value)) {
    return value;
  }
  return markdownToHtml(value);
}

function savedEntryBodyHtml(value) {
  const raw = String(value || '');
  const html = /<(?:p|div|figure|br|span|font|b|strong|i|em|u|s|strike|ul|ol|li|h[1-6]|blockquote|details|pre|img)\b/i.test(raw)
    ? raw
    : markdownToHtml(raw);
  return sanitizeSavedRichContent(html);
}

function sanitizeSavedRichContent(html) {
  return String(html || '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\son\w+=(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s(href|src)=("|')javascript:[^"']*\2/gi, ' $1="#"');
}

function editorToPlainText(editor) {
  const html = editor?.innerHTML ?? '';
  if (/<(?:figure|span|font|b|strong|i|em|u|strike|ul|ol|li|h[1-6]|blockquote|details|pre|img)\b/i.test(html)) {
    return html.trim();
  }
  const text = editor?.innerText ?? editor?.textContent ?? '';
  return text
    .replace(/\u00A0/g, ' ')
    .replace(/\u200B/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd();
}

function inlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<figure class="resizable-image-frame" contenteditable="false"><img class="markdown-pasted-image" alt="$1" src="$2"></figure>')
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

function insertImageFiles(files, afterInsert = () => {}) {
  const validFiles = files.filter(Boolean);
  if (!validFiles.length) return;
  let pending = validFiles.length;
  validFiles.forEach((file) => {
    insertImageFile(file, () => {
      pending -= 1;
      if (pending === 0) afterInsert();
    });
  });
}

function insertImageFile(file, afterInsert = () => {}) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const frame = document.createElement('figure');
    frame.className = 'resizable-image-frame';
    frame.contentEditable = 'false';
    const image = document.createElement('img');
    image.src = String(reader.result);
    image.alt = file.name || '붙여넣은 이미지';
    image.className = 'markdown-pasted-image';
    frame.appendChild(image);
    insertNodeAtCursor(frame);
    const spacer = document.createElement('p');
    spacer.innerHTML = '<br>';
    insertNodeAtCursor(spacer);
    afterInsert();
  };
  reader.readAsDataURL(file);
}

function wrapLooseEditorImages(editor) {
  editor?.querySelectorAll?.('img.markdown-pasted-image')?.forEach((image) => {
    if (image.closest('.resizable-image-frame')) return;
    const frame = document.createElement('figure');
    frame.className = 'resizable-image-frame';
    frame.contentEditable = 'false';
    image.replaceWith(frame);
    frame.appendChild(image);
  });
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

function fontSizeCss(size) {
  return {
    2: '0.92rem',
    3: '1rem',
    4: '1.16rem',
    5: '1.35rem'
  }[Number(size)] ?? '1rem';
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
});
</script>
