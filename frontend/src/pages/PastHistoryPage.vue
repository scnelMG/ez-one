<template>
  <AppLayout>
    <section class="history-page">
      <header class="history-header">
        <div>
          <h1>과거 지원 내역</h1>
          <p>공고 장바구니에서 이어진 지원 기록을 기간별로 확인하고, 필요한 항목은 바로 워크스페이스에서 이어갈 수 있습니다.</p>
        </div>
        <label class="history-period-field">
          <span>기간</span>
          <select
            v-model="selectedPeriod"
            data-testid="history-period-select"
            aria-label="과거 지원 기간 선택"
          >
            <option v-for="period in periods" :key="period.value" :value="period.value">
              {{ period.label }}
            </option>
          </select>
        </label>
      </header>

      <section class="history-summary" aria-label="과거 지원 요약">
        <div class="history-metric" data-testid="metric-total">
          <span>전체 공고</span>
          <strong>{{ summary.total }}</strong>
        </div>
        <div class="history-metric" data-testid="metric-ready">
          <span>지원전</span>
          <strong>{{ summary.ready }}</strong>
        </div>
        <div class="history-metric" data-testid="metric-not-applied">
          <span>미지원</span>
          <strong>{{ summary.notApplied }}</strong>
        </div>
        <div class="history-metric" data-testid="metric-in-progress">
          <span>진행 중</span>
          <strong>{{ summary.inProgress }}</strong>
        </div>
        <div class="history-metric" data-testid="metric-completed">
          <span>지원완료</span>
          <strong>{{ summary.completed }}</strong>
        </div>
      </section>

      <section class="history-table-panel">
        <div class="history-table-title">
          <h2>지원 내역</h2>
          <span data-testid="history-visible-count">전체 {{ summary.total }}건 중 {{ visibleRows.length }}건 표시</span>
        </div>

        <div class="filter-bar compact" aria-label="지원 내역 필터">
          <button
            v-for="option in applicationStatusOptions"
            :key="option.value ?? 'ALL'"
            type="button"
            class="filter-chip"
            :class="{ active: selectedApplicationStatus === option.value }"
            :data-testid="`history-status-chip-${option.value || 'ALL'}`"
            @click="selectedApplicationStatus = option.value"
          >
            {{ option.label }}
          </button>
          <input
            v-model="searchQuery"
            class="search-field"
            data-testid="history-search"
            type="search"
            aria-label="회사명 또는 직무명 검색"
            placeholder="회사명 또는 직무명 검색"
          />
          <button
            class="history-reset-button"
            type="button"
            data-testid="history-reset-filters"
            :disabled="!hasClientFilters"
            @click="resetClientFilters"
          >
            초기화
          </button>
        </div>

        <div class="history-filter-row" aria-label="지원 내역 정렬">
          <label>
            <span>상태 라벨</span>
            <select v-model="selectedApplicationStatus" data-testid="history-status-filter">
              <option v-for="option in applicationStatusOptions" :key="option.value ?? 'ALL'" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
          <label>
            <span>정렬</span>
            <select v-model="selectedSort" data-testid="history-sort-select">
              <option value="DEFAULT">기본순</option>
              <option value="DEADLINE_DESC">마감일 최신순</option>
              <option value="DEADLINE_ASC">마감일 빠른순</option>
              <option value="COMPANY_ASC">회사명 가나다순</option>
              <option value="STATUS_ASC">상태 라벨순</option>
            </select>
          </label>
        </div>

        <div v-if="status === 'loading'" class="history-state">불러오는 중입니다.</div>
        <div v-else-if="status === 'error'" class="history-state error" role="alert">{{ errorMessage }}</div>
        <div v-else-if="!visibleRows.length" class="history-state">
          선택한 조건의 지원 내역이 없습니다.
          <button
            v-if="hasClientFilters"
            class="history-inline-reset"
            type="button"
            @click="resetClientFilters"
          >
            필터 초기화
          </button>
        </div>
        <div v-else class="basket-data-table history-basket-table" aria-label="과거 지원 내역 목록">
          <div class="basket-data-head history-table-head">
            <span>회사명</span>
            <span>직무</span>
            <span>상태</span>
            <span>마감일</span>
            <span>채용 사이트 링크</span>
            <span>최근 작업</span>
          </div>
          <article
            v-for="row in visibleRows"
            :key="row.id"
            class="basket-data-row history-row"
            data-testid="history-row"
          >
            <RouterLink class="job-main-link company-cell" :to="`/workspaces/${row.workspaceId}`">
              <span class="company-logo-badge" aria-hidden="true">
                <span>{{ companyInitial(row.companyName) }}</span>
              </span>
              <strong data-testid="history-row-company">{{ row.companyName }}</strong>
            </RouterLink>
            <RouterLink class="job-main-link" :to="`/workspaces/${row.workspaceId}`">
              {{ row.positionTitle }}
            </RouterLink>
            <span>
              <em class="status-tag" :class="statusClass(row.applicationStatus)">{{ statusLabel(row.applicationStatus) }}</em>
            </span>
            <RouterLink class="job-main-link deadline-cell" :to="`/workspaces/${row.workspaceId}`">
              <span>{{ row.deadlineLabel || '-' }}</span>
            </RouterLink>
            <a
              v-if="row.sourceUrl"
              class="source-link"
              :data-testid="`history-source-${row.id}`"
              :href="normalizedSourceUrl(row.sourceUrl)"
              target="_blank"
              rel="noreferrer"
            >
              바로가기
            </a>
            <span v-else></span>
            <RouterLink
              class="recent-work-badge"
              :data-testid="`history-workspace-${row.id}`"
              :to="`/workspaces/${row.workspaceId}`"
            >
              이어가기
            </RouterLink>
          </article>
        </div>
      </section>
    </section>
  </AppLayout>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import AppLayout from '@/shared/AppLayout.vue';
