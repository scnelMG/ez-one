<template>
  <AppLayout>
    <section class="wire-page document-wire document-profile-page">
      <header class="wire-toolbar document-profile-toolbar">
        <div>
          <h1>정보 입력</h1>
          <p>지원서 자동 입력과 워크스페이스 기본값에 사용할 정보를 관리합니다.</p>
          <p v-if="documentProfileStore.profile?.lastSavedAt" class="last-saved-at">
            마지막 저장: {{ formattedLastSavedAt }}
          </p>
        </div>
      </header>

      <StatePanel
        v-if="documentProfileStore.status === 'error'"
        id="document-profile-error"
        tone="navy"
        title="서류 입력 정보 오류"
        :body="documentProfileStore.errorMessage"
      />

      <div class="document-editor-grid document-editor-grid-focused">
        <aside class="wire-side-rail document-section-rail" aria-label="서류 섹션 목록">
          <button
            v-for="section in sections"
            :key="section.id"
            class="rail-button"
            :class="{ active: section.id === activeSection }"
            :data-testid="`section-${section.id}`"
            type="button"
            @click="selectSection(section.id)"
          >
            {{ section.label }}
          </button>
        </aside>

        <main ref="documentFormPanelRef" class="document-form-panel document-form-panel-focused">
          <SkeletonLoader v-if="documentProfileStore.status === 'loading'" :lines="10" label="서류 프로필 정보를 불러오는 중" />

          <template v-else>
            <div class="section-heading">
              <div>
                <h2>{{ activeSectionTitle }}</h2>
              </div>
            </div>

            <section v-if="activeSection === 'basicInfo'" class="profile-group-card" aria-label="기본 정보 입력">
              <div class="profile-subsection-heading">
                <h3>기본 인적사항</h3>
              </div>
              <div class="profile-photo-field">
                <div class="profile-photo-preview" aria-hidden="true">
                  <img
                    v-if="basicInfoForm.profilePhoto?.dataUrl"
                    :src="basicInfoForm.profilePhoto.dataUrl"
                    alt=""
                    data-testid="basic-info-profile-photo-preview"
                  />
                  <span v-else>4:5</span>
                </div>
                <div class="profile-photo-meta">
                  <strong>지원서 사진</strong>
                  <span data-testid="basic-info-profile-photo-name">
                    {{ basicInfoForm.profilePhoto?.name || '등록된 사진 없음' }}
                  </span>
                </div>
                <div class="profile-photo-actions">
                  <label class="secondary-button compact-button" for="basic-info-profile-photo-input">
                    사진 등록
                  </label>
                  <input
                    id="basic-info-profile-photo-input"
                    class="profile-photo-native-input"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    data-testid="basic-info-profile-photo-input"
                    @change="updateProfilePhoto"
                  />
                  <button
                    v-if="basicInfoForm.profilePhoto"
                    class="ghost-button compact"
                    type="button"
                    data-testid="basic-info-profile-photo-remove"
                    @click="removeProfilePhoto"
                  >
                    삭제
                  </button>
                </div>
              </div>
              <div class="profile-field-grid columns-3">
                <label>
                  신입/경력
                  <select
                    v-model="basicInfoForm.applicationCareerType"
                    data-testid="basic-info-application-career-type"
                    @change="updateChoiceField(basicInfoForm, 'applicationCareerType', $event)"
                  >
                    <option v-for="option in selectOptions.applicationCareerType" :key="option.value" :value="option.value">
                      {{ option.label }}
                    </option>
                  </select>
                </label>
                <label>
                  지원경로
                  <select
                    v-model="basicInfoForm.applicationSource"
                    data-testid="basic-info-application-source"
                    @change="updateChoiceField(basicInfoForm, 'applicationSource', $event)"
                  >
                    <option v-for="option in selectOptions.applicationSource" :key="option.value" :value="option.value">
                      {{ option.label }}
                    </option>
                  </select>
                </label>
                <label>
                  한글 이름
                  <input v-model="basicInfoForm.nameKo" placeholder="홍길동" data-testid="basic-info-name" />
                </label>
                <label>
                  영문 이름
                  <input v-model="basicInfoForm.nameEn" placeholder="Hong Gildong" data-testid="basic-info-name-en" />
                </label>
                <label>
                  한자 이름
                  <input v-model="basicInfoForm.nameHanja" placeholder="洪吉童" data-testid="basic-info-name-hanja" />
                </label>
                <label class="wide">
                  이메일
                  <input v-model="basicInfoForm.email" placeholder="test@example.com" data-testid="basic-info-email" />
                </label>
                <label>
                  휴대폰 번호
                  <input v-model="basicInfoForm.phone" placeholder="010-1234-5678" data-testid="basic-info-phone" />
                </label>
                <label>
                  성별
                  <select
                    v-model="basicInfoForm.gender"
                    data-testid="basic-info-gender"
                    @change="updateChoiceField(basicInfoForm, 'gender', $event)"
                  >
                    <option v-for="option in selectOptions.gender" :key="option.value" :value="option.value">
                      {{ option.label }}
                    </option>
                  </select>
                </label>
                <label>
                  생년월일
                  <span class="profile-date-input">
                    <input
                      :value="basicInfoForm.birthdate"
                      type="text"
                      inputmode="numeric"
                      maxlength="10"
                      placeholder="YYYY-MM-DD"
                      autocomplete="off"
                      data-testid="basic-info-birthdate"
                      @input="updateDateField(basicInfoForm, 'birthdate', $event)"
                      @paste="pasteDateField(basicInfoForm, 'birthdate', $event)"
                      @blur="blurDateField(basicInfoForm, 'birthdate', $event)"
                    />
                    <button
                      class="profile-date-picker-button"
                      type="button"
                      aria-label="달력 열기"
                      @click="openDatePicker"
                    >
                      <svg viewBox="0 0 20 20" focusable="false" aria-hidden="true">
                        <path d="M6 2v3" />
                        <path d="M14 2v3" />
                        <path d="M3.5 8h13" />
                        <path d="M5 4h10a1.5 1.5 0 0 1 1.5 1.5V15A1.5 1.5 0 0 1 15 16.5H5A1.5 1.5 0 0 1 3.5 15V5.5A1.5 1.5 0 0 1 5 4Z" />
                      </svg>
                    </button>
                    <input
                      class="profile-date-native"
                      :value="datePickerValue(basicInfoForm.birthdate)"
                      type="date"
                      tabindex="-1"
                      aria-hidden="true"
                      data-testid="basic-info-birthdate-picker"
                      @input="pickDateField(basicInfoForm, 'birthdate', $event)"
                    />
                  </span>
                </label>
                <label class="full">
                  주소
                  <input v-model="basicInfoForm.address" placeholder="서울시 강남구 테헤란로 123" data-testid="basic-info-address" />
                </label>
                <label class="full">
                  상세주소
                  <input v-model="basicInfoForm.addressDetail" placeholder="101동 101호" data-testid="basic-info-address-detail" />
                </label>
              </div>
            </section>

            <section
              v-else-if="activeSectionSchema"
              class="document-structured-section"
              :aria-label="`${activeSectionTitle} 입력`"
            >
              <div
                v-for="group in activeSectionSchema.groups"
                :key="group.key"
                class="profile-group-card"
                :class="{ 'application-choice-card': group.layout === 'applicationChoice' }"
              >
                <div
                  class="profile-subsection-heading"
                  :class="{ 'application-choice-heading': applicationChoiceField(group) }"
                >
                  <h3>{{ group.title }}</h3>
                  <div v-if="applicationChoiceField(group)" class="application-choice-status">
                    <div
                      class="application-radio-group application-radio-group-compact"
                      :aria-label="applicationChoiceField(group).label"
                      :data-testid="`${group.key}-${applicationChoiceField(group).key}-radio-group`"
                    >
                      <label
                        v-for="option in applicationChoiceField(group).options"
                        :key="String(option.value)"
                        class="application-radio-option"
                      >
                        <input
                          v-model="activeSectionForm[group.key][applicationChoiceField(group).key]"
                          type="radio"
                          :name="`${group.key}-${applicationChoiceField(group).key}`"
                          :value="option.value"
                          :data-testid="`${group.key}-${applicationChoiceField(group).key}-${String(option.value)}`"
                          @change="updateChoiceField(activeSectionForm[group.key], applicationChoiceField(group).key, $event)"
                        />
                        <span>{{ option.label }}</span>
                      </label>
                    </div>
                  </div>
                </div>

                <template v-if="group.repeatable">
                  <article
                    v-for="(item, index) in activeSectionForm[group.key]"
                    :key="`${group.key}-${index}`"
                    class="profile-entry-card"
                  >
                    <div class="profile-entry-card-head">
                      <h4>{{ group.itemLabel }} {{ index + 1 }}</h4>
                      <div class="profile-entry-card-actions">
                        <template v-if="isDeletePending(group.key, index)">
                          <span class="inline-delete-prompt" aria-live="polite">삭제할까요?</span>
                          <button
                            class="ghost-button compact"
                            type="button"
                            :data-testid="`cancel-delete-${group.key}-${index}`"
                            @click="cancelDeleteGroupItem(group.key, index)"
                          >
                            취소
                          </button>
                          <button
                            class="danger-button compact"
                            type="button"
                            :data-testid="`confirm-delete-${group.key}-${index}`"
                            @click="confirmDeleteGroupItem(group.key, index)"
                          >
                            삭제
                          </button>
                        </template>
                        <template v-else>
                          <label
                            v-for="field in entryHeaderFields(group)"
                            :key="field.key"
                            class="entry-header-checkbox"
                          >
                            <input
                              v-model="item[field.key]"
                              type="checkbox"
                              :data-testid="`${group.key}-${index}-${field.key}`"
                              @change="updateChoiceField(item, field.key, $event)"
                            />
                            <span>{{ field.checkboxLabel }}</span>
                          </label>
                          <button
                            class="danger-button"
                            type="button"
                            :data-testid="`delete-${group.key}-${index}`"
                            @click="requestDeleteGroupItem(group.key, index)"
                          >
                            삭제
                          </button>
                        </template>
                      </div>
                    </div>
                    <div class="profile-field-grid" :class="`columns-${group.columns ?? 3}`">
                      <template v-for="field in visibleGroupFields(group)" :key="field.key">
                        <div v-if="field.type === 'checkbox'" class="checkbox-field-wrapper" :class="{ wide: field.wide, full: field.full }">
                          <span class="checkbox-top-label">&nbsp;</span>
                          <label class="checkbox-field">
                            <input
                              v-model="item[field.key]"
                              type="checkbox"
                              :data-testid="`${group.key}-${index}-${field.key}`"
                              @change="updateChoiceField(item, field.key, $event)"
                            />
                            <span>{{ field.checkboxLabel }}</span>
                          </label>
                        </div>
                        <div v-else-if="field.type === 'radio'" class="radio-field-wrapper" :class="{ wide: field.wide, full: field.full }">
                          <span class="radio-field-label">{{ field.label }}</span>
                          <div class="application-radio-group" :data-testid="`${group.key}-${index}-${field.key}-radio-group`">
                            <label v-for="option in field.options" :key="String(option.value)" class="application-radio-option">
                              <input
                                v-model="item[field.key]"
                                type="radio"
                                :name="`${group.key}-${index}-${field.key}`"
                                :value="option.value"
                                :data-testid="`${group.key}-${index}-${field.key}-${String(option.value)}`"
                                @change="updateChoiceField(item, field.key, $event)"
                              />
                              <span>{{ option.label }}</span>
                            </label>
                          </div>
                        </div>
                        <label v-else :class="{ wide: field.wide, full: field.full }">
                          {{ field.label }}
                          <textarea
                            v-if="field.type === 'textarea'"
                            v-model="item[field.key]"
                            :placeholder="field.placeholder"
                            :data-testid="`${group.key}-${index}-${field.key}`"
                          />
                          <select
                            v-else-if="field.type === 'select'"
                            v-model="item[field.key]"
                            :data-testid="`${group.key}-${index}-${field.key}`"
                            @change="updateChoiceField(item, field.key, $event)"
                          >
                            <option v-for="option in field.options" :key="option.value" :value="option.value">
                              {{ option.label }}
                            </option>
                          </select>
                          <span v-else-if="field.type === 'date'" class="profile-date-input">
                            <input
                              :value="item[field.key]"
                              type="text"
                              inputmode="numeric"
                              maxlength="10"
                              :placeholder="field.placeholder"
                              autocomplete="off"
                              :data-testid="`${group.key}-${index}-${field.key}`"
                              @input="updateDateField(item, field.key, $event)"
                              @paste="pasteDateField(item, field.key, $event)"
                              @blur="blurDateField(item, field.key, $event)"
                            />
                            <button
                              class="profile-date-picker-button"
                              type="button"
                              aria-label="달력 열기"
                              @click="openDatePicker"
                            >
                              <svg viewBox="0 0 20 20" focusable="false" aria-hidden="true">
                                <path d="M6 2v3" />
                                <path d="M14 2v3" />
                                <path d="M3.5 8h13" />
                                <path d="M5 4h10a1.5 1.5 0 0 1 1.5 1.5V15A1.5 1.5 0 0 1 15 16.5H5A1.5 1.5 0 0 1 3.5 15V5.5A1.5 1.5 0 0 1 5 4Z" />
                              </svg>
                            </button>
                            <input
                              class="profile-date-native"
                              :value="datePickerValue(item[field.key])"
                              type="date"
                              tabindex="-1"
                              aria-hidden="true"
                              :data-testid="`${group.key}-${index}-${field.key}-picker`"
                              @input="pickDateField(item, field.key, $event)"
                            />
                          </span>
                          <input
                            v-else
                            v-model="item[field.key]"
                            :type="field.type ?? 'text'"
                            :placeholder="field.placeholder"
                            :data-testid="`${group.key}-${index}-${field.key}`"
                          />
                        </label>
                      </template>
                    </div>
                  </article>
                  <button
                    class="add-profile-button"
                    type="button"
                    :data-testid="`add-${group.key}`"
                    @click="addGroupItem(group.key)"
                  >
                    + {{ group.addLabel }}
                  </button>
                </template>

                <div v-else class="profile-field-grid" :class="`columns-${group.columns ?? 3}`">
                  <template v-for="field in visibleGroupFields(group)" :key="field.key">
                    <div v-if="field.type === 'checkbox'" class="checkbox-field-wrapper" :class="{ wide: field.wide, full: field.full }">
                      <span class="checkbox-top-label">&nbsp;</span>
                      <label class="checkbox-field">
                        <input
                          v-model="activeSectionForm[group.key][field.key]"
                          type="checkbox"
                          :data-testid="`${group.key}-${field.key}`"
                          @change="updateChoiceField(activeSectionForm[group.key], field.key, $event)"
                        />
                        <span>{{ field.checkboxLabel }}</span>
                      </label>
                    </div>
                    <div v-else-if="field.type === 'radio'" class="radio-field-wrapper" :class="{ wide: field.wide, full: field.full }">
                      <span class="radio-field-label">{{ field.label }}</span>
                      <div class="application-radio-group" :data-testid="`${group.key}-${field.key}-radio-group`">
                        <label v-for="option in field.options" :key="String(option.value)" class="application-radio-option">
                              <input
                                v-model="activeSectionForm[group.key][field.key]"
                                type="radio"
                                :name="`${group.key}-${field.key}`"
                                :value="option.value"
                                :data-testid="`${group.key}-${field.key}-${String(option.value)}`"
                                @change="updateChoiceField(activeSectionForm[group.key], field.key, $event)"
                              />
                          <span>{{ option.label }}</span>
                        </label>
                      </div>
                    </div>
                    <label v-else :class="{ wide: field.wide, full: field.full }">
                      {{ field.label }}
                      <textarea
                        v-if="field.type === 'textarea'"
                        v-model="activeSectionForm[group.key][field.key]"
                        :placeholder="field.placeholder"
                        :data-testid="`${group.key}-${field.key}`"
                      />
                      <select
                        v-else-if="field.type === 'select'"
                        v-model="activeSectionForm[group.key][field.key]"
                        :data-testid="`${group.key}-${field.key}`"
                        @change="updateChoiceField(activeSectionForm[group.key], field.key, $event)"
                      >
                        <option v-for="option in field.options" :key="option.value" :value="option.value">
                          {{ option.label }}
                        </option>
                      </select>
                      <span v-else-if="field.type === 'date'" class="profile-date-input">
                        <input
                          :value="activeSectionForm[group.key][field.key]"
                          type="text"
                          inputmode="numeric"
                          maxlength="10"
                          :placeholder="field.placeholder"
                          autocomplete="off"
                          :data-testid="`${group.key}-${field.key}`"
                          @input="updateDateField(activeSectionForm[group.key], field.key, $event)"
                          @paste="pasteDateField(activeSectionForm[group.key], field.key, $event)"
                          @blur="blurDateField(activeSectionForm[group.key], field.key, $event)"
                        />
                        <button
                          class="profile-date-picker-button"
                          type="button"
                          aria-label="달력 열기"
                          @click="openDatePicker"
                        >
                          <svg viewBox="0 0 20 20" focusable="false" aria-hidden="true">
                            <path d="M6 2v3" />
                            <path d="M14 2v3" />
                            <path d="M3.5 8h13" />
                            <path d="M5 4h10a1.5 1.5 0 0 1 1.5 1.5V15A1.5 1.5 0 0 1 15 16.5H5A1.5 1.5 0 0 1 3.5 15V5.5A1.5 1.5 0 0 1 5 4Z" />
                          </svg>
                        </button>
                        <input
                          class="profile-date-native"
                          :value="datePickerValue(activeSectionForm[group.key][field.key])"
                          type="date"
                          tabindex="-1"
                          aria-hidden="true"
                          :data-testid="`${group.key}-${field.key}-picker`"
                          @input="pickDateField(activeSectionForm[group.key], field.key, $event)"
                        />
                      </span>
                      <input
                        v-else
                        v-model="activeSectionForm[group.key][field.key]"
                        :type="field.type ?? 'text'"
                        :placeholder="field.placeholder"
                        :data-testid="`${group.key}-${field.key}`"
                      />
                    </label>
                  </template>
                </div>
              </div>
            </section>

          </template>
          <div class="document-save-actions">
            <p
              v-if="manualSaveMessage"
              class="document-save-feedback"
              :class="manualSaveFeedback"
              data-testid="document-save-feedback"
              aria-live="polite"
            >
              <span
                class="document-save-feedback-icon"
                data-testid="document-save-feedback-icon"
                aria-hidden="true"
              >
                <svg v-if="manualSaveFeedback === 'saved'" viewBox="0 0 16 16" focusable="false">
                  <path d="M13.5 4.5 6.7 11.3 3 7.6" />
                </svg>
                <svg v-else viewBox="0 0 16 16" focusable="false">
                  <path d="M8 4.25v4.5" />
                  <path d="M8 11.75h.01" />
                </svg>
              </span>
              <span>{{ manualSaveMessage }}</span>
            </p>
            <button
              class="primary-button"
              type="button"
              :disabled="documentProfileStore.status === 'saving'"
              data-testid="save-document-profile"
              @click="saveActiveSection({ manual: true })"
            >
              {{ saveButtonLabel }}
            </button>
          </div>
        </main>
      </div>
    </section>
  </AppLayout>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDocumentProfileStore } from '@/stores/documentProfileStore';
