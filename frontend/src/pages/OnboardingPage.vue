<template>
  <AppLayout>
    <section class="wire-page onboarding-wire">
      <div class="modal-scrim">
        <section class="onboarding-dialog" aria-label="온보딩 입력 모달">
          <div class="dialog-header">
            <div>
              <p class="section-kicker">ONB-001 / ONB-002</p>
              <h1>선호 조건을 알려주세요</h1>
              <p>추천 공고와 마이페이지 설정에 함께 쓰일 기본 정보를 정리합니다.</p>
            </div>
            <span class="status-chip">최초 로그인</span>
          </div>

          <section class="tag-section" aria-label="선호 직무">
            <strong>선호 직무</strong>
            <div class="tag-list">
              <button class="filter-chip active" type="button">백엔드 개발자</button>
              <button class="filter-chip" type="button">서버 개발자</button>
              <button class="filter-chip" type="button">플랫폼 엔지니어</button>
            </div>
          </section>

          <section class="tag-section" aria-label="선호 기업 유형">
            <strong>선호 기업 유형</strong>
            <div class="tag-list">
              <button class="filter-chip active" type="button">대기업</button>
              <button class="filter-chip active" type="button">스타트업</button>
              <button class="filter-chip" type="button">공공기관</button>
              <button class="filter-chip" type="button">중견기업</button>
            </div>
          </section>

          <section class="tag-section" aria-label="기술 스택">
            <strong>기술 스택</strong>
            <div class="tag-list">
              <button class="filter-chip active" type="button">Java</button>
              <button class="filter-chip active" type="button">Spring Boot</button>
              <button class="filter-chip active" type="button">MyBatis</button>
              <button class="filter-chip" type="button">MySQL</button>
            </div>
          </section>

          <section class="form-shell compact" aria-label="추가 선호 정보">
            <label>
              근무 지역
              <input value="서울, 경기" readonly />
            </label>
            <label>
              SSAFY 여부
              <input value="아니오" readonly />
            </label>
            <label>
              관심 산업
              <input value="플랫폼, 생산성 도구" readonly />
            </label>
          </section>

          <div class="dialog-actions">
            <button class="ghost-button" type="button">건너뛰기</button>
            <button class="primary-button" type="button">저장하고 시작</button>
          </div>
        </section>
      </div>
    </section>
  </AppLayout>
</template>

<script setup lang="ts">
import AppLayout from '@/shared/AppLayout.vue'
</script>
