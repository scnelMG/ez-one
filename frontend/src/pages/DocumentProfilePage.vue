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
        <div class="document-save-controls">
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

      <div class="document-editor-grid document-editor-grid-focused">
        <aside class="wire-side-rail document-section-rail" aria-label="서류 섹션 목록">
          <button
            v-for="section in sections"
            :key="section.id"
            class="rail-button"
            :class="{ active: section.id === activeSection }"
            :data-testid="`section-${section.id}`"
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
                <h2>{{ activeSectionTitle }}</h2>
              </div>
            </div>

            <section v-if="activeSection === 'basicInfo'" class="form-shell compact document-basic-form" aria-label="기본 정보 입력">
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
              <label>
                이메일
                <input v-model="basicInfoForm.email" placeholder="test@example.com" data-testid="basic-info-email" />
              </label>
              <label>
                휴대폰 번호
                <input v-model="basicInfoForm.phone" placeholder="010-1234-5678" data-testid="basic-info-phone" />
              </label>
              <label>
                성별
                <select v-model="basicInfoForm.gender" data-testid="basic-info-gender">
                  <option v-for="option in selectOptions.gender" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </label>
              <label>
                생년월일
                <input v-model="basicInfoForm.birthdate" type="date" data-testid="basic-info-birthdate" />
              </label>
              <label>
                주소
                <input v-model="basicInfoForm.address" placeholder="서울시 강남구 테헤란로 123" data-testid="basic-info-address" />
              </label>
              <label>
                상세주소
                <input v-model="basicInfoForm.addressDetail" placeholder="101동 101호" data-testid="basic-info-address-detail" />
              </label>
            </section>

            <section
              v-else-if="activeSectionSchema"
              class="document-structured-section"
              :aria-label="`${activeSectionTitle} 입력`"
            >
              <template v-for="group in activeSectionSchema.groups" :key="group.key">
                <div class="profile-subsection-heading">
                  <h3>{{ group.title }}</h3>
                </div>

                <template v-if="group.repeatable">
                  <article
                    v-for="(item, index) in activeSectionForm[group.key]"
                    :key="`${group.key}-${index}`"
                    class="profile-entry-card"
                  >
                    <div class="profile-entry-card-head">
                      <h4>{{ group.itemLabel }} {{ index + 1 }}</h4>
                      <button
                        class="danger-button"
                        type="button"
                        :data-testid="`delete-${group.key}-${index}`"
                        @click="deleteGroupItem(group.key, index)"
                      >
                        삭제
                      </button>
                    </div>
                    <div class="profile-field-grid" :class="`columns-${group.columns ?? 3}`">
                      <template v-for="field in group.fields" :key="field.key">
                        <label :class="{ wide: field.wide, full: field.full }">
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
                          >
                            <option v-for="option in field.options" :key="option.value" :value="option.value">
                              {{ option.label }}
                            </option>
                          </select>
                          <label v-else-if="field.type === 'checkbox'" class="checkbox-field">
                            <input
                              v-model="item[field.key]"
                              type="checkbox"
                              :data-testid="`${group.key}-${index}-${field.key}`"
                            />
                            <span>{{ field.checkboxLabel }}</span>
                          </label>
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
                  <template v-for="field in group.fields" :key="field.key">
                    <label :class="{ wide: field.wide, full: field.full }">
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
                      >
                        <option v-for="option in field.options" :key="option.value" :value="option.value">
                          {{ option.label }}
                        </option>
                      </select>
                      <label v-else-if="field.type === 'checkbox'" class="checkbox-field">
                        <input
                          v-model="activeSectionForm[group.key][field.key]"
                          type="checkbox"
                          :data-testid="`${group.key}-${field.key}`"
                        />
                        <span>{{ field.checkboxLabel }}</span>
                      </label>
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
              </template>
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
const activeSectionForm = reactive({});
const customFieldForm = reactive({
  label: '',
  fieldType: 'TEXT',
  value: ''
});
const editingCustomFieldId = ref('');
let autoSaveTimer = null;
let suppressFormWatch = true;