import AppLayout from '@/shared/AppLayout.vue';
import StatePanel from '@/shared/StatePanel.vue';
import SkeletonLoader from '@/shared/SkeletonLoader.vue';
import { showToast } from '@/shared/useToast';

const MAX_PROFILE_PHOTO_BYTES = 2 * 1024 * 1024;
const AUTO_SAVE_DELAY_MS = 600;
const DEFAULT_SECTION_ID = 'basicInfo';
const validSectionIds = new Set(['basicInfo', 'military', 'education', 'career', 'projects', 'certificates', 'other']);
const documentProfileStore = useDocumentProfileStore();
const route = useRoute();
const router = useRouter();
const activeSection = ref(normalizeSectionId(route.query.section));
const autoSaveStatus = ref('idle');
const manualSaveFeedback = ref('idle');
const lastSaveErrorMessage = ref('');
const pendingDelete = ref(null);
const documentFormPanelRef = ref(null);
const basicInfoForm = reactive({
  nameKo: '',
  nameEn: '',
  nameHanja: '',
  email: '',
  phone: '',
  gender: '',
  birthdate: '',
  address: '',
  addressDetail: '',
  applicationCareerType: '',
  applicationSource: '',
  profilePhoto: null
});
const activeSectionForm = reactive({});
let autoSaveTimer = null;
let manualSaveFeedbackTimer = null;
let suppressFormWatch = true;
let basicInfoDirty = false;
let activeSectionDirty = false;
let lastSyncedActiveSection = '';

