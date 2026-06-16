<template>
  <AppLayout>
    <section class="history-page">
      <header class="history-header">
        <div>
          <h1>과거 지원 내역</h1>
          <p>실제 지원 기록을 기간별로 확인하고, 필요한 항목은 바로 지원 워크스페이스에서 이어서 볼 수 있습니다.</p>
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
          <span>총 지원</span>
          <strong>{{ summary.total }}</strong>
        </div>
        <div class="history-metric" data-testid="metric-completed">
          <span>지원완료</span>
          <strong>{{ summary.completed }}</strong>
        </div>
        <div class="history-metric" data-testid="metric-not-applied">
          <span>미지원</span>
          <strong>{{ summary.notApplied }}</strong>
        </div>
        <div class="history-metric" data-testid="metric-in-progress">
          <span>진행 중</span>
          <strong>{{ summary.inProgress }}</strong>
        </div>
        <div class="history-metric" data-testid="metric-ready">
          <span>지원 전</span>
          <strong>{{ summary.ready }}</strong>
        </div>
      </section>

      <section class="history-grid">
        <div class="history-side-panels">
        <div class="history-company-panel" data-testid="company-type-chart">
          <h2>기업 유형</h2>
          <div v-if="companyTypes.length" class="history-company-bars">
            <div
              v-for="companyType in companyTypes"
              :key="companyType.type"
              class="history-company-bar"
            >
              <span>{{ companyType.type }}</span>
              <div aria-hidden="true">
                <i :style="{ width: `${companyTypePercent(companyType.count)}%` }"></i>
              </div>
              <strong>{{ companyType.count }}</strong>
            </div>
          </div>
          <p v-else class="history-muted">선택한 기간의 기업 유형 데이터가 없습니다.</p>
        </div>

        <div class="history-company-panel" data-testid="industry-chart">
          <h2>산업군</h2>
          <div v-if="industryStats.length" class="history-company-bars">
            <div
              v-for="industry in industryStats"
              :key="industry.industry"
              class="history-company-bar"
            >
              <span>{{ industry.industry }}</span>
              <div aria-hidden="true">
                <i :style="{ width: `${industryPercent(industry.count)}%` }"></i>
              </div>
              <strong>{{ industry.count }}</strong>
            </div>
          </div>
          <p v-else class="history-muted">선택한 기간의 산업군 데이터가 없습니다.</p>
        </div>

        <div class="history-company-panel" data-testid="company-data-quality">
          <h2>기업 정보 신뢰도</h2>
          <div class="history-quality-list">
            <span>기업 마스터</span>
            <strong>{{ dataQuality.companyMaster }}</strong>
            <span>룰 기반 보강</span>
            <strong>{{ dataQuality.ruleBased }}</strong>
            <span>미확인</span>
            <strong>{{ dataQuality.unknown }}</strong>
          </div>
        </div>
        </div>

        <div class="history-table-panel">
          <div class="history-table-title">
            <h2>지원 내역</h2>
            <span data-testid="history-visible-count">전체 {{ summary.total }}건 중 {{ visibleRows.length }}건 표시</span>
          </div>
          <div class="history-table-tools" aria-label="지원 내역 필터">
            <input
              v-model="searchQuery"
              class="history-search"
              data-testid="history-search"
              type="search"
              aria-label="회사명, 직무, 결과, 원본 URL 검색"
              placeholder="회사명, 직무, 결과 검색"
            />
            <button
              class="history-reset-button"
              type="button"
              data-testid="history-reset-filters"
              :disabled="!hasClientFilters"
              @click="resetClientFilters"
            >
              필터 초기화
            </button>
          </div>
          <div class="history-filter-row" aria-label="지원 내역 라벨 필터와 정렬">
            <label>
              <span>상태 라벨</span>
              <select v-model="selectedApplicationStatus" data-testid="history-status-filter">
                <option value="">전체 상태</option>
                <option v-for="option in applicationStatusOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>
            <label>
              <span>결과 라벨</span>
              <select v-model="selectedResultLabel" data-testid="history-result-label-filter">
                <option value="">전체 결과</option>
                <option v-for="label in resultLabelOptions" :key="label" :value="label">
                  {{ label }}
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
          <div v-else class="history-table" aria-label="과거 지원 내역 목록">
            <div class="history-table-head">
              <span>회사명</span>
              <span>직무</span>
              <span>상태</span>
              <span>마감일자</span>
              <span>채용 사이트 링크</span>
            </div>
            <div
              v-for="row in visibleRows"
              :key="row.id"
              class="history-row"
              data-testid="history-row"
              role="link"
              tabindex="0"
              @click="openWorkspace(row.workspaceId)"
              @keydown.enter.prevent="openWorkspace(row.workspaceId)"
              @keydown.space.prevent="openWorkspace(row.workspaceId)"
            >
              <strong data-testid="history-row-company">{{ row.companyName }}</strong>
              <span>{{ row.positionTitle }}</span>
              <span>
                <em class="status-tag" :class="statusClass(row.applicationStatus)">{{ statusLabel(row.applicationStatus) }}</em>
              </span>
              <span>{{ row.deadlineLabel }}</span>
              <span class="history-link-cell">
                <a
                  v-if="row.sourceUrl"
                  class="history-source-cell"
                  :data-testid="`history-source-${row.id}`"
                  :href="normalizedSourceUrl(row.sourceUrl)"
                  target="_blank"
                  rel="noreferrer"
                  @click.stop
                >
                  바로가기
                </a>
              </span>
            </div>
          </div>
        </div>
      </section>
    </section>
  </AppLayout>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import AppLayout from '@/shared/AppLayout.vue';
