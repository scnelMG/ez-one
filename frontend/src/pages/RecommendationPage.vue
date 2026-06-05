<template>
  <AppLayout>
    <section class="wire-page">
      <PageHeader
        eyebrow="REC-001"
        title="추천 공고"
        description="프로필과 저장 이력을 기준으로 지금 확인할 만한 Jasoseol.com 공고 후보를 보여줍니다."
      />

      <section class="filter-bar" aria-label="추천 공고 필터">
        <button class="filter-chip active" type="button">전체</button>
        <button class="filter-chip" type="button">백엔드</button>
        <button class="filter-chip" type="button">Java/Spring</button>
        <button class="filter-chip" type="button">서울</button>
        <div class="search-field">추천 공고 검색</div>
      </section>

      <StatePanel
        v-if="recommendationStore.status === 'error'"
        id="recommendation-error"
        tone="navy"
        title="추천 공고 오류"
        :body="recommendationStore.errorMessage"
      />

      <section class="wire-section" aria-label="추천 공고 목록">
        <p v-if="recommendationStore.status === 'loading'">추천 공고를 불러오는 중입니다.</p>
        <div v-else-if="recommendationStore.jobs.length > 0" class="recommendation-grid">
          <article v-for="item in recommendationStore.jobs" :key="item.id" class="recommendation-card">
            <span class="shell-card-kicker">{{ item.deadlineLabel }}</span>
            <h3>{{ item.companyName }}</h3>
            <p>{{ item.positionTitle }}</p>
            <button
              class="text-button"
              type="button"
              :disabled="recommendationStore.status === 'saving'"
              :data-testid="`save-recommendation-${item.id}`"
              @click="saveRecommendation(item.id)"
            >
              별표로 담기
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

      <StatePanel
        v-if="recommendationStore.savedJob"
        id="recommendation-saved"
        tone="green"
        title="공고를 담았습니다"
        :body="`${recommendationStore.savedJob.companyName} ${recommendationStore.savedJob.positionTitle} 워크스페이스가 준비됐습니다.`"
      />

      <RouterLink
        v-if="recommendationStore.savedJob"
        class="primary-button"
        :to="`/workspaces/${recommendationStore.savedJob.workspaceId}`"
        data-testid="saved-workspace-link"
      >
        워크스페이스 열기
      </RouterLink>
    </section>
  </AppLayout>
</template>

<script setup>import AppLayout from '@/shared/AppLayout.vue';
import StatePanel from '@/shared/StatePanel.vue';
import PageHeader from '@/shared/PageHeader.vue';
import { onMounted } from 'vue';
import { useRecommendationStore } from '@/stores/recommendationStore';
const recommendationStore = useRecommendationStore();
onMounted(() => {
    void recommendationStore.loadRecommendations();
});
function saveRecommendation(recommendationId) {
    void recommendationStore.saveRecommendation(recommendationId);
}
</script>
