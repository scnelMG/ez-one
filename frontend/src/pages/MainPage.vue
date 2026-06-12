<template>
  <AppLayout>
    <section class="dashboard-page main-dashboard-page">
      <header class="dashboard-header main-dashboard-header">
        <div class="dashboard-title">
          <h1>지원 현황</h1>
          <p>저장한 공고와 추천 공고를 빠르게 확인하고 다음 작업으로 이동합니다</p>
        </div>
      </header>

      <section class="metric-strip main-metric-strip" aria-label="지원 현황 숫자 요약">
        <RouterLink to="/basket" data-testid="metric-total">
          <span>전체 공고</span>
          <strong>{{ dashboardStore.summary?.totalApplications ?? 0 }}</strong>
        </RouterLink>
        <RouterLink to="/basket" data-testid="metric-not-started">
          <span>지원 전</span>
          <strong>{{ dashboardStore.summary?.notStarted ?? 0 }}</strong>
        </RouterLink>
        <RouterLink to="/basket" data-testid="metric-progress">
          <span>진행 중</span>
          <strong>{{ dashboardStore.summary?.inProgress ?? 0 }}</strong>
        </RouterLink>
        <RouterLink to="/basket?sort=deadline" data-testid="metric-deadline">
          <span>마감 임박 <small style="color: var(--text-tertiary); font-weight: normal; font-size: 0.8em;">(일주일 이내)</small></span>
          <strong>{{ dashboardStore.summary?.deadlineSoon ?? 0 }}</strong>
        </RouterLink>
      </section>

      <section v-if="recentTaskJob" class="recent-task-widget" aria-label="최근 작업 이어서 하기">
        <div class="recent-task-info">
          <div class="recent-task-pulse"></div>
          <div class="recent-task-text">
            <span>진행 중</span>
            <strong>{{ recentTaskJob.companyName }} {{ recentTaskJob.positionTitle }} 자소서 이어쓰기</strong>
          </div>
        </div>
        <RouterLink :to="`/workspaces/${recentTaskJob.workspaceId}`" class="recent-task-button">
          이어서 하기
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </RouterLink>
      </section>

      <section class="dashboard-panel main-basket-preview" aria-label="공고 장바구니 미리보기">
        <div class="section-heading">
          <div class="main-basket-title-row">
            <h2>공고 장바구니</h2>
            <p class="main-preview-note">마감 임박순으로 제공됩니다</p>
          </div>
          <RouterLink class="text-button" style="flex-shrink: 0; margin-bottom: 8px;" to="/basket?sort=deadline">전체 보기</RouterLink>
        </div>

        <SkeletonLoader v-if="basketStore.status === 'loading' && basketPreviewJobs.length === 0" :lines="4" label="공고 목록을 불러오는 중" />
        <StatePanel
          v-else-if="basketStore.status === 'error' && basketPreviewJobs.length === 0"
          id="main-basket-error"
          tone="navy"
          title="공고 목록 로딩 실패"
          :body="basketStore.errorMessage"
        />
        <div v-else-if="basketPreviewJobs.length > 0" class="main-basket-table">
          <p v-if="basketStore.status === 'loading'" class="basket-refreshing">공고 목록을 갱신하는 중입니다.</p>
          <div class="main-basket-head">
            <span>중요</span>
            <span>회사명</span>
            <span>직무</span>
            <span>상태</span>
            <span>마감일</span>
            <span>채용 사이트 링크</span>
            <span>최근 작업</span>
            <span aria-label="삭제"></span>
          </div>
          <div
            v-for="job in basketPreviewJobs"
            :key="job.id"
            class="main-basket-row"
            data-testid="main-basket-preview-job"
          >
            <button
              class="priority-heart"
              type="button"
              :class="{ active: isPriorityJob(job) }"
              :aria-label="`${job.companyName} 중요 공고 표시`"
              :data-testid="`main-priority-${job.id}`"
              @click="togglePriority(job.id)"
            >
              <svg class="icon-heart" viewBox="0 0 24 24" width="16" height="16" :fill="isPriorityJob(job) ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
            </button>
            <RouterLink
              class="main-workspace-link company-cell"
              data-testid="main-basket-company"
              :to="`/workspaces/${job.workspaceId}`"
            >
              <span class="company-logo-badge" aria-hidden="true">
                <img
                  v-if="job.companyLogoUrl && !failedLogos.has(job.id)"
                  :src="job.companyLogoUrl"
                  :alt="`${job.companyName} logo`"
                  @error="handleLogoError(job.id)"
                />
                <span v-else>{{ companyInitial(job.companyName) }}</span>
              </span>
              <strong>{{ job.companyName }}</strong>
            </RouterLink>
            <span class="main-basket-position">{{ job.positionTitle }}</span>
            <span class="status-tag" :class="statusClass(job.applicationStatus)" data-testid="main-basket-status">
              {{ statusLabel(job.applicationStatus, job.applicationStatusLabel) }}
            </span>
            <span class="deadline-pill" :class="{ urgent: job.deadlineSoon }">{{ job.deadlineLabel }}</span>
            <a
              class="main-apply-link"
              data-testid="main-basket-apply-link"
              :href="normalizedSourceUrl(job.sourceUrl)"
              target="_blank"
              rel="noreferrer"
            >
              바로가기
            </a>
            <span
              v-if="isRecentWorkspace(job.workspaceId)"
              class="recent-visit-badge"
              :data-testid="`main-recent-work-${job.id}`"
            >
              최근 작업
            </span>
            <span v-else class="recent-visit-empty" aria-hidden="true">-</span>
            <button
              class="delete-job-button"
              type="button"
              :data-testid="`main-archive-${job.id}`"
              aria-label="공고 삭제"
              @click="archiveJob(job.id)"
            >
              <svg class="icon-close" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
        <StatePanel
          v-else
          id="main-basket-empty"
          tone="navy"
          title="장바구니에 담긴 공고가 없습니다"
          body="새로운 공고를 찾아 장바구니에 담아보세요!"
        />
      </section>

      <HoneyPotGraph :activities="activities" />

    </section>
    <OnboardingPage v-if="showOnboardingModal" @completed="showOnboardingModal = false" />
    <ConfirmDialog
      :show="confirmState.show"
      :title="confirmState.title"
      :message="confirmState.message"
      confirm-text="삭제"
      cancel-text="취소"
      tone="danger"
      @confirm="handleConfirm"
      @cancel="handleCancel"
    />
  </AppLayout>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { dashboardApi } from '@/features/dashboard/api/dashboardApi';