import { historyApi } from '@/features/history/api/historyApi';
import { normalizedSourceUrl, statusClass, statusLabel } from '@/shared/utils/jobUtils';

const router = useRouter();
const selectedPeriod = ref('ALL');
const selectedApplicationStatus = ref('');
const selectedResultLabel = ref('');
const selectedSort = ref('DEFAULT');
const searchQuery = ref('');
const status = ref('idle');
const errorMessage = ref('');
const historyData = ref({
    periods: [{ value: 'ALL', label: '전체' }],
    summary: emptySummary(),
    companyTypes: [],
    industryStats: [],
    dataQuality: emptyDataQuality(),
    rows: []
});

const periods = computed(() => {
    return historyData.value.periods.length
        ? historyData.value.periods
        : [{ value: 'ALL', label: '전체' }];
});
const summary = computed(() => historyData.value.summary);
const companyTypes = computed(() => historyData.value.companyTypes);
const industryStats = computed(() => historyData.value.industryStats ?? []);
const dataQuality = computed(() => historyData.value.dataQuality ?? emptyDataQuality());
const rows = computed(() => historyData.value.rows);
const maxCompanyTypeCount = computed(() => Math.max(1, ...companyTypes.value.map((companyType) => companyType.count)));
const maxIndustryCount = computed(() => Math.max(1, ...industryStats.value.map((industry) => industry.count)));
const applicationStatusOptions = [
    { value: 'COMPLETED', label: '지원완료' },
    { value: 'NOT_APPLIED', label: '미지원' },
    { value: 'IN_PROGRESS', label: '진행 중' },
    { value: 'READY', label: '지원 전' }
];
const resultLabelOptions = computed(() => [...new Set(rows.value
    .map((row) => row.resultLabel)
    .filter((label) => typeof label === 'string' && label.trim()))].sort((left, right) => left.localeCompare(right, 'ko-KR')));
const hasClientFilters = computed(() => Boolean(
    selectedApplicationStatus.value ||
    selectedResultLabel.value ||
    selectedSort.value !== 'DEFAULT' ||
    searchQuery.value.trim()
));
const visibleRows = computed(() => {
    const keyword = searchQuery.value.trim().toLowerCase();
    const filteredRows = rows.value.filter((row) => {
        if (selectedApplicationStatus.value && row.applicationStatus !== selectedApplicationStatus.value) {
            return false;
        }
        if (selectedResultLabel.value && row.resultLabel !== selectedResultLabel.value) {
            return false;
        }
        if (!keyword) {
            return true;
        }
        return [
            row.companyName,
            row.positionTitle,
            row.resultLabel,
            row.rawResult,
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
            period: selectedPeriod.value,
            resultStage: undefined
        });
        status.value = 'success';
    } catch (error) {
        status.value = 'error';
        errorMessage.value = error instanceof Error ? error.message : '과거 지원 내역을 불러오지 못했습니다.';
    }
}

function resetClientFilters() {
    selectedApplicationStatus.value = '';
    selectedResultLabel.value = '';
    selectedSort.value = 'DEFAULT';
    searchQuery.value = '';
}

function openWorkspace(workspaceId) {
    void router.push(`/workspaces/${workspaceId}`);
}

function companyTypePercent(count) {
    return Math.max(8, Math.round((count / maxCompanyTypeCount.value) * 100));
}

function industryPercent(count) {
    return Math.max(8, Math.round((count / maxIndustryCount.value) * 100));
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
    const rank = ['COMPLETED', 'IN_PROGRESS', 'READY', 'NOT_APPLIED'].indexOf(status);
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

function emptyDataQuality() {
    return {
        total: 0,
        companyMaster: 0,
        ruleBased: 0,
        unknown: 0
    };
}
</script>
