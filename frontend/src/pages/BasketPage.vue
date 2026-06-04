<template>
  <main class="figma-page">
    <header class="figma-page-title">
      <h1>공고 장바구니 페이지</h1>
    </header>

    <section class="figma-frame" aria-label="공고 장바구니 와이어프레임">
      <header class="figma-nav">
        <RouterLink class="figma-logo" to="/">
          <strong>EZ-one</strong>
          <span>로고</span>
        </RouterLink>

        <nav class="figma-menu" aria-label="주요 메뉴">
          <RouterLink to="/basket">공고 장바구니</RouterLink>
          <RouterLink to="/document-profile">서류 입력 정보</RouterLink>
          <RouterLink to="/recommendations">추천 공고</RouterLink>
          <span class="figma-menu-disabled" aria-disabled="true">과거 지원 내역</span>
        </nav>

        <div class="figma-actions">
          <button type="button" class="figma-logout">로그아웃</button>
          <RouterLink class="figma-icon-action" to="/mypage" aria-label="마이페이지">
            <span class="user-icon" aria-hidden="true"></span>
            <small>마이페이지</small>
          </RouterLink>
          <button type="button" class="figma-icon-action" aria-label="알림">
            <span class="bell-icon" aria-hidden="true"></span>
            <small>알림</small>
          </button>
        </div>
      </header>

      <section class="figma-section">
        <h2>캘린더</h2>
        <div class="calendar-box">
          <div class="calendar-heading">
            <button type="button" aria-label="이전 달">‹</button>
            <strong>2026년 6월</strong>
            <button type="button" aria-label="다음 달">›</button>
            <button type="button" class="today-button">오늘</button>
          </div>

          <div class="calendar-grid month-grid" aria-label="2026년 6월 달력">
            <span class="sun">일</span>
            <span>월</span>
            <span>화</span>
            <span>수</span>
            <span>목</span>
            <span>금</span>
            <span class="sat">토</span>

            <div v-for="day in monthDays" :key="day" class="calendar-cell">
              <span :class="{ sun: day % 7 === 1, sat: day % 7 === 0 }">{{ day }}</span>
              <i v-if="[11, 20, 23].includes(day)" aria-hidden="true"></i>
            </div>
          </div>
        </div>
      </section>

      <section class="figma-section">
        <h2>주간 일정</h2>
        <div class="calendar-grid week-grid" aria-label="주간 일정">
          <span class="sun">일</span>
          <span>월</span>
          <span>화</span>
          <span>수</span>
          <span>목</span>
          <span>금</span>
          <span class="sat">토</span>

          <div class="week-cell"></div>
          <div class="week-cell">
            <i></i>
            <i class="short"></i>
          </div>
          <div class="week-cell">
            <i class="short"></i>
          </div>
          <div class="week-cell"></div>
          <div class="week-cell">
            <i></i>
            <i class="short"></i>
          </div>
          <div class="week-cell">
            <i class="short"></i>
          </div>
          <div class="week-cell"></div>
        </div>
      </section>

      <section class="figma-section basket-table-section">
        <div class="basket-title-row">
          <h2>공고 장바구니</h2>
          <div class="basket-tools">
            <button type="button" aria-label="필터링"><span class="filter-icon"></span></button>
            <button type="button" aria-label="정렬"><span class="sort-icon">↕</span></button>
            <button type="button" aria-label="검색"><span class="search-icon"></span></button>
          </div>
        </div>
        <div class="tool-labels" aria-hidden="true">
          <span>필터링</span>
          <span>정렬</span>
          <span>검색</span>
        </div>

        <div class="figma-table" aria-label="공고 장바구니 목록">
          <div class="figma-table-head">
            <span>회사명</span>
            <span>직무</span>
            <span>상태</span>
            <span>마감일자</span>
            <span>채용 사이트 링크</span>
          </div>
          <RouterLink
            v-for="job in tableJobs"
            :key="job.id"
            class="figma-table-row"
            :to="`/workspaces/${job.workspaceId}`"
          >
            <span>{{ job.companyName }}</span>
            <span>{{ job.positionTitle }}</span>
            <span>{{ job.statusLabel }}</span>
            <span>{{ job.deadlineLabel }}</span>
            <span>{{ job.sourceUrl }}</span>
          </RouterLink>
          <div v-for="index in emptyRows" :key="`empty-${index}`" class="figma-table-row empty">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </section>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useBasketStore } from '@/stores/basketStore'

const basketStore = useBasketStore()
const monthDays = Array.from({ length: 30 }, (_, index) => index + 1)
const tableJobs = computed(() => basketStore.jobs.slice(0, 3))
const emptyRows = computed(() => Array.from({ length: Math.max(0, 5 - tableJobs.value.length) }, (_, index) => index))

onMounted(() => {
  void basketStore.loadJobs()
})
</script>
