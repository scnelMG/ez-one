<template>
  <AppLayout>
    <section class="dashboard-page main-dashboard-page">
      <header class="dashboard-header main-dashboard-header">
        <div class="dashboard-title">
          <h1>지원 준비를 한 화면에서 정리하세요</h1>
          <p>저장한 공고와 추천 공고를 빠르게 훑고 다음 작업으로 이동합니다.</p>
        </div>
      </header>

      <section class="metric-strip main-metric-strip" aria-label="지원 현황 숫자 요약">
        <RouterLink to="/basket" data-testid="metric-total">
          <span>총 지원</span>
          <strong>{{ dashboardStore.summary?.totalApplications ?? 0 }}</strong>
        </RouterLink>
        <RouterLink to="/basket?sort=deadline" data-testid="metric-deadline">
          <span>마감 임박 개수</span>
          <strong>{{ dashboardStore.summary?.deadlineSoon ?? 0 }}</strong>
        </RouterLink>
        <RouterLink to="/basket" data-testid="metric-progress">
          <span>진행 개수</span>
          <strong>{{ dashboardStore.summary?.inProgress ?? 0 }}</strong>
        </RouterLink>
        <RouterLink to="/basket" data-testid="metric-not-started">
          <span>지원 전</span>
          <strong>{{ dashboardStore.summary?.notStarted ?? 0 }}</strong>
        </RouterLink>
      </section>

      <section class="dashboard-panel main-basket-preview" aria-label="공고 장바구니 미리보기">
        <div class="section-heading">
          <div>
            <div class="main-basket-title-row">
              <h2>공고 장바구니</h2>
              <p class="main-preview-note">마감 임박순으로 제공됩니다.</p>
            </div>
          </div>
          <RouterLink class="text-button" to="/basket?sort=deadline">전체 보기</RouterLink>
        </div>

        <p v-if="basketStore.status === 'loading'" class="basket-loading">공고 목록을 불러오는 중입니다.</p>
        <StatePanel
          v-else-if="basketStore.status === 'error'"
          id="main-basket-error"
          tone="navy"
          title="공고 목록 로딩 실패"
          :body="basketStore.errorMessage"
        />
        <div v-else class="main-basket-table">
          <div class="main-basket-head">
            <span>회사명</span>
            <span>직무</span>
            <span>상태</span>
            <span>마감일</span>
            <span>지원</span>
            <span>최근 작업</span>
          </div>
          <div
            v-for="job in basketPreviewJobs"
            :key="job.id"
            class="main-basket-row"
            data-testid="main-basket-preview-job"
          >
            <RouterLink
              class="main-workspace-link"
              data-testid="main-basket-company"
              :to="`/workspaces/${job.workspaceId}`"
            >
              {{ job.companyName }}
            </RouterLink>
            <span class="main-basket-position">{{ job.positionTitle }}</span>
            <span
              class="status-tag"
              :class="statusClass(job.status)"
              data-testid="main-basket-status"
            >
              {{ job.statusLabel }}
            </span>
            <span class="deadline-pill" :class="{ urgent: job.deadlineSoon }">{{ job.deadlineLabel }}</span>
            <a
              class="main-apply-link"
              data-testid="main-basket-apply-link"
              :href="job.sourceUrl"
              target="_blank"
              rel="noreferrer"
            >
              바로가기
            </a>
            <span v-if="isRecentWorkspace(job.workspaceId)" class="recent-visit-badge">최근 작업</span>
          </div>
        </div>
      </section>

      <section class="dashboard-panel main-recommendation-preview" aria-label="추천공고 미리보기">
        <div class="section-heading">
          <div>
            <h2>추천공고</h2>
          </div>
          <RouterLink class="text-button" to="/recommendations">추천 더보기</RouterLink>
        </div>
        <p v-if="recommendationStore.status === 'loading'" class="basket-loading">추천 공고를 불러오는 중입니다.</p>
        <StatePanel
          v-else-if="recommendationStore.status === 'error'"
          id="main-recommendation-error"
          tone="navy"
          title="추천 공고 로딩 실패"
          :body="recommendationStore.errorMessage"
        />
        <div v-else class="recommendation-thumbnail-grid">
          <article
            v-for="item in recommendationPreviewItems"
            :key="item.id"
            class="recommendation-thumbnail-card"
            data-testid="main-recommendation-preview-job"
          >
            <div class="recommendation-thumbnail-logo" aria-hidden="true">
              <img
                data-testid="main-recommendation-logo"
                :src="item.companyLogoUrl"
                :alt="`${item.companyName} logo`"
              />
            </div>
            <strong>{{ item.companyName }}</strong>
            <span>{{ item.positionTitle }}</span>
            <p class="recommendation-thumbnail-meta">
              {{ item.deadlineLabel }} · {{ item.participantCount }}명 작성
            </p>
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
      </section>
    </section>
    <OnboardingPage v-if="showOnboardingModal" @completed="showOnboardingModal = false" />
  </AppLayout>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import AppLayout from '@/shared/AppLayout.vue';
import StatePanel from '@/shared/StatePanel.vue';
import OnboardingPage from '@/pages/OnboardingPage.vue';
import { getCurrentUser } from '@/features/auth/session/authSession';
import { isRecentWorkspace } from '@/features/basket/recentWorkspaces';
import { useBasketStore } from '@/stores/basketStore';
import { useDashboardStore } from '@/stores/dashboardStore';
import { useRecommendationStore } from '@/stores/recommendationStore';

const dashboardStore = useDashboardStore();
const basketStore = useBasketStore();
const recommendationStore = useRecommendationStore();
const showOnboardingModal = ref(getCurrentUser()?.profileCompleted === false);

const basketPreviewJobs = computed(() => [...basketStore.jobs]
    .sort((left, right) => deadlineRank(left) - deadlineRank(right))
    .slice(0, 5));

const recommendationPreviewItems = computed(() => recommendationStore.jobs
    .filter((item) => item.companyLogoUrl && item.deadlineDate && item.deadlineLabel !== '상시')
    .slice(0, 8));

onMounted(() => {
    void dashboardStore.loadSummary();
    void basketStore.loadJobs();
    void recommendationStore.loadRecommendations();
});

function deadlineRank(job) {
    const source = job.deadlineDate ?? job.deadlineLabel ?? '';
    const explicit = source.match(/(20\d{2})[-.](\d{1,2})[-.](\d{1,2})/);
    if (explicit) {
        return new Date(Number(explicit[1]), Number(explicit[2]) - 1, Number(explicit[3])).getTime();
    }
    const dDay = source.match(/D-(\d+)/i);
    return dDay ? Number(dDay[1]) : Number.MAX_SAFE_INTEGER;
}

function saveRecommendation(recommendationId) {
    void recommendationStore.saveRecommendation(recommendationId);
}

function statusClass(status) {
    return {
        NOT_STARTED: 'status-not-started',
        IN_PROGRESS: 'status-in-progress',
        SUBMITTED: 'status-submitted',
        NOT_APPLIED: 'status-not-applied'
    }[status] ?? 'status-not-applied';
}
</script>
