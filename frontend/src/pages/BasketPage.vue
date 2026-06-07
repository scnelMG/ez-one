<template>
  <AppLayout>
    <section class="basket-page">
      <header class="basket-hero">
        <div>
          <p class="section-kicker">공고 관리</p>
          <h1>공고 장바구니</h1>
          <p>담아둔 공고의 마감 일정과 지원 상태를 한 화면에서 확인하고 바로 워크스페이스로 이동합니다.</p>
        </div>
        <RouterLink class="primary-button" to="/recommendations">추천 공고 보기</RouterLink>
      </header>

      <section class="basket-metrics" aria-label="장바구니 요약">
        <div data-testid="metric-all">
          <span>전체 공고</span>
          <strong>{{ basketStore.jobs.length }}</strong>
        </div>
        <div data-testid="metric-progress">
          <span>진행 중</span>
          <strong>{{ statusCounts.IN_PROGRESS }}</strong>
        </div>
        <div data-testid="metric-not-started">
          <span>지원 전</span>
          <strong>{{ statusCounts.NOT_STARTED }}</strong>
        </div>
        <div data-testid="metric-deadline">
          <span>마감 임박</span>
          <strong>{{ basketStore.deadlineSoonCount }}</strong>
        </div>
      </section>

      <section class="deadline-panel basket-calendar-panel" data-testid="basket-calendar" aria-label="공고 캘린더">
        <div class="section-heading">
          <div>
            <p class="section-kicker">마감 일정</p>
            <h2>공고 캘린더</h2>
          </div>
          <span>{{ calendarMonthLabel }}</span>
        </div>

        <div class="deadline-calendar job-calendar" :aria-label="`${calendarMonthLabel} 공고 캘린더`">
          <span v-for="weekday in weekdays" :key="weekday" class="weekday">{{ weekday }}</span>
          <div v-for="offset in firstDayOffset" :key="`offset-${offset}`" aria-hidden="true"></div>
          <div v-for="day in monthDays" :key="day" class="deadline-day job-calendar-day">
            <span>{{ day }}</span>
            <RouterLink
              v-for="job in jobsByDay[day] ?? []"
              :key="job.id"
              class="calendar-job-card"
              data-testid="calendar-job"
              :to="`/workspaces/${job.workspaceId}`"
            >
              <strong>{{ job.companyName }}</strong>
              <small>{{ job.positionTitle }}</small>
              <em>{{ job.statusLabel }}</em>
            </RouterLink>
          </div>
        </div>
      </section>

      <section class="basket-list-panel" data-testid="basket-list-panel" aria-label="저장한 공고 목록">
        <div class="basket-title-row">
          <div>
            <p class="section-kicker">저장한 공고</p>
            <h2>공고 장바구니</h2>
          </div>
          <div class="basket-tools" aria-label="장바구니 정렬">
            <RouterLink
              class="ghost-button small"
              data-testid="basket-sort-deadline"
              :class="{ active: selectedSort === 'deadline' }"
              :to="queryLink({ sort: 'deadline' })"
            >
              마감일순
            </RouterLink>
            <RouterLink
              class="ghost-button small"
              data-testid="basket-sort-saved"
              :class="{ active: selectedSort === 'saved' }"
              :to="queryLink({ sort: 'saved' })"
            >
              담은 순
            </RouterLink>
          </div>
        </div>

        <div class="filter-bar compact" aria-label="지원 상태 필터">
          <RouterLink
            v-for="filter in statusFilters"
            :key="filter.label"
            :data-testid="`basket-filter-${filter.value ?? 'ALL'}`"
            class="filter-chip"
            :class="{ active: selectedStatus === filter.value && !isOverdueFilter }"
            :to="queryLink({ status: filter.value, overdue: undefined })"
          >
            {{ filter.label }}
          </RouterLink>
          <RouterLink
            class="filter-chip"
            :class="{ active: isOverdueFilter }"
            data-testid="basket-filter-overdue"
            :to="queryLink({ overdue: 'true', status: undefined })"
          >
            기한 지남
          </RouterLink>
          <input
            v-model="searchQuery"
            class="search-field"
            data-testid="basket-search"
            type="search"
            aria-label="회사명 또는 직무명 검색"
            placeholder="회사명 또는 직무명 검색"
          />
        </div>

        <p v-if="basketStore.status === 'loading'" class="basket-loading">공고 목록을 불러오는 중입니다.</p>
        <StatePanel
          v-else-if="basketStore.status === 'error'"
          id="basket-error"
          tone="navy"
          title="공고 목록 처리 실패"
          :body="basketStore.errorMessage"
        />
        <div v-else class="basket-data-table">
          <div class="basket-data-head">
            <span>회사명</span>
            <span>직무</span>
            <span>상태</span>
            <span>마감일</span>
            <span>채용 사이트 링크</span>
            <span>관리</span>
          </div>

          <article v-for="job in pagedJobs" :key="job.id" class="basket-data-row" data-testid="basket-job-row">
            <RouterLink class="job-main-link company-cell" :to="`/workspaces/${job.workspaceId}`">
              <span class="company-logo-badge" aria-hidden="true">
                <img
                  v-if="job.companyLogoUrl"
                  :src="job.companyLogoUrl"
                  :alt="`${job.companyName} logo`"
                  @error="job.companyLogoUrl = null"
                />
                <span v-else>{{ companyInitial(job.companyName) }}</span>
              </span>
              <strong data-testid="basket-row-company">{{ job.companyName }}</strong>
              <span v-if="isRecentWorkspace(job.workspaceId)" class="recent-visit-badge">최근 방문</span>
            </RouterLink>
            <RouterLink class="job-main-link" :to="`/workspaces/${job.workspaceId}`">
              {{ job.positionTitle }}
            </RouterLink>
            <select
              class="status-select"
              :value="job.status"
              :aria-label="`${job.companyName} ${job.positionTitle} 지원 상태 변경`"
              :data-testid="`status-${job.id}`"
              @change="changeStatus(job.id, $event.target.value)"
            >
              <option value="NOT_STARTED">지원 전</option>
              <option value="NOT_APPLIED">미지원</option>
              <option value="IN_PROGRESS">진행 중</option>
              <option value="SUBMITTED">지원완료</option>
            </select>
            <RouterLink class="job-main-link" :to="`/workspaces/${job.workspaceId}`">
              <span class="deadline-pill" :class="{ urgent: job.deadlineSoon }">{{ job.deadlineLabel }}</span>
            </RouterLink>
            <a class="source-link" :href="job.sourceUrl" target="_blank" rel="noreferrer">원문</a>
            <div class="row-actions">
              <RouterLink class="text-button" :to="`/basket/${job.id}`">상세</RouterLink>
              <button
                class="text-button danger"
                type="button"
                :data-testid="`archive-${job.id}`"
                @click="archiveJob(job.id)"
              >
                보관
              </button>
            </div>
          </article>

          <form class="basket-data-row inline-create-row" data-testid="inline-create-row" @submit.prevent="createManualJob">
            <input
              v-model="manualForm.companyName"
              data-testid="inline-company"
              name="companyName"
              autocomplete="organization"
              placeholder="+ 회사명"
              required
            />
            <input
              v-model="manualForm.positionTitle"
              data-testid="inline-position"
              name="positionTitle"
              autocomplete="organization-title"
              placeholder="직무명"
              required
            />
            <span class="inline-placeholder">지원 전</span>
            <input
              v-model="manualForm.deadlineLabel"
              data-testid="inline-deadline"
              name="deadline"
              inputmode="numeric"
              autocomplete="off"
              placeholder="2026.06.30"
            />
            <input
              v-model="manualForm.sourceUrl"
              data-testid="inline-source"
              name="sourceUrl"
              type="url"
              inputmode="url"
              autocomplete="off"
              placeholder="https://example.com/jobs/123"
              required
            />
            <button class="text-button" type="submit">추가</button>
          </form>

          <div v-if="totalPages > 1" class="pagination-row" aria-label="장바구니 페이지 이동">
            <button
              class="ghost-button small"
              type="button"
              data-testid="basket-page-prev"
              :disabled="currentPage === 1"
              @click="currentPage -= 1"
            >
              이전
            </button>
            <span data-testid="basket-page-status">{{ currentPage }} / {{ totalPages }}</span>
            <button
              class="ghost-button small"
              type="button"
              data-testid="basket-page-next"
              :disabled="currentPage === totalPages"
              @click="currentPage += 1"
            >
              다음
            </button>
          </div>
        </div>
        <p
          v-if="basketStore.status !== 'loading' && basketStore.status !== 'error'"
          class="trademark-disclaimer"
          data-testid="basket-trademark-disclaimer"
        >
          표시된 회사명 및 로고는 채용공고 식별 목적으로만 사용되며, 각 상표는 해당 소유자의 자산입니다. EZ-ONE은 표시된 기업과 제휴 또는 후원을 의미하지 않습니다.
        </p>
      </section>
    </section>
  </AppLayout>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import AppLayout from '@/shared/AppLayout.vue';