const sections = [
  { id: 'basicInfo', label: '기본 정보', title: '기본 정보' },
  { id: 'military', label: '병역 / 장애 / 보훈', title: '병역 / 장애 / 보훈' },
  { id: 'education', label: '학교 정보', title: '학교 정보' },
  { id: 'career', label: '경력', title: '경력' },
  { id: 'projects', label: '프로젝트', title: '프로젝트' },
  { id: 'certificates', label: '자격증 / 어학', title: '자격증 / 어학' },
  { id: 'other', label: '수상 / 교육 / 대외활동', title: '수상 / 교육 / 대외활동' }
];

const saveButtonLabel = computed(() => {
  if (documentProfileStore.status === 'saving') return '저장 중';
  if (manualSaveFeedback.value === 'saved') return '저장됨';
  if (manualSaveFeedback.value === 'failed') return '다시 저장';
  return '저장';
});
const manualSaveMessage = computed(() => {
  if (manualSaveFeedback.value === 'saved') return '저장됐습니다';
  if (manualSaveFeedback.value === 'failed') {
    return lastSaveErrorMessage.value
      ? `저장에 실패했습니다. ${lastSaveErrorMessage.value}`
      : '저장에 실패했습니다';
  }
  return '';
});
const activeSectionConfig = computed(() => sections.find((section) => section.id === activeSection.value) ?? sections[0]);
const activeSectionTitle = computed(() => activeSectionConfig.value.title);
const activeSectionSchema = computed(() => sectionSchemas[activeSection.value]);
const formattedLastSavedAt = computed(() => formatSavedAt(documentProfileStore.profile?.lastSavedAt));

watch(() => route.query.section, (section) => {
  const nextSection = normalizeSectionId(section);
  if (nextSection === activeSection.value) return;
  activeSectionDirty = false;
  lastSyncedActiveSection = '';
  activeSection.value = nextSection;
});

