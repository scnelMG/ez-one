<template>
  <AppLayout>
    <section class="wire-page notion-wire">
      <header class="wire-toolbar">
        <div>
          <p class="section-kicker">공고 동기화</p>
          <h1>Notion 동기화</h1>
          <p>저장한 공고 정보만 Notion으로 보내고 자기소개서와 작성 내용은 동기화하지 않습니다.</p>
        </div>
        <button class="primary-button" type="button">연결하기</button>
      </header>

      <div class="settings-grid">
        <main class="wire-board">
          <section class="notion-shell" aria-label="Notion 동기화 설정">
            <div>
              <p class="section-kicker">동기화 범위</p>
              <h2>공고만 동기화</h2>
              <p>공고명, 회사, 직무, 마감일, 원문 링크만 Notion으로 보냅니다.</p>
            </div>
            <span class="status-chip">활성 범위</span>
          </section>

          <section class="wire-panel" aria-label="Notion 연결 카드">
            <div class="section-heading">
              <div>
                <p class="section-kicker">Connection</p>
                <h2>Notion 계정</h2>
              </div>
              <button class="ghost-button" type="button">다시 연결</button>
            </div>
            <div class="notion-preview">
              <strong>EZ One 지원 공고 DB</strong>
              <p>공고 저장 시 기본 공고 속성만 동기화됩니다.</p>
              <div class="mini-lines" aria-hidden="true">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </section>
        </main>

        <aside class="wire-side-panel">
          <StatePanel
            id="notion-job-only"
            tone="green"
            title="작성 내용은 동기화하지 않음"
            body="현재는 저장한 공고 정보만 Notion에 보내도록 제한해 지원서 초안과 개인 작성 내용은 서비스 안에 남깁니다."
          />
        </aside>
      </div>
    </section>
  </AppLayout>
</template>

<script setup lang="ts">
import AppLayout from '@/shared/AppLayout.vue'
import StatePanel from '@/shared/StatePanel.vue'
</script>
