<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content honey-pot-modal">
      <header class="modal-header">
        <h2>🍯 꿀통 채우기 가이드</h2>
        <button class="icon-button" @click="$emit('close')" aria-label="닫기">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </header>
      <div class="modal-body">
        <section class="status-section">
          <h3>나의 꿀 수집 현황</h3>
          <div class="status-cards">
            <div class="status-card">
              <span class="status-label">최근 1년 모은 꿀</span>
              <strong class="status-value">{{ totalHoney }} 방울</strong>
            </div>
            <div class="status-card">
              <span class="status-label">현재 연속 채우기</span>
              <strong class="status-value">{{ currentStreak }} 일</strong>
            </div>
            <div class="status-card">
              <span class="status-label">최장 연속 채우기</span>
              <strong class="status-value">{{ maxStreak }} 일</strong>
            </div>
          </div>
        </section>

        <section class="criteria-section">
          <h3>어떻게 채우나요?</h3>
          <ul class="criteria-list">
            <li>
              <span class="honey-drop">💧 1방울</span>
              <div>
                <strong>새로운 공고 스크랩</strong>
                <p>장바구니에 새로운 채용 공고를 담을 때마다 기록됩니다.</p>
              </div>
            </li>
            <li>
              <span class="honey-drop">💧 1방울</span>
              <div>
                <strong>자소서 작성 및 수정</strong>
                <p>지원 워크스페이스에서 자소서 문항을 작성하고 저장하면 기록됩니다.</p>
              </div>
            </li>
            <li>
              <span class="honey-drop">💧 1방울</span>
              <div>
                <strong>참고자료 추가</strong>
                <p>지원 워크스페이스에 직무, 기업, JD 관련 레퍼런스를 추가하면 기록됩니다.</p>
              </div>
            </li>
            <li>
              <span class="honey-drop">💧 2방울</span>
              <div>
                <strong>지원 상태 업데이트</strong>
                <p>공고를 '진행 중' 또는 '지원 완료'로 변경하면 더 큰 점수를 받습니다.</p>
              </div>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  activities: {
    type: Array,
    default: () => []
  }
});

defineEmits(['close']);

// Calculate stats
const totalHoney = computed(() => {
  return props.activities.reduce((sum, act) => sum + act.score, 0);
});

const streaks = computed(() => {
  // activities is a list of { date: 'YYYY-MM-DD', score: N }
  // We need to calculate current streak and max streak ending today.
  
  const map = {};
  for (const act of props.activities) {
    if (act.score > 0) {
      map[act.date] = true;
    }
  }

  let currentStreak = 0;
  let maxStreak = 0;
  let tempStreak = 0;

  // Let's iterate backwards from today
  const today = new Date();
  // check up to 365 days ago
  let isCurrent = true;

  for (let i = 0; i <= 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const date = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${date}`;

    if (map[dateStr]) {
      tempStreak++;
      if (isCurrent) currentStreak = tempStreak;
      if (tempStreak > maxStreak) maxStreak = tempStreak;
    } else {
      // Missing a day
      if (i === 0) {
        // If today is missed, current streak might be broken, but we allow today to be 0 and streak from yesterday
        // So we don't break current streak if i === 0
      } else {
        isCurrent = false;
        tempStreak = 0;
      }
    }
  }

  return { currentStreak, maxStreak };
});

const currentStreak = computed(() => streaks.value.currentStreak);
const maxStreak = computed(() => streaks.value.maxStreak);
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.honey-pot-modal {
  width: 90%;
  max-width: 480px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #f1f5f9;
}

.modal-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
}

.modal-body {
  padding: 24px;
  max-height: 70vh;
  overflow-y: auto;
}

.status-section {
  margin-bottom: 24px;
}

.status-section h3 {
  font-size: 15px;
  color: #475569;
  margin-bottom: 12px;
}

.status-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.status-card {
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 12px;
  padding: 16px 12px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.status-label {
  font-size: 12px;
  color: #b45309;
}

.status-value {
  font-size: 18px;
  color: #92400e;
  font-weight: 700;
}

.criteria-section h3 {
  font-size: 15px;
  color: #475569;
  margin-bottom: 16px;
}

.criteria-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.criteria-list li {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.honey-drop {
  background: #fef3c7;
  color: #d97706;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.criteria-list li div strong {
  display: block;
  font-size: 14px;
  color: #1e293b;
  margin-bottom: 4px;
}

.criteria-list li div p {
  margin: 0;
  font-size: 13px;
  color: #64748b;
  line-height: 1.4;
}

.icon-button {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
}

.icon-button:hover {
  background: #f1f5f9;
  color: #475569;
}
</style>