const selectOptions = {
  empty: [{ label: '선택', value: '' }],
  choose: [{ label: '선택하세요', value: '' }],
  gender: [
    { label: '선택', value: '' },
    { label: '남성', value: 'MALE' },
    { label: '여성', value: 'FEMALE' },
    { label: '기타', value: 'OTHER' }
  ],
  applicationCareerType: [
    { label: '선택', value: '' },
    { label: '신입', value: '신입' },
    { label: '경력', value: '경력' },
    { label: '신입/경력', value: '신입/경력' },
    { label: '인턴', value: '인턴' }
  ],
  applicationSource: [
    { label: '선택', value: '' },
    { label: '채용 사이트', value: '채용 사이트' },
    { label: '회사 홈페이지', value: '회사 홈페이지' },
    { label: '취업 포털', value: '취업 포털' },
    { label: '학교/센터 추천', value: '학교/센터 추천' },
    { label: '지인 추천', value: '지인 추천' },
    { label: '기타', value: '기타' }
  ],
  servicePeriod: [
    { label: '선택', value: '' },
    { label: '18 개월', value: '18 개월' },
    { label: '21 개월', value: '21 개월' },
    { label: '24 개월', value: '24 개월' },
    { label: '기타', value: '기타' }
  ],
  schoolTrack: [
    { label: '선택', value: '' },
    { label: '인문계', value: '인문계' },
    { label: '자연계', value: '자연계' },
    { label: '예체능계', value: '예체능계' },
    { label: '전문계', value: '전문계' },
    { label: '기타', value: '기타' }
  ],
  campusType: [
    { label: '선택', value: '' },
    { label: '본교', value: '본교' },
    { label: '분교', value: '분교' }
  ],
  majorCategory: [
    { label: '선택', value: '' },
    { label: '인문계열', value: '인문계열' },
    { label: '사회계열', value: '사회계열' },
    { label: '상경계열', value: '상경계열' },
    { label: '공학계열', value: '공학계열' },
    { label: '자연계열', value: '자연계열' },
    { label: '의약계열', value: '의약계열' },
    { label: '예체능계열', value: '예체능계열' },
    { label: '기타', value: '기타' }
  ],
  militaryStatus: [
    { label: '선택', value: '' },
    { label: '미필', value: '미필' },
    { label: '군필', value: '군필' },
    { label: '면제', value: '면제' },
    { label: '해당 없음', value: '해당 없음' }
  ],
  militaryBranch: [
    { label: '선택', value: '' },
    { label: '육군', value: '육군' },
    { label: '해군', value: '해군' },
    { label: '공군', value: '공군' },
    { label: '해병대', value: '해병대' },
    { label: '의무경찰', value: '의무경찰' },
    { label: '의무소방', value: '의무소방' },
    { label: '사회복무요원', value: '사회복무요원' },
    { label: '산업기능요원', value: '산업기능요원' },
    { label: '전문연구요원', value: '전문연구요원' },
    { label: '기타', value: '기타' }
  ],
  militaryRank: [
    { label: '선택', value: '' },
    { label: '이병', value: '이병' },
    { label: '일병', value: '일병' },
    { label: '상병', value: '상병' },
    { label: '병장', value: '병장' },
    { label: '하사', value: '하사' },
    { label: '중사', value: '중사' },
    { label: '상사', value: '상사' },
    { label: '원사', value: '원사' },
    { label: '준위', value: '준위' },
    { label: '소위', value: '소위' },
    { label: '중위', value: '중위' },
    { label: '대위', value: '대위' },
    { label: '소령 이상', value: '소령 이상' },
    { label: '해당 없음', value: '해당 없음' }
  ],
  dischargeType: [
    { label: '선택', value: '' },
    { label: '만기제대', value: '만기제대' },
    { label: '의병제대', value: '의병제대' },
    { label: '의가사제대', value: '의가사제대' },
    { label: '전역 예정', value: '전역 예정' },
    { label: '소집해제', value: '소집해제' },
    { label: '면제', value: '면제' },
    { label: '해당 없음', value: '해당 없음' }
  ],
  applicableStatus: [
    { label: '비대상', value: false },
    { label: '대상', value: true }
  ],
  disabilityLevel: [
    { label: '선택', value: '' },
    { label: '중증', value: '중증' },
    { label: '경증', value: '경증' },
    { label: '1급', value: '1급' },
    { label: '2급', value: '2급' },
    { label: '3급', value: '3급' },
    { label: '4급', value: '4급' },
    { label: '5급', value: '5급' },
    { label: '6급', value: '6급' }
  ],
  veteranRelation: [
    { label: '선택', value: '' },
    { label: '본인', value: '본인' },
    { label: '부', value: '부' },
    { label: '모', value: '모' },
    { label: '배우자', value: '배우자' },
    { label: '자녀', value: '자녀' },
    { label: '조부', value: '조부' },
    { label: '조모', value: '조모' },
    { label: '기타', value: '기타' }
  ],
  graduation: [
    { label: '선택', value: '' },
    { label: '졸업', value: '졸업' },
    { label: '졸업예정', value: '졸업예정' },
    { label: '중퇴', value: '중퇴' },
    { label: '휴학', value: '휴학' },
    { label: '재학', value: '재학' },
    { label: '검정고시', value: '검정고시' }
  ],
  schoolType: [
    { label: '선택', value: '' },
    { label: '일반고', value: '일반고' },
    { label: '특성화고', value: '특성화고' },
    { label: '자율고', value: '자율고' },
    { label: '기타', value: '기타' }
  ],
  dayNight: [
    { label: '선택', value: '' },
    { label: '주간', value: '주간' },
    { label: '야간', value: '야간' }
  ],
  degreeUniversity: [
    { label: '선택', value: '' },
    { label: '전문학사', value: '전문학사' },
    { label: '학사', value: '학사' }
  ],
  degreeGraduate: [
    { label: '선택', value: '' },
    { label: '석사', value: '석사' },
    { label: '박사', value: '박사' }
  ],
  gradeScale: [
    { label: '만점기준', value: '' },
    { label: '4.5', value: '4.5' },
    { label: '4.3', value: '4.3' },
    { label: '100', value: '100' }
  ],
  languageTestName: [
    { label: '선택하세요', value: '' },
    { label: 'OPIc(영어)', value: 'OPIc(영어)' },
    { label: 'OPIc(일본어)', value: 'OPIc(일본어)' },
    { label: 'OPIc(중국어)', value: 'OPIc(중국어)' },
    { label: 'OPIc(스페인어)', value: 'OPIc(스페인어)' },
    { label: 'OPIc(러시아어)', value: 'OPIc(러시아어)' },
    { label: 'OPIc(베트남어)', value: 'OPIc(베트남어)' },
    { label: 'TOEIC', value: 'TOEIC' },
    { label: 'TOEFL', value: 'TOEFL' },
    { label: 'IELTS', value: 'IELTS' },
    { label: 'TEPS', value: 'TEPS' },
    { label: 'JLPT', value: 'JLPT' },
    { label: 'HSK', value: 'HSK' },
    { label: '기타', value: '기타' }
  ],
  employmentType: [
    { label: '선택', value: '' },
    { label: '정규직', value: '정규직' },
    { label: '계약직', value: '계약직' },
    { label: '파견직', value: '파견직' },
    { label: '프리랜서', value: '프리랜서' },
    { label: '기타', value: '기타' }
  ],
  projectType: [
    { label: '선택', value: '' },
    { label: '개인', value: '개인' },
    { label: '팀', value: '팀' },
    { label: '회사', value: '회사' },
    { label: '오픈소스', value: '오픈소스' },
    { label: '기타', value: '기타' }
  ],
  internshipType: [
    { label: '선택', value: '' },
    { label: '인턴', value: '인턴' },
    { label: '알바', value: '알바' },
    { label: '실습', value: '실습' },
    { label: '기타', value: '기타' }
  ],
  activityType: [
    { label: '선택하세요', value: '' },
    { label: '동아리', value: '동아리' },
    { label: '학생회', value: '학생회' },
    { label: '서포터즈', value: '서포터즈' },
    { label: '봉사', value: '봉사' },
    { label: '공모전', value: '공모전' },
    { label: '대외활동', value: '대외활동' },
    { label: '기타', value: '기타' }
  ],
  overseasPurpose: [
    { label: '선택하세요', value: '' },
    { label: '어학연수', value: '어학연수' },
    { label: '해외연수', value: '해외연수' },
    { label: '교환학생', value: '교환학생' },
    { label: '세미나', value: '세미나' },
    { label: '해외거주', value: '해외거주' },
    { label: '해외봉사', value: '해외봉사' },
    { label: '기타', value: '기타' }
  ]
};

