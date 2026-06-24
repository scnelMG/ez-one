<template>
  <div class="honey-pot-graph-container">
    <div class="honey-pot-top">
      <section class="honey-log-card" aria-label="꿀통 채우기 로그">
        <div class="honey-pot-header">
          <h3 class="honey-pot-title">
            🍯 꿀통 채우기
            <span class="honey-pot-subtitle">나의 취준 로그</span>
          </h3>
          <div class="honey-pot-legend">
            <span>Less</span>
            <div class="honey-pot-cell level-0"></div>
            <div class="honey-pot-cell level-1"></div>
            <div class="honey-pot-cell level-2"></div>
            <div class="honey-pot-cell level-3"></div>
            <div class="honey-pot-cell level-4"></div>
            <span>More</span>
          </div>
        </div>

        <div class="honey-log-body">
          <div class="honey-pot-grid-scroll">
          <div class="honey-pot-graph-body">
            <div class="honey-pot-y-axis">
              <span style="grid-row: 2">Mon</span>
              <span style="grid-row: 4">Wed</span>
              <span style="grid-row: 6">Fri</span>
            </div>
            <div class="honey-pot-main">
              <div class="honey-pot-months">
                <span
                  v-for="(month, idx) in months"
                  :key="idx"
                  :style="{ width: `${month.weeks * 16}px` }"
                >
                  {{ month.label }}
                </span>
              </div>
              <div class="honey-pot-grid" role="grid" aria-label="꿀 수집 현황">
                <div v-for="(week, weekIndex) in weeks" :key="weekIndex" class="honey-pot-week">
                  <button
                    v-for="day in week"
                    :key="day.dateStr"
                    type="button"
                    class="honey-pot-cell"
                    data-testid="honey-day-button"
                    :class="['level-' + day.level, { future: day.isFuture, selected: day.dateStr === selectedDate }]"
                    :title="day.isFuture ? '' : `${formatDate(day.dateStr)}: ${day.score}방울`"
                    :aria-label="day.isFuture ? `${formatDate(day.dateStr)} 예정일` : `${formatDate(day.dateStr)} ${day.score}방울 로그 보기`"
                    :disabled="day.isFuture"
                    @click="selectDay(day)"
                  ></button>
                </div>
              </div>
            </div>
          </div>
          </div>
          <div v-if="!selectedDate" class="honey-log-placeholder" data-testid="honey-log-placeholder" aria-hidden="true"></div>
          <aside v-else class="honey-log-side-panel" data-testid="honey-log-side-panel" aria-label="선택 날짜 점수 로그">
            <div v-if="!selectedDate" class="log-panel-empty">
              <strong>점수 로그</strong>
              <p>날짜 칸을 누르면 왜 방울을 받았는지 여기에 표시돼요.</p>
            </div>
            <template v-else>
              <div class="details-header compact">
                <div class="details-title">
                  <svg
                    class="calendar-icon"
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    stroke="currentColor"
                    stroke-width="2"
                    fill="none"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <div class="details-title-copy" data-testid="honey-score-log">
                    <h4>{{ formatDate(selectedDate) }} 점수 로그</h4>
                    <p>{{ selectedDayScore }}방울을 받은 이유를 확인해요.</p>
                  </div>
                </div>
                <button class="close-details" type="button" aria-label="활동 내역 닫기" @click="selectedDate = null">
                  ×
                </button>
              </div>

              <div v-if="isLoadingLogs" class="loading-logs compact">
                <div class="spinner"></div>
                기록을 불러오는 중...
              </div>
              <div v-else-if="displayedDateLogs.length > 0" class="timeline-container compact">
                <div v-for="(log, idx) in displayedDateLogs" :key="idx" class="timeline-item">
                  <div class="timeline-marker">
                    <div class="timeline-icon">
                      <svg
                        viewBox="0 0 24 24"
                        width="14"
                        height="14"
                        stroke="currentColor"
                        stroke-width="2"
                        fill="none"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                      </svg>
                    </div>
                    <div v-if="idx !== displayedDateLogs.length - 1" class="timeline-line"></div>
                  </div>
                  <div class="timeline-content">
                    <span class="timeline-time">{{ log.time }}</span>
                    <div class="timeline-card">
                      <span class="timeline-desc">{{ log.description }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="empty-logs compact">
                <p>이 날짜에는 기록된 활동이 없어요.</p>
              </div>
            </template>
          </aside>
        </div>
      </section>

      <section class="honey-status-panel" aria-label="나의 꿀 수집 현황">
        <div class="honey-status-copy">
          <h3>나의 꿀 수집 현황</h3>
          <div class="honey-status-grid">
            <div class="honey-status-card">
              <span>최근 6개월 모은 꿀</span>
              <strong>{{ totalHoney }} 방울</strong>
            </div>
            <div class="honey-status-card">
              <span>현재 연속 채우기</span>
              <strong>{{ currentStreak }} 일</strong>
            </div>
            <div class="honey-status-card">
              <span>최장 연속 채우기</span>
              <strong>{{ maxStreak }} 일</strong>
            </div>
          </div>
        </div>
        <img
          class="honey-status-character"
          data-testid="honey-status-character"
          :src="honeyCharacterImage"
          alt="꿀통을 들고 있는 EZ-ONE 캐릭터"
          width="512"
          height="512"
        />
      </section>
    </div>

    <section class="honey-guide-section" aria-label="꿀통 채우는 방법">
      <h3>어떻게 채우나요?</h3>
      <div class="honey-guide-list">
        <article v-for="item in guideItems" :key="item.title" class="honey-guide-card">
          <span class="honey-drop-pill">💧 {{ item.drop }}</span>
          <strong>{{ item.title }}</strong>
          <p>{{ item.description }}</p>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import honeyCharacterImage from '@/assets/bee-honey-jar-cutout.png';
import { useDashboardStore } from '@/stores/dashboardStore';

const HALF_YEAR_WEEKS = 26;

const props = defineProps({
  activities: {
    type: Array,
    default: () => []
  }
});

const dashboardStore = useDashboardStore();
const selectedDate = ref(null);
const selectedDateLogs = ref([]);
const isLoadingLogs = ref(false);

const guideItems = [
  {
    drop: '1방울',
    title: '새로운 공고 스크랩',
    description: '장바구니에 새로운 채용 공고를 담을 때마다 기록됩니다.'
  },
  {
    drop: '1방울',
    title: '자소서 작성 및 수정',
    description: '지원 워크스페이스에서 자소서 문항을 작성하고 저장하면 기록됩니다.'
  },
  {
    drop: '1방울',
    title: '참고자료 추가',
    description: '지원 워크스페이스에 직무, 기업, JD 관련 레퍼런스를 추가하면 기록됩니다.'
  },
  {
    drop: '2방울',
    title: '지원 상태 업데이트',
    description: "공고를 '진행 중' 또는 '지원 완료'로 변경하면 더 큰 점수를 받습니다."
  }
];

async function selectDay(day) {
  if (day.isFuture) return;
  selectedDate.value = day.dateStr;
  isLoadingLogs.value = true;
  try {
    const realLogs = await dashboardStore.loadActivityLogs(day.dateStr);
    selectedDateLogs.value = realLogs || [];
  } finally {
    isLoadingLogs.value = false;
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${year}년 ${parseInt(month, 10)}월 ${parseInt(day, 10)}일`;
}

const graphStartDate = computed(() => {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(today.getDate() - (HALF_YEAR_WEEKS * 7) - today.getDay());
  return startDate;
});

const activityMap = computed(() => {
  const map = {};
  for (const act of props.activities) {
    map[act.date] = Number(act.score || 0);
  }
  return map;
});

const selectedDayScore = computed(() => {
  if (!selectedDate.value) return 0;
  return activityMap.value[selectedDate.value] || 0;
});

const displayedDateLogs = computed(() => {
  return selectedDateLogs.value;
});

const recentActivityMap = computed(() => {
  const map = {};
  for (const act of props.activities) {
    const activityDate = new Date(`${act.date}T00:00:00`);
    if (activityDate >= graphStartDate.value && activityDate <= new Date()) {
      map[act.date] = Number(act.score || 0);
    }
  }
  return map;
});

const totalHoney = computed(() => {
  return Object.values(recentActivityMap.value).reduce((sum, score) => sum + Number(score || 0), 0);
});

const streakSummary = computed(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let currentStreak = 0;
  let maxStreak = 0;
  let runningStreak = 0;

  for (let offset = 0; offset <= HALF_YEAR_WEEKS * 7; offset++) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const dateStr = toDateString(date);
    const hasActivity = Number(recentActivityMap.value[dateStr] || 0) > 0;

    if (hasActivity) {
      runningStreak++;
      if (offset === currentStreak) {
        currentStreak++;
      }
      maxStreak = Math.max(maxStreak, runningStreak);
    } else {
      runningStreak = 0;
      if (offset === 0) {
        currentStreak = 0;
      }
    }
  }

  return { currentStreak, maxStreak };
});

const currentStreak = computed(() => streakSummary.value.currentStreak);
const maxStreak = computed(() => streakSummary.value.maxStreak);

const weeks = computed(() => {
  const result = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const currentDate = new Date(graphStartDate.value);

  for (let w = 0; w <= HALF_YEAR_WEEKS; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = toDateString(currentDate);
      const score = activityMap.value[dateStr] || 0;
      let level = 0;
      if (score >= 4) level = 4;
      else if (score === 3) level = 3;
      else if (score === 2) level = 2;
      else if (score === 1) level = 1;

      week.push({
        dateStr,
        score,
        level,
        isFuture: currentDate > today
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }
    result.push(week);
  }

  return result;
});

const months = computed(() => {
  const result = [];
  let currentMonth = -1;
  let weeksCount = 0;

  for (const week of weeks.value) {
    const firstDayStr = week[0].dateStr;
    const month = parseInt(firstDayStr.split('-')[1], 10);

    if (currentMonth !== month) {
      if (currentMonth !== -1) {
        result.push({
          label: getMonthName(currentMonth),
          weeks: weeksCount
        });
      }
      currentMonth = month;
      weeksCount = 1;
    } else {
      weeksCount++;
    }
  }

  if (weeksCount > 0) {
    result.push({
      label: getMonthName(currentMonth),
      weeks: weeksCount
    });
  }

  return result;
});

function toDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMonthName(m) {
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return names[m - 1];
}
</script>

<style scoped>
.honey-pot-graph-container {
  display: grid;
  gap: 14px;
  margin: 0;
  border-radius: 18px;
  background: transparent;
  padding: 16px;
}

.honey-pot-top {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 0.36fr);
  gap: 14px;
  align-items: stretch;
}

.honey-log-card,
.honey-status-panel,
.honey-guide-section {
  border: 1px solid #edf0f6;
  border-radius: 14px;
  background: #ffffff;
  box-shadow:
    0 14px 30px rgba(30, 41, 59, 0.055),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.honey-log-card {
  min-width: 0;
  overflow: hidden;
  padding: 14px;
}

.honey-log-body {
  display: grid;
  grid-template-columns: minmax(0, max-content) minmax(160px, 1fr);
  align-items: start;
  gap: 18px;
  min-height: 190px;
}

.honey-log-side-panel {
  display: flex;
  min-width: 240px;
  max-width: 360px;
  height: 190px;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #eef2f7;
  border-radius: 14px;
  background: linear-gradient(180deg, #ffffff 0%, #fbfcff 100%);
  padding: 12px;
}

.honey-log-placeholder {
  min-width: 240px;
  max-width: 360px;
  height: 190px;
}

.log-panel-empty {
  display: grid;
  height: 100%;
  align-content: start;
  gap: 7px;
  color: #64748b;
}

.log-panel-empty strong {
  color: #111827;
  font-size: 0.9rem;
  font-weight: 850;
}

.log-panel-empty p {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 650;
  line-height: 1.45;
  word-break: keep-all;
}

.honey-pot-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 12px;
}

.honey-pot-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: #1e293b;
  font-size: 1rem;
  font-weight: 800;
  line-height: 1.2;
}

.honey-pot-subtitle {
  color: #94a3b8;
  font-size: 0.78rem;
  font-weight: 650;
}

.honey-pot-legend {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #64748b;
  font-size: 0.76rem;
  white-space: nowrap;
}

.honey-pot-legend .honey-pot-cell {
  margin: 0 1px;
  cursor: default;
  pointer-events: none;
}

.honey-pot-grid-scroll {
  overflow-x: auto;
  padding-bottom: 4px;
}

.honey-pot-grid-scroll::-webkit-scrollbar {
  height: 6px;
}

.honey-pot-grid-scroll::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: #cbd5e1;
}

.honey-pot-graph-body {
  display: flex;
  gap: 8px;
  min-width: max-content;
}

.honey-pot-y-axis {
  display: grid;
  grid-template-rows: repeat(7, 12px);
  gap: 4px;
  margin-top: 20px;
  color: #64748b;
  font-size: 0.65rem;
  line-height: 12px;
}

.honey-pot-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.honey-pot-months {
  display: flex;
  height: 16px;
  color: #64748b;
  font-size: 0.65rem;
}

.honey-pot-months span {
  display: inline-block;
  overflow: hidden;
}

.honey-pot-grid {
  display: flex;
  gap: 4px;
  cursor: default;
}

.honey-pot-grid:hover .honey-pot-cell:not(.future),
.honey-pot-cell:not(.future):hover {
  opacity: 0.82;
}

.honey-pot-week {
  display: grid;
  grid-template-rows: repeat(7, 12px);
  gap: 4px;
}

.honey-pot-cell {
  width: 12px;
  height: 12px;
  border: 0;
  border-radius: 3px;
  appearance: none;
  background-color: #ebedf0;
  padding: 0;
  cursor: pointer;
  transition:
    opacity 0.16s ease,
    transform 0.16s ease,
    outline-color 0.16s ease;
}

.honey-pot-cell:not(.future):hover {
  transform: translateY(-1px);
}

.honey-pot-cell:focus-visible {
  outline: 2px solid #5a35f0;
  outline-offset: 2px;
}

.honey-pot-cell.level-0 {
  background-color: #f1f5f9;
}

.honey-pot-cell.level-1 {
  background-color: #fef08a;
}

.honey-pot-cell.level-2 {
  background-color: #fde047;
}

.honey-pot-cell.level-3 {
  background-color: #eab308;
}

.honey-pot-cell.level-4 {
  background-color: #ca8a04;
}

.honey-pot-cell.future {
  border: 1px solid #f1f5f9;
  background-color: transparent;
  cursor: default;
}

.honey-pot-cell:disabled {
  pointer-events: none;
}

.honey-pot-cell.selected {
  outline: 2px solid #5a35f0;
  outline-offset: 1px;
}

.honey-status-panel {
  position: relative;
  min-height: 172px;
  overflow: hidden;
  padding: 14px;
  background: #ffffff;
}

.honey-status-copy {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 10px;
  padding-right: 84px;
}

.honey-status-panel h3,
.honey-guide-section h3 {
  margin: 0;
  color: #1e293b;
  font-size: 0.95rem;
  font-weight: 850;
  line-height: 1.25;
}

.honey-status-grid {
  display: grid;
  gap: 8px;
}

.honey-status-card {
  display: grid;
  gap: 4px;
  min-height: 54px;
  border: 1px solid rgba(234, 179, 8, 0.28);
  border-radius: 12px;
  background: rgba(255, 251, 235, 0.74);
  padding: 9px 10px;
}

.honey-status-card span {
  color: #a16207;
  font-size: 0.74rem;
  font-weight: 720;
}

.honey-status-card strong {
  color: #92400e;
  font-size: 1.08rem;
  font-weight: 850;
  line-height: 1;
}

.honey-status-character {
  position: absolute;
  right: 8px;
  bottom: 2px;
  z-index: 2;
  width: 74px;
  height: 74px;
  border-radius: 18px;
  background: #ffffff;
  object-fit: contain;
  filter: none;
  pointer-events: none;
}

.honey-guide-section {
  display: grid;
  gap: 12px;
  padding: 14px;
}

.honey-guide-list {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.honey-guide-card {
  display: grid;
  align-content: start;
  gap: 8px;
  min-height: 120px;
  border: 1px solid #eef2f7;
  border-radius: 12px;
  background: linear-gradient(180deg, #ffffff 0%, #fbfcff 100%);
  padding: 12px;
}

.honey-drop-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  justify-self: start;
  min-height: 24px;
  border-radius: 999px;
  background: #fff3c4;
  color: #d97706;
  font-size: 0.78rem;
  font-weight: 850;
  padding: 0 10px;
}

.honey-guide-card strong {
  color: #111827;
  font-size: 0.86rem;
  font-weight: 850;
  line-height: 1.25;
}

.honey-guide-card p {
  margin: 0;
  color: #64748b;
  font-size: 0.76rem;
  font-weight: 620;
  line-height: 1.45;
  word-break: keep-all;
}

.details-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  border-bottom: 1px solid #edf0f6;
  padding-bottom: 10px;
}

.details-header.compact {
  gap: 8px;
  margin-bottom: 9px;
  padding-bottom: 8px;
}

.details-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #111827;
}

.details-title-copy {
  display: grid;
  gap: 2px;
}

.details-title h4 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 800;
}

.details-header.compact .details-title h4 {
  font-size: 0.82rem;
}

.details-title-copy p {
  margin: 0;
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 650;
}

.details-header.compact .details-title-copy p {
  font-size: 0.7rem;
}

.calendar-icon {
  color: #2563eb;
}

.close-details {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 50%;
  background: #f8fafc;
  color: #64748b;
  font-size: 1.1rem;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.close-details:hover {
  background: #e2e8f0;
  color: #111827;
}

.timeline-container {
  display: flex;
  flex-direction: column;
  padding-left: 8px;
}

.timeline-container.compact {
  max-height: 118px;
  overflow-y: auto;
  padding-left: 3px;
  padding-right: 2px;
}

.timeline-item {
  position: relative;
  display: flex;
  gap: 14px;
}

.timeline-container.compact .timeline-item {
  gap: 9px;
}

.timeline-marker {
  display: flex;
  flex: 0 0 24px;
  flex-direction: column;
  align-items: center;
  width: 24px;
}

.timeline-icon {
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin-top: 2px;
  border: 2px solid #fff;
  border-radius: 50%;
  background: #f0fdf4;
  box-shadow: 0 0 0 1px #bbf7d0;
  color: #16a34a;
}

.timeline-container.compact .timeline-icon {
  width: 22px;
  height: 22px;
}

.timeline-line {
  flex-grow: 1;
  width: 2px;
  min-height: 24px;
  margin-top: -4px;
  margin-bottom: -4px;
  background: #e2e8f0;
}

.timeline-content {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  padding-bottom: 20px;
}

.timeline-container.compact .timeline-content {
  padding-bottom: 12px;
}

.timeline-item:last-child .timeline-content {
  padding-bottom: 0;
}

.timeline-time {
  margin-bottom: 4px;
  color: #94a3b8;
  font-size: 0.78rem;
  font-weight: 650;
}

.timeline-card {
  display: flex;
  align-items: center;
  border: 1px solid #edf0f6;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 2px 4px rgba(15, 23, 42, 0.02);
  padding: 10px 12px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.timeline-container.compact .timeline-card {
  border-radius: 10px;
  padding: 8px 9px;
}

.timeline-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
}

.timeline-desc {
  color: #111827;
  font-size: 0.86rem;
  font-weight: 650;
}

.timeline-container.compact .timeline-desc {
  font-size: 0.75rem;
  line-height: 1.45;
}

.empty-logs,
.loading-logs {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 28px 0;
  color: #94a3b8;
}

.empty-logs.compact,
.loading-logs.compact {
  min-height: 88px;
  padding: 10px 0;
  text-align: center;
}

.empty-logs p {
  margin: 0;
  font-size: 0.86rem;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e2e8f0;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1080px) {
  .honey-pot-top {
    grid-template-columns: 1fr;
  }

  .honey-guide-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .honey-pot-graph-container {
    padding: 12px;
  }

  .honey-pot-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .honey-status-copy {
    padding-right: 74px;
  }

  .honey-status-character {
    width: 64px;
    height: 64px;
    border-radius: 16px;
  }

  .honey-guide-list {
    grid-template-columns: 1fr;
  }
}
</style>
