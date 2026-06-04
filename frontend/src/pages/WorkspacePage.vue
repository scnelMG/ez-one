<template>
  <AppLayout>
    <section class="wire-page workspace-wire">
      <header class="wire-toolbar">
        <div>
          <p class="section-kicker">지원 워크스페이스</p>
          <h1>지원 워크스페이스</h1>
          <p>{{ headerDescription }}</p>
        </div>
        <div class="toolbar-actions">
          <button class="ghost-button" type="button">원문 보기</button>
          <button class="primary-button" type="button">버전 저장</button>
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
          <button class="question-item active" type="button">문항 1</button>
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
            title="워크스페이스 로딩 실패"
            :body="workspaceStore.errorMessage"
          />
          <template v-else-if="workspaceStore.workspace">
            <div class="editor-toolbar">
            <div>
                <p class="section-kicker">초안 작성</p>
                <h2>{{ workspaceStore.workspace.questions[0]?.prompt }}</h2>
              </div>
              <span class="status-chip">자동 저장 대기</span>
            </div>
            <div class="draft-surface">
              {{ workspaceStore.workspace.questions[0]?.draft }}
            </div>
            <div class="editor-meta">
              <span>{{ draftLength }} / {{ workspaceStore.workspace.questions[0]?.maxLength }}자</span>
              <button class="ghost-button" type="button">저장</button>
            </div>
          </template>
        </main>

        <aside class="reference-side-panel">
          <div class="section-heading">
            <div>
              <p class="section-kicker">작성 옆 참고자료</p>
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

      <section class="wire-panel" aria-label="참고자료 보드 미리보기">
        <div class="section-heading">
          <div>
            <p class="section-kicker">자료 보드</p>
            <h2>참고자료 보드</h2>
          </div>
        </div>
        <div class="reference-board-grid">
          <article v-for="board in referenceBoards" :key="board">
            <strong>{{ board }}</strong>
            <div class="mini-lines" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </article>
        </div>
      </section>
    </section>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from '@/shared/AppLayout.vue'
import StatePanel from '@/shared/StatePanel.vue'
import { useWorkspaceStore } from '@/stores/workspaceStore'

const route = useRoute()
const workspaceStore = useWorkspaceStore()
const workspaceId = computed(() => String(route.params.workspaceId ?? '102'))
const referenceBoards = ['JD', '뉴스', 'DART', '인재상', '프로젝트', '메모']
const headerDescription = computed(() => {
  const workspace = workspaceStore.workspace

  if (!workspace) {
    return `워크스페이스 ${workspaceId.value}에서 자기소개서, 참고자료, 서류 기본값을 함께 관리합니다.`
  }

  return `${workspace.companyName} ${workspace.positionTitle} 지원을 위한 작성 공간입니다.`
})
const draftLength = computed(() => workspaceStore.workspace?.questions[0]?.draft.length ?? 0)

function loadCurrentWorkspace() {
  void workspaceStore.loadWorkspace(workspaceId.value)
}

onMounted(loadCurrentWorkspace)
watch(workspaceId, loadCurrentWorkspace)
</script>
