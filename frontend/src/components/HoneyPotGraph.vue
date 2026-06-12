<template>
  <div class="honey-pot-graph-container">
    <div class="honey-pot-header">
      <h3 class="honey-pot-title">
        🍯 꿀통 채우기 <span class="honey-pot-subtitle">나의 취준 로그</span>
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
    
    <div class="honey-pot-grid-scroll">
      <div class="honey-pot-graph-body">
        <div class="honey-pot-y-axis">
          <span style="grid-row: 2">Mon</span>
          <span style="grid-row: 4">Wed</span>
          <span style="grid-row: 6">Fri</span>
        </div>
        <div class="honey-pot-main">
          <div class="honey-pot-months">
            <span v-for="(month, idx) in months" :key="idx" :style="{ width: `${month.weeks * 16}px` }">
              {{ month.label }}
            </span>
          </div>
          <div class="honey-pot-grid" role="grid" aria-label="꿀통 현황">
            <div v-for="(week, weekIndex) in weeks" :key="weekIndex" class="honey-pot-week">
              <div 
                v-for="day in week" 
                :key="day.dateStr" 
                class="honey-pot-cell" 
                :class="['level-' + day.level, { 'future': day.isFuture, 'selected': day.dateStr === selectedDate }]"
                :title="day.isFuture ? '' : `${formatDate(day.dateStr)}: ${day.score}개의 활동`"
                @click="selectDay(day)"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div v-if="selectedDate" class="honey-pot-details">
      <div class="details-header">
        <div class="details-title">
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" class="calendar-icon"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          <h4>{{ formatDate(selectedDate) }} 활동 내역</h4>
        </div>
        <button class="close-details" @click="selectedDate = null">×</button>
      </div>
      <div v-if="isLoadingLogs" class="loading-logs">
        <div class="spinner"></div> 기록을 불러오는 중...
      </div>
      <div v-else-if="selectedDateLogs.length > 0" class="timeline-container">
        <div v-for="(log, idx) in selectedDateLogs" :key="idx" class="timeline-item">
          <div class="timeline-marker">
            <div class="timeline-icon">
              <svg v-if="log.type === 'COMMIT'" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><line x1="3" y1="12" x2="9" y2="12"></line><line x1="15" y1="12" x2="21" y2="12"></line></svg>
              <svg v-else viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            </div>
            <div class="timeline-line" v-if="idx !== selectedDateLogs.length - 1"></div>
          </div>
          <div class="timeline-content">
            <span class="timeline-time">{{ log.time }}</span>
            <div class="timeline-card">
              <span class="timeline-desc">{{ log.description }}</span>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="empty-logs">
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        <p>기록된 활동이 없습니다.</p>
      </div>
    </div>

    <div class="honey-pot-footer">
      <button class="text-button small" @click="showModal = true">점수 기준표 보기</button>
    </div>
    <HoneyPotModal v-if="showModal" :activities="activities" @close="showModal = false" />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import HoneyPotModal from './HoneyPotModal.vue';
import { useDashboardStore } from '@/stores/dashboardStore';

const props = defineProps({
  activities: {
    type: Array,
    default: () => []
  }
});

const dashboardStore = useDashboardStore();
const showModal = ref(false);
const selectedDate = ref(null);
const selectedDateLogs = ref([]);
const isLoadingLogs = ref(false);

