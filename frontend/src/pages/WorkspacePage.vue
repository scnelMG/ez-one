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

        <article class="workspace-info-section">
          <div class="workspace-section-title">
            <h2>기업정보</h2>
          </div>
          <dl class="info-grid compact">
            <div>
              <dt>기업유형</dt>
              <dd>{{ workspaceStore.workspace.companyDetails?.companyType ?? '미입력' }}</dd>
            </div>
            <div>
              <dt>산업</dt>
              <dd>{{ workspaceStore.workspace.companyDetails?.industry ?? workspaceStore.workspace.companyDetails?.domain ?? '미입력' }}</dd>
            </div>
            <div>
              <dt>사원수</dt>
              <dd>{{ workspaceStore.workspace.companyDetails?.employeeCount ?? workspaceStore.workspace.companyDetails?.size ?? '미입력' }}</dd>
            </div>
            <div>
              <dt>설립일</dt>
              <dd>{{ workspaceStore.workspace.companyDetails?.foundedAt ?? '미입력' }}</dd>
            </div>
            <div>
              <dt>자본금</dt>
              <dd>{{ workspaceStore.workspace.companyDetails?.capital ?? '미입력' }}</dd>
            </div>
            <div>
              <dt>매출액</dt>
              <dd>{{ workspaceStore.workspace.companyDetails?.revenue ?? '미입력' }}</dd>
            </div>
            <div>
              <dt>대표자</dt>
              <dd>{{ workspaceStore.workspace.companyDetails?.representative ?? '미입력' }}</dd>
            </div>
            <div>
              <dt>홈페이지</dt>
              <dd>{{ workspaceStore.workspace.companyDetails?.homepage ?? workspaceStore.workspace.companyDetails?.domain ?? '미입력' }}</dd>
            </div>
            <div class="wide-info-row">
              <dt>주요사업</dt>
              <dd>{{ workspaceStore.workspace.companyDetails?.business ?? '미입력' }}</dd>
            </div>
            <div class="wide-info-row">
              <dt>주소</dt>
              <dd>{{ workspaceStore.workspace.companyDetails?.address ?? '미입력' }}</dd>
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
                    <label>
                      <span>{{ activeQuestionIndex + 1 }}번 문항</span>
                      <input
                        v-model="editQuestion.prompt"
                        data-testid="edit-question-prompt"
                        aria-label="문항 제목"
                        @blur="saveQuestionSettings"
                        @keydown.enter.prevent="saveQuestionSettings"
                      />
                    </label>
                    <label>
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
                    class="status-chip"
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
                    <p class="section-kicker">자소서 버전관리</p>
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

            <button
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
              <section v-if="workspaceStore.activeReference" class="reference-editor-panel floating-editor">
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
  prompt: '새 문항',
  maxLength: 1000
});
const editQuestion = reactive({
  prompt: '',
  maxLength: 1000
});

const defaultQuestions = [
  { id: 'default-1', prompt: '1번 문항', draft: '', maxLength: 1000, localOnly: true },
  { id: 'default-2', prompt: '2번 문항', draft: '', maxLength: 1000, localOnly: true },
  { id: 'default-3', prompt: '3번 문항', draft: '', maxLength: 1000, localOnly: true }
];
const localQuestions = ref([]);
const localDrafts = reactive({});
const localQuestionEdits = reactive({});
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
const currentQuestionVersions = computed(() => {
  if (!currentQuestion.value) return [];
  return workspaceStore.versions.filter((version) => version.questionId === currentQuestion.value.id);
});
const selectedLeftVersion = computed(() => currentQuestionVersions.value.find((version) => version.id === selectedLeftVersionId.value) ?? null);
const selectedRightVersion = computed(() => currentQuestionVersions.value.find((version) => version.id === selectedRightVersionId.value) ?? null);
const versionDiffRows = computed(() => buildLineDiff(selectedLeftVersion.value?.body ?? '', selectedRightVersion.value?.body ?? ''));
const canSaveFinalEssay = computed(() => Boolean(
  currentQuestion.value
  && !currentQuestion.value.localOnly
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
  rememberRecentWorkspace(workspaceId.value);
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

async function saveDraft() {
  if (!currentQuestion.value) return;
  clearAutoSaveTimer();
  autoSaveStatus.value = 'saving';
  await workspaceStore.saveDraft(workspaceId.value, currentQuestion.value.id, draftBody.value);
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
    prompt: `${nextNumber}번 문항`,
    draft: '',
    maxLength: 1000,
    localOnly: true
  }];
  activeQuestionIndex.value = nextIndex;
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
    return;
  }
  await workspaceStore.updateQuestion(workspaceId.value, currentQuestion.value.id, payload);
}

