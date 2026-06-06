<template>
  <AppLayout>
    <section class="wire-page document-wire document-profile-page">
      <header class="wire-toolbar document-profile-toolbar">
        <div>
          <p class="section-kicker">PROFILE-001</p>
          <h1>서류 입력 정보</h1>
          <p>반복해서 쓰는 지원서 정보를 한 화면에서 저장하고 워크스페이스 기본값으로 재사용합니다.</p>
          <p v-if="documentProfileStore.profile?.lastSavedAt" class="last-saved-at">
            마지막 저장 {{ documentProfileStore.profile.lastSavedAt }}
          </p>
        </div>
        <div class="document-save-controls">
          <span
            class="status-chip"
            data-testid="document-autosave-status"
            :data-save-state="autoSaveStatus"
          >
            {{ autoSaveLabel }}
          </span>
          <button
            class="primary-button"
            type="button"
            :disabled="documentProfileStore.status === 'saving'"
            data-testid="save-document-profile"
            @click="saveActiveSection"
          >
            {{ saveButtonLabel }}
          </button>
        </div>
      </header>

      <StatePanel
        v-if="documentProfileStore.status === 'error'"
        id="document-profile-error"
        tone="navy"
        title="서류 입력 정보 오류"
        :body="documentProfileStore.errorMessage"
      />

      <section class="workspace-tabs" aria-label="서류 정보 탭">
        <button
          v-for="section in sections"
          :key="section.id"
          class="tab-button"
          :class="{ active: section.id === activeSection }"
          :data-testid="`section-${section.id}`"
          type="button"
          @click="activeSection = section.id"
        >
          {{ section.label }}
        </button>
      </section>

      <div class="document-editor-grid document-editor-grid-focused">
        <aside class="wire-side-rail document-section-rail" aria-label="서류 섹션 목록">
          <strong>입력 섹션</strong>
          <button
            v-for="section in sections"
            :key="section.id"
            class="rail-button"
            :class="{ active: section.id === activeSection }"
            :data-testid="`section-rail-${section.id}`"
            type="button"
            @click="activeSection = section.id"
          >
            {{ section.label }}
          </button>
        </aside>

        <main class="document-form-panel document-form-panel-focused">
          <p v-if="documentProfileStore.status === 'loading'">서류 입력 정보를 불러오는 중입니다.</p>

          <template v-else>
            <div class="section-heading">
              <div>
                <p class="section-kicker">{{ activeSectionLabel }}</p>
                <h2>{{ activeSectionTitle }}</h2>
              </div>
              <span class="status-chip">{{ statusLabel }}</span>
            </div>

            <section v-if="activeSection === 'basicInfo'" class="form-shell compact document-basic-form" aria-label="기본 정보 입력">
              <label>
                이름
                <input v-model="basicInfoForm.nameKo" data-testid="basic-info-name" />
              </label>
              <label>
                영문 이름
                <input v-model="basicInfoForm.nameEn" data-testid="basic-info-name-en" />
              </label>
              <label>
                한자 이름
                <input v-model="basicInfoForm.nameHanja" data-testid="basic-info-name-hanja" />
              </label>
              <label>
                이메일
                <input v-model="basicInfoForm.email" data-testid="basic-info-email" />
              </label>
              <label>
                휴대폰
                <input v-model="basicInfoForm.phone" data-testid="basic-info-phone" />
              </label>
              <label>
                성별
                <input v-model="basicInfoForm.gender" data-testid="basic-info-gender" />
              </label>
              <label>
                생년월일
                <input v-model="basicInfoForm.birthdate" type="date" data-testid="basic-info-birthdate" />
              </label>
              <label>
                주소
                <input v-model="basicInfoForm.address" data-testid="basic-info-address" />
              </label>
              <label>
                상세주소
                <input v-model="basicInfoForm.addressDetail" data-testid="basic-info-address-detail" />
              </label>
            </section>

            <section v-else-if="isReusableSection" class="form-shell compact document-repeatable-form" aria-label="서류 재사용 섹션 입력">
              <div class="repeatable-list">
                <div
                  v-for="(item, index) in reusableSectionItems"
                  :key="`${activeSection}-${index}`"
                  class="repeatable-item"
                  :class="{ active: index === editingReusableItemIndex }"
                >
                  <button type="button" :data-testid="`edit-reusable-${index}`" @click="editReusableItem(index)">
                    <strong>{{ item.title || '제목 없음' }}</strong>
                    <span>{{ item.summary || '요약 없음' }}</span>
                  </button>
                  <button
                    class="text-button danger"
                    type="button"
                    :data-testid="`delete-reusable-${index}`"
                    @click="deleteReusableItem(index)"
                  >
                    삭제
                  </button>
                </div>
              </div>
              <div class="repeatable-tools">
                <button class="ghost-button" type="button" data-testid="add-reusable-item" @click="addReusableItem">
                  항목 추가
                </button>
              </div>
              <label>
                제목
                <input v-model="reusableSectionForm.title" data-testid="section-title" />
              </label>
              <label>
                요약
                <textarea v-model="reusableSectionForm.summary" data-testid="section-summary" />
              </label>
            </section>

            <section v-else-if="activeSection === 'custom'" class="form-shell compact document-custom-form" aria-label="커스텀 항목 입력">
              <ul class="summary-stack">
                <li v-for="field in documentProfileStore.profile?.customFields ?? []" :key="field.id">
                  <strong>{{ field.label }}</strong>
                  <p>{{ field.value }}</p>
                  <small>{{ field.fieldType }}</small>
                  <button
                    class="text-button"
                    type="button"
                    :data-testid="`edit-custom-${field.id}`"
                    @click="editCustomField(field)"
                  >
                    수정
                  </button>
                  <button
                    class="text-button danger"
                    type="button"
                    :data-testid="`delete-custom-${field.id}`"
                    @click="deleteCustomField(field.id)"
                  >
                    삭제
                  </button>
                </li>
              </ul>
              <label>
                라벨
                <input v-model="customFieldForm.label" data-testid="custom-label" />
              </label>
              <label>
                유형
                <select v-model="customFieldForm.fieldType" data-testid="custom-type">
                  <option value="TEXT">텍스트</option>
                  <option value="URL">링크</option>
                  <option value="NUMBER">숫자</option>
                </select>
              </label>
              <label>
                값
                <input v-model="customFieldForm.value" data-testid="custom-value" />
              </label>
              <div class="repeatable-tools">
                <button
                  v-if="editingCustomFieldId"
                  class="primary-button"
                  type="button"
                  data-testid="update-custom-field"
                  @click="updateCustomField"
                >
                  커스텀 수정
                </button>
                <button
                  v-else
                  class="primary-button"
                  type="button"
                  data-testid="create-custom-field"
                  @click="createCustomField"
                >
                  커스텀 추가
                </button>
              </div>
            </section>
          </template>
        </main>
      </div>
    </section>
  </AppLayout>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useDocumentProfileStore } from '@/stores/documentProfileStore';
