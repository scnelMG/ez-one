<template>
  <AppLayout>
    <section class="dashboard-page main-dashboard-page">
      <header class="dashboard-header main-dashboard-header">
        <div class="dashboard-title">
          <h1>지원 현황</h1>
          <p>저장한 공고와 추천 공고를 빠르게 확인하고 다음 작업으로 이동합니다.</p>
        </div>
      </header>

      <section class="metric-strip main-metric-strip" aria-label="지원 현황 숫자 요약">
        <RouterLink to="/basket" data-testid="metric-total">
          <span>전체 공고</span>
          <strong>{{ dashboardStore.summary?.totalApplications ?? 0 }}</strong>
        </RouterLink>
        <RouterLink to="/basket?sort=deadline" data-testid="metric-deadline">
          <span>마감 임박</span>
          <strong>{{ dashboardStore.summary?.deadlineSoon ?? 0 }}</strong>
        </RouterLink>
        <RouterLink to="/basket" data-testid="metric-progress">
          <span>진행 중</span>
          <strong>{{ dashboardStore.summary?.inProgress ?? 0 }}</strong>
        </RouterLink>
        <RouterLink to="/basket" data-testid="metric-not-started">
          <span>지원 전</span>
          <strong>{{ dashboardStore.summary?.notStarted ?? 0 }}</strong>
        </RouterLink>
      </section>

      <section class="dashboard-panel main-basket-preview" aria-label="공고 장바구니 미리보기">
        <div class="section-heading">
          <div class="main-basket-title-row">
            <h2>공고 장바구니</h2>
            <p class="main-preview-note">마감 임박순으로 제공됩니다.</p>
          </div>
          <RouterLink class="text-button" to="/basket?sort=deadline">전체 보기</RouterLink>
        </div>

        <SkeletonLoader v-if="basketStore.status === 'loading' && basketPreviewJobs.length === 0" :lines="4" label="공고 목록을 불러오는 중" />
        <StatePanel
          v-else-if="basketStore.status === 'error' && basketPreviewJobs.length === 0"
          id="main-basket-error"
          tone="navy"
          title="공고 목록 로딩 실패"
          :body="basketStore.errorMessage"
        />
        <div v-else class="main-basket-table">
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
            <span class="status-tag" :class="statusClass(job.status)" data-testid="main-basket-status">
              {{ statusLabel(job.status, job.statusLabel) }}
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
      </section>

      <section class="dashboard-panel main-recommendation-preview" aria-label="추천 공고 미리보기">
        <div class="section-heading">
          <div>
            <h2>추천 공고</h2>
            <p>마감일과 지원자 관심도를 기준으로 정리한 추천 공고입니다.</p>
          </div>
          <RouterLink class="text-button" to="/recommendations">추천 더보기</RouterLink>
        </div>
        <SkeletonLoader v-if="recommendationStore.status === 'loading' && recommendationPreviewItems.length === 0" :lines="3" label="추천 공고를 불러오는 중" />
        <StatePanel
          v-else-if="recommendationStore.status === 'error' && recommendationPreviewItems.length === 0"
          id="main-recommendation-error"
          tone="navy"
          title="추천 공고 로딩 실패"
          :body="recommendationStore.errorMessage"
        />
        <div v-else-if="recommendationPreviewItems.length > 0" class="recommendation-thumbnail-grid">
          <article
            v-for="item in recommendationPreviewItems"
            :key="item.id"
            class="recommendation-thumbnail-card"
            data-testid="main-recommendation-preview-job"
          >
            <div class="recommendation-thumbnail-logo" aria-hidden="true">
              <img
                v-if="item.companyLogoUrl && !failedLogos.has(item.id)"
                data-testid="main-recommendation-logo"
                :src="item.companyLogoUrl"
                :alt="`${item.companyName} logo`"
                @error="handleLogoError(item.id)"
              />
              <span v-else>{{ companyInitial(item.companyName) }}</span>
            </div>
            <div class="recommendation-thumbnail-copy">
              <strong>{{ item.companyName }}</strong>
              <span>{{ item.positionTitle }}</span>
              <p>{{ item.deadlineLabel }} · {{ formatParticipantCount(item.participantCount) }}명 작성</p>
            </div>
            <button
              class="recommendation-save-button"
              type="button"
              :disabled="recommendationStore.status === 'saving'"
              :data-testid="`main-save-recommendation-${item.id}`"
              @click="saveRecommendation(item.id)"
            >
              담기
            </button>
          </article>
        </div>
        <StatePanel
          v-else
          id="main-recommendation-empty"
          tone="navy"
          title="추천 공고가 없습니다"
          body="추천 공고 페이지에서 조건을 확인해 주세요."
        />
      </section>
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

const basketPreviewJobs = computed(() => [...basketStore.jobs]
    .sort((left, right) => deadlineRank(left) - deadlineRank(right))
    .slice(0, 5));

const recommendationPreviewItems = computed(() => [...recommendationStore.jobs]
    .filter(isVisibleRecommendation)
    .sort((left, right) => deadlineRank(left) - deadlineRank(right))
    .slice(0, 4));

onMounted(() => {
    void dashboardStore.loadSummary();
    void basketStore.loadJobs();
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
