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
        <div class="history-metric" data-testid="metric-in-progress">
          <span>진행 중</span>
          <strong>{{ summary.inProgress }}</strong>
        </div>
        <div class="history-metric" data-testid="metric-completed">
          <span>지원완료</span>
          <strong>{{ summary.completed }}</strong>
        </div>
        <div class="history-metric" data-testid="metric-not-applied">
          <span>미지원</span>
          <strong>{{ summary.notApplied }}</strong>
        </div>
      </section>

      <section
        class="history-insight-dashboard"
        data-testid="history-insight-dashboard"
        aria-label="과거 지원 통계 대시보드"
      >
        <article class="history-insight-card history-action-card" data-testid="history-action-insight">
          <div>
            <h2>실행률</h2>
          </div>
          <strong data-testid="history-execution-rate">{{ executionRate }}%</strong>
          <span>지원완료+진행 중 / 전체</span>
        </article>

        <article class="history-insight-card" data-testid="history-status-stack">
          <div class="history-insight-heading">
            <h2>상태 분포</h2>
          </div>
          <div class="history-stack-chart" aria-hidden="true">
            <i
              v-for="item in statusDistribution"
              :key="item.key"
              :class="`history-stack-${item.key}`"
              :style="{ width: `${chartPercent(item.count, summary.total)}%` }"
            ></i>
          </div>
          <div class="history-chart-legend">
            <span v-for="item in statusDistribution" :key="`legend-${item.key}`">
              <b :class="`history-dot-${item.key}`"></b>{{ item.label }} {{ item.count }}
            </span>
          </div>
        </article>

        <article class="history-insight-card" data-testid="history-stage-chart">
          <div class="history-insight-heading">
            <h2>결과</h2>
          </div>
          <div class="history-mini-bars">
            <div v-for="item in stageDistribution" :key="item.key" class="history-mini-bar">
              <span>{{ item.label }}</span>
              <div aria-hidden="true">
                <i :class="`history-bar-${item.key}`" :style="{ width: `${barPercent(item.count, maxStageCount)}%` }"></i>
              </div>
              <strong>{{ item.count }}</strong>
            </div>
          </div>
        </article>

        <article class="history-insight-card" data-testid="history-company-chart">
          <div class="history-insight-heading">
            <h2>기업 유형</h2>
          </div>
          <div v-if="companyTypeInsights.length" class="history-mini-bars">
            <div v-for="item in companyTypeInsights" :key="item.type" class="history-mini-bar">
              <span>{{ item.type }}</span>
              <div aria-hidden="true">
                <i :style="{ width: `${barPercent(item.count, maxCompanyTypeCount)}%` }"></i>
              </div>
              <strong>{{ item.count }}</strong>
            </div>
          </div>
          <p v-else class="history-muted compact">기업 유형 데이터가 아직 없습니다.</p>
        </article>
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
            <span>지원 결과</span>
            <span>마감일</span>
            <span>채용 사이트 링크</span>
          </div>
          <article
            v-for="row in visibleRows"
            :key="row.id"
            class="basket-data-row history-row"
            data-testid="history-row"
          >
            <RouterLink class="job-main-link company-cell" :to="`/workspaces/${row.workspaceId}`">
              <span class="company-logo-badge" aria-hidden="true">
                <img
                  v-if="row.companyLogoUrl"
                  :src="row.companyLogoUrl"
                  :alt="`${row.companyName} logo`"
                  @error="row.companyLogoUrl = null"
                />
                <span v-else>{{ companyInitial(row.companyName) }}</span>
              </span>
              <strong data-testid="history-row-company">{{ row.companyName }}</strong>
            </RouterLink>
            <RouterLink class="job-main-link" :to="`/workspaces/${row.workspaceId}`">
              {{ row.positionTitle }}
            </RouterLink>
            <span>
              <select
                v-model="row.applicationStatus"
                class="history-label-select history-status-select"
                :class="statusClass(row.applicationStatus)"
                :data-testid="`history-status-edit-${row.id}`"
                :aria-label="`${row.companyName} 상태 라벨 변경`"
                @change="saveHistoryLabels(row)"
              >
                <option v-for="option in rowStatusOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </span>
            <span>
              <select
                v-model="row.resultStage"
                class="history-label-select history-result-select"
                :class="resultClass(row.resultStage)"
                :data-testid="`history-result-edit-${row.id}`"
                :aria-label="`${row.companyName} 지원 결과 라벨 변경`"
                @change="saveHistoryLabels(row)"
              >
                <option v-for="option in resultStageOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
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
const executionRate = computed(() => {
    if (!summary.value.total) {
        return 0;
    }
    return Math.round(((summary.value.completed + summary.value.inProgress) / summary.value.total) * 100);
});
const statusDistribution = computed(() => [
    { key: 'ready', label: '지원전', count: summary.value.ready },
    { key: 'progress', label: '진행 중', count: summary.value.inProgress },
    { key: 'completed', label: '지원완료', count: summary.value.completed },
    { key: 'notApplied', label: '미지원', count: summary.value.notApplied }
].filter((item) => item.count > 0));
const stageDistribution = computed(() => [
    { key: 'document', label: '서류 탈락', count: summary.value.documentFailed },
    { key: 'test', label: '필기 탈락', count: summary.value.testFailed },
    { key: 'interview', label: '면접 탈락', count: summary.value.interviewFailed },
    { key: 'progress', label: '진행 중', count: summary.value.inProgress },
    { key: 'notApplied', label: '미지원', count: summary.value.notApplied }
].filter((item) => item.count > 0));
const maxStageCount = computed(() => Math.max(1, ...stageDistribution.value.map((item) => item.count)));
const companyTypeInsights = computed(() => {
    const groups = new Map();
    rows.value.forEach((row) => {
        const type = String(row.companyType ?? '').trim();
        if (!type) {
            return;
        }
        const current = groups.get(type) ?? { type, count: 0 };
        current.count += 1;
        groups.set(type, current);
    });
    if (!groups.size) {
        (historyData.value.companyTypes ?? []).forEach((item) => {
            const type = String(item.type ?? '').trim();
            if (type) {
                groups.set(type, { type, count: Number(item.count) || 0 });
            }
        });
    }
    return [...groups.values()]
        .filter((item) => item.count > 0)
        .sort((left, right) => right.count - left.count || left.type.localeCompare(right.type, 'ko-KR'))
        .slice(0, 4);
});
const maxCompanyTypeCount = computed(() => Math.max(1, ...companyTypeInsights.value.map((item) => item.count)));
const applicationStatusOptions = [
    { value: '', label: '전체' },
    { value: 'READY', label: '지원전' },
    { value: 'IN_PROGRESS', label: '진행 중' },
    { value: 'COMPLETED', label: '지원완료' },
    { value: 'NOT_APPLIED', label: '미지원' }
];
const rowStatusOptions = applicationStatusOptions.filter((option) => option.value);
const resultStageOptions = [
    { value: 'DOCUMENT_FAILED', label: '서류 탈락' },
    { value: 'TEST_FAILED', label: '필기 탈락' },
    { value: 'INTERVIEW_FAILED', label: '면접 탈락' },
    { value: 'IN_PROGRESS', label: '진행 중' },
    { value: 'NOT_APPLIED', label: '미지원' }
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
            resultDisplayLabel(row),
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

async function saveHistoryLabels(row) {
    const originalId = row.id;
    try {
        const updatedRow = await historyApi.updateApplicationLabels(originalId, {
            applicationStatus: row.applicationStatus,
            resultStage: row.resultStage
        });
        historyData.value = {
            ...historyData.value,
            rows: historyData.value.rows.map((item) => {
                if (item.id === originalId || item.workspaceId === updatedRow.workspaceId) {
                    return { ...item, ...updatedRow };
                }
                return item;
            })
        };
    } catch (error) {
        errorMessage.value = error instanceof Error ? error.message : '지원 이력 라벨을 저장하지 못했습니다.';
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
    const rank = ['READY', 'IN_PROGRESS', 'COMPLETED', 'NOT_APPLIED'].indexOf(status);
    return rank === -1 ? Number.MAX_SAFE_INTEGER : rank;
}

function resultDisplayLabel(row) {
    const stageLabels = {
        DOCUMENT_FAILED: '서류 탈락',
        TEST_FAILED: '필기 탈락',
        INTERVIEW_FAILED: '면접 탈락',
        IN_PROGRESS: '진행 중',
        NOT_APPLIED: '미지원'
    };
    if (stageLabels[row?.resultStage]) {
        return stageLabels[row.resultStage];
    }
    return normalizeResultLabel(row?.resultLabel) || statusLabel(row?.applicationStatus);
}

function normalizeResultLabel(label) {
    const value = String(label ?? '').trim();
    if (!value) {
        return '';
    }
    if (value.includes('서류')) {
        return '서류 탈락';
    }
    if (value.includes('필기') || value.includes('역량')) {
        return '필기 탈락';
    }
    if (value.includes('면접')) {
        return '면접 탈락';
    }
    return value;
}

function resultClass(resultStage) {
    return {
        'is-document-failed': resultStage === 'DOCUMENT_FAILED',
        'is-test-failed': resultStage === 'TEST_FAILED',
        'is-interview-failed': resultStage === 'INTERVIEW_FAILED',
        'is-in-progress': resultStage === 'IN_PROGRESS',
        'is-not-applied': resultStage === 'NOT_APPLIED'
    };
}

function chartPercent(count, total) {
    if (!total || !count) {
        return 0;
    }
    return Math.max(3, Math.round((count / total) * 100));
}

function barPercent(count, maxCount) {
    if (!maxCount || !count) {
        return 0;
    }
    return Math.max(8, Math.round((count / maxCount) * 100));
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
