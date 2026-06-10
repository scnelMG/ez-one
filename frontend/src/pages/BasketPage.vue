<template>
  <AppLayout>
    <section class="basket-page">
      <header class="basket-hero">
        <div>
          <h1>공고 장바구니</h1>
          <p>담아둔 공고의 마감일과 지원 상태를 한 화면에서 확인하고 바로 워크스페이스로 이동합니다.</p>
        </div>
      </header>

      <section class="basket-metrics" aria-label="장바구니 요약">
        <div data-testid="metric-all">
          <span>전체 공고</span>
          <strong>{{ basketStore.jobs.length }}</strong>
        </div>
        <div data-testid="metric-not-started">
          <span>지원 전</span>
          <strong>{{ statusCounts.NOT_STARTED }}</strong>
        </div>
        <div data-testid="metric-progress">
          <span>진행 중</span>
          <strong>{{ statusCounts.IN_PROGRESS }}</strong>
        </div>
        <div data-testid="metric-deadline">
          <span>마감 임박</span>
          <strong>{{ basketStore.deadlineSoonCount }}</strong>
        </div>
      </section>

      <section class="basket-list-panel" data-testid="basket-list-panel" aria-label="저장한 공고 목록">
        <div class="basket-title-row">
          <div>
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
            :class="{ active: selectedStatus === filter.value && !isPriorityFilter }"
            :to="queryLink({ status: filter.value, priority: undefined })"
          >
            {{ filter.label }}
          </RouterLink>
          <RouterLink
            class="filter-chip"
            :class="{ active: isPriorityFilter }"
            data-testid="basket-filter-priority"
            :to="queryLink({ priority: 'true', status: undefined })"
          >
            중요
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

        <SkeletonLoader v-if="basketStore.status === 'loading' && !basketStore.hasJobs" :lines="5" label="공고 목록을 불러오는 중" />
        <StatePanel
          v-else-if="basketStore.status === 'error' && !basketStore.hasJobs"
          id="basket-error"
          tone="navy"
          title="공고 목록 처리 실패"
          :body="basketStore.errorMessage"
        />
        <div v-else class="basket-data-table">
          <p v-if="basketStore.status === 'loading'" class="basket-refreshing" data-testid="basket-refreshing">
            공고 목록을 갱신하는 중입니다.
          </p>
          <p v-else-if="basketStore.status === 'error'" class="basket-inline-error" role="alert">
            {{ basketStore.errorMessage }}
          </p>
          <div class="basket-data-head">
            <span>중요</span>
            <span>회사명</span>
            <span>직무</span>
            <span>상태</span>
            <span>마감일</span>
            <span>채용 사이트 링크</span>
            <span>최근 작업</span>
            <span aria-label="삭제"></span>
          </div>

          <article v-for="job in pagedJobs" :key="job.id" class="basket-data-row" data-testid="basket-job-row">
            <button
              class="priority-heart"
              type="button"
              :class="{ active: isPriorityJob(job) }"
              :aria-label="`${job.companyName} 중요 공고 표시`"
              :data-testid="`priority-${job.id}`"
              @click="togglePriority(job.id)"
            >
              <svg class="icon-heart" viewBox="0 0 24 24" width="16" height="16" :fill="isPriorityJob(job) ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
            </button>
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
            </RouterLink>
            <RouterLink class="job-main-link" :to="`/workspaces/${job.workspaceId}`">
              {{ job.positionTitle }}
            </RouterLink>
            <div class="status-menu">
              <button
                class="status-select status-tag"
                type="button"
                :class="statusClass(job.status)"
                :aria-label="`${job.companyName} ${job.positionTitle} 지원 상태 변경`"
                :aria-expanded="openStatusJobId === job.id ? 'true' : 'false'"
                :data-testid="`status-${job.id}`"
                @click="toggleStatusMenu(job.id)"
              >
                {{ statusLabel(job.status) }}
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
                  :data-testid="`status-${job.id}-option-${option.value}`"
                  @click="changeStatus(job.id, option.value)"
                >
                  {{ option.label }}
                </button>
              </div>
            </div>
            <RouterLink class="job-main-link" :to="`/workspaces/${job.workspaceId}`">
              <span class="deadline-pill" :class="{ urgent: isDeadlineSoon(job) }">{{ job.deadlineLabel }}</span>
            </RouterLink>
            <a
              class="source-link"
              :href="normalizedSourceUrl(job.sourceUrl)"
              target="_blank"
              rel="noreferrer"
              :data-testid="`source-${job.id}`"
            >
              바로가기
            </a>
            <span
              v-if="isRecentWorkspace(job.workspaceId)"
              class="recent-visit-badge"
              :data-testid="`recent-work-${job.id}`"
            >
              최근 작업
            </span>
            <span v-else class="recent-visit-empty" aria-hidden="true">-</span>
            <button
              class="delete-job-button"
              type="button"
              :data-testid="`archive-${job.id}`"
              aria-label="공고 삭제"
              @click="archiveJob(job.id)"
            >
              <svg class="icon-close" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </article>

          <form class="basket-data-row inline-create-row" data-testid="inline-create-row" @submit.prevent="createManualJob">
            <span class="inline-placeholder">-</span>
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
              type="text"
              inputmode="url"
              autocomplete="off"
              placeholder="jasoseol.com/jobs/123"
              required
            />
            <span class="inline-placeholder"></span>
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
      </section>

      <section class="deadline-panel basket-calendar-panel" data-testid="basket-calendar" aria-label="공고 캘린더">
        <div class="section-heading">
          <div class="calendar-title-row">
            <h2>공고 캘린더</h2>
            <p data-testid="basket-calendar-note">공고별 마감 날짜가 캘린더에 표시됩니다.</p>
          </div>
          <select v-model="selectedMonthKey" data-testid="calendar-month-picker" aria-label="캘린더 월 선택">
            <option v-for="month in selectableMonths" :key="month.key" :value="month.key">{{ month.label }}</option>
          </select>
        </div>

        <div class="deadline-calendar job-calendar" :aria-label="`${calendarMonthLabel} 공고 캘린더`">
          <span v-for="weekday in weekdays" :key="weekday" class="weekday">{{ weekday }}</span>
          <div v-for="offset in firstDayOffset" :key="`offset-${offset}`" aria-hidden="true"></div>
          <div
            v-for="day in monthDays"
            :key="day"
            class="deadline-day job-calendar-day"
            :class="{ today: isToday(day), weekend: isWeekend(day) }"
            :data-testid="isToday(day) ? 'calendar-today' : (isWeekend(day) ? 'calendar-weekend' : undefined)"
          >
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
              <em class="status-tag" :class="statusClass(job.status)">{{ statusLabel(job.status) }}</em>
            </RouterLink>
          </div>
        </div>
      </section>
    </section>
  </AppLayout>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import AppLayout from '@/shared/AppLayout.vue';