import StatePanel from '@/shared/StatePanel.vue';
import { isRecentWorkspace } from '@/features/basket/recentWorkspaces';
import { useBasketStore } from '@/stores/basketStore';

const route = useRoute();
const basketStore = useBasketStore();
const searchQuery = ref(String(route.query.q ?? ''));
const currentPage = ref(1);
const pageSize = 10;
const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
const currentMonthDate = new Date();
const monthDays = Array.from(
    { length: new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 0).getDate() },
    (_, index) => index + 1
);
const firstDayOffset = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), 1).getDay();
const calendarMonthLabel = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long'
}).format(currentMonthDate);
const manualForm = reactive({
    companyName: '',
    positionTitle: '',
    deadlineLabel: '',
    sourceUrl: ''
});
const statusFilters = [
    { label: '전체', value: undefined },
    { label: '지원 전', value: 'NOT_STARTED' },
    { label: '미지원', value: 'NOT_APPLIED' },
    { label: '진행 중', value: 'IN_PROGRESS' },
    { label: '지원완료', value: 'SUBMITTED' }
];

const selectedSort = computed(() => route.query.sort === 'saved' ? 'saved' : 'deadline');
const selectedStatus = computed(() => {
    const status = route.query.status;
    return status === 'NOT_STARTED' || status === 'NOT_APPLIED' || status === 'IN_PROGRESS' || status === 'SUBMITTED'
        ? status
        : undefined;
});
const isOverdueFilter = computed(() => route.query.overdue === 'true');
const searchedJobs = computed(() => {
    const keyword = searchQuery.value.trim().toLowerCase();
    const sourceJobs = isOverdueFilter.value ? basketStore.jobs.filter(isOverdueJob) : basketStore.jobs;
    if (!keyword) {
        return sourceJobs;
    }
    return sourceJobs.filter((job) => (job.companyName.toLowerCase().includes(keyword) ||
        job.positionTitle.toLowerCase().includes(keyword)));
});
const sortedJobs = computed(() => [...searchedJobs.value].sort((left, right) => {
    if (selectedSort.value === 'deadline') {
        const deadlineDifference = deadlineRank(left) - deadlineRank(right);
        return deadlineDifference === 0 ? savedRank(left) - savedRank(right) : deadlineDifference;
    }
    return savedRank(left) - savedRank(right);
}));
const totalPages = computed(() => Math.max(1, Math.ceil(sortedJobs.value.length / pageSize)));
const pagedJobs = computed(() => {
    const start = (currentPage.value - 1) * pageSize;
    return sortedJobs.value.slice(start, start + pageSize);
});
const statusCounts = computed(() => ({
    NOT_STARTED: basketStore.jobs.filter((job) => job.status === 'NOT_STARTED').length,
    NOT_APPLIED: basketStore.jobs.filter((job) => job.status === 'NOT_APPLIED').length,
    IN_PROGRESS: basketStore.jobs.filter((job) => job.status === 'IN_PROGRESS').length,
    SUBMITTED: basketStore.jobs.filter((job) => job.status === 'SUBMITTED').length
}));
const jobsByDay = computed(() => {
    return [...basketStore.jobs]
        .sort((left, right) => deadlineRank(left) - deadlineRank(right))
        .reduce((groups, job) => {
            const day = deadlineDay(job);
            if (!groups[day]) {
                groups[day] = [];
            }
            groups[day].push(job);
            return groups;
        }, {});
});

