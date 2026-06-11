<template>
  <AppLayout>
    <section class="study-detail-page">
      <header class="study-header">
        <div class="breadcrumb">
          <RouterLink to="/study">← 취업 스터디 목록으로</RouterLink>
        </div>
        <h1>{{ studyStore.currentStudy?.name || '로딩 중...' }}</h1>
        <p class="study-description">{{ studyStore.currentStudy?.description }}</p>
        <div class="header-actions">
          <button class="ghost-button" type="button" @click="inviteMember">팀원 초대</button>
        </div>
      </header>

      <div class="study-layout">
        <!-- 좌측 사이드바: 탭 메뉴 -->
        <aside class="study-sidebar">
          <nav class="study-nav">
            <button
              :class="{ active: activeTab === 'dashboard' }"
              @click="activeTab = 'dashboard'"
            >
              스터디 대시보드
            </button>
            <button
              :class="{ active: activeTab === 'essays' }"
              @click="activeTab = 'essays'"
            >
              자소서 피드백
            </button>
            <button
              :class="{ active: activeTab === 'jobs' }"
              @click="activeTab = 'jobs'"
            >
              지인 공고 추천
            </button>
          </nav>
        </aside>

        <!-- 우측 메인 콘텐츠 -->
        <main class="study-main-content">
          <!-- 대시보드 탭 -->
          <div v-if="activeTab === 'dashboard'" class="tab-pane">
            <h2>멤버 현황</h2>
            <div v-if="studyStore.status === 'loading'" class="loading-state">로딩 중...</div>
            <div v-else class="member-list">
              <div class="member-row" v-for="member in studyStore.currentStudy?.members || []" :key="member.id">
                <div class="member-info">
                  <span class="member-avatar">{{ member.userEmail.charAt(0).toUpperCase() }}</span>
                  <strong>{{ member.userEmail }}</strong>
                  <span class="role-badge" v-if="member.role === 'LEADER'">스터디장</span>
                </div>
                <div class="member-stats">
                  <span>진행 중인 공고: <strong>{{ member.activeJobCount || 0 }}</strong>개</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 자소서 피드백 탭 -->
          <div v-if="activeTab === 'essays'" class="tab-pane">
            <div class="section-heading">
              <h2>공유된 자소서</h2>
              <button class="primary-button" type="button" @click="shareEssay">내 자소서 공유하기</button>
            </div>
            <div v-if="studyStore.sharedEssays.length === 0" class="empty-state">
              아직 공유된 자소서가 없습니다.
            </div>
            <div v-else class="shared-list">
              <div class="shared-card" v-for="essay in studyStore.sharedEssays" :key="essay.id">
                <div class="shared-card-header">
                  <p><strong>{{ essay.userEmail }}</strong>님의 자소서</p>
                  <small>{{ new Date(essay.sharedAt).toLocaleString() }}</small>
                </div>
                <h3>{{ essay.companyName || '회사명 정보 없음' }} - {{ essay.positionTitle || '직무 정보 없음' }}</h3>
                <p>마감일: {{ essay.deadlineLabel || '-' }}</p>
                <button class="text-button" @click="viewEssay(essay.id)">자세히 보기</button>
              </div>
            </div>
          </div>

          <!-- 지인 공고 추천 탭 -->
          <div v-if="activeTab === 'jobs'" class="tab-pane">
            <div class="section-heading">
              <h2>추천된 공고</h2>
              <button class="primary-button" type="button" @click="recommendJob">내 장바구니에서 공고 추천</button>
            </div>
            <div v-if="studyStore.sharedJobs.length === 0" class="empty-state">
              아직 추천된 공고가 없습니다.
            </div>
            <div v-else class="shared-list">
              <div class="shared-card" v-for="job in studyStore.sharedJobs" :key="job.id">
                <p><strong>{{ job.recommenderEmail }}</strong>님이 추천했습니다.</p>
                <h3>{{ job.companyName }} - {{ job.positionTitle }}</h3>
                <p>마감일: {{ job.deadlineLabel }}</p>
                <a v-if="job.sourceUrl" :href="job.sourceUrl" target="_blank" class="text-button">공고 보러가기</a>
              </div>
            </div>
          </div>
        </main>
      </div>

      <!-- 내 자소서 공유하기 모달 -->
      <div v-if="isShareModalOpen" class="modal-backdrop" @click.self="closeShareModal">
        <div class="modal-content share-modal">
          <header class="modal-header">
            <h2>내 자소서 공유하기</h2>
            <button class="icon-button" @click="closeShareModal">×</button>
          </header>
          
          <div class="modal-body">
            <!-- Step 1: 워크스페이스(지원 공고) 선택 -->
            <div v-if="shareStep === 1">
              <h3>1. 지원 공고 선택</h3>
              <p v-if="isLoadingBaskets">불러오는 중...</p>
              <div v-else-if="baskets.length === 0" class="empty-state">
                현재 진행 중인 워크스페이스(지원 공고)가 없습니다.
              </div>
              <ul v-else class="workspace-list">
                <li v-for="basket in baskets" :key="basket.id" class="workspace-item">
                  <div class="workspace-info">
                    <strong>{{ basket.companyName }}</strong>
                    <span>{{ basket.positionTitle }}</span>
                  </div>
                  <button class="primary-button" @click="selectWorkspace(basket)">선택</button>
                </li>
              </ul>
            </div>

            <!-- Step 2: 문항별 버전 선택 -->
            <div v-else-if="shareStep === 2">
              <h3>2. 문항별 공유할 버전 선택</h3>
              <p class="selected-workspace-title">{{ selectedWorkspaceName }}</p>
              
              <p v-if="isLoadingWorkspaceData">문항 및 버전을 불러오는 중...</p>
              <div v-else class="question-list">
                <div v-for="q in workspaceQuestions" :key="q.id" class="question-item">
                  <p class="question-prompt"><strong>{{ q.prompt }}</strong></p>
                  <label class="version-select-label">
                    버전 선택:
                    <select v-model="selectedVersions[q.id]">
                      <option value="">-- 공유 안 함 --</option>
                      <option v-for="v in getVersionsForQuestion(q.id)" :key="v.id" :value="v.id">
                        {{ v.versionName }} ({{ v.createdAt }})
                      </option>
                    </select>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <footer class="modal-footer" v-if="shareStep === 2">
            <button class="ghost-button" @click="shareStep = 1">이전</button>
            <button class="primary-button" @click="submitSharedEssay" :disabled="isSharing">
              {{ isSharing ? '공유 중...' : '스터디에 공유하기' }}
            </button>
          </footer>
        </div>
      </div>

      <!-- 자세히 보기 모달 -->
      <div v-if="isDetailModalOpen" class="modal-backdrop" @click.self="closeDetailModal">
        <div class="modal-content detail-modal">
          <header class="modal-header">
            <h2>공유된 자소서 상세</h2>
            <button class="icon-button" @click="closeDetailModal">×</button>
          </header>
          
          <div class="modal-body" v-if="studyStore.status === 'loading' || !studyStore.currentSharedEssayDetail">
            <p>로딩 중...</p>
          </div>
          <div class="modal-body detail-layout" v-else>
            <!-- 자소서 영역 -->
            <div class="essay-content-section">
              <div class="essay-meta">
                <h3>{{ studyStore.currentSharedEssayDetail.companyName }} - {{ studyStore.currentSharedEssayDetail.positionTitle }}</h3>
                <p>작성자: <strong>{{ studyStore.currentSharedEssayDetail.userEmail }}</strong> | 마감일: {{ studyStore.currentSharedEssayDetail.deadlineLabel }}</p>
              </div>
              <div class="essay-items">
                <div v-for="item in studyStore.currentSharedEssayDetail.items" :key="item.versionId" class="essay-item">
                  <h4 class="question-title">Q. {{ item.questionText }}</h4>
                  <div class="essay-body" v-html="item.body"></div>
                </div>
                <div v-if="studyStore.currentSharedEssayDetail.items.length === 0" class="empty-state">
                  선택된 자소서 내용이 없습니다.
                </div>
              </div>
            </div>

            <!-- 피드백 영역 -->
            <div class="feedback-section">
              <h3>피드백</h3>
              <div class="feedback-list">
                <div v-for="fb in studyStore.currentSharedEssayDetail.feedbacks" :key="fb.id" class="feedback-item">
                  <div class="feedback-meta">
                    <strong>{{ fb.authorEmail }}</strong>
                    <span class="time">{{ new Date(fb.createdAt).toLocaleString() }}</span>
                  </div>
                  <p class="fb-content">{{ fb.content }}</p>
                </div>
                <div v-if="studyStore.currentSharedEssayDetail.feedbacks.length === 0" class="empty-feedback">
                  아직 작성된 피드백이 없습니다.
                </div>
              </div>
              
              <div class="feedback-input">
                <textarea v-model="feedbackContent" placeholder="피드백을 남겨주세요..." rows="3"></textarea>
                <div class="feedback-actions">
                  <button class="primary-button" @click="submitFeedback" :disabled="!feedbackContent.trim() || isSubmittingFeedback">
                    {{ isSubmittingFeedback ? '등록 중...' : '등록' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 내 장바구니 공고 추천 모달 -->
      <div v-if="isRecommendModalOpen" class="modal-backdrop" @click.self="isRecommendModalOpen = false">
        <div class="modal-content share-modal">
          <header class="modal-header">
            <h2>지인 공고 추천하기</h2>
            <button class="icon-button" @click="isRecommendModalOpen = false">×</button>
          </header>
          
          <div class="modal-body">
            <p v-if="isLoadingRecommendJobs">불러오는 중...</p>
            <div v-else-if="recommendJobsList.length === 0" class="empty-state">
              장바구니에 담긴 공고가 없습니다.
            </div>
            <ul v-else class="workspace-list">
              <li v-for="basket in recommendJobsList" :key="basket.id" class="workspace-item checkbox-item">
                <label class="checkbox-label">
                  <input type="checkbox" :value="basket" v-model="selectedRecommendJobs">
                  <div class="workspace-info">
                    <strong>{{ basket.companyName }}</strong>
                    <span>{{ basket.positionTitle }}</span>
                    <small>마감일: {{ basket.deadlineLabel }}</small>
                  </div>
                </label>
              </li>
            </ul>
          </div>

          <footer class="modal-footer">
            <button class="ghost-button" @click="isRecommendModalOpen = false">취소</button>
            <button class="primary-button" @click="submitRecommendJobs" :disabled="selectedRecommendJobs.length === 0 || isRecommending">
              {{ isRecommending ? '추천 중...' : `${selectedRecommendJobs.length}개 추천하기` }}
            </button>
          </footer>
        </div>
      </div>
    </section>
  </AppLayout>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import AppLayout from '@/shared/AppLayout.vue';
import { useStudyStore } from '@/stores/studyStore';
import { studyApi } from '@/features/study/api/studyApi';
import { basketApi } from '@/features/basket/api/basketApi';
import { workspaceApi } from '@/features/workspace/api/workspaceApi';

const route = useRoute();
const studyStore = useStudyStore();
const activeTab = ref('dashboard');
const studyId = route.params.studyId;

// 모달 상태
const isShareModalOpen = ref(false);
const shareStep = ref(1);
const isLoadingBaskets = ref(false);
const isLoadingWorkspaceData = ref(false);
const isSharing = ref(false);

const baskets = ref([]);
const selectedWorkspaceId = ref(null);
const selectedWorkspaceName = ref('');
const workspaceQuestions = ref([]);
const workspaceVersions = ref([]);
const selectedVersions = ref({});

// 상세 보기 모달 상태
const isDetailModalOpen = ref(false);
const feedbackContent = ref('');
const isSubmittingFeedback = ref(false);

// 추천 공고 모달 상태
const isRecommendModalOpen = ref(false);
const recommendJobsList = ref([]);
const selectedRecommendJobs = ref([]);
const isLoadingRecommendJobs = ref(false);
const isRecommending = ref(false);

onMounted(() => {
  loadData();
});

watch(activeTab, () => {
  loadData();
});

function loadData() {
  if (activeTab.value === 'dashboard') {
    studyStore.loadStudyDetail(studyId);
  } else if (activeTab.value === 'essays') {
    studyStore.loadSharedEssays(studyId);
  } else if (activeTab.value === 'jobs') {
    studyStore.loadSharedJobs(studyId);
  }
}

async function inviteMember() {
  const email = prompt('초대할 팀원의 이메일을 입력하세요:');
  if (email) {
    try {
      await studyApi.inviteMember(studyId, email);
      alert(`${email} 님에게 초대 메일을 보냈습니다!`);
    } catch (e) {
      alert(e.message || '초대 실패');
    }
  }
}

async function shareEssay() {
  isShareModalOpen.value = true;
  shareStep.value = 1;
  isLoadingBaskets.value = true;
  try {
    const allJobs = await basketApi.listJobs();
    // 워크스페이스가 생성된(workspaceId가 있는) 공고만 필터링
    baskets.value = allJobs.filter(job => job.workspaceId);
  } catch (e) {
    alert('목록을 불러오는 중 오류가 발생했습니다.');
  } finally {
    isLoadingBaskets.value = false;
  }
}

function closeShareModal() {
  isShareModalOpen.value = false;
  selectedWorkspaceId.value = null;
  workspaceQuestions.value = [];
  workspaceVersions.value = [];
  selectedVersions.value = {};
}

async function selectWorkspace(basket) {
  selectedWorkspaceId.value = basket.workspaceId;
  selectedWorkspaceName.value = `${basket.companyName} - ${basket.positionTitle}`;
  shareStep.value = 2;
  isLoadingWorkspaceData.value = true;
  
  try {
    const workspace = await workspaceApi.getWorkspace(basket.workspaceId);
    workspaceQuestions.value = workspace.questions || [];
    workspaceVersions.value = await workspaceApi.listVersions(basket.workspaceId);
    
    // 기본 선택값 초기화
    selectedVersions.value = {};
    workspaceQuestions.value.forEach(q => {
      selectedVersions.value[q.id] = '';
    });
  } catch (e) {
    alert('워크스페이스 정보를 불러오지 못했습니다.');
    shareStep.value = 1;
  } finally {
    isLoadingWorkspaceData.value = false;
  }
}

function getVersionsForQuestion(questionId) {
  return workspaceVersions.value.filter(v => v.questionId === String(questionId));
}

async function submitSharedEssay() {
  const versionIds = Object.values(selectedVersions.value).filter(id => id !== '');
  if (versionIds.length === 0) {
    alert('최소 1개 이상의 버전을 선택해야 합니다.');
    return;
  }
  
  isSharing.value = true;
  try {
    await studyApi.shareEssay(studyId, selectedWorkspaceId.value, versionIds);
    alert('자소서가 공유되었습니다!');
    closeShareModal();
    studyStore.loadSharedEssays(studyId);
  } catch (e) {
    alert('공유 중 오류가 발생했습니다.');
  } finally {
    isSharing.value = false;
  }
}

async function viewEssay(essayId) {
  isDetailModalOpen.value = true;
  feedbackContent.value = '';
  await studyStore.loadSharedEssayDetail(studyId, essayId);
}

function closeDetailModal() {
  isDetailModalOpen.value = false;
  studyStore.currentSharedEssayDetail = null;
}

async function submitFeedback() {
  if (!feedbackContent.value.trim() || !studyStore.currentSharedEssayDetail) return;
  
  isSubmittingFeedback.value = true;
  try {
    await studyStore.addEssayFeedback(studyId, studyStore.currentSharedEssayDetail.id, feedbackContent.value);
    feedbackContent.value = '';
  } catch (e) {
    alert('피드백 등록 중 오류가 발생했습니다.');
  } finally {
    isSubmittingFeedback.value = false;
  }
}

async function recommendJob() {
  isRecommendModalOpen.value = true;
  isLoadingRecommendJobs.value = true;
  selectedRecommendJobs.value = [];
  try {
    const allJobs = await basketApi.listJobs();
    recommendJobsList.value = allJobs;
  } catch (e) {
    alert('목록을 불러오는 중 오류가 발생했습니다.');
  } finally {
    isLoadingRecommendJobs.value = false;
  }
}

async function submitRecommendJobs() {
  isRecommending.value = true;
  try {
    const promises = selectedRecommendJobs.value.map(job => {
      return studyApi.recommendJob(studyId, {
        companyName: job.companyName,
        positionTitle: job.positionTitle,
        deadlineLabel: job.deadlineLabel,
        sourceUrl: job.sourceUrl || ''
      });
    });
    await Promise.all(promises);
    alert('공고를 추천했습니다!');
    isRecommendModalOpen.value = false;
    studyStore.loadSharedJobs(studyId);
  } catch (e) {
    alert('공고 추천 중 오류가 발생했습니다.');
  } finally {
    isRecommending.value = false;
  }
}
</script>

<style scoped>
.study-detail-page {
  padding: 40px;
  max-width: 1200px;
  margin: 0 auto;
}
.breadcrumb {
  margin-bottom: 16px;
  font-size: 0.9rem;
}
.study-header {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--line);
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}
.study-layout {
  display: flex;
  gap: 40px;
}
.study-sidebar {
  width: 240px;
  flex-shrink: 0;
}
.study-nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.study-nav button {
  text-align: left;
  padding: 12px 16px;
  border-radius: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 1rem;
  color: var(--text-secondary);
}
.study-nav button:hover {
  background: var(--surface-hover);
}
.study-nav button.active {
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: bold;
}
.study-main-content {
  flex-grow: 1;
}
.section-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}
.member-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 16px;
}
.member-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 8px;
}
.member-info {
  display: flex;
  align-items: center;
  gap: 12px;
}
.member-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--line);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: var(--text-secondary);
}
.role-badge {
  font-size: 0.75rem;
  background: var(--color-primary-light);
  color: var(--color-primary);
  padding: 2px 6px;
  border-radius: 4px;
}
.shared-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.shared-card {
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
}
.shared-card h3 {
  margin: 8px 0;
}
.empty-state {
  color: var(--text-secondary);
  padding: 40px 0;
  text-align: center;
  background: var(--surface);
  border-radius: 8px;
  border: 1px dashed var(--line-strong);
}