import { historyApi } from '@/features/history/api/historyApi';
import { companyInitial, normalizedSourceUrl, statusClass, statusLabel } from '@/shared/utils/jobUtils';

const selectedPeriod = ref('ALL');
const selectedApplicationStatus = ref('');
const selectedSort = ref('DEFAULT');
const searchQuery = ref('');
const status = ref('idle');
const errorMessage = ref('');
const historyData = ref({
    periods: [{ value: 'ALL', label: '전체' }],
    summary: emptySummary(),
    rows: []
});

const periods = computed(() => {
    return historyData.value.periods.length
        ? historyData.value.periods
        : [{ value: 'ALL', label: '전체' }];
});
const summary = computed(() => historyData.value.summary);
const rows = computed(() => historyData.value.rows);
const applicationStatusOptions = [
    { value: '', label: '전체' },
    { value: 'READY', label: '지원전' },
    { value: 'NOT_APPLIED', label: '미지원' },
    { value: 'IN_PROGRESS', label: '진행 중' },
    { value: 'COMPLETED', label: '지원완료' }
];
const hasClientFilters = computed(() => Boolean(
    selectedApplicationStatus.value ||
    selectedSort.value !== 'DEFAULT' ||
    searchQuery.value.trim()
));
const visibleRows = computed(() => {
    const keyword = searchQuery.value.trim().toLowerCase();
    const filteredRows = rows.value.filter((row) => {
        if (selectedApplicationStatus.value && row.applicationStatus !== selectedApplicationStatus.value) {
            return false;
        }
        if (!keyword) {
            return true;
        }
        return [
            row.companyName,
            row.positionTitle,
            row.deadlineLabel,
            row.sourceUrl
        ].some((value) => String(value ?? '').toLowerCase().includes(keyword));
    });
    return sortRows(filteredRows, selectedSort.value);
});

onMounted(() => {
    void loadHistory();
});

watch(selectedPeriod, () => {
    void loadHistory();
});

async function loadHistory() {
    status.value = 'loading';
    errorMessage.value = '';
    try {
        historyData.value = await historyApi.listApplications({
            period: selectedPeriod.value
        });
        status.value = 'success';
    } catch (error) {
        status.value = 'error';
        errorMessage.value = error instanceof Error ? error.message : '과거 지원 내역을 불러오지 못했습니다.';
    }
}

function resetClientFilters() {
    selectedApplicationStatus.value = '';
    selectedSort.value = 'DEFAULT';
    searchQuery.value = '';
}

function sortRows(sourceRows, sortKey) {
    if (sortKey === 'DEFAULT') {
        return sourceRows;
    }
    const sortedRows = [...sourceRows];
    if (sortKey === 'DEADLINE_DESC') {
        return sortedRows.sort((left, right) => compareDeadline(left.deadlineLabel, right.deadlineLabel, 'DESC'));
    }
    if (sortKey === 'DEADLINE_ASC') {
        return sortedRows.sort((left, right) => compareDeadline(left.deadlineLabel, right.deadlineLabel, 'ASC'));
    }
    if (sortKey === 'COMPANY_ASC') {
        return sortedRows.sort((left, right) => left.companyName.localeCompare(right.companyName, 'ko-KR'));
    }
    if (sortKey === 'STATUS_ASC') {
        return sortedRows.sort((left, right) => statusRank(left.applicationStatus) - statusRank(right.applicationStatus));
    }
    return sourceRows;
}

function deadlineRank(deadlineLabel) {
    const value = String(deadlineLabel ?? '');
    const match = value.match(/(20\d{2})\D+(\d{1,2})\D+(\d{1,2})/);
    if (!match) {
        return undefined;
    }
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).getTime();
}

function compareDeadline(leftDeadline, rightDeadline, direction) {
    const leftRank = deadlineRank(leftDeadline);
    const rightRank = deadlineRank(rightDeadline);
    if (leftRank === undefined && rightRank === undefined) {
        return 0;
    }
    if (leftRank === undefined) {
        return 1;
    }
    if (rightRank === undefined) {
        return -1;
    }
    return direction === 'ASC' ? leftRank - rightRank : rightRank - leftRank;
}

function statusRank(status) {
    const rank = ['READY', 'NOT_APPLIED', 'IN_PROGRESS', 'COMPLETED'].indexOf(status);
    return rank === -1 ? Number.MAX_SAFE_INTEGER : rank;
}

function emptySummary() {
    return {
        total: 0,
        completed: 0,
        notApplied: 0,
        inProgress: 0,
        ready: 0,
        documentFailed: 0,
        testFailed: 0,
        interviewFailed: 0
    };
}
</script>