function queryLink(nextQuery) {
    const query = {
        ...route.query,
        ...nextQuery
    };
    Object.keys(query).forEach((key) => {
        if (query[key] === undefined || query[key] === null || query[key] === '') {
            delete query[key];
        }
    });
    const params = new URLSearchParams(query);
    const queryString = params.toString();
    return queryString ? `/basket?${queryString}` : '/basket';
}
function deadlineDay(job) {
    const date = parseDeadlineDate(job);
    return date && date.getMonth() === currentMonthDate.getMonth() ? date.getDate() : 99;
}
function deadlineRank(job) {
    const date = parseDeadlineDate(job);
    if (date) {
        return date.getTime();
    }
    const source = job.deadlineDate ?? job.deadlineLabel ?? '';
    const dDay = source.match(/D-(\d+)/i);
    return dDay ? Number(dDay[1]) : Number.MAX_SAFE_INTEGER;
}
function savedRank(job) {
    const rank = Number(job.id);
    return Number.isFinite(rank) ? rank : Number.MAX_SAFE_INTEGER;
}
function isOverdueJob(job) {
    const date = parseDeadlineDate(job);
    return date !== null && date < startOfToday();
}
function parseDeadlineDate(job) {
    const source = job.deadlineDate ?? job.deadlineLabel ?? '';
    const match = source.match(/(20\d{2})[-.](\d{1,2})[-.](\d{1,2})/);
    if (!match) {
        return null;
    }
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}
function startOfToday() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
async function createManualJob() {
    await basketStore.createJob({
        companyName: manualForm.companyName,
        positionTitle: manualForm.positionTitle,
        deadlineLabel: manualForm.deadlineLabel,
        sourceUrl: manualForm.sourceUrl,
        savedSource: 'MANUAL'
    });
    manualForm.companyName = '';
    manualForm.positionTitle = '';
    manualForm.deadlineLabel = '';
    manualForm.sourceUrl = '';
}
function changeStatus(jobId, nextStatus) {
    void basketStore.updateStatus(jobId, nextStatus);
}
function companyInitial(companyName) {
    return (companyName ?? '?').trim().charAt(0).toUpperCase() || '?';
}
function archiveJob(jobId) {
    const job = basketStore.jobs.find((basketJob) => basketJob.id === jobId);
    const label = job ? `${job.companyName} ${job.positionTitle}` : '이 공고';
    if (!window.confirm(`${label}를 보관하시겠습니까? 보관한 공고는 목록에서 숨겨집니다.`)) {
        return;
    }
    void basketStore.archiveJob(jobId);
}

onMounted(() => {
    void basketStore.loadJobs(selectedStatus.value);
});
watch(selectedStatus, (nextStatus) => {
    currentPage.value = 1;
    void basketStore.loadJobs(nextStatus);
});
watch(() => route.query.q, (nextQuery) => {
    currentPage.value = 1;
    searchQuery.value = String(nextQuery ?? '');
});
watch([searchQuery, isOverdueFilter, selectedSort, sortedJobs], () => {
    currentPage.value = 1;
});
watch(totalPages, (nextTotalPages) => {
    if (currentPage.value > nextTotalPages) {
        currentPage.value = nextTotalPages;
    }
});
</script>