import AppLayout from '@/shared/AppLayout.vue';
import StatePanel from '@/shared/StatePanel.vue';

const documentProfileStore = useDocumentProfileStore();
const activeSection = ref('basicInfo');
const autoSaveStatus = ref('idle');
const basicInfoForm = reactive({
  nameKo: '',
  nameEn: '',
  nameHanja: '',
  email: '',
  phone: '',
  gender: '',
  birthdate: '',
  address: '',
  addressDetail: ''
});
const reusableSectionForm = reactive({
  title: '',
  summary: ''
});
const reusableSectionItems = ref([]);
const editingReusableItemIndex = ref(0);
const customFieldForm = reactive({
  label: '',
  fieldType: 'TEXT',
  value: ''
});
const editingCustomFieldId = ref('');
let autoSaveTimer = null;
let suppressFormWatch = true;

const sections = [
  { id: 'basicInfo', label: '기본 정보', title: '지원서 공통 입력값' },
  { id: 'education', label: '학력', title: '학력' },
  { id: 'career', label: '경력', title: '경력' },
  { id: 'courses', label: '과목', title: '과목 정보' },
  { id: 'projects', label: '프로젝트', title: '프로젝트' },
  { id: 'certificates', label: '자격/어학', title: '자격/어학' },
  { id: 'awards', label: '수상/활동', title: '수상/활동' },
  { id: 'essays', label: '자소서', title: '사전 작성 자소서' },
  { id: 'military', label: '병역/보훈', title: '병역/장애/보훈' },
  { id: 'internships', label: '인턴/알바', title: '인턴/아르바이트/실습' },
  { id: 'trainings', label: '교육이수', title: '교육이수사항' },
  { id: 'activities', label: '학내외 활동', title: '학내외 활동' },
  { id: 'custom', label: '커스텀', title: '커스텀 항목' }
];
const reusableSectionTypes = [
  'education',
  'career',
  'courses',
  'projects',
  'certificates',
  'awards',
  'essays',
  'military',
  'internships',
  'trainings',
  'activities'
];

