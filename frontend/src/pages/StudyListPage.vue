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
              <div class="study-info">
                <h3>{{ study.name }}</h3>
                <p>{{ study.description }}</p>
                <p class="member-count">멤버: {{ study.memberCount || 1 }}명</p>
              </div>
              <div class="study-image-upload" @click.stop>
                <img v-if="study.imageUrl" :src="study.imageUrl" alt="Study Thumbnail" class="study-thumb" />
                <button v-else class="upload-btn" @click.stop="triggerUpload(study.id)">+</button>
                <input type="file" :ref="el => setFileInput(study.id, el)" @change="e => uploadImage(study.id, e)" accept="image/*" style="display: none;" />
              </div>
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
    <!-- 스터디 만들기 모달 -->
    <div v-if="isCreateModalOpen" class="modal-backdrop" @click.self="closeCreateModal">
      <div class="modal-content">
        <header class="modal-header">
          <h2>새 스터디 만들기</h2>
          <button class="icon-button" @click="closeCreateModal">×</button>
        </header>
        <div class="modal-body">
          <div class="form-group">
            <label>스터디 이름</label>
            <input type="text" v-model="createForm.name" placeholder="스터디 이름을 입력하세요" />
          </div>
          <div class="form-group">
            <label>스터디 설명</label>
            <textarea v-model="createForm.description" placeholder="스터디 설명을 입력하세요 (선택)" rows="3"></textarea>
          </div>
        </div>
        <footer class="modal-footer">
          <button class="ghost-button" @click="closeCreateModal">취소</button>
          <button class="primary-button" @click="submitCreateStudy" :disabled="!createForm.name.trim()">만들기</button>
        </footer>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import AppLayout from '@/shared/AppLayout.vue';
import { useStudyStore } from '@/stores/studyStore';
import { studyApi } from '@/features/study/api/studyApi';

const router = useRouter();
const studyStore = useStudyStore();

const isCreateModalOpen = ref(false);
const createForm = reactive({ name: '', description: '' });
const fileInputs = ref({});

function setFileInput(id, el) {
  if (el) {
    fileInputs.value[id] = el;
  }
}

onMounted(() => {
  studyStore.loadMyStudies();
});

function openCreateModal() {
  createForm.name = '';
  createForm.description = '';
  isCreateModalOpen.value = true;
}

function closeCreateModal() {
  isCreateModalOpen.value = false;
}

async function submitCreateStudy() {
  if (!createForm.name.trim()) return;
  try {
    await studyStore.createStudy(createForm.name, createForm.description);
    closeCreateModal();
    alert('스터디가 생성되었습니다!');
  } catch (e) {
    alert(e.message);
  }
}

function triggerUpload(studyId) {
  const el = fileInputs.value[studyId];
  if (el) el.click();
}

async function uploadImage(studyId, event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    await studyStore.uploadStudyImage(studyId, file);
    alert('이미지가 업로드되었습니다.');
    studyStore.loadMyStudies();
  } catch (e) {
    alert('이미지 업로드에 실패했습니다.');
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
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.study-info {
  flex-grow: 1;
}
.study-image-upload {
  width: 120px;
  height: 120px;
  border-radius: 8px;
  background: var(--surface-hover);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px dashed var(--line-strong);
  cursor: pointer;
}
.study-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.upload-btn {
  font-size: 1.5rem;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  cursor: pointer;
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
/* Modal Styles */
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content {
  background: var(--surface);
  border-radius: 12px;
  width: 400px;
  max-width: 90vw;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
}
.modal-header {
  padding: 20px;
  border-bottom: 1px solid var(--line);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.form-group input, .form-group textarea {
  padding: 10px;
  border: 1px solid var(--line-strong);
  border-radius: 6px;
}
.modal-footer {
  padding: 20px;
  border-top: 1px solid var(--line);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
