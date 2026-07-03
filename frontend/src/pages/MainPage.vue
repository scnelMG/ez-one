<template>
  <AppLayout>
    <section class="dashboard-page main-dashboard-page">
      <section class="main-hero" data-testid="main-dashboard-hero" aria-label="오늘의 지원 현황">
        <div class="main-hero-copy">
          <h1>오늘의 지원 현황</h1>
          <p>매일 조금씩 준비하면, 좋은 결과로 이어져요.</p>

          <div class="main-metric-toolbar">
            <span>지원 현황 요약</span>
          </div>

          <section class="main-metric-strip" aria-label="지원 현황 숫자 요약">
            <RouterLink
              v-for="metric in metricCards"
              :key="metric.testId"
              class="main-metric-card metric-lift-card"
              :class="`tone-${metric.tone}`"
              :to="metric.to"
              :data-testid="metric.testId"
            >
              <span class="main-metric-icon" data-testid="main-metric-icon" aria-hidden="true">
                <svg v-if="metric.icon === 'briefcase'" viewBox="0 0 24 24">
                  <path d="M8.5 7V5.8c0-.8.6-1.4 1.4-1.4h4.2c.8 0 1.4.6 1.4 1.4V7" />
                  <path d="M5.5 7h13A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5v-9A1.5 1.5 0 0 1 5.5 7Z" />
                  <path d="M4 11.2h16M10 12.6h4" />
                </svg>
                <svg v-else-if="metric.icon === 'bookmark'" viewBox="0 0 24 24">
                  <path d="M7 4.5h10a1.5 1.5 0 0 1 1.5 1.5v14L12 16.4 5.5 20V6A1.5 1.5 0 0 1 7 4.5Z" />
                </svg>
                <svg v-else-if="metric.icon === 'plane'" viewBox="0 0 24 24">
                  <path d="M21 4 3.8 11.6l6.8 2.2L13 20l8-16Z" />
                  <path d="m10.6 13.8 4.8-5.1" />
                </svg>
                <svg v-else viewBox="0 0 24 24">
                  <circle cx="12" cy="13" r="6.2" />
                  <path d="M12 10v3.3l2.2 1.5M7.2 5.5 4.8 8M16.8 5.5 19.2 8" />
                </svg>
              </span>
              <span class="main-metric-copy">
                <span>
                  {{ metric.label }}
                </span>
                <strong>{{ metric.value }}</strong>
                <small v-if="metric.helper" class="metric-helper" data-testid="metric-helper">{{ metric.helper }}</small>
              </span>
            </RouterLink>
          </section>
        </div>

        <RouterLink
          class="hero-basket-link hero-side-cta primary-gradient-action"
          data-testid="hero-basket-link"
          to="/basket"
        >
          <span class="hero-basket-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M5 7h14l-1.3 8.4A2 2 0 0 1 15.7 17H8.3a2 2 0 0 1-2-1.6L5 7Z" />
              <path d="M8 7 10 3M16 7l-2-4M9 21h.01M15 21h.01" />
            </svg>
          </span>
          공고 장바구니 바로가기
          <span class="action-arrow" aria-hidden="true">›</span>
        </RouterLink>

        <div class="main-hero-visual">
          <img
            class="hero-face-character"
            data-testid="main-character-image"
            :src="characterImage"
            alt="지원 현황을 들고 있는 EZ-ONE 캐릭터"
            width="512"
            height="512"
            fetchpriority="high"
          />
        </div>
      </section>

      <section class="main-panel main-extension-cta" data-testid="main-extension-cta" aria-label="EZ-ONE 확장 프로그램 설치">
        <div class="main-extension-cta-copy">
          <span class="main-extension-eyebrow">EZ-ONE 확장 프로그램</span>
          <h2>공고 저장을 브라우저에서 바로 시작하세요</h2>
          <p>자소설닷컴 공고를 바로 저장하고 지원서 입력도 이어갈 수 있어요.</p>
          <small v-if="!extensionInstallUrl">스토어 설치 링크가 준비되지 않았습니다. 설치 안내 페이지에서 다음 단계를 확인해 주세요.</small>
        </div>
        <div class="main-extension-actions">
          <a
            v-if="extensionInstallUrl"
            class="primary-gradient-action extension-install-action"
            data-testid="main-extension-install-link"
            :href="extensionInstallUrl"
            target="_blank"
            rel="noreferrer"
          >
            Chrome에 설치
          </a>
          <RouterLink
            v-else
            class="primary-gradient-action extension-install-action"
            data-testid="main-extension-install-fallback-link"
            to="/extension"
          >
            설치 방법 보기
          </RouterLink>
          <RouterLink class="extension-help-link" data-testid="main-extension-help-link" to="/extension">
            설치 도움말
          </RouterLink>
        </div>
      </section>

      <div class="main-content-grid">
        <div class="main-left-column">
          <section class="main-panel active-application-panel" aria-label="작성 중인 지원서">
          <div class="main-section-heading">
            <div class="main-heading-title">
              <span class="section-icon document-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M7 4h7l3 3v13H7z" />
                  <path d="M14 4v4h4M9.5 12h5M9.5 15h4" />
                </svg>
              </span>
              <h2>작성 중인 지원서</h2>
            </div>
          </div>

          <article v-if="activeApplication" class="active-application-card" data-testid="active-application-card">
            <div class="active-company-mark" aria-hidden="true">
              <img
                v-if="activeApplication.companyLogoUrl && !failedLogos.has(activeApplication.id)"
                :src="activeApplication.companyLogoUrl"
                :alt="`${activeApplication.companyName} logo`"
                @error="handleLogoError(activeApplication.id)"
              />
              <span v-else>{{ companyInitial(activeApplication.companyName) }}</span>
            </div>

            <div class="active-application-body">
              <h3>{{ activeApplication.companyName }} · {{ activeApplication.positionTitle }}</h3>
              <div class="active-application-meta">
                <span>
                  <small>마지막 수정</small>
                  <strong>{{ activeApplication.updatedAtLabel }}</strong>
                </span>
                <span>
                  <small>마감일</small>
                  <strong>
                    <em v-if="formatDDay(activeApplication)" class="inline-dday">{{ formatDDay(activeApplication) }}</em>
                    {{ formatAbsoluteDeadline(activeApplication) }}
                  </strong>
                </span>
                <span>
                  <small>작성 완료</small>
                  <strong>{{ activeApplication.progressPercent }}%</strong>
                </span>
              </div>
              <div class="active-progress-row">
                <div class="active-progress-track" aria-hidden="true">
                  <span :style="{ width: `${activeApplication.progressPercent}%` }"></span>
                </div>
              </div>
            </div>

            <RouterLink
              class="active-detail-link"
              data-testid="active-application-link"
              :to="`/workspaces/${activeApplication.workspaceId}`"
            >
              상세 보기
            </RouterLink>
          </article>

          <StatePanel
            v-else
            id="active-application-empty"
            tone="navy"
            title="작성 중인 지원서가 없습니다"
            body="저장한 공고가 생기면 가장 최근에 작업한 지원서를 이어서 보여드립니다."
          />
          </section>

          <section class="main-panel basket-panel full-width-panel compact-basket-panel" data-testid="basket-panel" aria-label="공고 장바구니">
          <div class="basket-list-block">
            <div class="main-section-heading compact basket-section-heading">
              <h2>공고 장바구니</h2>
              <RouterLink class="text-button" to="/basket?sort=deadline">전체 보기</RouterLink>
            </div>

            <SkeletonLoader
              v-if="basketStore.status === 'loading' && basketPreviewJobs.length === 0"
              :lines="4"
              label="공고 목록을 불러오는 중"
            />
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
                <span class="interest-head-cell">관심</span>
                <span class="text-start-cell">회사명</span>
                <span class="text-start-cell">직무</span>
                <span class="center-cell">상태</span>
                <span class="deadline-align-cell">마감일</span>
                <span class="center-cell">바로가기</span>
                <span aria-label="삭제"></span>
              </div>
              <div
                v-for="job in basketPreviewJobs"
                :key="job.id"
                class="main-basket-row"
                :class="{ 'status-menu-row-open': openStatusJobId === job.id }"
                data-testid="main-basket-preview-job"
              >
                <button
                  class="priority-heart"
                  type="button"
                  :class="{ active: isPriorityJob(job) }"
                  :aria-label="`${job.companyName} 관심 공고 표시`"
                  :aria-pressed="isPriorityJob(job) ? 'true' : 'false'"
                  :data-testid="`main-priority-${job.id}`"
                  @click="togglePriority(job.id)"
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21.2l8.8-8.8a5.5 5.5 0 0 0 0-7.8Z" />
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

                <RouterLink class="main-basket-position text-start-cell" :to="`/workspaces/${job.workspaceId}`">
                  {{ job.positionTitle }}
                </RouterLink>

                <div class="status-menu center-cell">
                  <button
                    class="status-select status-tag"
                    type="button"
                    :class="statusClass(job.status)"
                    :aria-label="`${job.companyName} ${job.positionTitle} 지원 상태 변경`"
                    :aria-expanded="openStatusJobId === job.id ? 'true' : 'false'"
                    :data-testid="`main-status-${job.id}`"
                    @click="toggleStatusMenu(job.id)"
                  >
                    {{ displayStatusLabel(job.status, job.statusLabel) }}
                  </button>
                  <div
                    v-if="openStatusJobId === job.id"
                    class="status-option-list"
                    role="listbox"
                    :aria-label="`${job.companyName} 지원 상태 선택`"
                  >
                    <button
                      v-for="option in statusOptions"
                      :key="option.value"
                      class="status-option status-tag"
                      type="button"
                      role="option"
                      :class="statusClass(option.value)"
                      :aria-selected="job.status === option.value ? 'true' : 'false'"
                      :data-testid="`main-status-${job.id}-option-${option.value}`"
                      @click="changeStatus(job.id, option.value)"
                    >
                      {{ option.label }}
                    </button>
                  </div>
                </div>

                <RouterLink class="deadline-cell deadline-align-cell center-cell" :to="`/workspaces/${job.workspaceId}`">
                  <strong>{{ formatAbsoluteDeadline(job) }}</strong>
                  <span v-if="formatDDay(job)" class="deadline-pill" :class="{ urgent: job.deadlineSoon }">
                    {{ formatDDay(job) }}
                  </span>
                </RouterLink>

                <a
                  class="main-apply-link center-cell"
                  data-testid="main-basket-apply-link"
                  :href="normalizedSourceUrl(job.sourceUrl)"
                  target="_blank"
                  rel="noreferrer"
                >
                  공고 보기
                </a>

                <button
                  class="delete-job-button"
                  type="button"
                  :data-testid="`main-archive-${job.id}`"
                  aria-label="공고 삭제"
                  @click="archiveJob(job.id)"
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <StatePanel
              v-else
              id="main-basket-empty"
              tone="navy"
              title="바구니에 담긴 공고가 없습니다"
              body="확장 프로그램으로 공고를 저장하거나 장바구니에서 직접 추가해 보세요."
            />
          </div>
          </section>
        </div>

        <aside class="main-panel study-panel" data-testid="study-panel" aria-label="취업 스터디">
          <div class="main-heading-title study-panel-heading">
            <div class="study-panel-title">
              <span class="section-icon study-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                  <path d="M3.5 19c.5-3.4 2.4-5.2 4.5-5.2s4 1.8 4.5 5.2M11.5 19c.5-3.4 2.4-5.2 4.5-5.2s4 1.8 4.5 5.2" />
                </svg>
              </span>
              <h2>취업 스터디</h2>
            </div>
            <RouterLink class="study-more-link" data-testid="study-more-link" to="/study">더보기</RouterLink>
          </div>

          <div v-if="isStudyLoading" class="study-empty-card" data-testid="study-loading-state">
            <strong>스터디를 불러오는 중입니다</strong>
            <p>참여 중인 스터디 정보를 확인하고 있습니다.</p>
          </div>

          <template v-else-if="featuredStudies.length > 0">
            <article v-for="study in featuredStudies" :key="study.id" class="study-card">
              <div>
                <strong>{{ study.name }}</strong>
                <div class="study-tag-list" :aria-label="`${study.name} 요약`">
                  <span v-for="tag in study.stats" :key="tag" class="study-stat-tag" data-testid="study-stat-tag">{{ tag }}</span>
                </div>
              </div>
              <RouterLink
                class="primary-gradient-action compact-action"
                data-testid="study-card-link"
                :to="`/study/${study.id}`"
                :aria-label="`${study.name} 이어서 하기`"
              >
                <span class="action-arrow" aria-hidden="true">›</span>
              </RouterLink>
            </article>
          </template>

          <div v-else class="study-empty-card" data-testid="study-empty-state">
            <strong>참여 중인 스터디가 없습니다</strong>
            <p>스터디를 만들거나 초대를 수락하면 여기에 표시됩니다.</p>
          </div>
        </aside>
      </div>

      <section class="main-panel honey-panel" data-testid="honey-panel" aria-label="꿀통 채우기">
        <HoneyPotGraph :activities="activities" />
      </section>
    </section>

    <OnboardingPage v-if="showOnboardingModal" @completed="showOnboardingModal = false" />
  </AppLayout>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import characterImage from '@/assets/bee-backpack-main.png';