const saveButtonLabel = computed(() => (documentProfileStore.status === 'saving' ? '저장 중' : '저장'));
const activeSectionConfig = computed(() => sections.find((section) => section.id === activeSection.value) ?? sections[0]);
const activeSectionLabel = computed(() => activeSectionConfig.value.label);
const activeSectionTitle = computed(() => activeSectionConfig.value.title);
const isReusableSection = computed(() => reusableSectionTypes.includes(activeSection.value));
const statusLabel = computed(() => {
  if (documentProfileStore.status === 'saving') return '저장 중';
  if (autoSaveStatus.value === 'waiting') return '자동 저장 대기';
  if (autoSaveStatus.value === 'saved') return '저장됨';
  return documentProfileStore.profile ? '불러옴' : '대기';
});
const autoSaveLabel = computed(() => {
  if (autoSaveStatus.value === 'waiting') return '자동 저장 대기';
  if (autoSaveStatus.value === 'saving') return '자동 저장 중';
  if (autoSaveStatus.value === 'saved') return '자동 저장 완료';
  if (autoSaveStatus.value === 'failed') return '자동 저장 실패';
  return '자동 저장 켜짐';
});

watch(() => documentProfileStore.basicInfo, (basicInfo) => {
  suppressFormWatch = true;
  Object.assign(basicInfoForm, basicInfo);
  queueMicrotask(() => {
    suppressFormWatch = false;
  });
}, { immediate: true });

watch([
  activeSection,
  () => documentProfileStore.education,
  () => documentProfileStore.career,
  () => documentProfileStore.courses,
  () => documentProfileStore.projects,
  () => documentProfileStore.certificates,
  () => documentProfileStore.awards,
  () => documentProfileStore.essays,
  () => documentProfileStore.military,
  () => documentProfileStore.internships,
  () => documentProfileStore.trainings,
  () => documentProfileStore.activities
], () => {
  suppressFormWatch = true;
  syncReusableSectionForm();
  queueMicrotask(() => {
    suppressFormWatch = false;
  });
}, { immediate: true });

watch(basicInfoForm, () => {
  if (activeSection.value !== 'basicInfo') return;
  scheduleAutoSave();
}, { deep: true });

watch(reusableSectionForm, () => {
  if (!isReusableSection.value) return;
  scheduleAutoSave();
}, { deep: true });

onMounted(() => {
  void documentProfileStore.loadDocumentProfile();
});
onBeforeUnmount(clearAutoSaveTimer);

async function saveActiveSection() {
  clearAutoSaveTimer();
  autoSaveStatus.value = 'saving';
  try {
    if (activeSection.value === 'basicInfo') {
      await documentProfileStore.saveBasicInfo({ ...basicInfoForm });
    } else if (isReusableSection.value) {
      await documentProfileStore.saveReusableSection(activeSection.value, reusablePayload());
    }
    autoSaveStatus.value = documentProfileStore.status === 'error' ? 'failed' : 'saved';
  } catch {
    autoSaveStatus.value = 'failed';
  }
}

