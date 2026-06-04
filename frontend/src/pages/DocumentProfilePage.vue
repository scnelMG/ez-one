<template>
  <AppLayout>
    <section class="wire-page document-wire">
      <header class="wire-toolbar">
        <div>
          <p class="section-kicker">반복 입력 정보</p>
          <h1>서류 입력 정보</h1>
          <p>반복해서 쓰는 지원서 정보를 섹션별로 저장하고 워크스페이스 기본값으로 재사용합니다.</p>
        </div>
        <button class="primary-button" type="button">저장</button>
      </header>

      <section class="workspace-tabs" aria-label="서류 정보 탭">
        <button
          v-for="section in sections"
          :key="section"
          class="tab-button"
          :class="{ active: section === '기본정보' }"
          type="button"
        >
          {{ section }}
        </button>
      </section>

      <div class="document-editor-grid">
        <aside class="wire-side-rail" aria-label="서류 섹션 목록">
          <strong>입력 섹션</strong>
          <button class="rail-button active" type="button">기본정보</button>
          <button class="rail-button" type="button">학력</button>
          <button class="rail-button" type="button">경력</button>
          <button class="rail-button" type="button">프로젝트</button>
          <button class="rail-button" type="button">커스텀</button>
        </aside>

        <main class="document-form-panel">
          <div class="section-heading">
            <div>
              <p class="section-kicker">기본정보</p>
              <h2>지원서 공통 입력값</h2>
            </div>
            <span class="status-chip">자동 불러오기</span>
          </div>
          <section class="form-shell compact">
            <label>
              이름
              <input value="EZ One 사용자" readonly />
            </label>
            <label>
              이메일
              <input value="user@example.com" readonly />
            </label>
            <label>
              휴대폰
              <input value="010-0000-0000" readonly />
            </label>
            <label>
              주소
              <input value="서울특별시" readonly />
            </label>
          </section>
        </main>

        <aside class="wire-side-panel">
          <p class="section-kicker">워크스페이스 기본값</p>
          <h2>워크스페이스 기본값</h2>
          <p>입력한 값은 공고별 워크스페이스에서 기본값으로 불러옵니다.</p>
          <div class="summary-stack">
            <ShellCard
              v-for="card in documentProfileCards"
              :key="card.title"
              :kicker="card.kicker"
              :title="card.title"
              :body="card.body"
              :status="card.status"
            />
          </div>
        </aside>
      </div>
    </section>
  </AppLayout>
</template>

<script setup lang="ts">
import { documentProfileCards } from '@/data/shellContent'
import AppLayout from '@/shared/AppLayout.vue'
import ShellCard from '@/shared/ShellCard.vue'

const sections = ['기본정보', '학력', '경력', '프로젝트', '자격증', '수상/활동', '커스텀']
</script>