const sections = [
  { id: 'basicInfo', label: '기본 정보', title: '기본 정보' },
  { id: 'military', label: '병역 / 장애 / 보훈', title: '병역 / 장애 / 보훈' },
  { id: 'education', label: '학교 정보', title: '학교 정보' },
  { id: 'career', label: '경력', title: '경력' },
  { id: 'certificates', label: '자격증 / 어학', title: '자격증 / 어학' },
  { id: 'essays', label: '자소서', title: '자소서' },
  { id: 'other', label: '기타', title: '기타' },
  { id: 'custom', label: '커스텀 필드', title: '커스텀 필드' }
];

const saveButtonLabel = computed(() => (documentProfileStore.status === 'saving' ? '저장 중' : '저장'));
const activeSectionConfig = computed(() => sections.find((section) => section.id === activeSection.value) ?? sections[0]);
const activeSectionTitle = computed(() => activeSectionConfig.value.title);
const activeSectionSchema = computed(() => sectionSchemas[activeSection.value]);
const formattedLastSavedAt = computed(() => formatSavedAt(documentProfileStore.profile?.lastSavedAt));

const selectOptions = {
  empty: [{ label: '선택', value: '' }],
  choose: [{ label: '선택하세요', value: '' }],
  gender: [
    { label: '선택', value: '' },
    { label: '남성', value: 'MALE' },
    { label: '여성', value: 'FEMALE' },
    { label: '기타', value: 'OTHER' }
  ],
  militaryStatus: [
    { label: '선택', value: '' },
    { label: '미필', value: '미필' },
    { label: '군필', value: '군필' },
    { label: '면제', value: '면제' }
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
    { label: '교내', value: '교내' },
    { label: '대외', value: '대외' },
    { label: '봉사', value: '봉사' },
    { label: '프로젝트', value: '프로젝트' },
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
        title: '병역 / 장애 / 보훈',
        columns: 3,
        fields: [
          selectField('status', '병역 상태 (군필/미필/면제 등)', selectOptions.militaryStatus),
          textField('branch', '군별 (육군/해군/공군 등)', '예: 육군'),
          textField('rank', '계급', '예: 병장'),
          textField('specialty', '보직/병과', '예: 정보통신'),
          dateField('enlistmentDate', '입대일'),
          dateField('dischargeDate', '전역일'),
          textField('dischargeType', '전역 구분 (만기/의병 등)', '예: 만기제대', true),
          textField('exemptionReason', '면제 사유', '면제 사유를 입력하세요', true),
          checkboxField('hasDisability', '장애 여부'),
          textField('disabilityLevel', '장애 정도', '장애 정도', true),
          textField('disabilityDescription', '장애 내용', '장애 내용', true),
          checkboxField('isVeteran', '보훈 대상 여부'),
          textField('veteranNumber', '보훈 번호', '보훈 번호', true),
          textField('veteranRelation', '보훈 관계 (본인/부/모 등)', '보훈 관계 (본인/부/모 등)', true),
          textField('veteranRate', '보훈 비율', '보훈 비율', true)
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
          selectField('graduationStatus', '졸업구분', selectOptions.graduation, true),
          selectField('schoolType', '학교 유형', selectOptions.schoolType),
          textField('location', '소재지', '예: 서울'),
          selectField('dayNight', '주간/야간', selectOptions.dayNight),
          monthField('entranceDate', '입학일'),
          monthField('graduationDate', '졸업일'),
          textField('grade', '* 성적 평점', '평점', true),
          selectField('gradeScale', '/', selectOptions.gradeScale, true)
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
          selectField('employmentType', '고용 형태 (정규직/계약직 등)', selectOptions.employmentType),
          textField('department', '부서'),
          textField('position', '직급/직책'),
          textField('roleName', '담당 직무명'),
          dateField('startDate', '입사일'),
          dateField('endDate', '퇴사일'),
          checkboxField('isEmployed', '재직 중 여부'),
          textField('salary', '연봉', '예: 5000만원'),
          textField('companyType', '회사 유형 (대기업/중소 등)', '', true),
          textField('industry', '회사 업종', '', true),
          textField('duties', '담당 업무', '', false, true),
          textField('achievements', '주요 성과', '', false, true),
          textField('resignationReason', '퇴사 사유', '', true)
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
          selectField('experienceType', '경험 구분 (인턴/알바/실습 등)', selectOptions.internshipType),
          textField('companyName', '회사명'),
          textField('department', '부서'),
          textField('position', '직무/직책'),
          dateField('startDate', '시작일'),
          dateField('endDate', '종료일'),
          checkboxField('isActive', '재직 중 여부'),
          textField('weeklyHours', '주당 근무 시간', '예: 20시간', true),
          textField('duties', '주요 업무 내용', '', false, true)
        ]
      },
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
        key: 'languageTests',
        title: '공인외국어시험',
        itemLabel: '시험',
        addLabel: '시험 추가',
        repeatable: true,
        columns: 4,
        fields: [
          textField('testName', '시험명', '예: TOEIC'),
          textField('score', '점수/등급', '예: 900'),
          dateField('acquiredDate', '취득일'),
          dateField('expiryDate', '만료일')
        ]
      },
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
      }
    ]
  },
  essays: {
    groups: [
      {
        key: 'essays',
        title: '자소서',
        itemLabel: '자소서',
        addLabel: '자소서 추가',
        repeatable: true,
        columns: 2,
        fields: [
          textField('title', '문항/제목', '예: 지원동기'),
          textField('keywords', '키워드', '예: 성장, 협업'),
          textField('content', '본문', '자소서 내용을 입력하세요.', false, true)
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
          dateField('startDate', '이수기간 시작일'),
          dateField('endDate', '이수기간 종료일'),
          textField('hours', '교육시간', '교육 시간'),
          textField('description', '주요내용', '교육 과정 주요 내용을 상세히 입력하세요.', false, true)
        ]
      },
      {
        key: 'activities',
        title: '학내외 활동',
        itemLabel: '학내외 활동',
        addLabel: '학내외 활동 추가',
        repeatable: true,
        columns: 2,
        fields: [
          selectField('activityType', '활동구분', selectOptions.activityType),
          textField('role', '직위 또는 역할', '직위 또는 역할을 입력하세요.'),
          textField('activityName', '활동명', '활동명을 입력하세요.', true),
          textField('description', '활동 내용', '활동 내용을 상세히 입력하세요.', false, true)
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

watch(() => documentProfileStore.basicInfo, (basicInfo) => {
  suppressFormWatch = true;
  Object.assign(basicInfoForm, basicInfo);
  queueMicrotask(() => {
    suppressFormWatch = false;
  });
}, { immediate: true });

watch([
  activeSection,
  () => documentProfileStore.profile?.sections
], () => {
  suppressFormWatch = true;
  syncActiveSectionForm();
  queueMicrotask(() => {
    suppressFormWatch = false;
  });
}, { immediate: true });

watch(basicInfoForm, () => {
  if (activeSection.value !== 'basicInfo') return;
  scheduleAutoSave();
}, { deep: true });

watch(activeSectionForm, () => {
  if (!activeSectionSchema.value) return;
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
    } else if (activeSectionSchema.value) {
      await documentProfileStore.saveReusableSection(activeSection.value, cloneValue(activeSectionForm));
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

function syncActiveSectionForm() {
  if (!activeSectionSchema.value) return;
  replaceReactive(activeSectionForm, sectionPayload(activeSection.value));
  autoSaveStatus.value = 'idle';
}

function sectionPayload(sectionType) {
  const savedPayload = legacySectionPayload(sectionType);
  return mergeSectionDefaults(activeSectionSchema.value, savedPayload);
}

function legacySectionPayload(sectionType) {
  const sectionsPayload = documentProfileStore.profile?.sections ?? {};
  const savedPayload = sectionsPayload[sectionType];
  if (savedPayload && typeof savedPayload === 'object' && !Array.isArray(savedPayload)) {
    return savedPayload;
  }
  if (sectionType === 'education') {
    return { universities: Array.isArray(sectionsPayload.education) ? sectionsPayload.education : [] };
  }
  if (sectionType === 'career') {
    return {
      careers: Array.isArray(sectionsPayload.career) ? sectionsPayload.career : [],
      internships: Array.isArray(sectionsPayload.internships) ? sectionsPayload.internships : [],
      projects: Array.isArray(sectionsPayload.projects) ? sectionsPayload.projects : []
    };
  }
  if (sectionType === 'certificates') {
    return { certificates: Array.isArray(sectionsPayload.certificates) ? sectionsPayload.certificates : [] };
  }
  if (sectionType === 'military') {
    const firstMilitary = Array.isArray(sectionsPayload.military) ? sectionsPayload.military[0] : null;
    return { military: firstMilitary ?? {} };
  }
  if (sectionType === 'essays') {
    return { essays: Array.isArray(sectionsPayload.essays) ? sectionsPayload.essays : [] };
  }
  if (sectionType === 'other') {
    return {
      awards: Array.isArray(sectionsPayload.awards) ? sectionsPayload.awards : [],
      trainings: Array.isArray(sectionsPayload.trainings) ? sectionsPayload.trainings : [],
      activities: Array.isArray(sectionsPayload.activities) ? sectionsPayload.activities : [],
      overseas: Array.isArray(sectionsPayload.overseas) ? sectionsPayload.overseas : []
    };
  }
  return savedPayload;
}

function addGroupItem(groupKey) {
  const group = activeSectionSchema.value?.groups.find((item) => item.key === groupKey);
  if (!group) return;
  if (!Array.isArray(activeSectionForm[groupKey])) {
    activeSectionForm[groupKey] = [];
  }
  activeSectionForm[groupKey].push(emptyGroupItem(group));
}

function deleteGroupItem(groupKey, index) {
  if (!Array.isArray(activeSectionForm[groupKey])) return;
  activeSectionForm[groupKey].splice(index, 1);
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

function textField(key, label, placeholder = '', wide = false, full = false) {
  return { key, label, placeholder, wide, full, type: full ? 'textarea' : 'text' };
}

function dateField(key, label) {
  return { key, label, type: 'date', placeholder: '연도-월-일' };
}

function monthField(key, label) {
  return { key, label, type: 'month', placeholder: 'YYYY.MM' };
}

function selectField(key, label, options, wide = false) {
  return { key, label, options, wide, type: 'select' };
}

function checkboxField(key, checkboxLabel) {
  return { key, label: '', checkboxLabel, type: 'checkbox', wide: true };
}

function educationDegreeFields(degreeOptions) {
  return [
    textField('schoolName', '학교명', '학교명', true),
    selectField('degreeType', '학위구분', degreeOptions, true),
    monthField('entranceDate', '입학일'),
    monthField('graduationDate', '졸업일'),
    selectField('graduationStatus', '졸업구분', selectOptions.graduation),
    textField('grade', '* 성적 평점', '평점', true),
    selectField('gradeScale', '/', selectOptions.gradeScale, true),
    textField('major', '전공', '전공명', true)
  ];
}

function mergeSectionDefaults(schema, savedPayload) {
  const payload = savedPayload && typeof savedPayload === 'object' && !Array.isArray(savedPayload) ? savedPayload : {};
  return schema.groups.reduce((section, group) => {
    if (group.repeatable) {
      const savedItems = Array.isArray(payload[group.key]) ? payload[group.key] : [];
      section[group.key] = savedItems.length > 0
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
