<template>
  <AppLayout>
    <section class="mm-page">
      <header class="mm-page-header">
        <div>
          <span class="mm-kicker">SSAFY 채널 기반</span>
          <h1 data-testid="mm-recommendation-title">Mattermost 추천공고</h1>
          <p>취업 채널에서 실제 채용공고로 분류된 후보만 모아 검토하고 저장합니다.</p>
        </div>
        <RouterLink class="mm-secondary-link" to="/basket">공고 바구니</RouterLink>
      </header>

      <StatePanel
        v-if="status === 'loading'"
        id="mm-loading"
        tone="navy"
        title="Mattermost 공고를 불러오는 중"
        body="검토 가능한 공고 후보를 확인하고 있습니다."
      />
      <StatePanel
        v-else-if="status === 'error'"
        id="mm-error"
        tone="navy"
        title="Mattermost 공고를 불러오지 못했습니다"
        :body="errorMessage"
      />
      <StatePanel
        v-else-if="jobs.length === 0"
        id="mm-empty"
        tone="navy"
        title="아직 추천 가능한 MM 공고가 없습니다"
        body="수집된 메시지가 검토를 통과하면 이곳에 표시됩니다."
      />

      <div v-else class="mm-job-grid" aria-label="Mattermost 추천공고 목록">
        <article
          v-for="job in jobs"
          :key="job.id"
          class="mm-job-card"
          :data-testid="`mm-recommendation-card-${job.id}`"
        >
          <div class="mm-card-top">
            <span class="mm-logo" aria-hidden="true">
              <img v-if="job.companyLogoUrl" :src="job.companyLogoUrl" :alt="`${job.companyName} logo`" />
              <span v-else>{{ companyInitial(job.companyName) }}</span>
            </span>
            <div>
              <strong>{{ job.companyName }}</strong>
              <p>{{ job.positionTitle }}</p>
            </div>
          </div>

          <div class="mm-card-meta">
            <span>{{ job.deadlineLabel || '마감 미정' }}</span>
            <span>MM 승인 후보</span>
          </div>

          <div class="mm-card-actions">
            <a
              class="mm-source-link"
              :data-testid="`mm-recommendation-source-${job.id}`"
              :href="normalizedSourceUrl(job.sourceUrl)"
              target="_blank"
              rel="noreferrer"
            >
              원문 공고
            </a>
            <RouterLink
              v-if="savedJobs[job.id]?.workspaceId"
              class="mm-saved-link"
              :data-testid="`mm-saved-workspace-${job.id}`"
              :to="`/workspaces/${savedJobs[job.id].workspaceId}`"
            >
              워크스페이스
            </RouterLink>
            <button
              v-else
              class="mm-save-button"
              type="button"
              :data-testid="`mm-save-${job.id}`"
              :disabled="savingJobId === job.id"
              @click="saveJob(job.id)"
            >
              {{ savingJobId === job.id ? '저장 중' : '바구니 저장' }}
            </button>
          </div>
        </article>
      </div>
    </section>
  </AppLayout>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { recommendationApi } from '@/features/recommendations/api/recommendationApi';
import AppLayout from '@/shared/AppLayout.vue';
import StatePanel from '@/shared/StatePanel.vue';
import { companyInitial, normalizedSourceUrl } from '@/shared/utils/jobUtils';

const jobs = ref([]);
const status = ref('loading');
const errorMessage = ref('');
const savingJobId = ref(null);
const savedJobs = reactive({});

onMounted(loadJobs);

async function loadJobs() {
  status.value = 'loading';
  try {
    jobs.value = await recommendationApi.listMattermostJobs();
    status.value = 'ready';
  } catch (error) {
    errorMessage.value = error?.message ?? '요청을 다시 시도해 주세요.';
    status.value = 'error';
  }
}

async function saveJob(jobId) {
  savingJobId.value = jobId;
  try {
    savedJobs[jobId] = await recommendationApi.saveMattermostJob(jobId);
  } finally {
    savingJobId.value = null;
  }
}
</script>

<style scoped>
.mm-page {
  width: min(1120px, calc(100vw - 48px));
  margin: 0 auto;
  padding: 32px 0 56px;
}

.mm-page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 24px;
}

.mm-kicker {
  display: inline-flex;
  margin-bottom: 8px;
  color: var(--blue-strong);
  font-size: 0.86rem;
  font-weight: 700;
}

.mm-page-header h1 {
  margin: 0;
  color: var(--ink);
  font-size: 2rem;
  letter-spacing: 0;
}

.mm-page-header p {
  margin: 8px 0 0;
  color: var(--text-secondary);
}

.mm-secondary-link,
.mm-source-link,
.mm-saved-link,
.mm-save-button {
  min-height: 40px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 14px;
  font-weight: 700;
  text-decoration: none;
}

.mm-secondary-link,
.mm-source-link {
  border: 1px solid var(--line);
  color: var(--text-secondary);
  background: #fff;
}

.mm-job-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.mm-job-card {
  display: flex;
  min-height: 220px;
  flex-direction: column;
  justify-content: space-between;
  gap: 20px;
  padding: 20px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
}

.mm-card-top {
  display: flex;
  gap: 14px;
}

.mm-logo {
  width: 44px;
  height: 44px;
  border: 1px solid var(--line);
  border-radius: 8px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  overflow: hidden;
  background: #f8fafc;
  color: var(--blue-strong);
  font-weight: 800;
}

.mm-logo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.mm-card-top strong {
  color: var(--ink);
  font-size: 1.05rem;
}

.mm-card-top p {
  margin: 6px 0 0;
  color: var(--text-secondary);
  line-height: 1.45;
}

.mm-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.mm-card-meta span {
  padding: 6px 10px;
  border-radius: 999px;
  background: #f1f5f9;
  color: var(--text-secondary);
  font-size: 0.84rem;
  font-weight: 700;
}

.mm-card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.mm-save-button,
.mm-saved-link {
  border: 0;
  background: var(--blue);
  color: #fff;
  cursor: pointer;
}

.mm-save-button:disabled {
  cursor: wait;
  opacity: 0.7;
}

@media (max-width: 720px) {
  .mm-page {
    width: min(100% - 28px, 1120px);
    padding-top: 20px;
  }

  .mm-page-header {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