const sectionSchemas = {
  military: {
    groups: [
      {
        key: 'military',
        title: '병역',
        columns: 3,
        fields: [
          selectField('status', '병역 상태 (군필/미필/면제 등)', selectOptions.militaryStatus),
          selectField('branch', '군별 (육군/해군/공군 등)', selectOptions.militaryBranch),
          selectField('rank', '계급', selectOptions.militaryRank),
          textField('specialty', '보직/병과', '예: 정보통신'),
          dateField('enlistmentDate', '입대일'),
          dateField('dischargeDate', '전역일'),
          selectField('dischargeType', '전역 구분 (만기/의병 등)', selectOptions.dischargeType),
          textField('exemptionReason', '면제 사유', '면제 사유를 입력하세요', true)
        ]
      },
      {
        key: 'disability',
        title: '장애',
        layout: 'applicationChoice',
        columns: 2,
        fields: [
          radioField('hasDisability', '장애 여부', selectOptions.applicableStatus),
          selectField('disabilityLevel', '장애 정도', selectOptions.disabilityLevel),
          textField('disabilityDescription', '장애 내용', '장애 내용', true)
        ]
      },
      {
        key: 'veteran',
        title: '보훈',
        layout: 'applicationChoice',
        columns: 2,
        fields: [
          radioField('isVeteran', '보훈 대상 여부', selectOptions.applicableStatus),
          selectField('veteranRelation', '보훈 관계 (본인/부/모 등)', selectOptions.veteranRelation),
          textField('veteranNumber', '보훈 번호', '보훈 번호', false),
          textField('veteranRate', '보훈 비율', '보훈 비율', false)
        ]
      }
    ]
  },
  education: {
    groups: [
      {
        key: 'highSchool',
        title: '고등학교',
        columns: 3,
        fields: [
          textField('schoolName', '학교명', '학교명', true),
          selectField('schoolType', '학교 유형', selectOptions.schoolType),
          dateField('entranceDate', '입학일'),
          dateField('graduationDate', '졸업일'),
          selectField('graduationStatus', '졸업구분', selectOptions.graduation),
          textField('location', '소재지', '예: 서울'),
          selectField('dayNight', '주간/야간', selectOptions.dayNight)
        ]
      },
      {
        key: 'universities',
        title: '대학교',
        itemLabel: '대학교',
        addLabel: '대학교 추가',
        repeatable: true,
        columns: 3,
        fields: educationDegreeFields(selectOptions.degreeUniversity)
      },
      {
        key: 'graduateSchools',
        title: '대학원',
        itemLabel: '대학원',
        addLabel: '대학원 추가',
        repeatable: true,
        columns: 3,
        fields: educationDegreeFields(selectOptions.degreeGraduate)
      }
    ]
  },
  career: {
    groups: [
      {
        key: 'careers',
        title: '경력',
        itemLabel: '경력',
        addLabel: '경력 추가',
        repeatable: true,
        columns: 3,
        fields: [
          textField('companyName', '회사명'),
          textField('companyType', '회사 유형 (대기업/중소 등)', '', false),
          textField('industry', '회사 업종', '', false),
          textField('department', '부서'),
          textField('position', '직급/직책'),
          textField('roleName', '담당 직무명'),
          selectField('employmentType', '고용 형태 (정규직/계약직 등)', selectOptions.employmentType),
          textField('salary', '연봉', '예: 5000만원'),
          textField('resignationReason', '퇴사 사유', '', false),
          dateField('startDate', '입사일'),
          dateField('endDate', '퇴사일'),
          checkboxField('isEmployed', '재직 중 여부'),
          textField('duties', '담당 업무', '', false, true),
          textField('achievements', '주요 성과', '', false, true)
        ]
      },
      {
        key: 'internships',
        title: '인턴/알바',
        itemLabel: '인턴/알바',
        addLabel: '인턴/알바 추가',
        repeatable: true,
        columns: 3,
        fields: [
          textField('companyName', '회사명'),
          selectField('experienceType', '경험 구분 (인턴/알바/실습 등)', selectOptions.internshipType),
          textField('department', '부서'),
          textField('position', '직무/직책'),
          textField('weeklyHours', '주당 근무 시간', '예: 20시간', false),
          dateField('startDate', '시작일'),
          dateField('endDate', '종료일'),
          checkboxField('isActive', '재직 중 여부'),
          textField('duties', '주요 업무 내용', '', false, true)
        ]
      }
    ]
  },
  projects: {
    groups: [
      {
        key: 'projects',
        title: '프로젝트',
        itemLabel: '프로젝트',
        addLabel: '프로젝트 추가',
        repeatable: true,
        columns: 3,
        fields: [
          textField('projectName', '프로젝트명'),
          selectField('projectType', '프로젝트 유형 (개인/팀/회사 등)', selectOptions.projectType),
          textField('role', '역할 (프론트/백엔드/PM 등)'),
          dateField('startDate', '시작일'),
          dateField('endDate', '종료일'),
          textField('techStack', '기술 스택', '예: React, Node.js, MongoDB'),
          textField('summary', '프로젝트 요약', '', false, true),
          textField('contribution', '본인 기여도/담당 업무', '', false, true)
        ]
      }
    ]
  },
  certificates: {
    groups: [
      {
        key: 'certificates',
        title: '자격증/면허증',
        itemLabel: '자격증',
        addLabel: '자격증 추가',
        repeatable: true,
        columns: 4,
        fields: [
          textField('certificateName', '자격증명', '자격증명을 입력하세요.'),
          textField('issuer', '발급기관', '발급기관을 입력하세요.'),
          textField('registrationNumber', '등록번호', '등록번호를 입력하세요.'),
          dateField('acquiredDate', '취득일')
        ]
      },
      {
        key: 'languageTests',
        title: '공인외국어시험',
        itemLabel: '시험',
        addLabel: '시험 추가',
        repeatable: true,
        columns: 4,
        fields: [
          selectField('testName', '시험명', selectOptions.languageTestName),
          textField('score', '점수/등급', '예: 900'),
          dateField('acquiredDate', '취득일'),
          textField('registrationNumber', '등록번호', '등록번호를 입력하세요.')
        ]
      }
    ]
  },
  other: {
    groups: [
      {
        key: 'awards',
        title: '수상경력',
        itemLabel: '수상경력',
        addLabel: '수상경력 추가',
        repeatable: true,
        columns: 3,
        fields: [
          textField('awardName', '상훈명', '상훈명을 입력하세요.'),
          textField('issuer', '수여기관', '수여기관을 입력하세요.'),
          dateField('awardDate', '수상일자'),
          textField('description', '수상내역', '수상내역을 입력하세요.', false, true)
        ]
      },
      {
        key: 'trainings',
        title: '교육이수사항',
        itemLabel: '교육이수사항',
        addLabel: '교육이수사항 추가',
        repeatable: true,
        columns: 3,
        fields: [
          textField('courseName', '과정명', '교육 과정명을 입력하세요.'),
          textField('institution', '교육기관', '교육 기관명을 입력하세요.'),
          textField('hours', '교육시간', '교육 시간'),
          dateField('startDate', '이수기간 시작일'),
          dateField('endDate', '이수기간 종료일'),
          textField('description', '주요내용', '교육 과정 주요 내용을 상세히 입력하세요.', false, true)
        ]
      },
      {
        key: 'activities',
        title: '대외활동',
        itemLabel: '대외활동',
        addLabel: '대외활동 추가',
        repeatable: true,
        columns: 3,
        fields: [
          selectField('activityType', '활동구분', selectOptions.activityType),
          textField('activityName', '활동명', '활동명을 입력하세요.'),
          textField('organization', '기관/단체', '기관 또는 단체명을 입력하세요.'),
          textField('role', '직위 또는 역할', '직위 또는 역할을 입력하세요.'),
          dateField('startDate', '시작일'),
          dateField('endDate', '종료일'),
          textField('description', '주요 활동', '맡은 일과 활동 내용을 입력하세요.', false, true),
          textField('outcome', '성과', '성과나 배운 점을 입력하세요.', false, true)
        ]
      },
      {
        key: 'overseas',
        title: '해외경험',
        itemLabel: '해외경험',
        addLabel: '해외경험 추가',
        repeatable: true,
        columns: 2,
        fields: [
          selectField('purpose', '해외경험 목적', selectOptions.overseasPurpose),
          textField('country', '국가', '국가 코드 (예: US, JP, CN)'),
          dateField('departureDate', '출국일'),
          dateField('entryDate', '입국일'),
          textField('description', '해외경험 내용기술', '해외경험 내용을 상세히 입력하세요.', false, true)
        ]
      }
    ]
  }
};

