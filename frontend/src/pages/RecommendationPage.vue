<template>
  <AppLayout>
    <section class="wire-page recommendation-page">
      <PageHeader
        title="추천 공고"
        description="관심 직무와 입력한 정보를 바탕으로 지금 확인할 만한 공고를 모아 보여드립니다. 마음에 드는 공고는 바로 담아 지원 준비를 이어갈 수 있습니다."
      />

      <StatePanel
        v-if="recommendationStore.status === 'error'"
        id="recommendation-error"
        tone="navy"
        title="추천 공고 오류"
        :body="recommendationStore.errorMessage"
      />

      <section class="wire-section" aria-label="추천 공고 목록">
        <p v-if="recommendationStore.status === 'loading'">추천 공고를 불러오는 중입니다.</p>
        <div v-else-if="sortedJobs.length > 0" class="recommendation-grid recommendation-page-grid">
          <article
            v-for="item in sortedJobs"
            :key="item.id"
            class="recommendation-card recommendation-job-card"
            data-testid="recommendation-card"
          >
            <div class="recommendation-company-row">
              <span class="recommendation-logo" aria-hidden="true">
                <img
                  v-if="item.companyLogoUrl"
                  :src="item.companyLogoUrl"
                  :alt="`${item.companyName} logo`"
                  @error="item.companyLogoUrl = ''"
                />
                <span v-else>{{ companyInitial(item.companyName) }}</span>
              </span>
              <span class="shell-card-kicker">{{ item.deadlineLabel }}</span>
            </div>
            <h3>{{ item.companyName }}</h3>
            <p>{{ item.positionTitle }}</p>
            <button
              class="primary-button compact-action"
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
          v-else
          id="recommendation-empty"
          tone="green"
          title="추천 공고가 없습니다"
          body="온보딩 선호 조건을 저장하면 추천 후보를 다시 확인할 수 있습니다."
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
            워크스페이스가 준비됐습니다.
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

const recommendationStore = useRecommendationStore();

const sortedJobs = computed(() => [...recommendationStore.jobs].sort(compareByDeadline));

onMounted(() => {
  void recommendationStore.loadRecommendations();
});

function saveRecommendation(recommendationId) {
  void recommendationStore.saveRecommendation(recommendationId);
}

function compareByDeadline(left, right) {
  return deadlineRank(left) - deadlineRank(right);
}

function deadlineRank(job) {
  if (job.deadlineDate) {
    const time = Date.parse(job.deadlineDate);
    if (!Number.isNaN(time)) {
      return time;
    }
  }
  const dDay = /^D-(\d+)$/i.exec(job.deadlineLabel ?? '');
  if (dDay) {
    return Number(dDay[1]);
  }
  if (job.deadlineLabel === '오늘마감' || job.deadlineLabel === 'D-DAY') {
    return 0;
  }
  return Number.MAX_SAFE_INTEGER;
}

function companyInitial(companyName) {
  return (companyName ?? '?').trim().charAt(0).toUpperCase() || '?';
}
</script>