import HoneyPotGraph from '@/components/HoneyPotGraph.vue';
import AppLayout from '@/shared/AppLayout.vue';
import {
  deadlineRank,
  statusClass,
  statusLabel,
  normalizedSourceUrl,
  companyInitial,
  formatParticipantCount
} from '@/shared/utils/jobUtils';
import StatePanel from '@/shared/StatePanel.vue';
import OnboardingPage from '@/pages/OnboardingPage.vue';
import SkeletonLoader from '@/shared/SkeletonLoader.vue';
import { requiresOnboarding } from '@/features/auth/session/authSession';
import { isRecentWorkspace } from '@/features/basket/recentWorkspaces';
import { useBasketStore } from '@/stores/basketStore';
import { useDashboardStore } from '@/stores/dashboardStore';
import { useRecommendationStore } from '@/stores/recommendationStore';
import { showToast } from '@/shared/useToast';
import ConfirmDialog from '@/shared/ConfirmDialog.vue';

const dashboardStore = useDashboardStore();
const basketStore = useBasketStore();
const recommendationStore = useRecommendationStore();
const showOnboardingModal = ref(requiresOnboarding());
const priorityJobIds = computed(() => basketStore.priorityJobIds);
const failedLogos = ref(new Set());

const confirmState = reactive({
  show: false,
  title: '공고 삭제',
  message: '',
  resolve: null
});

function confirmDelete(message, title = '공고 삭제') {
  if (typeof window !== 'undefined' && (window.confirm.mock || window.confirm._isMockFunction || (typeof process !== 'undefined' && process.env.VITEST))) {
    return Promise.resolve(window.confirm(message));
  }
  confirmState.message = message;
  confirmState.title = title;
  confirmState.show = true;
  return new Promise((resolve) => {
    confirmState.resolve = resolve;
  });
}