extendDocumentProfileSchemasForApplicationAutofill();

watch(() => documentProfileStore.basicInfo, (basicInfo) => {
  if (activeSection.value === 'basicInfo' && basicInfoDirty) return;
  suppressFormWatch = true;
  Object.assign(basicInfoForm, basicInfo);
  queueMicrotask(() => {
    suppressFormWatch = false;
  });
}, { immediate: true });

watch([
  activeSection,
  () => documentProfileStore.profile?.sections
], ([section], [previousSection] = []) => {
  const isSameSection = section === previousSection;
  if (isSameSection && activeSection.value !== 'basicInfo' && activeSectionDirty) return;
  const isSameSectionRefresh = section === previousSection && activeSection.value !== 'basicInfo';
  if (isSameSectionRefresh && lastSyncedActiveSection === section) return;
  suppressFormWatch = true;
  syncActiveSectionForm();
  queueMicrotask(() => {
    suppressFormWatch = false;
  });
}, { immediate: true });

watch(basicInfoForm, () => {
  if (suppressFormWatch) return;
  if (activeSection.value !== 'basicInfo') return;
  basicInfoDirty = true;
  scheduleAutoSave();
}, { deep: true });

watch(activeSectionForm, () => {
  if (suppressFormWatch) return;
  if (!activeSectionSchema.value) return;
  activeSectionDirty = true;
  scheduleAutoSave();
}, { deep: true });

watch(() => activeSectionForm.military?.status, () => {
  if (suppressFormWatch || activeSection.value !== 'military') return;
  clearIrrelevantMilitaryServiceDetails(activeSectionForm.military);
});

onMounted(() => {
  void documentProfileStore.loadDocumentProfile();
});
onBeforeUnmount(() => {
  clearAutoSaveTimer();
  clearManualSaveFeedback();
});

async function selectSection(sectionId) {
  const nextSection = normalizeSectionId(sectionId);
  activeSectionDirty = false;
  lastSyncedActiveSection = '';
  activeSection.value = nextSection;
  void updateSectionRoute(nextSection);
  await nextTick();
  if (typeof documentFormPanelRef.value?.scrollIntoView !== 'function') return;
  documentFormPanelRef.value.scrollIntoView({
    block: 'start',
    behavior: 'smooth'
  });
}

async function updateSectionRoute(sectionId) {
  const nextQuery = { ...route.query };
  if (sectionId === DEFAULT_SECTION_ID) {
    delete nextQuery.section;
  } else {
    nextQuery.section = sectionId;
  }
  await router.replace({ query: nextQuery });
}

async function saveActiveSection(options = {}) {
  const showManualFeedback = options.manual === true;
  clearAutoSaveTimer();
  clearManualSaveFeedback();
  await nextTick();
  suppressFormWatch = true;
  try {
    syncActiveSectionFormFromDom();
    await nextTick();
  } finally {
    suppressFormWatch = false;
  }
  const wasActiveSectionDirty = activeSectionDirty;
  autoSaveStatus.value = 'saving';
  try {
    if (activeSection.value === 'basicInfo') {
      await documentProfileStore.saveBasicInfo({ ...basicInfoForm });
    } else if (activeSectionSchema.value) {
      let payload = cloneValue(activeSectionForm);
      if (activeSection.value === 'military') {
        payload = createMilitarySavePayload(payload);
      }
      await documentProfileStore.saveReusableSection(activeSection.value, payload);
    }
    if (documentProfileStore.status === 'error') {
      autoSaveStatus.value = 'failed';
      lastSaveErrorMessage.value = documentProfileStore.errorMessage || '';
      if (showManualFeedback) {
        setManualSaveFeedback('failed');
      }
      showToast(documentProfileStore.errorMessage || '저장에 실패했습니다.', { tone: 'red' });
    } else {
      if (activeSection.value === 'basicInfo') {
        basicInfoDirty = false;
      } else {
        activeSectionDirty = wasActiveSectionDirty;
      }
      autoSaveStatus.value = 'saved';
      lastSaveErrorMessage.value = '';
      if (showManualFeedback) {
        setManualSaveFeedback('saved');
      }
    }
  } catch (err) {
    autoSaveStatus.value = 'failed';
    lastSaveErrorMessage.value = '네트워크 연결을 확인해 주세요.';
    if (showManualFeedback) {
      setManualSaveFeedback('failed');
    }
    showToast('저장 중 네트워크 오류가 발생했습니다.', { tone: 'red' });
  }
}

async function updateProfilePhoto(event) {
  const [file] = Array.from(event.target.files ?? []);
  event.target.value = '';
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showToast('이미지 파일만 등록할 수 있습니다.', { tone: 'red' });
    return;
  }
  if (file.size > MAX_PROFILE_PHOTO_BYTES) {
    showToast('사진은 2MB 이하로 등록해 주세요.', { tone: 'red' });
    return;
  }
  try {
    const dataUrl = await readFileAsDataUrl(file);
    basicInfoForm.profilePhoto = {
      name: file.name,
      type: file.type,
      size: file.size,
      dataUrl
    };
  } catch {
    showToast('사진을 읽지 못했습니다. 다른 파일로 다시 시도해 주세요.', { tone: 'red' });
  }
}

function removeProfilePhoto() {
  basicInfoForm.profilePhoto = null;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('File read failed'));
    reader.readAsDataURL(file);
  });
}

function scheduleAutoSave() {
  if (suppressFormWatch) return;
  clearAutoSaveTimer();
  clearManualSaveFeedback();
  autoSaveStatus.value = 'waiting';
  autoSaveTimer = setTimeout(() => {
    void saveActiveSection({ manual: false });
  }, AUTO_SAVE_DELAY_MS);
}

function clearAutoSaveTimer() {
  if (!autoSaveTimer) return;
  clearTimeout(autoSaveTimer);
  autoSaveTimer = null;
}

function syncActiveSectionForm() {
  if (!activeSectionSchema.value) return;
  replaceReactive(activeSectionForm, sectionPayload(activeSection.value));
  activeSectionDirty = false;
  if (documentProfileStore.profile?.sections) {
    lastSyncedActiveSection = activeSection.value;
  }
  pendingDelete.value = null;
  autoSaveStatus.value = 'idle';
  clearManualSaveFeedback();
}

function setManualSaveFeedback(status) {
  clearManualSaveFeedback();
  manualSaveFeedback.value = status;
  manualSaveFeedbackTimer = setTimeout(() => {
    manualSaveFeedback.value = 'idle';
    manualSaveFeedbackTimer = null;
  }, 2400);
}

function clearManualSaveFeedback() {
  if (manualSaveFeedbackTimer) {
    clearTimeout(manualSaveFeedbackTimer);
    manualSaveFeedbackTimer = null;
  }
  manualSaveFeedback.value = 'idle';
}

function sectionPayload(sectionType) {
  const savedPayload = legacySectionPayload(sectionType);
  return mergeSectionDefaults(activeSectionSchema.value, savedPayload);
}

function normalizeSectionId(value) {
  const sectionId = Array.isArray(value) ? value[0] : value;
  return validSectionIds.has(sectionId) ? sectionId : DEFAULT_SECTION_ID;
}

function createMilitarySavePayload(payload) {
  const military = payload.military ?? {};
  const disability = payload.disability ?? {};
  const veteran = payload.veteran ?? {};
  const flatRecord = {
    status: cleanRecordText(military.status),
    branch: cleanRecordText(military.branch),
    rank: cleanRecordText(military.rank),
    specialty: cleanRecordText(military.specialty),
    enlistmentDate: cleanRecordText(military.enlistmentDate),
    dischargeDate: cleanRecordText(military.dischargeDate),
    servicePeriod: cleanRecordText(military.servicePeriod),
    dischargeType: cleanRecordText(military.dischargeType),
    exemptionReason: cleanRecordText(military.exemptionReason),
    hasDisability: booleanRecordValue(disability.hasDisability),
    disabilityLevel: cleanRecordText(disability.disabilityLevel),
    disabilityRegistrationNumber: cleanRecordText(disability.disabilityRegistrationNumber),
    disabilityType: cleanRecordText(disability.disabilityType),
    disabilityDescription: cleanRecordText(disability.disabilityDescription),
    isVeteran: booleanRecordValue(veteran.isVeteran),
    veteranRelation: cleanRecordText(veteran.veteranRelation),
    veteranNumber: cleanRecordText(veteran.veteranNumber),
    veteranRate: cleanRecordText(veteran.veteranRate)
  };

  clearIrrelevantMilitaryServiceDetails(flatRecord);

  return { military: [flatRecord] };
}

