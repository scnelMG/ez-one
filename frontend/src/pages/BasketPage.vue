<template>
  <AppLayout>
    <section class="basket-page">
      <header class="basket-hero">
        <div>
          <p class="section-kicker">공고 관리</p>
          <h1>공고 장바구니</h1>
          <p>저장한 공고의 상태와 마감일을 한 번에 확인하고, 바로 지원 워크스페이스로 이동합니다.</p>
        </div>
        <RouterLink class="primary-button" to="/recommendations">추천 공고 보기</RouterLink>
      </header>

      <section class="basket-metrics" aria-label="장바구니 요약">
        <div>
          <span>전체 공고</span>
          <strong>{{ basketStore.jobs.length }}</strong>
        </div>
        <div>
          <span>진행 중</span>
          <strong>{{ statusCounts.IN_PROGRESS }}</strong>
        </div>
        <div>
          <span>지원 전</span>
          <strong>{{ statusCounts.NOT_STARTED }}</strong>
        </div>
        <div>
          <span>마감 임박</span>
          <strong>{{ basketStore.deadlineSoonCount }}</strong>
        </div>
      </section>

      <div class="basket-workspace-grid">
        <section class="basket-list-panel" aria-label="저장한 공고 목록">
          <div class="basket-title-row">
            <div>
              <p class="section-kicker">저장한 공고</p>
              <h2>지원 관리</h2>
            </div>
            <div class="basket-tools" aria-label="장바구니 도구">
              <RouterLink class="ghost-button small" to="/basket?sort=deadline">마감일순</RouterLink>
            </div>
          </div>

          <div class="filter-bar compact" aria-label="지원 상태 필터">
            <RouterLink
              v-for="filter in statusFilters"
              :key="filter.label"
              :data-testid="`basket-filter-${filter.value ?? 'ALL'}`"
              class="filter-chip"
              :class="{ active: selectedStatus === filter.value }"
              :to="filter.to"
            >
              {{ filter.label }}
            </RouterLink>
            <RouterLink
              class="filter-chip"
              :class="{ active: isOverdueFilter }"
              data-testid="basket-filter-overdue"
              to="/basket?overdue=true"
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
              <span>관리</span>
            </div>
            <article v-for="job in pagedJobs" :key="job.id" class="basket-data-row">
              <RouterLink class="job-main-link" :to="`/workspaces/${job.workspaceId}`">
                <strong>{{ job.companyName }}</strong>
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
              <div class="row-actions">
                <RouterLink class="text-button" :to="`/basket/${job.id}`">상세</RouterLink>
                <a class="source-link" :href="job.sourceUrl" target="_blank" rel="noreferrer">원문</a>
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

        <aside class="deadline-panel" aria-label="공고 직접 등록">
          <div class="section-heading">
            <div>
              <p class="section-kicker">직접 입력</p>
              <h2>공고 등록</h2>
            </div>
          </div>
          <form class="manual-job-form" data-testid="manual-create" @submit.prevent="createManualJob">
            <label>
              회사명
              <input
                v-model="manualForm.companyName"
                data-testid="manual-company"
                name="companyName"
                autocomplete="organization"
                required
              />
            </label>
            <label>
              직무명
              <input
                v-model="manualForm.positionTitle"
                data-testid="manual-position"
                name="positionTitle"
                autocomplete="organization-title"
                required
              />
            </label>
            <label>
              마감일
              <input
                v-model="manualForm.deadlineLabel"
                data-testid="manual-deadline"
                name="deadline"
                inputmode="numeric"
                autocomplete="off"
                placeholder="2026.06.30"
              />
            </label>
            <label>
              공고 URL
              <input
                v-model="manualForm.sourceUrl"
                data-testid="manual-source"
                name="sourceUrl"
                type="url"
                inputmode="url"
                autocomplete="off"
                placeholder="https://example.com/jobs/123"
                required
              />
            </label>
            <button class="primary-button" type="submit">공고 저장</button>
          </form>
        </aside>

        <aside class="deadline-panel" aria-label="마감일 스냅샷">
          <div class="section-heading">
            <div>
              <p class="section-kicker">마감 일정</p>
              <h2>마감일 스냅샷</h2>
            </div>
            <span>{{ calendarMonthLabel }}</span>
          </div>

          <div class="deadline-calendar" :aria-label="`${calendarMonthLabel} 마감일`">
            <span v-for="weekday in weekdays" :key="weekday" class="weekday">{{ weekday }}</span>
            <div v-for="offset in firstDayOffset" :key="`offset-${offset}`" aria-hidden="true"></div>
            <div v-for="day in monthDays" :key="day" class="deadline-day">
              <span>{{ day }}</span>
              <RouterLink
                v-for="job in jobsByDay[day] ?? []"
                :key="job.id"
                class="deadline-job-chip"
                :to="`/workspaces/${job.workspaceId}`"
              >
                {{ job.companyName }}
              </RouterLink>
            </div>
          </div>
        </aside>
      </div>
    </section>
  </AppLayout>
</template>

<script setup>import AppLayout from '@/shared/AppLayout.vue';
import StatePanel from '@/shared/StatePanel.vue';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
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
    { label: '전체', value: undefined, to: '/basket' },
    { label: '지원 전', value: 'NOT_STARTED', to: '/basket?status=NOT_STARTED' },
    { label: '미지원', value: 'NOT_APPLIED', to: '/basket?status=NOT_APPLIED' },
    { label: '진행 중', value: 'IN_PROGRESS', to: '/basket?status=IN_PROGRESS' },
    { label: '지원완료', value: 'SUBMITTED', to: '/basket?status=SUBMITTED' }
];
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
    if (route.query.sort === 'deadline') {
        return deadlineDay(left) - deadlineDay(right);
    }
    return Number(left.id) - Number(right.id);
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
const jobsByDay = computed(() => sortedJobs.value.reduce((groups, job) => {
    const day = deadlineDay(job);
    if (!groups[day]) {
        groups[day] = [];
    }
    groups[day].push(job);
    return groups;
}, {}));
function deadlineDay(job) {
    const source = job.deadlineDate ?? job.deadlineLabel;
    const month = String(currentMonthDate.getMonth() + 1).padStart(2, '0');
    const match = source.match(new RegExp(`(?:${currentMonthDate.getFullYear()}[-.])?${month}[-.](\\d{1,2})`));
    return match ? Number(match[1]) : 99;
}
function isOverdueJob(job) {
    const date = parseDeadlineDate(job);
    return date !== null && date < startOfToday();
}
function parseDeadlineDate(job) {
    const source = job.deadlineDate ?? job.deadlineLabel;
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
watch([searchQuery, isOverdueFilter, sortedJobs], () => {
    currentPage.value = 1;
});
watch(totalPages, (nextTotalPages) => {
    if (currentPage.value > nextTotalPages) {
        currentPage.value = nextTotalPages;
    }
});
</script>
