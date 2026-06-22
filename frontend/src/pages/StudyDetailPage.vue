<template>
  <AppLayout>
    <section class="study-detail-page">
      <div class="study-top-link">
        <RouterLink to="/study">← 취업스터디 목록으로</RouterLink>
      </div>

      <header class="study-header">
        <div class="study-title-group">
          <h1>{{ studyStore.currentStudy?.name || '로딩 중...' }}</h1>
          <p class="study-description">{{ studyStore.currentStudy?.description || '스터디 설명이 없습니다.' }}</p>
        </div>
        <div class="header-actions">
          <button class="primary-button" type="button" @click="openInviteModal">팀원 초대</button>

          <div class="dropdown-container" v-if="amILeader || amIMember">
            <button class="icon-button settings-button" type="button" @click="toggleSettings" title="스터디 설정">⚙️</button>
            <div class="dropdown-menu" v-if="isSettingsOpen">
              <button class="dropdown-item danger-text" v-if="amILeader" @click="openDeleteModal">스터디 삭제</button>
              <button class="dropdown-item" @click="openLeaveModal">스터디 탈퇴</button>
            </div>
          </div>
        </div>
      </header>

      <div v-if="studyStore.currentStudy?.imageUrl" class="study-cover">
        <img :src="studyStore.currentStudy.imageUrl" alt="스터디 대표 이미지" />
      </div>

      <div class="study-layout">
        <nav class="study-tab-menu" aria-label="스터디 탭 메뉴">
          <button
            class="study-tab-button"
            :class="{ active: activeTab === 'dashboard' }"
            @click="activeTab = 'dashboard'"
          >
            스터디 대시보드
          </button>
          <button
            class="study-tab-button"
            :class="{ active: activeTab === 'essays' }"
            @click="activeTab = 'essays'"
          >
            자소서 피드백
          </button>
          <button
            class="study-tab-button"
            :class="{ active: activeTab === 'jobs' }"
            @click="activeTab = 'jobs'"
          >
            지인 공고 추천
          </button>
        </nav>

        <!-- 우측 메인 콘텐츠 -->
        <main class="study-main-content">
          <!-- 대시보드 탭 -->
          <div v-if="activeTab === 'dashboard'" class="tab-pane dashboard-pane">
            <div v-if="studyStore.status === 'loading'" class="loading-state">로딩 중...</div>
            <template v-else>
              <!-- 팀원 진척도 차트 섹션 -->
              <div v-if="studySettings.showTeamComparison" class="dashboard-section chart-section">
                <h2>팀원 진척도 비교 <span class="subtitle">(진행중인 공고 수 기준)</span></h2>
                <div class="chart-container">
                  <div class="chart-bar-row" v-for="member in studyStore.currentStudy?.members || []" :key="'chart-'+member.id">
                    <div class="chart-label">
                      <div class="member-avatar-small">{{ (member.userName || member.userEmail).charAt(0).toUpperCase() }}</div>
                      <span class="member-name" :title="member.userName || member.userEmail.split('@')[0]">{{ member.userName || member.userEmail.split('@')[0] }}</span>
                    </div>
                    <div class="chart-track">
                      <div class="chart-fill" :style="{ width: Math.min((member.activeJobCount || 0) * 10, 100) + '%' }">
                        <span class="chart-value" v-if="(member.activeJobCount || 0) > 0">{{ member.activeJobCount }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 멤버 현황 그리드 섹션 -->
              <div class="dashboard-section">
                <h2>멤버 상세 현황</h2>
                <div class="member-grid">
                  <div class="member-card-new" v-for="member in studyStore.currentStudy?.members || []" :key="member.id">
                    <div class="member-card-header">
                      <div class="member-avatar-large">{{ (member.userName || member.userEmail).charAt(0).toUpperCase() }}</div>
                      <div class="member-info-new">
                        <div style="display: flex; align-items: center; gap: 8px;">
                          <strong>{{ member.userName || member.userEmail.split('@')[0] }}</strong>
                          <span v-if="hasUnreadEssays(member.userEmail)" class="new-badge">NEW!</span>
                        </div>
                        <span class="text-secondary text-sm" style="word-break: break-all;">{{ member.userEmail }}</span>
                        <span class="role-badge" :class="{'role-member': member.role !== 'LEADER'}">{{ member.role === 'LEADER' ? '스터디장' : '팀원' }}</span>
                      </div>
                    </div>
                    
                    <div v-if="studySettings.showDashboard" class="member-stats-grid">
                      <div class="stat-box-new bg-primary-light">
                        <span class="stat-label">진행중</span>
                        <strong class="stat-value text-primary">{{ member.activeJobCount || 0 }}</strong>
                      </div>
                      <div class="stat-box-new bg-gray">
                        <span class="stat-label">지원전</span>
                        <strong class="stat-value">{{ member.notStartedCount || 0 }}</strong>
                      </div>
                      <div class="stat-box-new bg-green-light">
                        <span class="stat-label">이번주</span>
                        <strong class="stat-value text-green">{{ member.appsThisWeekCount || 0 }}</strong>
                      </div>
                      <div class="stat-box-new bg-purple-light">
                        <span class="stat-label">이번달</span>
                        <strong class="stat-value text-purple">{{ member.appsThisMonthCount || 0 }}</strong>
                      </div>
                    </div>
                    <div v-else class="member-stats-basic">
                      진행 중인 공고: <strong>{{ member.activeJobCount || 0 }}</strong>개
                    </div>
                  </div>
                </div>
              </div>
            </template>
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
                  <p><strong>{{ getUserLabel(essay.userEmail) }}</strong>님이 공유한 자소서</p>
                  <small>{{ new Date(essay.sharedAt).toLocaleString() }}</small>
                </div>
                <h3 class="shared-essay-title">
                  {{ essay.companyName || '회사명 정보 없음' }} - {{ essay.positionTitle || '직무 정보 없음' }}
                  <span v-if="studySettings.showUnreadBadge && essay.isNew" class="badge new-badge">NEW</span>
                </h3>
                <div class="shared-essay-meta">
                  <span>{{ sharedQuestionCount(essay) }}개 문항</span>
                  <span>마감일 {{ essay.deadlineLabel || '-' }}</span>
                </div>
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
                <p><strong>{{ job.recommenderName || job.recommenderEmail }}</strong>님이 추천했습니다.</p>
                <div v-if="job.reason" class="job-reason">"{{ job.reason }}"</div>
                <h3>{{ job.companyName }} - {{ job.positionTitle }}</h3>
                <p class="deadline-row">
                  마감일: 
                  <strong v-if="job.deadlineDate">{{ job.deadlineDate }}</strong>
                  <strong v-else-if="job.deadlineLabel !== '상시' && job.deadlineLabel !== '상시채용'">{{ job.deadlineLabel || '-' }}</strong>
                  <span v-else class="deadline-badge">상시</span>
                </p>
                <a v-if="job.sourceUrl" :href="job.sourceUrl" target="_blank" class="text-button">공고 보러가기</a>
              </div>
            </div>
          </div>
        </main>
      </div>

      <!-- 팀원 초대 모달 -->
      <div v-if="isInviteModalOpen" class="modal-backdrop" @click.self="closeInviteModal">
        <div class="modal-content invite-modal">
          <header class="modal-header">
            <h2>팀원 초대하기</h2>
            <button class="icon-button" @click="closeInviteModal">×</button>
          </header>
          
          <div class="modal-body">
            <div class="form-group" v-if="!searchedUser">
              <label>초대할 팀원의 이메일</label>
              <div class="search-input-group">
                <input 
                  type="email" 
                  v-model="inviteEmail" 
                  placeholder="ez-one@example.com" 
                  @keyup.enter="searchUserToInvite"
                />
                <button class="primary-button" @click="searchUserToInvite" :disabled="isSearchingUser || !inviteEmail.trim()">
                  검색
                </button>
              </div>
              <p v-if="searchUserError" class="error-message">{{ searchUserError }}</p>
            </div>

            <div class="user-profile-card" v-else>
              <div class="user-profile-info">
                <div class="user-avatar">{{ searchedUser.name.charAt(0).toUpperCase() }}</div>
                <div class="user-details">
                  <strong>{{ searchedUser.name }} ({{ searchedUser.nickname }})</strong>
                  <span>{{ searchedUser.email }}</span>
                </div>
              </div>
              <p class="confirm-message">이 분을 스터디에 초대하시겠습니까?</p>
            </div>
          </div>

          <footer class="modal-footer">
            <button class="ghost-button" @click="closeInviteModal">취소</button>
            <button 
              v-if="searchedUser" 
              class="primary-button" 
              @click="confirmInvite" 
              :disabled="isInviting"
            >
              {{ isInviting ? '초대 중...' : '초대 보내기' }}
            </button>
          </footer>
        </div>
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

            <!-- Step 2: 문항 선택 후 버전 선택 -->
            <div v-else-if="shareStep === 2">
              <h3>2. 공유할 문항과 버전 선택</h3>
              <p class="selected-workspace-title">{{ selectedWorkspaceName }}</p>
              
              <p v-if="isLoadingWorkspaceData">문항 및 버전을 불러오는 중...</p>
              <div v-else-if="workspaceQuestions.length === 0" class="empty-state">
                이 공고에 등록된 자소서 문항이 없습니다.
              </div>
              <div v-else class="question-share-list">
                <div
                  v-for="(q, index) in workspaceQuestions"
                  :key="q.id"
                  class="question-share-item"
                  :class="{ selected: selectedQuestionIds[q.id] }"
                >
                  <div class="question-heading-row">
                    <span class="question-number">문항 {{ index + 1 }}</span>
                    <strong>{{ q.prompt }}</strong>
                  </div>
                  <div v-if="getVersionsForQuestion(q.id).length === 0" class="no-version-note">
                    저장된 버전이 없어 공유할 수 없습니다.
                  </div>
                  <div v-else class="question-share-controls">
                    <label class="version-select-label">
                      <span>버전 선택</span>
                      <select v-model="selectedVersions[q.id]" @change="handleVersionChange(q.id)">
                        <option value="">버전을 선택하세요</option>
                        <option v-for="v in getVersionsForQuestion(q.id)" :key="v.id" :value="v.id">
                          문항 {{ index + 1 }} · {{ v.versionName }} · {{ formatDateTime(v.createdAt) }}
                        </option>
                      </select>
                    </label>
                    <label class="share-checkbox-label">
                      <input
                        type="checkbox"
                        v-model="selectedQuestionIds[q.id]"
                        :disabled="!selectedVersions[q.id]"
                      />
                      <span>이 문항 공유</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <footer class="modal-footer" v-if="shareStep === 2">
            <button class="ghost-button" @click="shareStep = 1">이전</button>
            <button class="primary-button" @click="submitSharedEssay" :disabled="isSharing || selectedShareVersionIds.length === 0">
              {{ isSharing ? '공유 중...' : `${selectedShareVersionIds.length}개 문항 공유하기` }}
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
                  <p class="shared-version-name">{{ item.versionName }}</p>
                  <div class="essay-body">{{ item.body }}</div>
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
            <ul v-else class="workspace-list recommend-list" style="max-height: 400px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px;">
              <li v-for="basket in recommendJobsList" :key="basket.id" class="workspace-item checkbox-item" style="flex-direction: column; align-items: stretch; padding: 16px; gap: 12px; height: auto;">
                <label class="checkbox-label" style="display: flex; align-items: center; gap: 12px; cursor: pointer; width: 100%;">
                  <input type="checkbox" :value="basket" v-model="selectedRecommendJobs">
                  <div class="company-logo-badge">
                    <img v-if="basket.companyLogoUrl" :src="basket.companyLogoUrl" :alt="basket.companyName" />
                    <span v-else>{{ basket.companyName.charAt(0) }}</span>
                  </div>
                  <div class="workspace-info">
                    <strong>{{ basket.companyName }}</strong>
                    <span>{{ basket.positionTitle }}</span>
                    <small>마감일: {{ basket.deadlineDate ? basket.deadlineDate + ' (' + basket.deadlineLabel + ')' : basket.deadlineLabel }}</small>
                  </div>
                </label>
                <!-- Inline Reason Input (Accordion) -->
                <div v-if="selectedRecommendJobs.includes(basket)" class="reason-accordion">
                  <div class="reason-arrow">↳</div>
                  <textarea v-model="basket.recommendReason" placeholder="이 공고를 팀원들에게 추천하는 이유를 적어주세요! (선택)" rows="2" class="reason-textarea"></textarea>
                </div>
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

      <!-- 스터디 탈퇴 모달 -->
      <div v-if="isLeaveModalOpen" class="modal-backdrop" @click.self="closeLeaveModal">
        <div class="modal-content">
          <header class="modal-header">
            <h2>스터디 탈퇴</h2>
            <button class="icon-button" @click="closeLeaveModal">×</button>
          </header>
          <div class="modal-body">
            <p v-if="amILeader && otherMembers.length > 0">
              스터디장 권한을 위임할 팀원을 선택해야 탈퇴할 수 있습니다.
            </p>
            <p v-else>
              정말로 스터디를 탈퇴하시겠습니까?<br/>
              <span v-if="amILeader && otherMembers.length === 0" class="text-danger">
                마지막 남은 스터디장이므로, 탈퇴 시 스터디가 완전히 삭제됩니다.
              </span>
            </p>
            <div class="form-group" v-if="amILeader && otherMembers.length > 0">
              <label>권한 위임 대상</label>
              <select v-model="delegateEmail">
                <option value="">-- 위임할 팀원 선택 --</option>
                <option v-for="m in otherMembers" :key="m.id" :value="m.userEmail">
                  {{ m.userEmail }}
                </option>
              </select>
            </div>
          </div>
          <footer class="modal-footer">
            <button class="ghost-button" @click="closeLeaveModal">취소</button>
            <button class="danger-button" @click="confirmLeave" :disabled="isLeaving || (amILeader && otherMembers.length > 0 && !delegateEmail)">
              {{ isLeaving ? '처리 중...' : '탈퇴하기' }}
            </button>
          </footer>
        </div>
      </div>

      <!-- 스터디 삭제 모달 -->
      <div v-if="isDeleteModalOpen" class="modal-backdrop" @click.self="closeDeleteModal">
        <div class="modal-content">
          <header class="modal-header">
            <h2>스터디 삭제</h2>
            <button class="icon-button" @click="closeDeleteModal">×</button>
          </header>
          <div class="modal-body">
            <p class="text-danger" style="font-weight: bold; margin-bottom: 12px;">
              정말로 스터디를 삭제하시겠습니까?
            </p>
            <p>
              스터디를 삭제하면 공유된 자소서, 피드백, 공고 추천 등 모든 데이터가 완전히 삭제되며 <strong>복구할 수 없습니다</strong>.
            </p>
          </div>
          <footer class="modal-footer">
            <button class="ghost-button" @click="closeDeleteModal">취소</button>
            <button class="danger-button" @click="confirmDelete" :disabled="isDeleting">
              {{ isDeleting ? '삭제 중...' : '삭제하기' }}
            </button>
          </footer>
        </div>
      </div>
    </section>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppLayout from '@/shared/AppLayout.vue';
import { useStudyStore } from '@/stores/studyStore';
import { studyApi } from '@/features/study/api/studyApi';
import { basketApi } from '@/features/basket/api/basketApi';
import { workspaceApi } from '@/features/workspace/api/workspaceApi';
import { getCurrentUser } from '@/features/auth/session/authSession';

const route = useRoute();
const router = useRouter();
const studyStore = useStudyStore();
const activeTab = ref('dashboard');
const studyId = route.params.studyId;

const studySettings = computed(() => {
  const json = studyStore.currentStudy?.settingsJson;
  if (!json) return { showDashboard: true, showTeamComparison: true, showUnreadBadge: true };
  try {
    return JSON.parse(json);
  } catch(e) {
    return { showDashboard: true, showTeamComparison: true, showUnreadBadge: true };
  }
});

// 모달 상태
const isInviteModalOpen = ref(false);
const inviteEmail = ref('');
const searchedUser = ref(null);
const searchUserError = ref('');
const isSearchingUser = ref(false);
const isInviting = ref(false);

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
const selectedQuestionIds = ref({});
const selectedVersions = ref({});
const selectedShareVersionIds = computed(() => {
  return Object.entries(selectedQuestionIds.value)
    .filter(([, selected]) => selected)
    .map(([questionId]) => selectedVersions.value[questionId])
    .filter(Boolean);
});

// 상세 보기 모달 상태
const isDetailModalOpen = ref(false);
const feedbackContent = ref('');
const isSubmittingFeedback = ref(false);

// 추천 공고 모달 상태
const isRecommendModalOpen = ref(false);
const recommendJobsList = ref([]);
const selectedRecommendJobs = ref([]);
const recommendReason = ref('');
const isLoadingRecommendJobs = ref(false);
const isRecommending = ref(false);

// 설정 드롭다운 및 탈퇴/삭제 모달 상태
const isSettingsOpen = ref(false);
const isLeaveModalOpen = ref(false);
const isDeleteModalOpen = ref(false);
const delegateEmail = ref('');
const isLeaving = ref(false);
const isDeleting = ref(false);

onMounted(() => {
  loadData();
  
  // 모달 닫을 때 설정창도 닫음
  const closeDropdowns = (e) => {
    if (!e.target.closest('.dropdown-container')) {
      isSettingsOpen.value = false;
    }
  };
  document.addEventListener('click', closeDropdowns);
  return () => {
    document.removeEventListener('click', closeDropdowns);
  };
});

// 권한 확인
const myEmail = computed(() => {
  return getCurrentUser()?.email || '';
});

const myMemberInfo = computed(() => {
  return studyStore.currentStudy?.members?.find(m => m.userEmail === myEmail.value);
});

const amILeader = computed(() => myMemberInfo.value?.role === 'LEADER');
const amIMember = computed(() => !!myMemberInfo.value);

const otherMembers = computed(() => {
  return studyStore.currentStudy?.members?.filter(m => m.userEmail !== myEmail.value) || [];
});

const toggleSettings = () => {
  isSettingsOpen.value = !isSettingsOpen.value;
};

// NEW 뱃지 로직
const hasUnreadEssays = (memberEmail) => {
  if (memberEmail === myEmail.value) return false;
  return studyStore.sharedEssays?.some(e => e.userEmail === memberEmail && e.isNew);
};

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

function openInviteModal() {
  inviteEmail.value = '';
  searchedUser.value = null;
  searchUserError.value = '';
  isInviteModalOpen.value = true;
}

function closeInviteModal() {
  isInviteModalOpen.value = false;
}

async function searchUserToInvite() {
  if (!inviteEmail.value.trim()) return;
  
  isSearchingUser.value = true;
  searchUserError.value = '';
  searchedUser.value = null;
  
  try {
    const user = await studyApi.searchUser(inviteEmail.value.trim());
    searchedUser.value = user;
  } catch (e) {
    if (e.response && e.response.status === 404) {
      searchUserError.value = '가입 내역이 없습니다. 이메일을 다시 한 번 확인해 주세요.';
    } else {
      searchUserError.value = '사용자 검색 중 오류가 발생했습니다.';
    }
  } finally {
    isSearchingUser.value = false;
  }
}

async function confirmInvite() {
  if (!searchedUser.value) return;
  
  isInviting.value = true;
  try {
    await studyApi.inviteMember(studyId, searchedUser.value.email);
    alert(`${searchedUser.value.name}님에게 스터디 초대 알림을 발송했어요!`);
    closeInviteModal();
  } catch (e) {
    alert(e.message || '초대 실패');
  } finally {
    isInviting.value = false;
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
  selectedQuestionIds.value = {};
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
    selectedQuestionIds.value = {};
    selectedVersions.value = {};
    workspaceQuestions.value.forEach(q => {
      const versions = workspaceVersions.value.filter(v => v.questionId === String(q.id));
      selectedQuestionIds.value[q.id] = false;
      selectedVersions.value[q.id] = versions.length === 1 ? versions[0].id : '';
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

function handleVersionChange(questionId) {
  if (!selectedVersions.value[questionId]) {
    selectedQuestionIds.value[questionId] = false;
  }
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function sharedQuestionCount(essay) {
  return Array.isArray(essay.versionIds) ? essay.versionIds.length : 0;
}

function getUserLabel(email) {
  return email?.split('@')[0] || '팀원';
}

async function submitSharedEssay() {
  const versionIds = selectedShareVersionIds.value;
  if (versionIds.length === 0) {
    alert('공유할 문항을 선택하고 버전을 지정해 주세요.');
    return;
  }

  const missingVersion = Object.entries(selectedQuestionIds.value)
    .some(([questionId, selected]) => selected && !selectedVersions.value[questionId]);
  if (missingVersion) {
    alert('선택한 문항마다 공유할 버전을 지정해 주세요.');
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
  await studyStore.readSharedEssay(studyId, essayId);
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
    recommendJobsList.value = allJobs.map(job => ({ ...job, recommendReason: '' }));
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
        deadlineDate: job.deadlineDate || null,
        sourceUrl: job.sourceUrl || '',
        reason: job.recommendReason || ''
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

const openLeaveModal = () => {
  isSettingsOpen.value = false;
  delegateEmail.value = '';
  isLeaveModalOpen.value = true;
};
const closeLeaveModal = () => {
  isLeaveModalOpen.value = false;
};
const confirmLeave = async () => {
  isLeaving.value = true;
  try {
    await studyStore.leaveStudy(studyId, delegateEmail.value);
    alert('스터디를 성공적으로 탈퇴했습니다.');
    closeLeaveModal();
    router.push('/study');
  } catch (err) {
    alert(studyStore.errorMessage || '탈퇴 실패');
  } finally {
    isLeaving.value = false;
  }
};

const openDeleteModal = () => {
  isSettingsOpen.value = false;
  isDeleteModalOpen.value = true;
};
const closeDeleteModal = () => {
  isDeleteModalOpen.value = false;
};
const confirmDelete = async () => {
  isDeleting.value = true;
  try {
    await studyStore.deleteStudy(studyId);
    alert('스터디가 완전히 삭제되었습니다.');
    closeDeleteModal();
    router.push('/study');
  } catch (err) {
    alert(studyStore.errorMessage || '삭제 실패');
  } finally {
    isDeleting.value = false;
  }
};
</script>

<style scoped>
.study-detail-page {
  padding: 40px;
  max-width: 1200px;
  margin: 0 auto;
}
.study-top-link {
  margin-bottom: 18px;
}
.study-top-link a {
  color: var(--text-secondary);
  font-weight: 800;
  text-decoration: none;
}
.study-top-link a:hover {
  color: var(--color-primary);
}
.study-header {
  margin-bottom: 18px;
  padding: 0;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
}
.study-title-group {
  display: flex;
  align-items: baseline;
  gap: 18px;
  min-width: 0;
  flex-wrap: wrap;
}
.study-header h1 {
  font-size: 1.9rem;
  margin: 0;
  color: var(--text-primary);
  white-space: nowrap;
}
.study-description {
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0;
  max-width: 560px;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}
.study-cover {
  height: 260px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--line);
  margin-bottom: 22px;
  background: #f8fafc;
}
.study-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.dropdown-container {
  position: relative;
}
.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background: white;
  border: 1px solid var(--line);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  min-width: 150px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 10;
}
.dropdown-item {
  padding: 12px 16px;
  text-align: left;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--line);
  cursor: pointer;
  font-size: 0.9rem;
}
.dropdown-item:last-child {
  border-bottom: none;
}
.dropdown-item:hover {
  background: var(--surface-hover);
}
.danger-text {
  color: var(--color-danger, #dc2626);
  font-weight: bold;
}
.settings-button {
  background: white;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 8px;
  cursor: pointer;
}
.study-layout {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.study-tab-menu {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border: 1px solid var(--line);
  border-radius: 8px;
  overflow: hidden;
  background: white;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.04);
}
.study-tab-button {
  min-height: 86px;
  border: 0;
  border-right: 1px solid var(--line);
  background: white;
  color: var(--text-secondary);
  font-size: 1.05rem;
  font-weight: 900;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
}
.study-tab-button:last-child {
  border-right: 0;
}
.study-tab-button:hover {
  background: #f8fafc;
}
.study-tab-button.active {
  color: #4f46e5;
  background: #eef2ff;
  box-shadow: inset 0 4px 0 #4f46e5;
}
.study-main-content {
  width: 100%;
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
.role-member {
  background: var(--gray);
  color: var(--text-secondary);
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
.search-input-group {
  display: flex;
  gap: 8px;
}
.search-input-group input {
  flex-grow: 1;
}
.error-message {
  color: var(--color-danger, #ef4444);
  font-size: 0.85rem;
  margin-top: 8px;
}
.text-danger {
  color: var(--color-danger, #dc2626);
}
.danger-button {
  background: var(--color-danger, #ef4444);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
}
.danger-button:hover:not(:disabled) {
  background: #dc2626;
}
.danger-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.user-profile-card {
  padding: 20px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface-hover);
  text-align: center;
}
.user-profile-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 16px;
}
.user-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--color-primary-light);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: bold;
}
.user-details {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}
.confirm-message {
  font-weight: 600;
  color: var(--text-primary);
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
.shared-essay-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 10px 0;
}
.shared-essay-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}
.shared-essay-meta span {
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 5px 10px;
  background: #f8fafc;
  color: var(--text-secondary);
  font-size: 0.82rem;
  font-weight: 700;
}
.question-share-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.question-share-item {
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 16px;
  background: white;
}
.question-share-item.selected {
  border-color: #8b5cf6;
  background: #faf5ff;
}
.question-heading-row {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: start;
  gap: 10px;
  line-height: 1.5;
}
.question-number {
  color: #4f46e5;
  font-weight: 900;
  white-space: nowrap;
}
.no-version-note {
  margin-top: 10px;
  color: var(--text-secondary);
  font-size: 0.9rem;
}
.question-share-item .version-select-label {
  margin-top: 14px;
  justify-content: space-between;
}
.question-share-item .version-select-label span {
  font-weight: 800;
  color: var(--text-primary);
  white-space: nowrap;
}
.question-share-controls {
  display: grid;
  grid-template-columns: minmax(240px, 1fr) auto;
  align-items: center;
  gap: 14px;
}
.share-checkbox-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 10px 12px;
  background: white;
  color: var(--text-primary);
  font-weight: 800;
  cursor: pointer;
  white-space: nowrap;
}
.share-checkbox-label:has(input:disabled) {
  color: var(--text-secondary);
  cursor: not-allowed;
  background: #f8fafc;
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
.shared-version-name {
  color: #4f46e5;
  font-weight: 800;
  margin-bottom: 8px;
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
.company-logo-badge {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: var(--surface-hover);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid var(--line);
  flex-shrink: 0;
}
.company-logo-badge img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.deadline-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.deadline-badge {
  background: var(--color-danger-light, #fee2e2);
  color: var(--color-danger, #dc2626);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: bold;
}

/* Dashboard Redesign Styles */
.dashboard-pane {
  background: transparent;
  padding: 0;
  border: none;
}
.dashboard-section {
  background: white;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.02);
}
.dashboard-section h3 {
  font-size: 1.1rem;
  font-weight: bold;
  margin-bottom: 16px;
  color: var(--text-primary);
}
.chart-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.chart-bar-container {
  display: flex;
  align-items: center;
  gap: 12px;
}
.chart-label {
  width: 130px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: bold;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
}
.chart-bar-bg, .chart-track {
  flex-grow: 1;
  background: var(--surface-hover);
  height: 24px;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
}
.chart-bar-fill, .chart-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary) 0%, #a78bfa 100%);
  border-radius: 12px;
  transition: width 0.5s ease-out;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 8px;
}
.chart-value {
  text-align: right;
  font-weight: bold;
  font-size: 0.9rem;
  color: white;
}
.member-grid {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.member-card-new {
  background: white;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 18px;
  display: grid;
  grid-template-columns: minmax(260px, 0.8fr) minmax(360px, 1.2fr);
  align-items: center;
  gap: 16px;
  transition: transform 0.2s, box-shadow 0.2s;
}
.member-card-new:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.06);
}
.member-header, .member-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
}
.member-avatar-large {
  width: 48px;
  height: 48px;
  border-radius: 24px;
  background: var(--surface-hover);
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.member-avatar-small {
  width: 28px;
  height: 28px;
  border-radius: 14px;
  background: var(--surface-hover);
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.member-info-new {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}
.member-name {
  font-weight: bold;
  font-size: 1.05rem;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.member-role {
  font-size: 0.8rem;
  color: var(--text-secondary);
  background: var(--surface-hover);
  padding: 2px 8px;
  border-radius: 12px;
  width: fit-content;
  margin-top: 4px;
}
.role-leader, .role-badge {
  background: #ede9fe;
  color: var(--color-primary);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: bold;
  width: fit-content;
}
.member-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(80px, 1fr));
  gap: 10px;
}
.stat-box-new {
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.bg-primary-light { background: #eff6ff; }
.bg-gray { background: #f3f4f6; }
.bg-green-light { background: #f0fdf4; }
.bg-purple-light { background: #faf5ff; }
.text-green { color: #16a34a; }
.text-purple { color: #9333ea; }
.new-badge {
  background: #ef4444;
  color: white;
  font-size: 0.65rem;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 10px;
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}
.stat-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: 4px;
}
.stat-value {
  font-size: 1.2rem;
  font-weight: bold;
  color: var(--text-primary);
}
.stat-value.highlight {
  color: var(--color-primary);
}
.chart-bar-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
@media (max-width: 860px) {
  .study-detail-page {
    padding: 24px 16px;
  }
  .study-header {
    flex-direction: column;
  }
  .study-title-group {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
  }
  .study-header h1 {
    white-space: normal;
  }
  .study-tab-menu {
    grid-template-columns: 1fr;
  }
  .study-tab-button {
    min-height: 66px;
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }
  .study-tab-button:last-child {
    border-bottom: 0;
  }
  .member-card-new {
    grid-template-columns: 1fr;
  }
  .member-stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.reason-accordion {
  display: flex;
  gap: 12px;
  margin-left: 28px;
  margin-top: 8px;
  animation: slideDown 0.2s ease-out forwards;
}
.reason-arrow {
  color: var(--color-primary);
  font-size: 1.2rem;
  font-weight: bold;
}
.reason-textarea {
  flex-grow: 1;
  padding: 12px;
  border: 1px solid var(--primary-light);
  border-radius: 8px;
  resize: none;
  font-family: inherit;
  font-size: 0.9rem;
  background: #f8fafc;
  transition: border-color 0.2s;
}
.reason-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  background: white;
}
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