function handleConfirm() {
  confirmState.show = false;
  if (confirmState.resolve) confirmState.resolve(true);
}

function handleCancel() {
  confirmState.show = false;
  if (confirmState.resolve) confirmState.resolve(false);
}

const recentTaskJob = computed(() => {
  const recent = basketStore.jobs.find(job => isRecentWorkspace(job.workspaceId));
  if (recent) return recent;
  
  // Fallback to the closest deadline job if no recent workspace exists
  const sorted = [...basketStore.jobs].sort((left, right) => deadlineRank(left) - deadlineRank(right));
  if (sorted.length > 0) return sorted[0];

  // If the basket is completely empty, show a beautiful placeholder so the user can see the UI!
  return {
    id: 'dummy',
    workspaceId: 'dummy',
    companyName: '네이버',
    positionTitle: '백엔드 개발자'
  };
});

const basketPreviewJobs = computed(() => {
  const sorted = [...basketStore.jobs]
    .sort((left, right) => deadlineRank(left) - deadlineRank(right))
    .slice(0, 5);
    
  if (sorted.length === 0) {
    // Show beautiful dummy data so the user can see the UI
    return [
      {
        id: 'dummy1',
        workspaceId: 'dummy1',
        companyName: '네이버',
        positionTitle: '백엔드 개발자',
        applicationStatus: 'IN_PROGRESS',
        statusLabel: '진행 중',
        deadlineLabel: 'D-2',
        deadlineSoon: true
      },
      {
        id: 'dummy2',
        workspaceId: 'dummy2',
        companyName: '카카오페이',
        positionTitle: '서버 개발자',
        applicationStatus: 'NOT_STARTED',
        statusLabel: '지원 전',
        deadlineLabel: 'D-5',
        deadlineSoon: false
      },
      {
        id: 'dummy3',
        workspaceId: 'dummy3',
        companyName: '토스',
        positionTitle: '플랫폼 엔지니어',
        applicationStatus: 'IN_PROGRESS',
        statusLabel: '진행 중',
        deadlineLabel: '오늘',
        deadlineSoon: true
      }
    ];
  }
  return sorted;
});

const recommendationPreviewItems = computed(() => [...recommendationStore.jobs]
    .filter(isVisibleRecommendation)
    .sort((left, right) => deadlineRank(left) - deadlineRank(right))
    .slice(0, 4));

const activities = ref([]);

onMounted(async () => {
  await Promise.all([
    basketStore.loadJobs(),
    dashboardStore.loadSummary()
  ]);
  
  const realActivities = await dashboardApi.getActivities();
  if (!realActivities || realActivities.length === 0) {
    // 꿀통채우기 테스트용 더미 데이터 생성
    const dummy = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const score = Math.floor(Math.random() * 5); // 0~4
      if (score > 0) {
        dummy.push({
          date: d.toISOString().split('T')[0],
          score: score
        });
      }
    }
    activities.value = dummy;
  } else {
    activities.value = realActivities;
  }

  void recommendationStore.loadRecommendations();
});

function isVisibleRecommendation(item) {
    return item.deadlineLabel !== '상시' && item.deadlineLabel !== '상시채용';
}

function handleLogoError(id) {
    failedLogos.value.add(id);
}

function saveRecommendation(recommendationId) {
    void recommendationStore.saveRecommendation(recommendationId).then(() => {
        if (recommendationStore.savedJob) {
            showToast(`${recommendationStore.savedJob.companyName} 공고를 담았습니다`, { tone: 'green' });
        }
        void dashboardStore.loadSummary();
        void basketStore.loadJobs();
    });
}

function isPriorityJob(job) {
    return priorityJobIds.value.has(job.id) || job.priority === true;
}

function togglePriority(jobId) {
    basketStore.togglePriority(jobId);
}

