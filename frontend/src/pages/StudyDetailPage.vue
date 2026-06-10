<template>
  <AppLayout>
    <section class="study-detail-page">
      <header class="study-header">
        <div class="breadcrumb">
          <RouterLink to="/study">← 취업 스터디 목록으로</RouterLink>
        </div>
        <h1>{{ studyStore.currentStudy?.name || '로딩 중...' }}</h1>
        <p class="study-description">{{ studyStore.currentStudy?.description }}</p>
        <div class="header-actions">
          <button class="ghost-button" type="button" @click="inviteMember">팀원 초대</button>
        </div>
      </header>

      <div class="study-layout">
        <!-- 좌측 사이드바: 탭 메뉴 -->
        <aside class="study-sidebar">
          <nav class="study-nav">
            <button
              :class="{ active: activeTab === 'dashboard' }"
              @click="activeTab = 'dashboard'"
            >
              스터디 대시보드
            </button>
            <button
              :class="{ active: activeTab === 'essays' }"
              @click="activeTab = 'essays'"
            >
              자소서 피드백
            </button>
            <button
              :class="{ active: activeTab === 'jobs' }"
              @click="activeTab = 'jobs'"
            >
              지인 공고 추천
            </button>
          </nav>
        </aside>

        <!-- 우측 메인 콘텐츠 -->
        <main class="study-main-content">
          <!-- 대시보드 탭 -->
          <div v-if="activeTab === 'dashboard'" class="tab-pane">
            <h2>멤버 현황</h2>
            <div v-if="studyStore.status === 'loading'" class="loading-state">로딩 중...</div>
            <div v-else class="member-list">
              <div class="member-row" v-for="member in studyStore.currentStudy?.members || []" :key="member.id">
                <div class="member-info">
                  <span class="member-avatar">{{ member.userEmail.charAt(0).toUpperCase() }}</span>
                  <strong>{{ member.userEmail }}</strong>
                  <span class="role-badge" v-if="member.role === 'LEADER'">스터디장</span>
                </div>
                <div class="member-stats">
                  <span>진행 중인 공고: <strong>{{ member.activeJobCount || 0 }}</strong>개</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 자소서 피드백 탭 -->
          <div v-if="activeTab === 'essays'" class="tab-pane">
            <div class="section-heading">
              <h2>공유된 자소서</h2>
              <button class="primary-button" type="button" @click="shareEssay">내 자소서 공유하기</button>
            </div>
            <div v-if="studyStore.sharedEssays.length === 0" class="empty-state">
              아직 공유된 자소서가 없습니다.
            </div>
            <div v-else class="shared-list">
              <div class="shared-card" v-for="essay in studyStore.sharedEssays" :key="essay.id">
                <p><strong>{{ essay.userEmail }}</strong>님이 자소서를 공유했습니다.</p>
                <small>{{ new Date(essay.sharedAt).toLocaleString() }}</small>
                <button class="text-button" @click="viewEssay(essay.id)">자세히 보기</button>
              </div>
            </div>
          </div>

          <!-- 지인 공고 추천 탭 -->
          <div v-if="activeTab === 'jobs'" class="tab-pane">
            <div class="section-heading">
              <h2>추천된 공고</h2>
              <button class="primary-button" type="button" @click="recommendJob">내 장바구니에서 공고 추천</button>
            </div>
            <div v-if="studyStore.sharedJobs.length === 0" class="empty-state">
              아직 추천된 공고가 없습니다.
            </div>
            <div v-else class="shared-list">
              <div class="shared-card" v-for="job in studyStore.sharedJobs" :key="job.id">
                <p><strong>{{ job.recommenderEmail }}</strong>님이 추천했습니다.</p>
                <h3>{{ job.companyName }} - {{ job.positionTitle }}</h3>
                <p>마감일: {{ job.deadlineLabel }}</p>
                <a v-if="job.sourceUrl" :href="job.sourceUrl" target="_blank" class="text-button">공고 보러가기</a>
              </div>
            </div>
          </div>
        </main>
      </div>
    </section>
  </AppLayout>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import AppLayout from '@/shared/AppLayout.vue';
import { useStudyStore } from '@/stores/studyStore';
import { studyApi } from '@/features/study/api/studyApi';

const route = useRoute();
const studyStore = useStudyStore();
const activeTab = ref('dashboard');
const studyId = route.params.studyId;

onMounted(() => {
  loadData();
});

watch(activeTab, () => {
  loadData();
});

function loadData() {
  if (activeTab.value === 'dashboard') {
    studyStore.loadStudyDetail(studyId);
  } else if (activeTab.value === 'essays') {
    studyStore.loadSharedEssays(studyId);
  } else if (activeTab.value === 'jobs') {
    studyStore.loadSharedJobs(studyId);
  }
}

async function inviteMember() {
  const email = prompt('초대할 팀원의 이메일을 입력하세요:');
  if (email) {
    try {
      await studyApi.inviteMember(studyId, email);
      alert(`${email} 님에게 초대 메일을 보냈습니다!`);
    } catch (e) {
      alert(e.message || '초대 실패');
    }
  }
}

function shareEssay() {
  alert('자소서 공유 모달 준비 중 (내 진행중인 공고 목록 -> 버전 선택)');
}

function viewEssay(essayId) {
  alert(`자소서 상세 보기 및 피드백 모달 준비 중: ${essayId}`);
}

function recommendJob() {
  alert('공고 추천 모달 준비 중 (내 장바구니 목록 -> 공고 선택)');
}
</script>

<style scoped>
.study-detail-page {
  padding: 40px;
  max-width: 1200px;
  margin: 0 auto;
}
.breadcrumb {
  margin-bottom: 16px;
  font-size: 0.9rem;
}
.study-header {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--line);
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}
.study-layout {
  display: flex;
  gap: 40px;
}
.study-sidebar {
  width: 240px;
  flex-shrink: 0;
}
.study-nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.study-nav button {
  text-align: left;
  padding: 12px 16px;
  border-radius: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 1rem;
  color: var(--text-secondary);
}
.study-nav button:hover {
  background: var(--surface-hover);
}
.study-nav button.active {
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: bold;
}
.study-main-content {
  flex-grow: 1;
}
.section-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}
.member-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 16px;
}
.member-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 8px;
}
.member-info {
  display: flex;
  align-items: center;
  gap: 12px;
}
.member-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--line);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: var(--text-secondary);
}
.role-badge {
  font-size: 0.75rem;
  background: var(--color-primary-light);
  color: var(--color-primary);
  padding: 2px 6px;
  border-radius: 4px;
}
.shared-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.shared-card {
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
}
.shared-card h3 {
  margin: 8px 0;
}
.empty-state {
  color: var(--text-secondary);
  padding: 40px 0;
  text-align: center;
  background: var(--surface);
  border-radius: 8px;
  border: 1px dashed var(--line-strong);
}
</style>
