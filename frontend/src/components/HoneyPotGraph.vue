<template>
  <div class="honey-pot-graph-container">
    <div class="honey-pot-header">
      <h3 class="honey-pot-title">🍯 꿀통 채우기 (나의 취준 활동)</h3>
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
      <div class="honey-pot-grid">
        <div v-for="(week, weekIndex) in weeks" :key="weekIndex" class="honey-pot-week">
          <div 
            v-for="day in week" 
            :key="day.dateStr" 
            class="honey-pot-cell" 
            :class="['level-' + day.level, { 'future': day.isFuture }]"
            :title="day.isFuture ? '' : `${day.dateStr}: ${day.score} 방울`"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue';

const props = defineProps({
  activities: {
    type: Array,
    default: () => []
  }
});

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

.honey-pot-grid {
  display: flex;
  gap: 4px;
  min-width: max-content;
}

.honey-pot-week {
  display: flex;
  flex-direction: column;
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
</style>
