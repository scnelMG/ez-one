<template>
  <AppLayout>
    <section class="study-page">
      <header class="page-hero">
        <div class="page-hero-content">
          <h1>취업 스터디</h1>
          <p>함께 취업을 준비할 팀원을 모집하고, 서로의 공고와 자소서를 공유해보세요.</p>
          <div class="header-actions" style="margin-top: 16px;">
            <button class="primary-button" type="button" @click="openCreateModal">
              새 스터디 만들기
            </button>
          </div>
        </div>
      </header>

      <section class="study-dashboard">
        <article class="dashboard-section">
          <h2>참여 중인 스터디</h2>
          <div v-if="studyStore.status === 'loading'" class="loading-state">불러오는 중...</div>
          <div v-else-if="studyStore.myStudies.length === 0" class="study-empty-showcase">
            <div class="empty-copy">
              <span class="eyebrow">처음 시작하는 취업스터디</span>
              <h3>스터디를 만들면 대시보드, 자소서 피드백, 공고 추천이 한 곳에 모입니다.</h3>
              <p>
                팀원별 지원 현황을 보고, 공유한 자소서에 피드백을 남기고,
                각자 발견한 좋은 공고를 추천하면서 준비 흐름을 놓치지 않게 도와줘요.
              </p>
            </div>
            <div class="feature-preview-grid" aria-label="취업스터디 기능 예시">
              <article class="feature-preview dashboard-preview">
                <div class="preview-topline">
                  <strong>스터디 대시보드</strong>
                  <span>4명 참여</span>
                </div>
                <div class="mini-chart-row" v-for="row in previewMembers" :key="row.name">
                  <span>{{ row.name }}</span>
                  <div class="mini-chart-track"><i :style="{ width: row.progress + '%' }"></i></div>
                  <b>{{ row.count }}</b>
                </div>
              </article>
              <article class="feature-preview feedback-preview">
                <div class="preview-topline">
                  <strong>자소서 피드백</strong>
                  <span>NEW</span>
                </div>
                <p>네이버 서비스 기획 직무 1번 문항</p>
                <div class="comment-chip">문장 흐름은 좋아요. 수치 근거를 한 줄 더 넣어보면 좋겠어요.</div>
              </article>
              <article class="feature-preview job-preview">
                <div class="preview-topline">
                  <strong>지인 공고 추천</strong>
                  <span>D-7</span>
                </div>
                <p>핀테크 PM 인턴</p>
                <div class="job-tags"><span>서비스기획</span><span>금융권</span><span>추천</span></div>
              </article>
            </div>
          </div>
          <div v-else class="study-grid">
            <div class="study-card" v-for="study in studyStore.myStudies" :key="study.id" @click="goToStudy(study.id)">
              <div class="study-info">
                <h3>{{ study.name }}</h3>
                <p>{{ study.description }}</p>
                <div class="study-member-summary">
                  <p class="member-count">멤버 {{ study.memberCount || 1 }}명</p>
                  <div class="member-avatar-stack" :aria-label="`${study.name} 멤버 프로필`">
                    <span
                      v-for="member in memberPreview(study)"
                      :key="member.key"
                      class="member-avatar-preview"
                      :title="member.label"
                    >
                      {{ member.initial }}
                    </span>
                    <span v-if="remainingMemberCount(study) > 0" class="member-avatar-preview more">
                      +{{ remainingMemberCount(study) }}
                    </span>
                  </div>
                </div>
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
          <div class="form-group checkbox-group">
            <label>대시보드 표시 설정</label>
            <div class="checkbox-options">
              <label><input type="checkbox" v-model="createForm.settings.showDashboard" /> 스터디원 전체 대시보드 통계 표시</label>
              <label><input type="checkbox" v-model="createForm.settings.showTeamComparison" /> 팀원 대비 내 진척도 차트 표시</label>
              <label><input type="checkbox" v-model="createForm.settings.showUnreadBadge" /> 안 읽은 자소서 NEW 뱃지 표시</label>
            </div>
            <button class="ghost-button small-button" @click="openPreviewModal" style="margin-top:8px;">미리보기</button>
          </div>
        </div>
        <footer class="modal-footer">
          <button class="ghost-button" @click="closeCreateModal">취소</button>
          <button class="primary-button" @click="submitCreateStudy" :disabled="!createForm.name.trim()">만들기</button>
        </footer>
      </div>
    </div>

    <!-- 미리보기 모달 -->
    <div v-if="isPreviewModalOpen" class="modal-backdrop" @click.self="closePreviewModal" style="z-index: 1010;">
      <div class="modal-content preview-modal">
        <header class="modal-header">
          <h2>대시보드 미리보기</h2>
          <button class="icon-button" @click="closePreviewModal">×</button>
        </header>
        <div class="modal-body preview-body">
          <div class="preview-section" v-if="createForm.settings.showDashboard">
            <h3>대시보드 통계</h3>
            <div class="preview-stats">
              <div class="stat-box">진행중<br/><strong>3</strong></div>
              <div class="stat-box">지원전<br/><strong>1</strong></div>
              <div class="stat-box">최근 2주<br/><strong>5</strong></div>
            </div>
          </div>
          <div class="preview-section" v-if="createForm.settings.showTeamComparison">
            <h3>팀원 진척도 비교</h3>
            <div class="preview-chart">
              <div class="bar-row"><span class="label">나</span><div class="bar" style="width: 60%; background: var(--primary);"></div></div>
              <div class="bar-row"><span class="label">팀원A</span><div class="bar" style="width: 80%;"></div></div>
            </div>
          </div>
          <div class="preview-section" v-if="createForm.settings.showUnreadBadge">
            <h3>공유 자소서</h3>
            <div class="preview-essay">
              <span>팀원B의 네이버 자소서</span>
              <span class="badge new-badge">NEW</span>
            </div>
          </div>
          <div v-if="!createForm.settings.showDashboard && !createForm.settings.showTeamComparison && !createForm.settings.showUnreadBadge" class="empty-state">
            선택된 표시 설정이 없습니다. 기본 기능만 제공됩니다.
          </div>
        </div>
        <footer class="modal-footer">
          <button class="primary-button" @click="closePreviewModal">닫기</button>
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
const isPreviewModalOpen = ref(false);
const previewMembers = [
  { name: '나', progress: 70, count: 7 },
  { name: '민지', progress: 48, count: 5 },
  { name: '준호', progress: 32, count: 3 }
];
const createForm = reactive({ 
  name: '', 
  description: '',
  settings: {
    showDashboard: true,
    showTeamComparison: true,
    showUnreadBadge: true
  }
});
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
  createForm.settings = { showDashboard: true, showTeamComparison: true, showUnreadBadge: true };
  isCreateModalOpen.value = true;
}