import StatePanel from '@/shared/StatePanel.vue';
import SkeletonLoader from '@/shared/SkeletonLoader.vue';
import { isRecentWorkspace } from '@/features/basket/recentWorkspaces';
import { useBasketStore } from '@/stores/basketStore';

const route = useRoute();
const basketStore = useBasketStore();
const searchQuery = ref(String(route.query.q ?? ''));
const currentPage = ref(1);
const pageSize = 10;
const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
const today = startOfToday();
const selectedMonthKey = ref(toMonthKey(today));
const priorityJobIds = ref(new Set());
const openStatusJobId = ref(null);
const statusOptions = [
    { value: 'NOT_STARTED', label: '지원 전' },
    { value: 'NOT_APPLIED', label: '미지원' },
    { value: 'IN_PROGRESS', label: '진행중' },
    { value: 'SUBMITTED', label: '지원완료' }
];
const selectableMonths = computed(() => {
    const months = new Map();
    for (let offset = -1; offset <= 5; offset += 1) {
        const monthDate = new Date(today.getFullYear(), today.getMonth() + offset, 1);
        months.set(toMonthKey(monthDate), {
            key: toMonthKey(monthDate),
            label: new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long' }).format(monthDate)
        });
    }
    basketStore.jobs.forEach((job) => {
        const deadline = parseDeadlineDate(job);
        if (deadline) {
            months.set(toMonthKey(deadline), {
                key: toMonthKey(deadline),
                label: new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long' }).format(deadline)
            });
        }
    });
    return [...months.values()].sort((left, right) => left.key.localeCompare(right.key));
});
const currentMonthDate = computed(() => {
    const [year, month] = selectedMonthKey.value.split('-').map(Number);
    return new Date(year, month - 1, 1);
});
const monthDays = computed(() => Array.from(
    { length: new Date(currentMonthDate.value.getFullYear(), currentMonthDate.value.getMonth() + 1, 0).getDate() },
    (_, index) => index + 1
));
const firstDayOffset = computed(() => new Date(
    currentMonthDate.value.getFullYear(),
    currentMonthDate.value.getMonth(),
    1
).getDay());
const calendarMonthLabel = computed(() => new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long'
}).format(currentMonthDate.value));
const manualForm = reactive({
    companyName: '',
    positionTitle: '',
    deadlineLabel: '',
    sourceUrl: ''
});
const statusFilters = [
    { label: '전체', value: undefined },
    { label: '지원 전', value: 'NOT_STARTED' },
    { label: '진행중', value: 'IN_PROGRESS' },
    { label: '지원완료', value: 'SUBMITTED' },
    { label: '미지원', value: 'NOT_APPLIED' }
];