/* Modal Styles */
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content {
  background: var(--surface);
  border-radius: 12px;
  width: 500px;
  max-width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
}
.modal-header {
  padding: 20px;
  border-bottom: 1px solid var(--line);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex-grow: 1;
}
.modal-footer {
  padding: 20px;
  border-top: 1px solid var(--line);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
.workspace-list {
  list-style: none;
  padding: 0;
  margin: 16px 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.workspace-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface-hover);
}
.workspace-info {
  display: flex;
  flex-direction: column;
}
.selected-workspace-title {
  font-weight: bold;
  color: var(--color-primary);
  margin-bottom: 16px;
  padding: 12px;
  background: var(--color-primary-light);
  border-radius: 8px;
}
.question-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.question-item {
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 8px;
}
.question-prompt {
  margin-bottom: 12px;
}
.version-select-label {
  display: flex;
  align-items: center;
  gap: 12px;
}
.version-select-label select {
  flex-grow: 1;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid var(--line-strong);
}
.shared-card-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

/* Detail Modal Styles */
.detail-modal {
  width: 900px;
  max-width: 95vw;
  height: 85vh;
}
.detail-layout {
  display: flex;
  gap: 24px;
  padding: 0; /* Override padding for split layout */
  height: 100%;
}
.essay-content-section {
  flex: 2;
  padding: 24px;
  border-right: 1px solid var(--line);
  overflow-y: auto;
}
.essay-meta {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px dashed var(--line-strong);
}
.essay-item {
  margin-bottom: 32px;
}
.question-title {
  background: var(--surface-hover);
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 12px;
  line-height: 1.5;
}
.essay-body {
  padding: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
}
.feedback-section {
  flex: 1;
  padding: 24px;
  display: flex;
  flex-direction: column;
  background: var(--surface-hover);
}
.feedback-list {
  flex-grow: 1;
  overflow-y: auto;
  margin: 16px 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.feedback-item {
  background: var(--surface);
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.05);
}
.feedback-meta {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 0.85rem;
}
.feedback-meta .time {
  color: var(--text-secondary);
}
.fb-content {
  line-height: 1.4;
  white-space: pre-wrap;
}
.empty-feedback {
  text-align: center;
  color: var(--text-secondary);
  padding: 20px 0;
}
.feedback-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.feedback-input textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--line-strong);
  border-radius: 8px;
  resize: vertical;
}
.feedback-actions {
  display: flex;
  justify-content: flex-end;
}

/* Recommend Modal Specific Styles */
.checkbox-item {
  padding: 0;
}
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  padding: 12px;
  cursor: pointer;
}
.checkbox-label input[type="checkbox"] {
  width: 20px;
  height: 20px;
  cursor: pointer;
}
</style>