import HoneyPotGraph from '@/components/HoneyPotGraph.vue';
import AppLayout from '@/shared/AppLayout.vue';
import {
  deadlineRank,
  statusClass,
  normalizedSourceUrl,
  companyInitial,
  formatDDay,
  formatAbsoluteDeadline
} from '@/shared/utils/jobUtils';
import StatePanel from '@/shared/StatePanel.vue';
import OnboardingPage from '@/pages/OnboardingPage.vue';
import SkeletonLoader from '@/shared/SkeletonLoader.vue';
import { requiresOnboarding } from '@/features/auth/session/authSession';
import { getRecentWorkspaceWithTime } from '@/features/basket/recentWorkspaces';
import { useBasketStore } from '@/stores/basketStore';
import { useDashboardStore } from '@/stores/dashboardStore';
import { useStudyStore } from '@/stores/studyStore';
import { dashboardApi } from '@/features/dashboard/api/dashboardApi';

const basketStore = useBasketStore();
const dashboardStore = useDashboardStore();
const studyStore = useStudyStore();
const showOnboardingModal = ref(requiresOnboarding());
const failedLogos = ref(new Set());
const openStatusJobId = ref(null);
const activities = ref([]);
const extensionInstallUrl = computed(() => String(import.meta.env.VITE_EXTENSION_INSTALL_URL ?? '').trim());

