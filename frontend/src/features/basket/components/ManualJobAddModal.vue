<template>
  <div v-if="isOpen" class="modal-backdrop" @click.self="close">
    <div class="modal-content add-job-modal">
      <header class="modal-header">
        <h3>직접 추가하기</h3>
        <button class="close-button" @click="close" aria-label="닫기">×</button>
      </header>

      <form class="manual-add-form" @submit.prevent="submitForm">
        <div class="form-group autocomplete-group">
          <label for="companyName">회사명 *</label>
          <input
            id="companyName"
            v-model="form.companyName"
            type="text"
            placeholder="회사명을 입력하세요 (예: 현대모비스)"
            required
            @input="onSearchInput"
            @focus="showDropdown = true"
            autocomplete="off"
          />
          <ul v-if="showDropdown && searchResults.length > 0" class="autocomplete-dropdown">
            <li
              v-for="company in searchResults"
              :key="company.id"
              @click="selectCompany(company)"
            >
              <img v-if="company.logoUrl" :src="company.logoUrl" alt="" class="company-logo-tiny" />
              <span>{{ company.name }}</span>
            </li>
          </ul>
        </div>

        <div class="form-group">
          <label for="positionTitle">직무명 *</label>
          <input
            id="positionTitle"
            v-model="form.positionTitle"
            type="text"
            placeholder="예: 백엔드 개발자"
            required
          />
        </div>

        <div class="form-group">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <label for="deadline" style="margin-bottom: 0;">마감일</label>
            <label style="font-size: 0.8rem; font-weight: normal; display: flex; align-items: center; gap: 4px; cursor: pointer;">
              <input type="checkbox" v-model="form.isRolling" @change="onRollingChange" /> 상시 채용
            </label>
          </div>
          <input
            id="deadline"
            v-model="form.deadlineLabel"
            type="text"
            placeholder="YYYY.MM.DD"
            :disabled="form.isRolling"
          />
        </div>

        <div class="form-group">
          <label for="sourceUrl">채용 공고 URL</label>
          <input
            id="sourceUrl"
            v-model="form.sourceUrl"
            type="url"
            placeholder="https://..."
          />
        </div>

        <div class="modal-actions">
          <button type="button" class="ghost-button" @click="close">취소</button>
          <button type="submit" class="primary-button" :disabled="isSubmitting">
            {{ isSubmitting ? '추가 중...' : '추가하기' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { companyApi } from '@/features/basket/api/companyApi';
import { useBasketStore } from '@/stores/basketStore';

const props = defineProps({
    isOpen: Boolean
});
const emit = defineEmits(['close']);

const basketStore = useBasketStore();

const form = reactive({
    companyId: null,
    companyName: '',
    positionTitle: '',
    deadlineLabel: '',
    isRolling: false,
    sourceUrl: '',
    logoUrl: ''
});

const isSubmitting = ref(false);
const searchResults = ref([]);
const showDropdown = ref(false);

let searchTimeout = null;

function onRollingChange() {
    if (form.isRolling) {
        form.deadlineLabel = '';
    }
}

function onSearchInput() {
    form.companyId = null;
    form.logoUrl = '';
    
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        if (!form.companyName.trim()) {
            searchResults.value = [];
            return;
        }
        searchResults.value = await companyApi.searchCompanies(form.companyName);
        showDropdown.value = true;
    }, 300);
}

function selectCompany(company) {
    form.companyId = company.id;
    form.companyName = company.name;
    form.logoUrl = company.logoUrl ?? '';
    showDropdown.value = false;
}

function close() {
    emit('close');
    form.companyId = null;
    form.companyName = '';
    form.positionTitle = '';
    form.deadlineLabel = '';
    form.isRolling = false;
    form.sourceUrl = '';
    form.logoUrl = '';
    searchResults.value = [];
}

async function submitForm() {
    isSubmitting.value = true;
    try {
        await basketStore.createJob({
            companyId: form.companyId,
            companyName: form.companyName.trim(),
            positionTitle: form.positionTitle.trim(),
            deadlineLabel: form.isRolling ? '상시' : form.deadlineLabel.trim(),
            sourceUrl: form.sourceUrl.trim(),
            logoUrl: form.logoUrl,
            savedSource: 'MANUAL'
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
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}
.modal-content {
    background: var(--surface-bg, #fff);
    border-radius: 12px;
    padding: 24px;
    width: 90%;
    max-width: 400px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
}
.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}
.modal-header h3 {
    margin: 0;
    font-size: 1.25rem;
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
    margin-bottom: 16px;
    position: relative;
}
.form-group label {
    font-size: 0.875rem;
    font-weight: 500;
    margin-bottom: 6px;
}
.form-group input {
    padding: 10px 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 0.95rem;
}
.autocomplete-dropdown {
    position: absolute;
    top: 100%;
    left: 0; right: 0;
    background: white;
    border: 1px solid #ddd;
    border-radius: 6px;
    list-style: none;
    margin: 4px 0 0;
    padding: 0;
    max-height: 200px;
    overflow-y: auto;
    z-index: 10;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
.autocomplete-dropdown li {
    padding: 10px 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
}
.autocomplete-dropdown li:hover {
    background: #f5f5f5;
}
.company-logo-tiny {
    width: 20px;
    height: 20px;
    object-fit: contain;
    border-radius: 4px;
}
.modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 24px;
}
</style>