function booleanRecordValue(value) {
  return value === true || value === 'true';
}

function isMilitaryServiceDetailRelevant(status) {
  return ['군필', '복무중'].includes(cleanRecordText(status));
}

function clearIrrelevantMilitaryServiceDetails(record) {
  if (!record || isMilitaryServiceDetailRelevant(record.status)) return;
  record.branch = '';
  record.rank = '';
  record.specialty = '';
  record.enlistmentDate = '';
  record.dischargeDate = '';
  record.servicePeriod = '';
  record.dischargeType = '';
  if (record.status !== '면제') {
    record.exemptionReason = '';
  }
}

function legacySectionPayload(sectionType) {
  const sectionsPayload = documentProfileStore.profile?.sections ?? {};
  if (sectionType === 'military') {
    return normalizeMilitaryPayload(sectionsPayload.military);
  }
  const savedPayload = sectionsPayload[sectionType];
  if (savedPayload && typeof savedPayload === 'object' && !Array.isArray(savedPayload)) {
    return savedPayload;
  }
  if (sectionType === 'education') {
    return Array.isArray(sectionsPayload.education) ? { universities: sectionsPayload.education } : savedPayload;
  }
  if (sectionType === 'career') {
    return legacyArraysPayload(sectionsPayload, {
      career: 'careers',
      internships: 'internships'
    }) ?? savedPayload;
  }
  if (sectionType === 'projects') {
    return Array.isArray(sectionsPayload.projects) ? { projects: sectionsPayload.projects } : savedPayload;
  }
  if (sectionType === 'certificates') {
    return Array.isArray(sectionsPayload.certificates) ? { certificates: sectionsPayload.certificates } : savedPayload;
  }
  if (sectionType === 'other') {
    return legacyArraysPayload(sectionsPayload, {
      awards: 'awards',
      trainings: 'trainings',
      activities: 'activities',
      overseas: 'overseas'
    }) ?? savedPayload;
  }
  return savedPayload;
}

function legacyArraysPayload(source, keyMap) {
  const payload = {};
  Object.entries(keyMap).forEach(([sourceKey, targetKey]) => {
    if (Array.isArray(source[sourceKey])) {
      payload[targetKey] = source[sourceKey];
    }
  });
  return Object.keys(payload).length > 0 ? payload : null;
}

function normalizeMilitaryPayload(savedPayload) {
  const savedRecord = plainRecord(savedPayload);
  const nestedMilitary = savedRecord.military;
  const flatMilitary = Array.isArray(savedPayload)
    ? savedPayload[0]
    : Array.isArray(nestedMilitary)
      ? nestedMilitary[0]
      : (nestedMilitary ?? savedPayload);
  const disability = savedRecord.disability ?? flatMilitary;
  const veteran = savedRecord.veteran ?? flatMilitary;
  const military = normalizeMilitaryRecord(flatMilitary);
  return {
    military,
    disability: { ...plainRecord(disability) },
    veteran: { ...plainRecord(veteran) }
  };
}

function normalizeMilitaryRecord(record) {
  const normalizedRecord = { ...plainRecord(record) };
  const title = cleanRecordText(normalizedRecord.title);
  const summaryParts = splitSummaryText(normalizedRecord.summary);
  delete normalizedRecord.title;
  delete normalizedRecord.summary;
  if (!cleanRecordText(normalizedRecord.status) && optionHasValue(selectOptions.militaryStatus, title)) {
    normalizedRecord.status = title;
  }
  if (!cleanRecordText(normalizedRecord.branch)) {
    normalizedRecord.branch = summaryParts.find((part) => optionHasValue(selectOptions.militaryBranch, part)) ?? '';
  }
  if (!cleanRecordText(normalizedRecord.rank)) {
    normalizedRecord.rank = summaryParts.find((part) => optionHasValue(selectOptions.militaryRank, part)) ?? '';
  }
  if (!cleanRecordText(normalizedRecord.dischargeType)) {
    normalizedRecord.dischargeType = summaryParts.find((part) => optionHasValue(selectOptions.dischargeType, part)) ?? '';
  }
  return normalizedRecord;
}

function splitSummaryText(value) {
  return cleanRecordText(value)
    .split(/[\/,|·・]/)
    .map(cleanRecordText)
    .filter(Boolean);
}

function optionHasValue(options, value) {
  const normalizedValue = cleanRecordText(value);
  return Boolean(normalizedValue) && options.some((option) => option.value === normalizedValue);
}

function cleanRecordText(value) {
  return String(value ?? '').trim();
}

function plainRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function addGroupItem(groupKey) {
  const group = activeSectionSchema.value?.groups.find((item) => item.key === groupKey);
  if (!group) return;
  pendingDelete.value = null;
  if (!Array.isArray(activeSectionForm[groupKey])) {
    activeSectionForm[groupKey] = [];
  }
  activeSectionForm[groupKey].push(emptyGroupItem(group));
}

function requestDeleteGroupItem(groupKey, index) {
  if (!Array.isArray(activeSectionForm[groupKey])) return;
  pendingDelete.value = { groupKey, index };
}

function isDeletePending(groupKey, index) {
  return pendingDelete.value?.groupKey === groupKey && pendingDelete.value?.index === index;
}

function cancelDeleteGroupItem(groupKey, index) {
  if (isDeletePending(groupKey, index)) {
    pendingDelete.value = null;
  }
}

function confirmDeleteGroupItem(groupKey, index) {
  if (!Array.isArray(activeSectionForm[groupKey])) return;
  activeSectionForm[groupKey].splice(index, 1);
  pendingDelete.value = null;
}

function updateChoiceField(target, key, event) {
  if (!target) return;
  const element = event.target;
  target[key] = domFieldValue(element, target[key]);
}

function syncActiveSectionFormFromDom() {
  if (!activeSectionSchema.value || !documentFormPanelRef.value) return;
  activeSectionSchema.value.groups.forEach((group) => {
    if (group.repeatable) {
      syncRepeatableGroupFromDom(group);
      return;
    }
    syncGroupRecordFromDom(group, activeSectionForm[group.key], `${group.key}`);
  });
}

function syncRepeatableGroupFromDom(group) {
  const records = activeSectionForm[group.key];
  if (!Array.isArray(records)) return;
  records.forEach((record, index) => {
    syncGroupRecordFromDom(group, record, `${group.key}-${index}`);
  });
}

function syncGroupRecordFromDom(group, record, testIdPrefix) {
  if (!record) return;
  group.fields.forEach((field) => {
    const fieldValue = readFieldValueFromDom(field, testIdPrefix, record[field.key]);
    if (fieldValue !== undefined) {
      record[field.key] = fieldValue;
    }
  });
}

function readFieldValueFromDom(field, testIdPrefix, fallbackValue) {
  if (field.type === 'radio') {
    const checkedRadio = documentFormPanelRef.value.querySelector(
      `input[type="radio"][name="${escapeAttributeValue(testIdPrefix)}-${escapeAttributeValue(field.key)}"]:checked`
    );
    return checkedRadio ? domFieldValue(checkedRadio, fallbackValue, field) : fallbackValue;
  }
  const element = documentFormPanelRef.value.querySelector(testIdSelector(`${testIdPrefix}-${field.key}`));
  if (!element) return undefined;
  return domFieldValue(element, fallbackValue, field);
}

function domFieldValue(element, fallbackValue, field = null) {
  if (element.type === 'checkbox') return element.checked;
  if (field?.options?.some((option) => typeof option.value === 'boolean')) {
    return element.value === 'true';
  }
  if (typeof fallbackValue === 'boolean') return element.value === 'true';
  return element.value;
}