function closeCreateModal() {
  isCreateModalOpen.value = false;
}

function openPreviewModal() {
  isPreviewModalOpen.value = true;
}

function closePreviewModal() {
  isPreviewModalOpen.value = false;
}

async function submitCreateStudy() {
  if (!createForm.name.trim()) return;
  try {
    await studyStore.createStudy(createForm.name, createForm.description, createForm.settings);
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

function getMemberLabel(member) {
  return member?.userName || member?.userNickname || member?.userEmail?.split('@')[0] || '팀원';
}

function getMemberAvatarLabel(member) {
  const label = getMemberLabel(member).trim();
  if (!label) return '';
  if (/^[가-힣]+$/.test(label) && label.length >= 2) {
    return label.slice(-2);
  }
  return label.length <= 2 ? label : label.charAt(0).toUpperCase();
}

function memberPreview(study) {
  const members = Array.isArray(study.members) ? study.members : [];
  if (members.length > 0) {
    return members.slice(0, 4).map((member, index) => {
      const label = getMemberLabel(member);
      return {
        key: member.id || member.userEmail || `${study.id}-${index}`,
        label,
        initial: getMemberAvatarLabel(member)
      };
    });
  }

  const count = Math.max(study.memberCount || 1, 1);
  return Array.from({ length: Math.min(count, 4) }, (_, index) => ({
    key: `${study.id}-placeholder-${index}`,
    label: index === 0 ? '나' : `스터디원 ${index + 1}`,
    initial: index === 0 ? '나' : String(index + 1)
  }));
}

function remainingMemberCount(study) {
  const total = Math.max(study.memberCount || 1, 1);
  return Math.max(total - 4, 0);
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
  border-radius: 8px;
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
  min-width: 0;
}
.study-info h3 {
  margin-bottom: 8px;
}
.study-info p {
  color: var(--text-secondary);
  line-height: 1.5;
}
.study-image-upload {
  width: 160px;
  height: 160px;
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
  margin: 0;
}
.study-member-summary {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
}
.member-avatar-stack {
  display: flex;
  align-items: center;
  min-height: 34px;
}
.member-avatar-preview {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 2px solid white;
  background: #eef2ff;
  color: #4338ca;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 800;
  margin-left: -8px;
  box-shadow: 0 4px 10px rgba(79, 70, 229, 0.12);
}
.member-avatar-preview:first-child {
  margin-left: 0;
}
.member-avatar-preview:nth-child(2) {
  background: #ecfeff;
  color: #0e7490;
}
.member-avatar-preview:nth-child(3) {
  background: #f0fdf4;
  color: #15803d;
}
.member-avatar-preview:nth-child(4) {
  background: #fff7ed;
  color: #c2410c;
}
.member-avatar-preview.more {
  background: #f8fafc;
  color: var(--text-secondary);
}
.study-empty-showcase {
  margin-top: 16px;
  display: grid;
  grid-template-columns: minmax(260px, 0.8fr) minmax(360px, 1.2fr);
  gap: 24px;
  align-items: stretch;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 28px;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
}
.empty-copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 14px;
}
.empty-copy h3 {
  font-size: 1.45rem;
  line-height: 1.35;
  color: var(--text-primary);
}
.empty-copy p {
  color: var(--text-secondary);
  line-height: 1.7;
}
.eyebrow {
  color: #4f46e5;
  font-weight: 800;
  font-size: 0.9rem;
}
.feature-preview-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.feature-preview {
  border: 1px solid var(--line);
  border-radius: 8px;
  background: white;
  padding: 18px;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
}
.dashboard-preview {
  grid-row: span 2;
}
.preview-topline {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.preview-topline strong {
  color: var(--text-primary);
}
.preview-topline span {
  font-size: 0.8rem;
  color: #4f46e5;
  font-weight: 800;
}
.mini-chart-row {
  display: grid;
  grid-template-columns: 46px 1fr 28px;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  font-size: 0.85rem;
  color: var(--text-secondary);
}
.mini-chart-track {
  height: 10px;
  background: #eef2f7;
  border-radius: 999px;
  overflow: hidden;
}
.mini-chart-track i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #4f46e5, #06b6d4);
}
.feedback-preview p,
.job-preview p {
  color: var(--text-primary);
  font-weight: 700;
  margin-bottom: 12px;
}
.comment-chip {
  border-left: 3px solid #10b981;
  background: #ecfdf5;
  color: #065f46;
  padding: 10px 12px;
  border-radius: 6px;
  font-size: 0.86rem;
  line-height: 1.45;
}
.job-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.job-tags span {
  border: 1px solid #bfdbfe;
  color: #1d4ed8;
  background: #eff6ff;
  border-radius: 999px;
  padding: 5px 9px;
  font-size: 0.78rem;
  font-weight: 700;
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
.checkbox-group {
  margin-top: 16px;
  background: var(--surface-hover);
  padding: 16px;
  border-radius: 8px;
}
.checkbox-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 8px;
}
.checkbox-options label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: normal;
  cursor: pointer;
}
.preview-modal {
  max-width: 400px;
}
.preview-body {
  display: flex;
  flex-direction: column;
  gap: 20px;
  background: #f9fafb;
  padding: 24px;
}
.preview-section h3 {
  font-size: 1rem;
  margin-bottom: 12px;
  color: var(--text-primary);
}
.preview-stats {
  display: flex;
  gap: 12px;
}
.stat-box {
  flex: 1;
  background: white;
  padding: 12px;
  border-radius: 8px;
  text-align: center;
  font-size: 0.85rem;
  color: var(--text-secondary);
  border: 1px solid var(--line);
}
.stat-box strong {
  display: block;
  font-size: 1.25rem;
  color: var(--primary);
  margin-top: 4px;
}
.preview-chart {
  background: white;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid var(--line);
}
.bar-row {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}
.bar-row:last-child {
  margin-bottom: 0;
}
.bar-row .label {
  width: 40px;
  font-size: 0.85rem;
  color: var(--text-secondary);
}
.bar-row .bar {
  height: 12px;
  background: var(--line);
  border-radius: 6px;
}
.preview-essay {
  background: white;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid var(--line);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
}
.new-badge {
  background: #ef4444;
  color: white;
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 12px;
}
@media (max-width: 860px) {
  .study-page {
    padding: 24px 16px;
  }
  .study-empty-showcase {
    grid-template-columns: 1fr;
  }
  .feature-preview-grid {
    grid-template-columns: 1fr;
  }
  .dashboard-preview {
    grid-row: auto;
  }
  .study-card {
    align-items: flex-start;
    flex-direction: column;
  }
  .study-image-upload {
    width: 100%;
    height: 180px;
  }
}
</style>
