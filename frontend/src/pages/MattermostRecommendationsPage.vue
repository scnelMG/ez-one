<template>
  <AppLayout>
    <section class="mm-page">
      <header class="mm-page-header">
        <div class="mm-title-group">
          <span class="mm-kicker">SSAFY 취업 채널 기반</span>
          <h1 data-testid="mm-recommendation-title">Mattermost 추천공고</h1>
          <p>Mattermost 취업 채널에서 수집된 실제 채용공고 중 마감 전 공고만 정리했습니다.</p>
        </div>
        <RouterLink class="mm-secondary-link" to="/basket">공고 장바구니</RouterLink>
      </header>

      <StatePanel
        v-if="status === 'loading'"
        id="mm-loading"
        tone="navy"
        title="Mattermost 공고를 불러오는 중…"
        body="수집된 공고와 AI 추천 점수를 확인하고 있습니다."
      />
      <StatePanel
        v-else-if="status === 'error'"
        id="mm-error"
        tone="navy"
        title="Mattermost 공고를 불러오지 못했습니다"
        :body="errorMessage"
      />
      <StatePanel
        v-else-if="rawJobs.length === 0"
        id="mm-empty"
        tone="navy"
        title="마감 전 MM 공고가 없습니다"
        body="새 공고가 수집되면 이곳에 표시됩니다."
      />

      <template v-else>
        <div class="mm-controls" aria-label="Mattermost 공고 보기 옵션">
          <div class="mm-segmented-control" role="group" aria-label="공고 세그먼트">
            <button
              type="button"
              data-testid="mm-segment-all"
              :class="{ active: activeSegment === 'all' }"
              @click="activeSegment = 'all'"
            >
              전체 공고
            </button>
            <button
              type="button"
              data-testid="mm-segment-ai"
              :class="{ active: activeSegment === 'ai' }"
              @click="activeSegment = 'ai'"
            >
              AI 추천
            </button>
            <button
              type="button"
              data-testid="mm-segment-urgent"
              :class="{ active: activeSegment === 'urgent' }"
              @click="activeSegment = 'urgent'"
            >
              마감 임박
            </button>
          </div>
          <label class="mm-sort-control">
            정렬
            <select v-model="sortMode" data-testid="mm-sort-select" name="mattermostSort">
              <option value="deadline">마감 기한순</option>
              <option value="score">AI 추천 점수순</option>
              <option value="recent">최근 게시순</option>
            </select>
          </label>
        </div>

        <div class="mm-toolbar" aria-label="Mattermost 추천공고 상태">
          <div>
            <strong>{{ visibleJobs.length }}</strong>
            <span>{{ toolbarLabel }}</span>
          </div>
          <div>
            <strong>AI</strong>
            <span>저장 점수 우선</span>
          </div>
          <div>
            <strong>실시간</strong>
            <span>Webhook 수집 기준</span>
          </div>
        </div>

        <div class="mm-job-grid" aria-label="Mattermost 추천공고 목록">
          <article
            v-for="job in visibleJobs"
            :key="job.id"
            class="mm-job-card"
            :data-testid="`mm-recommendation-card-${job.id}`"
          >
            <div class="mm-card-header">
              <span class="mm-logo" aria-hidden="true">
                <img
                  v-if="job.companyLogoUrl"
                  :src="job.companyLogoUrl"
                  :alt="`${job.companyName} logo`"
                  width="44"
                  height="44"
                  loading="lazy"
                />
                <span v-else>{{ companyInitial(job.companyName) }}</span>
              </span>
              <div class="mm-card-title">
                <strong>{{ job.companyName }}</strong>
                <p>{{ job.positionTitle }}</p>
              </div>
              <div v-if="job.recommendationScore != null" class="mm-score" aria-label="AI 추천 점수">
                <span>{{ job.recommendationScore }}</span>
                <small>AI</small>
              </div>
              <div v-else class="mm-score pending" aria-label="AI 추천 점수 계산 중">
                <span>계산 중</span>
              </div>
            </div>

            <div class="mm-card-meta">
              <span :class="deadlineClass(job.deadlineLabel)">{{ job.deadlineLabel || '마감 미정' }}</span>
              <span v-if="job.companyType">{{ job.companyType }}</span>
              <span v-if="job.companyDomain">공식 사이트: {{ job.companyDomain }}</span>
              <span v-if="displayedPostedAt(job)">게시 {{ formatMattermostTime(displayedPostedAt(job)) }}</span>
              <span v-else-if="job.collectedAt">수집 {{ formatMattermostTime(job.collectedAt) }}</span>
              <span>Mattermost</span>
            </div>

            <p v-if="job.recommendationReason" class="mm-ai-reason">
              {{ job.recommendationReason }}
            </p>

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
                {{ savingJobId === job.id ? '저장 중…' : '공고 장바구니 저장' }}
              </button>
            </div>
          </article>
        </div>
      </template>
    </section>
  </AppLayout>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { recommendationApi } from '@/features/recommendations/api/recommendationApi';