const statusOptions = [
  { value: 'READY', label: '지원 전' },
  { value: 'NOT_APPLIED', label: '미지원' },
  { value: 'IN_PROGRESS', label: '진행 중' },
  { value: 'COMPLETED', label: '제출 완료' }
];

const metricCards = computed(() => {
  const summary = dashboardStore.summary ?? {};
  return [
    {
      testId: 'metric-total',
      icon: 'briefcase',
      tone: 'purple',
      label: '전체 공고',
      value: summary.totalApplications ?? 0,
      helper: '저장 총합',
      to: '/basket'
    },
    {
      testId: 'metric-not-started',
      icon: 'bookmark',
      tone: 'green',
      label: '지원 전',
      value: summary.notStarted ?? 0,
      helper: '지원 전 공고',
      to: '/basket?status=READY'
    },
    {
      testId: 'metric-progress',
      icon: 'plane',
      tone: 'blue',
      label: '진행 중',
      value: summary.inProgress ?? 0,
      helper: '작성 중 지원서',
      to: '/basket?status=IN_PROGRESS'
    },
    {
      testId: 'metric-deadline',
      icon: 'alarm',
      tone: 'orange',
      label: '마감 임박',
      value: summary.deadlineSoon ?? 0,
      helper: '일주일 이내',
      to: '/basket?sort=deadline'
    }
  ];
});