async function selectDay(day) {
  if (day.isFuture) return;
  selectedDate.value = day.dateStr;
  isLoadingLogs.value = true;
  try {
    const realLogs = await dashboardStore.loadActivityLogs(day.dateStr);
    if (!realLogs || realLogs.length === 0) {
      if (day.score > 0) {
        // 더미 로그 생성
        const dummy = [];
        const actions = ['자소서 1번 문항 작성', '자소서 수정 완료', '면접 준비 자료 정리', '기업 정보 스크랩', '이력서 업데이트', '지원 완료'];
        for (let i = 0; i < day.score; i++) {
          const hour = 10 + Math.floor(Math.random() * 10);
          const min = String(Math.floor(Math.random() * 60)).padStart(2, '0');
          const type = Math.random() > 0.5 ? 'COMMIT' : 'DOC';
          dummy.push({
            time: `${hour}:${min}`,
            description: `[네이버] ${actions[Math.floor(Math.random() * actions.length)]}`,
            type: type
          });
        }
        // 시간순 정렬
        dummy.sort((a, b) => a.time.localeCompare(b.time));
        selectedDateLogs.value = dummy;
      } else {
        selectedDateLogs.value = [];
      }
    } else {
      selectedDateLogs.value = realLogs;
    }
  } finally {
    isLoadingLogs.value = false;
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${year}년 ${parseInt(month, 10)}월 ${parseInt(day, 10)}일`;
}

// Map of { "2026-06-11": 3 }
const activityMap = computed(() => {
  const map = {};
  for (const act of props.activities) {
    map[act.date] = act.score;
  }
  return map;
});

const weeks = computed(() => {
  const result = [];
  const today = new Date();
  
  // Start from exactly 52주 전 일요일
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - (52 * 7) - today.getDay());
  
  let currentDate = new Date(startDate);
  
  // Generate 53 weeks (to include today)
  for (let w = 0; w < 53; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const date = String(currentDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${date}`;
      
      const score = activityMap.value[dateStr] || 0;
      let level = 0;
      if (score >= 4) level = 4;
      else if (score === 3) level = 3;
      else if (score === 2) level = 2;
      else if (score === 1) level = 1;
      
      const isFuture = currentDate > today;
      
      week.push({
        dateStr,
        score,
        level,
        isFuture
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
  
  for (let w = 0; w < weeks.value.length; w++) {
    const week = weeks.value[w];
    // Use the first day of the week to determine the month
    const firstDayStr = week[0].dateStr; // YYYY-MM-DD
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

function getMonthName(m) {
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return names[m - 1];
}
</script>

<style scoped>
.honey-pot-graph-container {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
  margin-top: 16px;
  margin-bottom: 24px;
}

.honey-pot-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.honey-pot-title {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
  display: flex;
  align-items: center;
}

.honey-pot-subtitle {
  font-size: 13px;
  font-weight: 400;
  color: #94a3b8;
  margin-left: 8px;
}

.honey-pot-legend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #64748b;
}

.honey-pot-legend .honey-pot-cell {
  margin: 0 2px;
}

.honey-pot-grid-scroll {
  overflow-x: auto;
  padding-bottom: 8px;
}

/* Hide scrollbar for clean look but keep functionality */
.honey-pot-grid-scroll::-webkit-scrollbar {
  height: 6px;
}
.honey-pot-grid-scroll::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.honey-pot-graph-body {
  display: flex;
  gap: 8px;
}

.honey-pot-y-axis {
  display: grid;
  grid-template-rows: repeat(7, 12px);
  gap: 4px;
  font-size: 10px;
  color: #64748b;
  line-height: 12px;
  margin-top: 20px; /* Align with cells below months */
}

.honey-pot-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.honey-pot-months {
  display: flex;
  font-size: 10px;
  color: #64748b;
  height: 16px;
}

.honey-pot-months span {
  display: inline-block;
  overflow: hidden;
}

.honey-pot-grid {
  display: flex;
  gap: 4px;
  min-width: max-content;
  cursor: pointer;
}

.honey-pot-grid:hover .honey-pot-cell:not(.future) {
  opacity: 0.8;
}

.honey-pot-week {
  display: grid;
  grid-template-rows: repeat(7, 12px);
  gap: 4px;
}

.honey-pot-cell {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  background-color: #ebedf0;
}

.honey-pot-cell.level-0 {
  background-color: #f1f5f9; /* Slate 100 */
}

.honey-pot-cell.level-1 {
  background-color: #fef08a; /* Yellow 200 */
}

.honey-pot-cell.level-2 {
  background-color: #fde047; /* Yellow 300 */
}

.honey-pot-cell.level-3 {
  background-color: #eab308; /* Yellow 500 */
}

.honey-pot-cell.level-4 {
  background-color: #ca8a04; /* Yellow 600 */
}

.honey-pot-cell.future {
  background-color: transparent;
  border: 1px solid #f1f5f9;
}

.honey-pot-cell.selected {
  outline: 2px solid #3b82f6;
  outline-offset: 1px;
}

.honey-pot-details {
  margin-top: 24px;
  padding: 24px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid rgba(79, 70, 229, 0.1);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
}

.details-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--line);
}

.details-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--ink);
}

.details-title h4 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
}

.calendar-icon {
  color: var(--blue);
}

.close-details {
  background: var(--surface-hover);
  border: none;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.close-details:hover {
  background: var(--line);
  color: var(--ink);
}

.timeline-container {
  display: flex;
  flex-direction: column;
  padding-left: 8px;
}

.timeline-item {
  display: flex;
  gap: 16px;
  position: relative;
}

.timeline-marker {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 24px;
  flex-shrink: 0;
}

.timeline-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #f0fdf4;
  color: #16a34a;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px #bbf7d0;
  z-index: 2;
  margin-top: 2px;
}

.timeline-line {
  width: 2px;
  flex-grow: 1;
  background: #e2e8f0;
  margin-top: -4px;
  margin-bottom: -4px;
  min-height: 24px;
}

.timeline-content {
  display: flex;
  flex-direction: column;
  padding-bottom: 24px;
  flex-grow: 1;
}

.timeline-item:last-child .timeline-content {
  padding-bottom: 0;
}

.timeline-time {
  font-size: 0.85rem;
  color: var(--text-tertiary);
  margin-bottom: 4px;
  font-weight: 500;
}

.timeline-card {
  background: white;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 12px 16px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.02);
  display: flex;
  align-items: center;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.timeline-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  border-color: var(--blue-light);
}

.timeline-desc {
  color: var(--ink);
  font-size: 0.95rem;
  font-weight: 500;
}

.empty-logs, .loading-logs {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 0;
  color: var(--text-tertiary);
  gap: 12px;
}

.empty-logs p {
  margin: 0;
  font-size: 0.95rem;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--line-strong);
  border-top-color: var(--blue);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.honey-pot-footer {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

</style>
