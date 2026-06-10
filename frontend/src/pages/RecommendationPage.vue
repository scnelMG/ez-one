<template>
  <AppLayout>
    <section class="wire-page recommendation-page">
      <PageHeader
        title="추천 공고"
        description="마감이 있는 공고를 빠른 순서로 정리했습니다. 관심 있는 공고를 담으면 장바구니와 워크스페이스로 이어집니다."
      />

      <StatePanel
        v-if="recommendationStore.status === 'error'"
        id="recommendation-error"
        tone="navy"
        title="추천 공고 오류"
        :body="recommendationStore.errorMessage"
      />

      <section class="wire-section recommendation-board" aria-label="추천 공고 목록">
        <div class="recommendation-list-header">
          <div>
            <h2>추천 공고 {{ sortedJobs.length }}건</h2>
            <p>마감 임박순으로 제공됩니다.</p>
          </div>
          <span>회사 로고와 지원자 작성 수를 함께 확인할 수 있습니다.</span>
        </div>
        <SkeletonLoader v-if="recommendationStore.status === 'loading' && sortedJobs.length === 0" :lines="4" label="추천 공고를 불러오는 중" />
        <p v-else-if="recommendationStore.status === 'loading'" class="recommendation-refreshing" data-testid="recommendation-refreshing">
          추천 공고를 갱신하는 중입니다.
        </p>
        <div
          v-if="sortedJobs.length > 0"
          class="recommendation-grid recommendation-page-grid"
        >
          <article
            v-for="item in sortedJobs"
            :key="item.id"
            class="recommendation-card recommendation-job-card"
            data-testid="recommendation-card"
          >
            <div class="recommendation-card-header">
              <div class="recommendation-card-copy">
                <h3>{{ item.companyName }}</h3>
                <p>{{ item.positionTitle }}</p>
                <span>{{ item.deadlineLabel }} · {{ formatParticipantCount(item.participantCount) }}명 작성</span>
              </div>
              <span class="recommendation-logo" aria-hidden="true">
                <img
                  v-if="item.companyLogoUrl"
                  :src="item.companyLogoUrl"
                  :alt="`${item.companyName} logo`"
                  @error="item.companyLogoUrl = ''"
                />
                <span v-else>{{ companyInitial(item.companyName) }}</span>
              </span>
            </div>
            <button
              class="recommendation-save-button"
              type="button"
              :disabled="recommendationStore.status === 'saving'"
              :data-testid="`save-recommendation-${item.id}`"
              @click="saveRecommendation(item.id)"
            >
              담기
            </button>
          </article>
        </div>
        <StatePanel
          v-if="recommendationStore.status !== 'loading' && sortedJobs.length === 0"
          id="recommendation-empty"
          tone="navy"
          title="추천 공고가 없습니다"
          body="선호 조건을 저장하면 추천 후보를 다시 확인할 수 있습니다."
        />
      </section>

      <section
        v-if="recommendationStore.savedJob"
        class="recommendation-save-alert"
        role="status"
        aria-live="polite"
      >
        <div class="save-alert-dot" aria-hidden="true"></div>
        <div>
          <h2>공고를 담았습니다</h2>
          <p>
            {{ recommendationStore.savedJob.companyName }}
            {{ recommendationStore.savedJob.positionTitle }}
            워크스페이스가 준비되었습니다.
          </p>
        </div>
        <RouterLink
          class="primary-button"
          :to="`/workspaces/${recommendationStore.savedJob.workspaceId}`"
          data-testid="saved-workspace-link"
        >
          워크스페이스 열기
        </RouterLink>
      </section>
    </section>
  </AppLayout>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useRecommendationStore } from '@/stores/recommendationStore';
import AppLayout from '@/shared/AppLayout.vue';
import PageHeader from '@/shared/PageHeader.vue';
import StatePanel from '@/shared/StatePanel.vue';
import SkeletonLoader from '@/shared/SkeletonLoader.vue';
import { showToast } from '@/shared/useToast';
import {
  deadlineRank,
  companyInitial,
  formatParticipantCount
} from '@/shared/utils/jobUtils';

const recommendationStore = useRecommendationStore();

const sortedJobs = computed(() => [...recommendationStore.jobs].sort(compareByDeadline));

onMounted(() => {
  void recommendationStore.loadRecommendations();
});

function saveRecommendation(recommendationId) {
  void recommendationStore.saveRecommendation(recommendationId).then(() => {
    if (recommendationStore.savedJob) {
      showToast(`${recommendationStore.savedJob.companyName} 공고를 담았습니다`, { tone: 'green' });
    }
  });
}

function compareByDeadline(left, right) {
  return deadlineRank(left) - deadlineRank(right);
}


</script>
