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
          <div v-if="studyStore.status === 'loading'" class="loading-state">불러오는 중...</div>
          <div v-else-if="studyStore.myStudies.length === 0" class="empty-state">
            아직 참여 중인 스터디가 없습니다. 새 스터디를 만들어 보세요!
          </div>
          <div v-else class="study-grid">
            <div class="study-card" v-for="study in studyStore.myStudies" :key="study.id" @click="goToStudy(study.id)">
              <h3>{{ study.name }}</h3>
              <p>{{ study.description }}</p>
              <p class="member-count">멤버: {{ study.memberCount || 1 }}명</p>
            </div>
          </div>
        </article>

        <article class="dashboard-section">
          <h2>받은 초대</h2>
          <div v-if="studyStore.myInvites.length === 0" class="empty-state">
            새로운 초대가 없습니다.
          </div>
          <div v-else class="invite-list">
            <div class="invite-card" v-for="invite in studyStore.myInvites" :key="invite.id">
              <p><strong>{{ invite.inviterEmail }}</strong>님이 <strong>{{ invite.studyName }}</strong> 스터디에 초대했습니다.</p>
              <div class="invite-actions">
                <button class="primary-button" @click="respondInvite(invite.id, true)">수락</button>
                <button class="ghost-button" @click="respondInvite(invite.id, false)">거절</button>
              </div>
            </div>
          </div>
        </article>
      </section>
    </section>
  </AppLayout>
</template>

<script setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import AppLayout from '@/shared/AppLayout.vue';
import { useStudyStore } from '@/stores/studyStore';

const router = useRouter();
const studyStore = useStudyStore();

onMounted(() => {
  studyStore.loadMyStudies();
});

async function openCreateModal() {
  const name = prompt('스터디 이름을 입력하세요:');
  if (!name) return;
  const desc = prompt('스터디 설명을 입력하세요 (선택):') || '';
  try {
    await studyStore.createStudy(name, desc);
    alert('스터디가 생성되었습니다!');
  } catch (e) {
    alert(e.message);
  }
}

function goToStudy(studyId) {
  router.push(`/study/${studyId}`);
}

async function respondInvite(inviteId, accept) {
  try {
    await studyStore.respondToInvite(inviteId, accept);
  } catch (e) {
    alert(e.message);
  }
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
.member-count {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-top: 12px;
}
.invite-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.invite-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
}
.invite-actions {
  display: flex;
  gap: 8px;
}
.empty-state, .loading-state {
  color: var(--text-secondary);
  font-size: 0.95rem;
  padding: 20px 0;
}
</style>