const selectedSort = computed(() => route.query.sort === 'saved' ? 'saved' : 'deadline');
const selectedStatus = computed(() => {
    const status = route.query.status;
    return status === 'NOT_STARTED' || status === 'NOT_APPLIED' || status === 'IN_PROGRESS' || status === 'SUBMITTED'
        ? status
        : undefined;
});
const isPriorityFilter = computed(() => route.query.priority === 'true');
const searchedJobs = computed(() => {
    const keyword = searchQuery.value.trim().toLowerCase();
    const sourceJobs = isPriorityFilter.value ? basketStore.jobs.filter(isPriorityJob) : basketStore.jobs;
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
            if (!day) {
                return groups;
            }
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
    return date && toMonthKey(date) === selectedMonthKey.value ? date.getDate() : null;
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
function toMonthKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
function normalizedSourceUrl(sourceUrl) {
    const trimmed = String(sourceUrl ?? '').trim();
    if (!trimmed) {
        return '#';
    }
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}
function daysUntilDeadline(job) {
    const date = parseDeadlineDate(job);
    if (!date) {
        return null;
    }
    return Math.ceil((date.getTime() - today.getTime()) / 86400000);
}
function isDeadlineSoon(job) {
    const daysLeft = daysUntilDeadline(job);
    return daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
}
function isToday(day) {
    return currentMonthDate.value.getFullYear() === today.getFullYear() &&
        currentMonthDate.value.getMonth() === today.getMonth() &&
        day === today.getDate();
}
function isWeekend(day) {
    const weekDay = new Date(currentMonthDate.value.getFullYear(), currentMonthDate.value.getMonth(), day).getDay();
    return weekDay === 0 || weekDay === 6;
}
function statusClass(status) {
    return {
        'status-not-started': status === 'NOT_STARTED',
        'status-in-progress': status === 'IN_PROGRESS',
        'status-submitted': status === 'SUBMITTED',
        'status-not-applied': status === 'NOT_APPLIED'
    };
}
function statusLabel(status) {
    return statusOptions.find((option) => option.value === status)?.label ?? '미지원';
}
function toggleStatusMenu(jobId) {
    openStatusJobId.value = openStatusJobId.value === jobId ? null : jobId;
}
function isPriorityJob(job) {
    return priorityJobIds.value.has(job.id) || job.priority === true;
}
function togglePriority(jobId) {
    const nextPriorityJobIds = new Set(priorityJobIds.value);
    if (nextPriorityJobIds.has(jobId)) {
        nextPriorityJobIds.delete(jobId);
    }
    else {
        nextPriorityJobIds.add(jobId);
    }
    priorityJobIds.value = nextPriorityJobIds;
}
async function createManualJob() {
    await basketStore.createJob({
        companyName: manualForm.companyName.trim(),
        positionTitle: manualForm.positionTitle.trim(),
        deadlineLabel: manualForm.deadlineLabel.trim(),
        sourceUrl: normalizedSourceUrl(manualForm.sourceUrl),
        savedSource: 'MANUAL'
    });
    manualForm.companyName = '';
    manualForm.positionTitle = '';
    manualForm.deadlineLabel = '';
    manualForm.sourceUrl = '';
}
function changeStatus(jobId, nextStatus) {
    openStatusJobId.value = null;
    void basketStore.updateStatus(jobId, nextStatus);
}
function companyInitial(companyName) {
    return (companyName ?? '?').trim().charAt(0).toUpperCase() || '?';
}
function archiveJob(jobId) {
    const job = basketStore.jobs.find((basketJob) => basketJob.id === jobId);
    const label = job ? `${job.companyName} ${job.positionTitle}` : '공고';
    if (!window.confirm(`${label} 공고를 삭제하시겠습니까?`)) {
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
watch([searchQuery, isPriorityFilter, selectedSort, sortedJobs], () => {
    currentPage.value = 1;
});
watch(totalPages, (nextTotalPages) => {
    if (currentPage.value > nextTotalPages) {
        currentPage.value = nextTotalPages;
    }
});
</script>