const safeJobs = computed(() => basketStore.jobs.filter(Boolean));
const featuredStudies = computed(() => studyStore.myStudies.slice(0, 2).map(toFeaturedStudy));
const isStudyLoading = computed(() => studyStore.status === 'loading' && featuredStudies.value.length === 0);

const basketPreviewJobs = computed(() => {
  return [...safeJobs.value]
    .sort((left, right) => deadlineRank(left) - deadlineRank(right))
    .slice(0, 5);
});

const activeApplication = computed(() => {
  const recent = getRecentWorkspaceWithTime();
  const recentJob = recent
    ? safeJobs.value.find((job) => String(job.workspaceId) === recent.id)
    : null;
  const fallbackJob = safeJobs.value.find((job) => job.status === 'IN_PROGRESS') ?? basketPreviewJobs.value[0] ?? null;
  const job = recentJob ?? fallbackJob;

  if (!job) {
    return null;
  }

  return {
    ...job,
    progressPercent: progressPercent(job),
    updatedAtLabel: formatKoreanDateTime(job.updatedAt ?? recent?.time)
  };
});

onMounted(async () => {
  await Promise.all([
    basketStore.loadJobs(),
    dashboardStore.loadSummary(),
    studyStore.loadMyStudies()
  ]);

  try {
    activities.value = await dashboardApi.getActivities() || [];
  } catch {
    activities.value = [];
  }
});

function progressPercent(job) {
  const raw = job.progressPercent ?? job.draftProgressPercent ?? job.completionPercent;
  const parsed = Number(raw);
  if (Number.isFinite(parsed)) {
    return Math.max(0, Math.min(100, Math.round(parsed)));
  }
  if (job.status === 'COMPLETED' || job.status === 'SUBMITTED') return 100;
  if (job.status === 'IN_PROGRESS') return 33;
  return 0;
}

