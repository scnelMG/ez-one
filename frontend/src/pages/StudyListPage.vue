<template>
  <AppLayout>
    <section class="study-page">
      <header class="page-header">
        <h1>취업 스터디</h1>
        <p>함께 취업을 준비할 팀원을 모집하고, 서로의 공고와 자소서를 공유해보세요.</p>
        <div class="header-actions">
          <button class="primary-button" type="button" @click="openCreateModal">
            새 스터디 만들기
          </button>
        </div>
      </header>

      <section class="study-dashboard">
        <article class="dashboard-section">
          <h2>참여 중인 스터디</h2>
          <div class="study-grid">
            <!-- 스터디 카드 목록 (예시) -->
            <div class="study-card" v-for="i in 2" :key="i" @click="goToStudy(i)">
              <h3>프론트엔드 취준 스터디 {{ i }}</h3>
              <p>멤버: {{ i + 2 }}명</p>
            </div>
          </div>
        </article>

        <article class="dashboard-section">
          <h2>받은 초대</h2>
          <div class="invite-list">
            <p class="empty-state">새로운 초대가 없습니다.</p>
          </div>
        </article>
      </section>
    </section>
  </AppLayout>
</template>

<script setup>
import { useRouter } from 'vue-router';
import AppLayout from '@/shared/AppLayout.vue';

const router = useRouter();

function openCreateModal() {
  // 스터디 생성 모달 로직
  alert('스터디 생성 모달 준비 중');
}

function goToStudy(studyId) {
  router.push(`/study/${studyId}`);
}
</script>

<style scoped>
.study-page {
  padding: 40px;
  max-width: 1200px;
  margin: 0 auto;
}
.page-header {
  margin-bottom: 40px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.header-actions {
  margin-top: 16px;
}
.dashboard-section {
  margin-bottom: 40px;
}
.study-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 16px;
}
.study-card {
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 24px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  background: var(--surface);
}
.study-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}
.empty-state {
  color: var(--text-secondary);
  font-size: 0.95rem;
  padding: 20px 0;
}
</style>