import AppLayout from '@/shared/AppLayout.vue';
import StatePanel from '@/shared/StatePanel.vue';
import { companyInitial, normalizedSourceUrl } from '@/shared/utils/jobUtils';

const rawJobs = ref([]);
const status = ref('loading');
const errorMessage = ref('');
const savingJobId = ref(null);
const activeSegment = ref('all');
const sortMode = ref('deadline');
const savedJobs = reactive({});

const visibleJobs = computed(() => filteredJobs().sort(compareJobs));
const toolbarLabel = computed(() => {
  if (activeSegment.value === 'ai') return 'AI 추천 공고';
  if (activeSegment.value === 'urgent') return '마감 임박 공고';
  return '마감 전 공고';
});

onMounted(loadJobs);

async function loadJobs() {
  status.value = 'loading';
  try {
    rawJobs.value = await recommendationApi.listMattermostJobs();
    status.value = 'ready';
  } catch (error) {
    errorMessage.value = error?.message ?? '잠시 후 다시 시도해 주세요.';
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

function deadlineClass(deadlineLabel) {
  if (!deadlineLabel) {
    return 'mm-deadline-neutral';
  }
  if (deadlineLabel.includes('상시') || deadlineLabel.includes('수시')) {
    return 'mm-deadline-open';
  }
  if (/^D-[0-7]$/.test(deadlineLabel) || deadlineLabel === '오늘 마감') {
    return 'mm-deadline-soon';
  }
  return 'mm-deadline-date';
}

function filteredJobs() {
  if (activeSegment.value === 'ai') {
    return rawJobs.value.filter((job) => (job.recommendationScore ?? 0) >= 70);
  }
  if (activeSegment.value === 'urgent') {
    return rawJobs.value.filter((job) => deadlineRank(job.deadlineLabel) <= 7);
  }
  return [...rawJobs.value];
}

function compareJobs(left, right) {
  if (sortMode.value === 'score') {
    return compareScore(left, right) || compareDeadline(left, right) || compareRecent(left, right);
  }
  if (sortMode.value === 'recent') {
    return compareRecent(left, right) || compareDeadline(left, right) || compareScore(left, right);
  }
  return compareDeadline(left, right) || compareScore(left, right) || compareRecent(left, right);
}

function compareScore(left, right) {
  return (right.recommendationScore ?? -1) - (left.recommendationScore ?? -1);
}

function compareDeadline(left, right) {
  return deadlineRank(left.deadlineLabel) - deadlineRank(right.deadlineLabel);
}

function compareRecent(left, right) {
  return new Date(right.postedAt || right.collectedAt || 0).getTime() - new Date(left.postedAt || left.collectedAt || 0).getTime();
}

function deadlineRank(deadlineLabel) {
  if (deadlineLabel === '오늘 마감') return 0;
  const dday = /^D-(\d+)$/.exec(deadlineLabel ?? '');
  if (dday) return Number(dday[1]);
  if ((deadlineLabel ?? '').includes('상시') || (deadlineLabel ?? '').includes('수시')) return 500;
  if ((deadlineLabel ?? '').includes('채용 시')) return 600;
  if ((deadlineLabel ?? '').includes('미확인')) return 900;
  const parsed = new Date(deadlineLabel);
  return Number.isNaN(parsed.getTime()) ? 800 : Math.max(0, Math.ceil((parsed.getTime() - Date.now()) / 86400000));
}

function displayedPostedAt(job) {
  return job.postedAt || '';
}

function formatMattermostTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
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
  margin-bottom: 18px;
}

.mm-title-group {
  min-width: 0;
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
  text-wrap: balance;
}

.mm-page-header p {
  margin: 8px 0 0;
  color: var(--text-secondary);
  line-height: 1.55;
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

.mm-secondary-link:hover,
.mm-source-link:hover {
  border-color: var(--blue-strong);
  color: var(--blue-strong);
}

.mm-secondary-link:focus-visible,
.mm-source-link:focus-visible,
.mm-save-button:focus-visible,
.mm-saved-link:focus-visible {
  outline: 3px solid rgba(79, 70, 229, 0.28);
  outline-offset: 2px;
}

.mm-toolbar {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 16px;
}

.mm-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.mm-segmented-control {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
}

.mm-segmented-control button,
.mm-sort-control select {
  min-height: 38px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
  color: var(--text-secondary);
  cursor: pointer;
  font: inherit;
  font-weight: 800;
  padding: 0 12px;
}

.mm-segmented-control button.active,
.mm-segmented-control button:hover {
  border-color: var(--blue-strong);
  background: #eef2ff;
  color: var(--blue-strong);
}

.mm-sort-control {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 0.86rem;
  font-weight: 800;
}

.mm-toolbar div {
  min-width: 0;
  padding: 12px 14px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
}

.mm-toolbar strong {
  display: block;
  color: var(--ink);
  font-size: 1rem;
}

.mm-toolbar span {
  display: block;
  margin-top: 2px;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.mm-job-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
}

.mm-job-card {
  display: flex;
  min-height: 260px;
  flex-direction: column;
  justify-content: space-between;
  gap: 16px;
  padding: 20px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
}

.mm-card-header {
  display: flex;
  align-items: flex-start;
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
  width: 44px;
  height: 44px;
  object-fit: contain;
}

.mm-card-title {
  min-width: 0;
  flex: 1 1 auto;
}

.mm-card-title strong {
  display: block;
  color: var(--ink);
  font-size: 1.05rem;
  overflow-wrap: anywhere;
}

.mm-card-title p {
  margin: 6px 0 0;
  color: var(--text-secondary);
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.mm-score {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  background: #eef2ff;
  color: var(--blue-strong);
  font-variant-numeric: tabular-nums;
}

.mm-score.pending {
  background: #f8fafc;
  color: var(--text-secondary);
}

.mm-score.pending span {
  margin-bottom: 0;
  font-size: 0.72rem;
}

.mm-score span {
  margin-bottom: -8px;
  font-size: 1rem;
  font-weight: 800;
}

.mm-score small {
  font-size: 0.68rem;
  font-weight: 800;
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

.mm-card-meta .mm-deadline-soon {
  background: #fef2f2;
  color: #b91c1c;
}

.mm-card-meta .mm-deadline-open {
  background: #ecfdf5;
  color: #047857;
}

.mm-card-meta .mm-deadline-date {
  background: #eff6ff;
  color: #1d4ed8;
}

.mm-ai-reason {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.92rem;
  line-height: 1.45;
  overflow-wrap: anywhere;
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

.mm-save-button:hover,
.mm-saved-link:hover {
  background: var(--blue-strong);
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

  .mm-toolbar {
    grid-template-columns: 1fr;
  }

  .mm-job-grid {
    grid-template-columns: 1fr;
  }
}
</style>
