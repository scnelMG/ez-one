<template>
  <div v-if="isOpen && job" class="modal-backdrop" @click.self="close">
    <div class="modal-content edit-job-modal">
      <header class="modal-header">
        <h3>공고 정보 수정</h3>
        <button class="close-button" type="button" aria-label="닫기" @click="close">×</button>
      </header>

      <form class="manual-add-form" data-testid="edit-job-form" @submit.prevent="submitForm">
        <div class="form-group">
          <label for="editCompanyName">회사명 *</label>
          <input id="editCompanyName" v-model="form.companyName" data-testid="edit-job-company" type="text" required />
        </div>

        <div class="form-group">
          <label for="editPositionTitle">직무/공고명 *</label>
          <input id="editPositionTitle" v-model="form.positionTitle" data-testid="edit-job-position" type="text" required />
        </div>

        <div class="form-group">
          <label for="editDeadline">마감 표시</label>
          <input id="editDeadline" v-model="form.deadlineLabel" data-testid="edit-job-deadline" type="text" placeholder="YYYY.MM.DD 또는 D-7" />
        </div>

        <div class="form-group">
          <label for="editSourceUrl">채용 공고 URL</label>
          <input id="editSourceUrl" v-model="form.sourceUrl" data-testid="edit-job-source" type="url" placeholder="https://..." />
        </div>

        <div class="form-group">
          <label for="editApplicationMemo">지원 메모</label>
          <textarea id="editApplicationMemo" v-model="form.applicationMemo" data-testid="edit-job-memo" rows="4" placeholder="지원 준비 메모를 남겨두세요."></textarea>
        </div>

        <div class="modal-actions">
          <button type="button" class="ghost-button" @click="close">취소</button>
          <button type="submit" class="primary-button" :disabled="isSubmitting">
            {{ isSubmitting ? '저장 중...' : '수정 저장' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, watch } from 'vue';
import { useBasketStore } from '@/stores/basketStore';

const props = defineProps({
    isOpen: Boolean,
    job: {
        type: Object,
        default: null
    }
});
const emit = defineEmits(['close']);
const basketStore = useBasketStore();
const isSubmitting = ref(false);
const form = reactive({
    companyName: '',
    positionTitle: '',
    deadlineLabel: '',
    sourceUrl: '',
    applicationMemo: ''
});

watch(() => props.job, (job) => {
    form.companyName = job?.companyName ?? '';
    form.positionTitle = job?.positionTitle ?? '';
    form.deadlineLabel = job?.deadlineLabel ?? '';
    form.sourceUrl = job?.sourceUrl ?? '';
    form.applicationMemo = job?.applicationMemo ?? '';
}, { immediate: true });

function close() {
    emit('close');
}

async function submitForm() {
    if (!props.job) {
        return;
    }
    isSubmitting.value = true;
    try {
        await basketStore.updateJob(props.job.id, {
            companyName: form.companyName.trim(),
            positionTitle: form.positionTitle.trim(),
            deadlineLabel: form.deadlineLabel.trim(),
            sourceUrl: form.sourceUrl.trim(),
            applicationMemo: form.applicationMemo.trim()
        });
        close();
    } finally {
        isSubmitting.value = false;
    }
}
</script>

<style scoped>
.modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.36);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}
.modal-content {
    background: var(--surface-bg, #fff);
    border-radius: 8px;
    padding: 24px;
    width: min(92vw, 460px);
    box-shadow: 0 18px 50px rgba(15, 23, 42, 0.22);
}
.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}
.modal-header h3 {
    margin: 0;
    font-size: 1.2rem;
}
.close-button {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
}
.form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 16px;
}
.form-group label {
    font-size: 0.875rem;
    font-weight: 700;
}
.form-group input,
.form-group textarea {
    padding: 10px 12px;
    border: 1px solid #d8dee8;
    border-radius: 6px;
    font: inherit;
}
.form-group textarea {
    resize: vertical;
}
.modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 24px;
}
</style>