function testIdSelector(value) {
  return `[data-testid="${escapeAttributeValue(value)}"]`;
}

function escapeAttributeValue(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function updateDateField(target, key, event) {
  const formattedValue = formatDateTypingInput(event.target.value);
  target[key] = formattedValue;
  event.target.value = formattedValue;
}

function blurDateField(target, key, event) {
  const formattedValue = normalizeDateInput(event.target.value);
  target[key] = formattedValue;
  event.target.value = formattedValue;
}

function pasteDateField(target, key, event) {
  const pastedValue = event.clipboardData?.getData('text') ?? '';
  const formattedValue = normalizeDateInput(pastedValue);
  if (!formattedValue) return;
  event.preventDefault();
  target[key] = formattedValue;
  event.target.value = formattedValue;
  event.target.dispatchEvent(new Event('input', { bubbles: true }));
}

function pickDateField(target, key, event) {
  const formattedValue = normalizeDateInput(event.target.value);
  target[key] = formattedValue;
}

function datePickerValue(value) {
  return normalizeDateInput(value);
}

function openDatePicker(event) {
  const nativeDateInput = event.currentTarget
    ?.closest('.profile-date-input')
    ?.querySelector('.profile-date-native');
  if (!nativeDateInput) return;
  if (typeof nativeDateInput.showPicker === 'function') {
    nativeDateInput.showPicker();
    return;
  }
  nativeDateInput.focus();
  nativeDateInput.click();
}

function formatDateTypingInput(value) {
  const validDate = normalizeDateInput(value);
  if (validDate) return validDate;
  const digits = String(value ?? '').replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

function normalizeDateInput(value) {
  const text = String(value ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return toDateValue(text.slice(0, 4), text.slice(5, 7), text.slice(8, 10));
  }
  const separatedDate = text.match(/^(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  if (separatedDate) {
    return toDateValue(separatedDate[1], separatedDate[2], separatedDate[3]);
  }
  const digits = String(value ?? '').replace(/\D/g, '').slice(0, 8);
  if (digits.length !== 8) return '';
  return toDateValue(digits.slice(0, 4), digits.slice(4, 6), digits.slice(6));
}

function toDateValue(year, month, day) {
  const normalizedYear = String(year).padStart(4, '0');
  const normalizedMonth = String(month).padStart(2, '0');
  const normalizedDay = String(day).padStart(2, '0');
  const parsed = new Date(`${normalizedYear}-${normalizedMonth}-${normalizedDay}T00:00:00Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== Number(normalizedYear) ||
    parsed.getUTCMonth() + 1 !== Number(normalizedMonth) ||
    parsed.getUTCDate() !== Number(normalizedDay)
  ) {
    return '';
  }
  return `${normalizedYear}-${normalizedMonth}-${normalizedDay}`;
}

function extendDocumentProfileSchemasForApplicationAutofill() {
  insertFieldAfter(sectionSchemas.military?.groups?.[0]?.fields, 'dischargeDate', selectField('servicePeriod', '복무기간', selectOptions.servicePeriod));
  insertFieldAfter(sectionSchemas.military?.groups?.[1]?.fields, 'disabilityLevel', textField('disabilityRegistrationNumber', '장애등록번호', '장애등록번호'));
  insertFieldAfter(sectionSchemas.military?.groups?.[1]?.fields, 'disabilityRegistrationNumber', textField('disabilityType', '장애 유형', '예: 지체, 시각, 청각'));
  insertFieldAfter(sectionSchemas.education?.groups?.[0]?.fields, 'schoolType', selectField('track', '계열', selectOptions.schoolTrack));

  for (const group of [sectionSchemas.education?.groups?.[1], sectionSchemas.education?.groups?.[2]]) {
    insertFieldAfter(group?.fields, 'schoolName', textField('location', '학교 소재지', '예: 부산'));
    insertFieldAfter(group?.fields, 'location', selectField('campusType', '본교/분교', selectOptions.campusType));
    insertFieldAfter(group?.fields, 'major', selectField('majorCategory', '학과계열', selectOptions.majorCategory));
  }
}

function insertFieldAfter(fields, afterKey, field) {
  if (!Array.isArray(fields) || !field?.key || fields.some((item) => item.key === field.key)) return;
  const index = fields.findIndex((item) => item.key === afterKey);
  fields.splice(index >= 0 ? index + 1 : fields.length, 0, field);
}

function textField(key, label, placeholder = '', wide = false, full = false) {
  return { key, label, placeholder, wide, full, type: full ? 'textarea' : 'text' };
}

function dateField(key, label) {
  return { key, label, type: 'date', placeholder: 'YYYY-MM-DD' };
}

function monthField(key, label) {
  return { key, label, type: 'month', placeholder: 'YYYY.MM' };
}

function selectField(key, label, options, wide = false) {
  return { key, label, options, wide, type: 'select' };
}

function radioField(key, label, options, wide = false) {
  return { key, label, options, wide, type: 'radio' };
}

function checkboxField(key, checkboxLabel, wide = true, headerPlacement = '') {
  return { key, label: '', checkboxLabel, type: 'checkbox', wide, headerPlacement };
}

function educationDegreeFields(degreeOptions) {
  return [
    textField('schoolName', '학교명', '학교명'),
    textField('major', '전공', '전공명'),
    textField('subMajor', '복수전공/부전공'),
    selectField('degreeType', '학위구분', degreeOptions),
    dateField('entranceDate', '입학일'),
    dateField('graduationDate', '졸업일'),
    selectField('graduationStatus', '졸업구분', selectOptions.graduation),
    checkboxField('isTransfer', '편입 여부', false, 'entryHeader'),
    textField('grade', '* 성적 평점', '평점'),
    selectField('gradeScale', '만점', selectOptions.gradeScale),
    textField('completedCredits', '이수학점', '예: 130'),
    textField('majorGrade', '전공 평점', '평점'),
    selectField('majorGradeScale', '전공 만점', selectOptions.gradeScale),
    textField('gradeRank', '학점 백분율', '예: 상위 10%')
  ];
}

function mergeSectionDefaults(schema, savedPayload) {
  const payload = savedPayload && typeof savedPayload === 'object' && !Array.isArray(savedPayload) ? savedPayload : {};
  return schema.groups.reduce((section, group) => {
    if (group.repeatable) {
      const hasSavedGroup = Object.prototype.hasOwnProperty.call(payload, group.key);
      const savedItems = Array.isArray(payload[group.key]) ? payload[group.key] : [];
      section[group.key] = hasSavedGroup
        ? savedItems.map((item) => ({ ...emptyGroupItem(group), ...item }))
        : [emptyGroupItem(group)];
      return section;
    }
    section[group.key] = { ...emptyGroupItem(group), ...(payload[group.key] ?? {}) };
    return section;
  }, {});
}

function emptyGroupItem(group) {
  return group.fields.reduce((item, field) => {
    item[field.key] = field.type === 'checkbox' ? false : '';
    return item;
  }, {});
}

function applicationChoiceField(group) {
  if (group.layout !== 'applicationChoice') return null;
  return group.fields.find((field) => field.type === 'radio') ?? null;
}

function visibleGroupFields(group) {
  const hiddenFieldKeys = new Set([
    applicationChoiceField(group)?.key,
    ...entryHeaderFields(group).map((field) => field.key)
  ].filter(Boolean));
  if (hiddenFieldKeys.size === 0) return group.fields;
  return group.fields.filter((field) => !hiddenFieldKeys.has(field.key));
}

function entryHeaderFields(group) {
  if (!group.repeatable) return [];
  return group.fields.filter((field) => field.headerPlacement === 'entryHeader');
}

function replaceReactive(target, source) {
  Object.keys(target).forEach((key) => {
    delete target[key];
  });
  Object.entries(source).forEach(([key, value]) => {
    target[key] = value;
  });
}

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function formatSavedAt(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value).replace(/[TZ].*$/g, '').replace('T', ' ');
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}년 ${month}월 ${day}일 ${hour}:${minute}`;
}
</script>
