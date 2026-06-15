<template>
  <AppLayout>
    <section class="history-page">
      <header class="history-header">
        <div>
          <h1>과거 지원 내역</h1>
          <p>저장된 실제 지원 기록을 기간별로 확인하고, 필요한 항목은 바로 지원 워크스페이스에서 이어서 볼 수 있습니다.</p>
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
        <button
          class="history-metric"
          type="button"
          :class="{ active: selectedResultStage === 'DOCUMENT_FAILED' }"
          data-testid="metric-document"
          @click="toggleStage('DOCUMENT_FAILED')"
        >
          <span>서류 합격 전 종료</span>
          <strong>{{ summary.documentFailed }}</strong>
        </button>
        <button
          class="history-metric"
          type="button"
          :class="{ active: selectedResultStage === 'TEST_FAILED' }"
          @click="toggleStage('TEST_FAILED')"
        >
          <span>필기/과제 종료</span>
          <strong>{{ summary.testFailed }}</strong>
        </button>
        <button
          class="history-metric"
          type="button"
          :class="{ active: selectedResultStage === 'INTERVIEW_FAILED' }"
          @click="toggleStage('INTERVIEW_FAILED')"
        >
          <span>면접 단계 종료</span>
          <strong>{{ summary.interviewFailed }}</strong>
        </button>
        <button
          class="history-metric"
          type="button"
          :class="{ active: selectedResultStage === 'NOT_APPLIED' }"
          data-testid="metric-missing"
          @click="toggleStage('NOT_APPLIED')"
        >
          <span>미지원 개수</span>
          <strong>{{ summary.notApplied }}</strong>
        </button>
      </section>

      <section class="history-grid">
        <div class="history-company-panel" data-testid="company-type-chart">
          <h2>기업 유형</h2>
          <div v-if="companyTypes.length" class="history-company-bars">
            <div v-for="companyType in companyTypes" :key="companyType.type" class="history-company-bar">
              <span>{{ companyType.type }}</span>
              <div aria-hidden="true">
                <i :style="{ width: `${companyTypePercent(companyType.count)}%` }"></i>
              </div>
              <strong>{{ companyType.count }}</strong>
            </div>
          </div>
          <p v-else class="history-muted">선택한 기간의 기업 유형 데이터가 없습니다.</p>
        </div>

        <div class="history-table-panel">
          <div class="history-table-title">
            <h2>지원 내역</h2>
            <span>{{ rows.length }}건</span>
          </div>
          <div v-if="status === 'loading'" class="history-state">불러오는 중입니다.</div>
          <div v-else-if="status === 'error'" class="history-state error" role="alert">{{ errorMessage }}</div>
          <div v-else-if="!rows.length" class="history-state">선택한 조건의 지원 내역이 없습니다.</div>
          <div v-else class="history-table" aria-label="과거 지원 내역 목록">
            <div class="history-table-head">
              <span>회사명</span>
              <span>직무</span>
              <span>결과</span>
              <span>마감일자</span>
              <span>채용 사이트 링크</span>
            </div>
            <RouterLink
              v-for="row in rows"
              :key="row.id"
              class="history-row"
              data-testid="history-row"
              :to="`/workspaces/${row.workspaceId}`"
            >
              <strong data-testid="history-row-company">{{ row.companyName }}</strong>
              <span>{{ row.positionTitle }}</span>
              <span>
                <em class="history-result" :class="resultClass(row.resultStage)">{{ row.resultLabel }}</em>
                <small>{{ row.rawResult }}</small>
              </span>
              <span>{{ row.deadlineLabel }}</span>
              <span class="history-source-cell">{{ row.sourceUrl ? '바로가기' : '-' }}</span>
            </RouterLink>
          </div>
        </div>
      </section>
    </section>
  </AppLayout>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import AppLayout from '@/shared/AppLayout.vue';
import { historyApi } from '@/features/history/api/historyApi';

const selectedPeriod = ref('ALL');
const selectedResultStage = ref(undefined);
const status = ref('idle');
const errorMessage = ref('');
const historyData = ref({
    periods: [{ value: 'ALL', label: '전체' }],
    summary: emptySummary(),
    companyTypes: [],
    rows: []
});

const periods = computed(() => {
    return historyData.value.periods.length
        ? historyData.value.periods
        : [{ value: 'ALL', label: '전체' }];
});
const summary = computed(() => historyData.value.summary);
const companyTypes = computed(() => historyData.value.companyTypes);
const rows = computed(() => historyData.value.rows);
const maxCompanyTypeCount = computed(() => Math.max(1, ...companyTypes.value.map((companyType) => companyType.count)));

onMounted(() => {
    void loadHistory();
});

watch([selectedPeriod, selectedResultStage], () => {
    void loadHistory();
});

async function loadHistory() {
    status.value = 'loading';
    errorMessage.value = '';
    try {
        historyData.value = await historyApi.listApplications({
            period: selectedPeriod.value,
            resultStage: selectedResultStage.value
        });
        status.value = 'success';
    } catch (error) {
        status.value = 'error';
        errorMessage.value = error instanceof Error ? error.message : '과거 지원 내역을 불러오지 못했습니다.';
    }
}

function toggleStage(stage) {
    selectedResultStage.value = selectedResultStage.value === stage ? undefined : stage;
}

function companyTypePercent(count) {
    return Math.max(8, Math.round((count / maxCompanyTypeCount.value) * 100));
}

function resultClass(stage) {
    return {
        failed: stage === 'DOCUMENT_FAILED' || stage === 'TEST_FAILED' || stage === 'INTERVIEW_FAILED',
        missing: stage === 'NOT_APPLIED',
        progress: stage === 'IN_PROGRESS'
    };
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