function formatKoreanDateTime(dateStr) {
  if (!dateStr) return '최근 기록 없음';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}.${month}.${day} ${hours}:${minutes}`;
}

function displayStatusLabel(status, fallback) {
  return {
    NOT_STARTED: '지원 전',
    READY: '지원 전',
    IN_PROGRESS: '진행 중',
    SUBMITTED: '제출 완료',
    COMPLETED: '제출 완료',
    NOT_APPLIED: '미지원'
  }[status] ?? fallback ?? '미지원';
}

function toFeaturedStudy(study) {
  return {
    id: study.id,
    name: study.name || '이름 없는 스터디',
    stats: studyStats(study)
  };
}

function studyStats(study) {
  const stats = [];
  const memberCount = toPositiveInteger(study.memberCount ?? study.members?.length);
  const sharedEssayCount = toPositiveInteger(study.sharedEssayCount ?? study.essayCount);
  const sharedJobCount = toPositiveInteger(study.sharedJobCount ?? study.recommendedJobCount ?? study.jobCount);
  const unreadFeedbackCount = toPositiveInteger(study.unreadFeedbackCount ?? study.feedbackCount);

  if (memberCount > 0) stats.push(`멤버 ${memberCount}명`);
  if (sharedEssayCount > 0) stats.push(`공유 자소서 ${sharedEssayCount}개`);
  if (sharedJobCount > 0) stats.push(`추천 공고 ${sharedJobCount}개`);
  if (unreadFeedbackCount > 0) stats.push(`새 피드백 ${unreadFeedbackCount}개`);

  return stats.length > 0 ? stats : ['최근 활동 없음'];
}

function toPositiveInteger(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

function draftStateLabel(job) {
  const percent = progressPercent(job);
  if (percent >= 100) return '제출 완료';
  if (percent > 0) return `${percent}% 작성 중`;
  return '초안 없음';
}

function handleLogoError(id) {
  failedLogos.value = new Set([...failedLogos.value, id]);
}

function isPriorityJob(job) {
  return basketStore.priorityJobIds.has(job.id) || job.priority === true;
}

function togglePriority(jobId) {
  basketStore.togglePriority(jobId);
}

function toggleStatusMenu(jobId) {
  openStatusJobId.value = openStatusJobId.value === jobId ? null : jobId;
}

function changeStatus(jobId, nextStatus) {
  openStatusJobId.value = null;
  void basketStore.updateStatus(jobId, nextStatus);
}

async function archiveJob(id) {
  const job = safeJobs.value.find((item) => item.id === id);
  const label = job ? `${job.companyName} ${job.positionTitle}` : '선택한';
  if (!window.confirm(`${label} 공고를 삭제하시겠습니까?`)) return;
  await basketStore.archiveJob(id);
  await dashboardStore.loadSummary();
}
</script>

<style scoped>
.main-dashboard-page {
  display: grid;
  gap: 14px;
}

.main-hero,
.main-panel {
  border: 1px solid #e7ddff;
  border-radius: 16px;
  background: #ffffff;
  box-shadow:
    0 18px 46px rgba(49, 46, 129, 0.07),
    0 6px 16px rgba(79, 70, 229, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.86);
}

.main-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(170px, max-content) minmax(150px, 210px);
  align-items: center;
  gap: clamp(14px, 2.2vw, 28px);
  min-height: 196px;
  overflow: hidden;
  background: #ffffff;
  padding: clamp(16px, 2.2vw, 22px) clamp(18px, 2.8vw, 28px);
}

.main-hero-copy {
  display: grid;
  align-content: center;
  gap: 10px;
  min-width: 0;
}

.main-hero h1 {
  margin: 0;
  color: #111827;
  font-size: clamp(1.55rem, 2.05vw, 1.95rem);
  font-weight: 800;
  letter-spacing: 0;
  line-height: 1.2;
}

.main-hero p {
  margin: 0;
  color: #475569;
  font-size: 0.82rem;
  font-weight: 600;
}

.main-metric-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0;
  margin-top: 6px;
}

.main-metric-toolbar > span {
  color: #64748b;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0;
}

.main-metric-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: clamp(10px, 1.1vw, 14px);
  margin-top: 0;
  border: 0;
  box-shadow: none;
  background: transparent;
  padding: 0;
  outline: 0;
}

.main-metric-card {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  min-height: 76px;
  border: 0;
  border-radius: 14px;
  background: #ffffff;
  box-shadow:
    0 12px 24px rgba(30, 41, 59, 0.055),
    0 3px 8px rgba(79, 70, 229, 0.035),
    inset 0 1px 0 rgba(255, 255, 255, 0.95);
  padding: 11px 13px;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.main-metric-card:hover {
  transform: translateY(-4px);
  box-shadow:
    0 18px 34px rgba(30, 41, 59, 0.09),
    0 8px 16px rgba(79, 70, 229, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.96);
}

.main-metric-icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  aspect-ratio: 1;
  flex: 0 0 auto;
}

.main-metric-icon svg {
  display: block;
  width: 21px;
  height: 21px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2.15;
}

.section-icon,
.hero-basket-icon {
  display: grid;
  place-items: center;
  flex: 0 0 auto;
}

.section-icon svg,
.hero-basket-icon svg,
.priority-heart svg,
.delete-job-button svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2.2;
}

.tone-purple .main-metric-icon {
  background: #f1ecff;
  color: #5a35f0;
}

.tone-green .main-metric-icon {
  background: #eaf8ef;
  color: #16a34a;
}

.tone-blue .main-metric-icon {
  background: #eaf2ff;
  color: #2563eb;
}

.tone-orange .main-metric-icon {
  background: #fff1e8;
  color: #f04b23;
}

.main-metric-copy {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.main-metric-copy span {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  color: #111827;
  font-size: 0.78rem;
  font-weight: 800;
  line-height: 1.15;
  white-space: nowrap;
}

.main-metric-copy strong {
  display: block;
  color: #25206b;
  font-size: clamp(1.38rem, 1.8vw, 1.68rem);
  font-weight: 700;
  line-height: 0.95;
  letter-spacing: 0;
  white-space: nowrap;
}

.metric-helper {
  color: #61708a;
  font-size: 0.68rem;
  font-weight: 650;
  line-height: 1.25;
  overflow: visible;
  text-overflow: clip;
  white-space: normal;
  word-break: keep-all;
}

.hero-basket-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  white-space: nowrap;
}

.hero-basket-icon {
  width: 16px;
  height: 16px;
}

.hero-basket-icon svg {
  width: 16px;
  height: 16px;
}

.primary-gradient-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  border: 0;
  border-radius: 12px;
  background:
    linear-gradient(135deg, #6555ff 0%, #4734d3 100%);
  box-shadow:
    0 18px 34px rgba(79, 70, 229, 0.28),
    0 8px 16px rgba(55, 48, 163, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.24);
  color: #ffffff;
  font-size: 0.78rem;
  font-weight: 850;
  line-height: 1;
  padding: 0 16px;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.primary-gradient-action:hover {
  transform: translateY(-2px);
  box-shadow:
    0 24px 42px rgba(79, 70, 229, 0.34),
    0 10px 20px rgba(55, 48, 163, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.28);
}

.basket-outline-action {
  min-height: 30px;
  border: 0;
  border-radius: 10px;
  background: #5a35f0;
  box-shadow:
    0 12px 22px rgba(79, 70, 229, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
  color: #ffffff;
  font-size: 0.72rem;
  font-weight: 820;
  line-height: 1;
  padding: 0 11px;
  transition:
    background 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    color 0.18s ease,
    transform 0.18s ease;
}

.basket-outline-action:hover {
  transform: translateY(-1px);
  background: #4b2fd3;
  box-shadow:
    0 14px 26px rgba(79, 70, 229, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.hero-side-cta {
  align-self: end;
  justify-self: end;
  min-height: 34px;
  border-radius: 12px;
  font-size: 0.78rem;
  padding-inline: 15px;
  margin-bottom: 40px;
}

.hero-side-cta:hover {
  transform: translateY(-2px);
}

.primary-gradient-action:focus-visible,
.basket-outline-action:focus-visible,
.main-metric-card:focus-visible,
.active-detail-link:focus-visible,
.text-button:focus-visible,
.main-apply-link:focus-visible,
.priority-heart:focus-visible,
.delete-job-button:focus-visible,
.status-select:focus-visible,
.status-option:focus-visible,
.extension-install-action:focus-visible,
.extension-help-link:focus-visible {
  outline: 3px solid rgba(103, 76, 255, 0.36);
  outline-offset: 3px;
}

.action-arrow {
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 0.8;
  transform: translateY(-1px);
}

.main-hero-visual {
  display: grid;
  place-items: center;
  min-width: 0;
  height: 100%;
}

.main-hero-visual img {
  display: block;
  width: min(100%, 142px);
  max-height: 138px;
  object-fit: contain;
  filter: drop-shadow(0 14px 16px rgba(15, 23, 42, 0.08));
}

.hero-face-character {
  transform-origin: center;
}

.main-extension-cta {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  padding: 15px 18px;
  background:
    linear-gradient(135deg, #ffffff 0%, #f7f4ff 56%, #f8fbff 100%);
}

.main-extension-cta-copy {
  display: grid;
  gap: 5px;
  min-width: 0;
}

.main-extension-eyebrow {
  color: #5a35f0;
  font-size: 0.72rem;
  font-weight: 850;
  letter-spacing: 0;
}

.main-extension-cta h2 {
  margin: 0;
  color: #111827;
  font-size: 1rem;
  font-weight: 850;
  line-height: 1.25;
}

.main-extension-cta p,
.main-extension-cta small {
  margin: 0;
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.45;
  word-break: keep-all;
}

.main-extension-cta small {
  color: #8a5b14;
}

.main-extension-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 9px;
}

.extension-install-action {
  white-space: normal;
}

.extension-help-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  border: 1px solid #d9def0;
  border-radius: 10px;
  color: #334155;
  font-size: 0.78rem;
  font-weight: 820;
  line-height: 1.2;
  padding: 0 13px;
  text-decoration: none;
  white-space: nowrap;
}

.extension-help-link:hover {
  border-color: #b8c0d4;
  background: #ffffff;
}

.main-content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(300px, 0.75fr);
  align-items: start;
  gap: 14px;
}

.main-left-column {
  display: contents;
}

.main-panel {
  min-width: 0;
  padding: 16px;
}

.active-application-panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  grid-column: 1 / 2;
  grid-row: 1;
  align-self: stretch;
  align-content: stretch;
  gap: 12px;
  padding-bottom: 14px;
}

.main-section-heading,
.main-heading-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.main-section-heading {
  justify-content: space-between;
}

.main-section-heading h2,
.main-heading-title h2 {
  margin: 0;
  color: #111827;
  font-size: 1rem;
  font-weight: 850;
}

.section-icon {
  width: 24px;
  height: 24px;
  border-radius: 8px;
}

.document-icon,
.study-icon {
  background: #f1ecff;
  color: #5a35f0;
}

.active-application-card {
  display: grid;
  grid-template-columns: 60px minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  height: 100%;
  min-height: 150px;
  border: 1px solid #edf0f6;
  border-radius: 12px;
  background: #ffffff;
  padding: 14px;
}

.active-company-mark,
.company-logo-badge {
  display: grid;
  place-items: center;
  overflow: hidden;
  background: #f7f8fc;
  color: #5a35f0;
  font-weight: 950;
}

.active-company-mark {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  font-size: 1.1rem;
}

.active-company-mark img,
.company-logo-badge img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.active-application-body {
  display: grid;
  min-width: 0;
  gap: 10px;
}

.active-application-body h3 {
  margin: 0;
  color: #111827;
  font-size: 0.98rem;
  font-weight: 850;
  line-height: 1.4;
}

.active-application-meta {
  display: grid;
  grid-template-columns: minmax(120px, 0.85fr) minmax(170px, 1.2fr) minmax(78px, 0.55fr);
  gap: 12px;
}

.active-application-meta span {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.active-application-meta small {
  color: #768197;
  font-size: 0.7rem;
  font-weight: 750;
}

.active-application-meta strong {
  color: #111827;
  font-size: 0.82rem;
  font-weight: 820;
  line-height: 1.35;
}

.inline-dday {
  color: #4f25e8;
  font-style: normal;
  margin-right: 6px;
}

.active-progress-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: center;
}

.active-progress-track {
  height: 7px;
  overflow: hidden;
  border-radius: 999px;
  background: #edf0f6;
}

.active-progress-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #5a35f0;
}

.active-detail-link,
.study-card a,
.main-apply-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  border-radius: 8px;
  font-weight: 820;
  white-space: nowrap;
}

.active-detail-link {
  border: 1px solid #b8c0d4;
  color: #334155;
  padding: 0 14px;
}

.basket-list-block {
  display: grid;
  gap: 8px;
}

.basket-panel {
  grid-column: 1 / -1;
  grid-row: 2;
  min-height: 0;
  background:
    linear-gradient(180deg, #ffffff 0%, #fbfcff 100%);
}

.compact-basket-panel {
  padding: 12px 16px 10px;
}

.basket-section-heading {
  min-height: 32px;
  align-items: center;
  padding: 0 2px;
}

.basket-section-heading h2 {
  line-height: 1.2;
}

.basket-section-heading .text-button {
  min-height: 30px;
  border-radius: 8px;
  padding: 0 12px;
}

.main-basket-table {
  display: grid;
  overflow: visible;
}

.main-basket-head,
.main-basket-row {
  display: grid;
  grid-template-columns:
    44px
    minmax(180px, 0.95fr)
    minmax(260px, 1.55fr)
    minmax(132px, 0.62fr)
    minmax(238px, 1fr)
    minmax(108px, 0.5fr)
    38px;
  align-items: center;
  column-gap: 14px;
  min-width: 0;
}

.main-basket-head {
  min-height: 34px;
  border-bottom: 1px solid #edf0f6;
  color: #596985;
  font-size: 0.72rem;
  font-weight: 850;
}

.main-basket-head span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.interest-head-cell {
  justify-self: center;
  text-align: center;
}

.text-start-cell {
  justify-self: stretch;
  text-align: left;
}

.center-cell {
  justify-self: stretch;
  text-align: center;
}

.deadline-align-cell {
  justify-self: stretch;
  text-align: center;
}

.main-basket-row {
  min-height: 54px;
  border-bottom: 1px solid #f0f2f7;
  color: #334155;
  font-size: 0.78rem;
}

.main-basket-row:hover {
  background:
    linear-gradient(90deg, rgba(246, 242, 255, 0.75), rgba(255, 255, 255, 0));
}

.priority-heart,
.delete-job-button {
  display: grid;
  place-items: center;
  justify-self: center;
  align-self: center;
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #64748b;
  cursor: pointer;
}

.priority-heart svg {
  fill: none;
}

.priority-heart.active {
  background: transparent;
  color: #ef4444;
}

.priority-heart.active svg {
  fill: currentColor;
}

.priority-heart:hover {
  background: #f8fafc;
}

.priority-heart.active:hover {
  background: transparent;
  color: #dc2626;
}

.company-cell {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.company-logo-badge {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  font-size: 0.72rem;
}

.company-cell strong,
.main-basket-position {
  min-width: 0;
  overflow: hidden;
  color: #111827;
  font-weight: 820;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.draft-state-pill,
.status-tag,
.deadline-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 820;
  padding: 0 9px;
  white-space: nowrap;
}

.draft-state-pill {
  background: #eef6ff;
  color: #2563eb;
}

.draft-state-pill.complete {
  background: #eaf8ef;
  color: #16a34a;
}

.status-menu {
  position: relative;
  display: inline-flex;
  justify-content: center;
  min-width: 0;
  width: 100%;
  z-index: 2;
}

.status-menu-row-open {
  z-index: 120;
}

.status-select {
  border: 0;
  cursor: pointer;
}

.status-option-list {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 130;
  display: grid;
  gap: 6px;
  min-width: 118px;
  border: 1px solid #dbe2ee;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.14);
  padding: 8px;
}

.status-option {
  border: 0;
  cursor: pointer;
}

.deadline-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 0;
  width: 100%;
}

.deadline-cell strong {
  overflow: hidden;
  color: #334155;
  font-size: 0.76rem;
  font-weight: 780;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.deadline-pill {
  background: #eef2ff;
  color: #4f25e8;
}

.deadline-pill.urgent {
  background: #fff1f2;
  color: #dc2626;
}

.main-apply-link {
  border: 1px solid #e1e6f0;
  color: #334155;
  font-size: 0.72rem;
  justify-self: center;
  padding: 0 10px;
  width: fit-content;
}

.delete-job-button {
  grid-column: auto;
  grid-row: auto;
  justify-self: center;
  color: #94a3b8;
}

.study-panel {
  display: grid;
  grid-template-rows: auto repeat(2, minmax(0, 1fr));
  grid-column: 2 / 3;
  grid-row: 1;
  gap: 12px;
  align-content: stretch;
  background:
    linear-gradient(145deg, #ffffff 0%, #fbfaff 48%, #f7fbff 100%);
}

.study-panel-heading {
  justify-content: space-between;
}

.study-panel-title {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.study-more-link {
  color: #5a35f0;
  font-size: 0.76rem;
  font-weight: 820;
  text-decoration: none;
  white-space: nowrap;
}

.study-more-link:hover {
  text-decoration: underline;
}

.study-card {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  height: 100%;
  min-height: 86px;
  border: 1px solid #edf0f6;
  border-radius: 12px;
  background:
    linear-gradient(180deg, #ffffff 0%, #fbfcff 100%);
  box-shadow:
    0 14px 32px rgba(15, 23, 42, 0.055),
    inset 0 1px 0 rgba(255, 255, 255, 0.92);
  padding: 14px;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease;
  overflow: hidden;
}

.study-card::before {
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: 5px;
  background: #6d4aff;
  opacity: 0.82;
}

.study-card:nth-of-type(2n)::before {
  background: #6d4aff;
}

.study-card:hover {
  transform: translateY(-3px);
  border-color: rgba(199, 188, 255, 0.82);
  box-shadow:
    0 22px 42px rgba(30, 41, 59, 0.09),
    0 12px 22px rgba(79, 70, 229, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.96);
}

.study-card strong {
  display: block;
  margin-bottom: 9px;
  color: #111827;
  font-size: 0.98rem;
  font-weight: 850;
  line-height: 1.25;
}

.study-empty-card {
  display: grid;
  align-content: center;
  gap: 6px;
  min-height: 86px;
  border: 1px dashed #dbe2ee;
  border-radius: 12px;
  background: #f8fafc;
  padding: 16px;
}

.study-empty-card strong {
  color: #111827;
  font-size: 0.9rem;
  font-weight: 850;
  line-height: 1.3;
}

.study-empty-card p {
  margin: 0;
  color: #64748b;
  font-size: 0.76rem;
  font-weight: 700;
  line-height: 1.45;
}

.study-tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  min-width: 0;
}

.study-stat-tag {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  border: 1px solid rgba(103, 76, 255, 0.13);
  border-radius: 999px;
  background:
    linear-gradient(180deg, rgba(246, 242, 255, 0.95), rgba(239, 246, 255, 0.88));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.82),
    0 6px 12px rgba(79, 70, 229, 0.06);
  color: #5438e8;
  font-size: 0.72rem;
  font-weight: 820;
  line-height: 1.2;
  padding: 0 9px;
  white-space: nowrap;
}

.study-stat-tag:nth-child(1) {
  border-color: rgba(109, 74, 255, 0.22);
  background: #f3f0ff;
  color: #5638d8;
}

.study-stat-tag:nth-child(2) {
  border-color: rgba(34, 197, 94, 0.2);
  background: #ecfdf5;
  color: #15803d;
}

.study-stat-tag:nth-child(3) {
  border-color: rgba(14, 165, 233, 0.2);
  background: #eff6ff;
  color: #2563eb;
}

.study-stat-tag:nth-child(4) {
  border-color: rgba(245, 158, 11, 0.22);
  background: #fffbeb;
  color: #b45309;
}

.study-card a {
  padding: 0;
}

.study-card .compact-action {
  width: 46px;
  min-width: 46px;
  height: 46px;
  min-height: 46px;
  border-radius: 12px;
  padding: 0;
}

.honey-panel {
  position: relative;
  padding: 0;
  overflow: hidden;
  background: linear-gradient(180deg, #ffffff 0%, #fffdfb 100%);
}

.honey-panel :deep(.honey-pot-graph-container) {
  position: relative;
  z-index: 1;
  margin: 0;
  border-radius: 18px;
  box-shadow: none;
  background: transparent;
}

.basket-refreshing {
  margin: 0 0 8px;
  color: #64748b;
  font-size: 0.76rem;
  font-weight: 750;
}

@media (max-width: 1080px) {
  .main-hero,
  .main-extension-cta,
  .main-content-grid {
    grid-template-columns: 1fr;
  }

  .main-extension-actions {
    justify-content: flex-start;
  }

  .active-application-panel,
  .study-panel,
  .basket-panel {
    grid-column: 1 / -1;
    grid-row: auto;
  }

  .main-hero-visual img {
    width: min(38vw, 128px);
    max-height: 128px;
  }
}

@media (max-width: 760px) {
  .main-hero {
    padding: 16px;
  }

  .main-metric-toolbar {
    align-items: flex-start;
  }

  .hero-side-cta {
    justify-self: start;
    width: fit-content;
    margin-bottom: 0;
    transform: none;
  }

  .hero-side-cta:hover {
    transform: translateY(-2px);
  }

  .main-extension-cta {
    padding: 15px;
  }

  .main-extension-actions {
    align-items: stretch;
  }

  .extension-install-action,
  .extension-help-link {
    width: 100%;
  }

  .main-metric-strip {
    grid-template-columns: 1fr;
  }

  .main-hero-visual img {
    width: min(44vw, 112px);
    max-height: 112px;
  }

  .active-application-card,
  .active-application-meta {
    grid-template-columns: 1fr;
  }

  .active-detail-link {
    justify-self: start;
  }

  .main-basket-head {
    display: none;
  }

  .main-basket-row {
    grid-template-columns: 36px minmax(0, 1fr) 34px;
    gap: 10px;
    min-height: auto;
    border: 1px solid #edf0f6;
    border-radius: 12px;
    margin-bottom: 10px;
    padding: 10px;
  }

  .main-basket-position,
  .status-menu,
  .deadline-cell,
  .main-apply-link {
    grid-column: 2 / 3;
  }

  .delete-job-button {
    grid-column: 3 / 4;
    grid-row: 1 / 2;
  }

}
</style>