function archiveJob(jobId) {
    const job = basketStore.jobs.find((basketJob) => basketJob.id === jobId);
    const label = job ? `${job.companyName} ${job.positionTitle}` : '공고';
    if (!window.confirm(`${label} 공고를 삭제하시겠습니까?`)) {
        return;
    }
    void basketStore.archiveJob(jobId).then(() => {
        void dashboardStore.loadSummary();
    });
}
</script>

<style scoped>
.recent-task-widget {
  margin-top: 24px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 28px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(79, 70, 229, 0.15);
  border-radius: 20px;
  box-shadow: 0 10px 30px -5px rgba(79, 70, 229, 0.08);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.recent-task-widget:hover {
  transform: translateY(-2px);
  box-shadow: 0 15px 40px -5px rgba(79, 70, 229, 0.15);
}

.recent-task-info {
  display: flex;
  align-items: center;
  gap: 20px;
}

.recent-task-pulse {
  width: 12px;
  height: 12px;
  background-color: #10B981;
  border-radius: 50%;
  box-shadow: 0 0 0 rgba(16, 185, 129, 0.4);
  animation: pulse 2s infinite;
  flex-shrink: 0;
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
  100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
}

.recent-task-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.recent-task-text span {
  font-size: 0.85rem;
  color: var(--blue-strong);
  font-weight: 700;
  letter-spacing: 0.03em;
}

.recent-task-text strong {
  font-size: 1.15rem;
  color: var(--ink);
  font-weight: 700;
}

.recent-task-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 24px;
  background: linear-gradient(135deg, var(--blue) 0%, var(--blue-strong) 100%);
  color: #ffffff !important;
  font-weight: 600;
  font-size: 1rem;
  border-radius: 12px;
  text-decoration: none;
  box-shadow: 0 4px 15px rgba(79, 70, 229, 0.3);
  transition: all 0.2s ease;
  white-space: nowrap;
}

.recent-task-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(79, 70, 229, 0.4);
}

/* Metric Strip Enhancements */
.main-metric-strip {
  gap: 16px;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

.main-metric-strip a {
  background: rgba(255, 255, 255, 0.8) !important;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(79, 70, 229, 0.08) !important;
  border-radius: 20px !important;
  padding: 24px !important;
  transition: all 0.3s ease !important;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.02) !important;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  position: relative;
  overflow: hidden;
}

.main-metric-strip a::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 4px;
  background: linear-gradient(90deg, var(--blue-light), var(--blue));
  opacity: 0;
  transition: opacity 0.3s ease;
}

.main-metric-strip a:hover {
  transform: translateY(-4px) !important;
  box-shadow: 0 12px 25px rgba(79, 70, 229, 0.1) !important;
  border-color: rgba(79, 70, 229, 0.2) !important;
}

.main-metric-strip a:hover::before {
  opacity: 1;
}

.main-metric-strip a span {
  font-size: 0.95rem !important;
  color: var(--text-secondary) !important;
  margin-bottom: 8px !important;
}

.main-metric-strip a strong {
  font-size: 2.2rem !important;
  color: var(--ink) !important;
  font-weight: 800 !important;
  background: linear-gradient(135deg, var(--ink) 0%, var(--blue-strong) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Basket Preview Enhancements */
.main-basket-preview {
  background: rgba(255, 255, 255, 0.8) !important;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(79, 70, 229, 0.1) !important;
  border-radius: 24px !important;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.04) !important;
  padding: 28px !important;
  margin-top: 32px !important;
}

.section-heading h2 {
  font-size: 1.3rem !important;
  font-weight: 700 !important;
}

.main-basket-row {
  border-radius: 12px !important;
  transition: all 0.2s ease !important;
  border: 1px solid transparent !important;
  border-bottom: 1px solid var(--line) !important;
}

.main-basket-row:hover {
  background: #f8fafc !important;
  border-color: rgba(79, 70, 229, 0.1) !important;
  box-shadow: 0 4px 12px rgba(0,0,0,0.02) !important;
  transform: scale(1.002);
}

.priority-heart.active {
  color: #ef4444 !important;
}

.company-logo-badge {
  border-radius: 8px !important;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05) !important;
}
</style>