function scheduleAutoSave() {
  if (suppressFormWatch || activeSection.value === 'custom') return;
  clearAutoSaveTimer();
  autoSaveStatus.value = 'waiting';
  autoSaveTimer = setTimeout(() => {
    void saveActiveSection();
  }, 2000);
}

function clearAutoSaveTimer() {
  if (!autoSaveTimer) return;
  clearTimeout(autoSaveTimer);
  autoSaveTimer = null;
}

function reusablePayload() {
  applyReusableForm();
  return reusableSectionItems.value.map(copyReusableItem);
}

function addReusableItem() {
  editingReusableItemIndex.value = reusableSectionItems.value.length;
  reusableSectionForm.title = '';
  reusableSectionForm.summary = '';
}

function editReusableItem(index) {
  const item = reusableSectionItems.value[index];
  if (!item) return;
  editingReusableItemIndex.value = index;
  reusableSectionForm.title = item.title;
  reusableSectionForm.summary = item.summary;
}

function deleteReusableItem(index) {
  if (index < 0) return;
  reusableSectionItems.value = reusableSectionItems.value.filter((_, itemIndex) => itemIndex !== index);
  if (editingReusableItemIndex.value > index) {
    editingReusableItemIndex.value -= 1;
    return;
  }
  if (editingReusableItemIndex.value === index && reusableSectionItems.value[index]) {
    editReusableItem(index);
    return;
  }
  editingReusableItemIndex.value = Math.max(0, Math.min(editingReusableItemIndex.value, reusableSectionItems.value.length));
}

function applyReusableForm() {
  if (!hasReusableFormContent() && !reusableSectionItems.value[editingReusableItemIndex.value]) return;
  const nextItems = reusableSectionItems.value.map(copyReusableItem);
  nextItems[editingReusableItemIndex.value] = {
    title: reusableSectionForm.title,
    summary: reusableSectionForm.summary
  };
  reusableSectionItems.value = nextItems.filter((item) => item.title.trim() || item.summary.trim());
}

function syncReusableSectionForm() {
  if (!isReusableSection.value) return;
  reusableSectionItems.value = reusableSectionItemsFor(activeSection.value).map(copyReusableItem);
  editingReusableItemIndex.value = 0;
  const firstItem = reusableSectionItems.value[0];
  reusableSectionForm.title = firstItem?.title ?? '';
  reusableSectionForm.summary = firstItem?.summary ?? '';
  autoSaveStatus.value = 'idle';
}

function reusableSectionItemsFor(sectionType) {
  return documentProfileStore[sectionType] ?? [];
}

function copyReusableItem(item) {
  return {
    title: item.title,
    summary: item.summary
  };
}

function hasReusableFormContent() {
  return reusableSectionForm.title.trim() !== '' || reusableSectionForm.summary.trim() !== '';
}

function editCustomField(field) {
  editingCustomFieldId.value = field.id;
  customFieldForm.label = field.label;
  customFieldForm.fieldType = field.fieldType;
  customFieldForm.value = field.value;
}

function createCustomField() {
  void documentProfileStore.createCustomField({ ...customFieldForm });
  resetCustomFieldForm();
}

function updateCustomField() {
  if (!editingCustomFieldId.value) return;
  void documentProfileStore.updateCustomField(editingCustomFieldId.value, { ...customFieldForm });
  resetCustomFieldForm();
}

function deleteCustomField(fieldId) {
  void documentProfileStore.deleteCustomField(fieldId);
  if (editingCustomFieldId.value === fieldId) {
    resetCustomFieldForm();
  }
}

function resetCustomFieldForm() {
  editingCustomFieldId.value = '';
  customFieldForm.label = '';
  customFieldForm.fieldType = 'TEXT';
  customFieldForm.value = '';
}
</script>