function deleteQuestion() {
  if (!currentQuestion.value) return;
  void workspaceStore.deleteQuestion(workspaceId.value, currentQuestion.value.id);
}

async function createVersion() {
  if (!currentQuestion.value || currentQuestion.value.localOnly) return;
  await saveDraft();
  await workspaceStore.createVersion(workspaceId.value, currentQuestion.value.id, `v${currentQuestionVersions.value.length + 1}`);
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
}

function createReference() {
  const type = activeBoard.value === 'AWARDS_PROJECTS' ? 'AWARDS_PROJECTS' : activeBoard.value;
  const template = referenceTemplate(type);
  void workspaceStore.createReference(workspaceId.value, {
    boardName: type,
    referenceType: type,
    title: template.title,
    body: template.body,
    url: ''
  });
}

function openReference(referenceId) {
  const reference = workspaceStore.workspace?.references.find((item) => item.id === referenceId);
  if (reference?.type) {
    activeBoard.value = reference.type;
  }
  drawerOpen.value = true;
  void workspaceStore.openReference(referenceId);
}

function saveReference() {
  const reference = workspaceStore.activeReference;
  if (!reference) return;
  void workspaceStore.updateReference(reference.id, {
    boardName: referenceForm.referenceType,
    referenceType: referenceForm.referenceType,
    title: referenceForm.title,
    body: referenceForm.body,
    url: referenceForm.url
  });
}

function deleteReference() {
  const reference = workspaceStore.activeReference;
  if (!reference) return;
  void workspaceStore.deleteReference(reference.id);
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

    function runCommand(command, value = null) {
      focusEditor();
      document.execCommand(command, false, value);
      updateEmptyState();
    }

    function insertHeading() {
      runCommand('formatBlock', 'h3');
    }

    function insertList() {
      runCommand('insertUnorderedList');
    }

    function insertCodeBlock() {
      focusEditor();
      const code = document.createElement('pre');
      code.className = 'markdown-code-block';
      code.textContent = '코드를 입력하세요.';
      insertNodeAtCursor(code);
      insertNodeAtCursor(document.createElement('p'));
      updateEmptyState();
    }

    function insertLink() {
      focusEditor();
      const selectedText = window.getSelection()?.toString() || '링크';
      document.execCommand('createLink', false, 'https://');
      if (!window.getSelection()?.toString()) {
        insertHtmlAtCursor(`<a href="https://" target="_blank" rel="noreferrer">${selectedText}</a>`);
      }
      updateEmptyState();
    }

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
      updateEmptyState();
    }

    function handleDrop(event) {
      const file = [...(event.dataTransfer?.files ?? [])].find((item) => item.type.startsWith('image/'));
      if (!file) return;
      event.preventDefault();
      focusEditor();
      insertImageFile(file, updateEmptyState);
    }

    function handleKeydown(event) {
      if (event.key !== ' ' && event.key !== 'Enter') return;
      nextTick(() => {
        applyMarkdownShortcuts();
        updateEmptyState();
      });
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

    return () => h('section', { class: 'drawer-board markdown-board-page' }, [
      h('div', { class: 'markdown-editor-wrap' }, [
        isEmpty.value ? h('p', { class: 'markdown-placeholder' }, '마크다운으로 입력하거나 이미지를 붙여넣으세요.') : null,
        h('div', {
          ref: editorRef,
          class: 'markdown-empty-page',
          contenteditable: 'true',
          'aria-label': '마크다운 게시판 편집 영역',
          'data-testid': 'markdown-editor',
          onInput: updateEmptyState,
          onPaste: handlePaste,
          onDrop: handleDrop,
          onDragover: (event) => event.preventDefault(),
          onKeydown: handleKeydown
        })
      ])
    ]);
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
  setup(props, { emit }) {
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
