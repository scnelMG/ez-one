<template>
  <AppLayout>
    <section class="wire-page mypage-page">
      <PageHeader
        :title="pageTitle"
      />

      <MyPageNav />

      <section v-if="activeSection === 'account'" class="mypage-panel" aria-label="내 계정">
        <article class="account-settings-card">
          <div class="account-setting-row account-photo-row">
            <span class="profile-avatar-fallback large account-photo-preview">
              <img
                v-if="accountProfileImageUrl"
                data-testid="account-profile-photo"
                :src="accountProfileImageUrl"
                alt=""
              />
              <span v-else>{{ profileInitial }}</span>
            </span>
            <div class="account-setting-main">
              <span>프로필 사진</span>
              <strong>{{ accountProfileImageUrl ? '등록됨' : '등록된 사진 없음' }}</strong>
            </div>
            <div class="account-photo-actions">
              <label class="ghost-button account-photo-upload">
                사진 변경
                <input
                  data-testid="profile-photo-input"
                  type="file"
                  accept="image/*"
                  @change="handleProfilePhotoChange"
                />
              </label>
              <button
                v-if="accountProfileImageUrl"
                class="text-button"
                type="button"
                @click="removeProfilePhoto"
              >
                삭제
              </button>
            </div>
          </div>

          <div class="account-setting-row">
            <label class="account-setting-main">
              <span>이름</span>
              <input
                v-model="nickname"
                data-testid="nickname-input"
                name="nickname"
                autocomplete="name"
                maxlength="50"
                placeholder="서비스에서 사용할 이름"
              />
            </label>
            <button
              class="primary-button"
              type="button"
              data-testid="save-account-profile"
              :disabled="saving"
              @click="saveProfile"
            >
              {{ saving ? '저장 중' : '저장' }}
            </button>
          </div>

          <div class="account-setting-row">
            <div class="account-setting-main">
              <span>Google 계정</span>
              <strong>{{ currentUser?.email }}</strong>
            </div>
            <span class="account-setting-note">비밀번호 없음</span>
          </div>
        </article>

        <div class="account-actions">
          <button class="ghost-button" type="button" @click="handleLogout">로그아웃</button>
          <button class="text-button danger" type="button" @click="handleWithdraw">회원 탈퇴</button>
        </div>
        <p v-if="statusMessage" class="form-status" role="status">{{ statusMessage }}</p>
      </section>

      <section v-else-if="activeSection === 'onboarding'" class="mypage-panel" aria-label="온보딩 정보">
        <div class="preference-chip-form onboarding-settings-form">
          <section class="onboarding-field-group" aria-label="희망 직무">
            <strong>희망 직무</strong>
            <div class="onboarding-chip-list">
              <button
                v-for="role in roleOptions"
                :key="role"
                class="filter-chip"
                :class="{ active: profileForm.desiredRoles.includes(role) }"
                type="button"
                :data-testid="`profile-role-option-${role}`"
                @click="toggleListValue(profileForm.desiredRoles, role)"
              >
                {{ role }}
              </button>
            </div>
          </section>
          <section class="onboarding-field-group" aria-label="희망 기업 유형">
            <strong>희망 기업 유형</strong>
            <div class="onboarding-chip-list">
              <button
                v-for="companyType in companyTypeOptions"
                :key="companyType"
                class="filter-chip"
                :class="{ active: profileForm.companyTypes.includes(companyType) }"
                type="button"
                :data-testid="`profile-company-option-${companyType}`"
                @click="toggleListValue(profileForm.companyTypes, companyType)"
              >
                {{ companyType }}
              </button>
            </div>
          </section>
          <section class="onboarding-field-group" aria-label="계열 및 업종">
            <strong>계열 / 업종</strong>
            <div class="onboarding-chip-list">
              <button
                v-for="industry in industryOptions"
                :key="industry"
                class="filter-chip"
                :class="{ active: profileForm.industries.includes(industry) }"
                type="button"
                :data-testid="`profile-industry-option-${industry}`"
                @click="toggleListValue(profileForm.industries, industry)"
              >
                {{ industry }}
              </button>
            </div>
          </section>
          <section class="onboarding-field-group" aria-label="희망 근무 지역">
            <strong>희망 근무 지역</strong>
            <div class="onboarding-chip-list">
              <button
                v-for="region in regionOptions"
                :key="region"
                class="filter-chip"
                :class="{ active: profileForm.regions.includes(region) }"
                type="button"
                :data-testid="`profile-region-option-${region}`"
                @click="toggleListValue(profileForm.regions, region)"
              >
                {{ region }}
              </button>
            </div>
          </section>
          <section class="onboarding-field-group" aria-label="보유 기술">
            <strong>보유 기술</strong>
            <div class="skill-input-shell">
              <span v-for="skill in profileForm.skills" :key="skill" class="skill-token">
                {{ skill }}
                <button
                  type="button"
                  :aria-label="`${skill} 삭제`"
                  :data-testid="`profile-skill-remove-${skill}`"
                  @click="removePreferenceSkill(skill)"
                >
                  ×
                </button>
              </span>
              <input
                v-model="skillInput"
                data-testid="profile-skill-input"
                type="text"
                placeholder="React, Java, Spring 입력 후 Enter"
                @keyup.enter="addPreferenceSkill"
              />
            </div>
          </section>
          <section class="onboarding-field-group" aria-label="SSAFY 교육생 여부">
            <strong>SSAFY 교육생이신가요?</strong>
            <div class="segmented-control">
              <button type="button" :class="{ active: profileForm.ssafy }" data-testid="profile-ssafy-true" @click="profileForm.ssafy = true">
                예
              </button>
              <button type="button" :class="{ active: !profileForm.ssafy }" data-testid="profile-ssafy-false" @click="profileForm.ssafy = false">
                아니오
              </button>
            </div>
            <p class="onboarding-helper">SSAFY 여부는 지원 준비 정보로 저장돼요.</p>
          </section>
        </div>
        <div class="form-actions">
          <p v-if="preferenceStatusMessage" class="form-status" role="status">{{ preferenceStatusMessage }}</p>
          <button class="ghost-button" type="button" data-testid="cancel-onboarding-profile" :disabled="profileStore.status === 'saving'" @click="cancelPreferences">
            취소
          </button>
          <button class="primary-button" type="button" data-testid="save-onboarding-profile" :disabled="profileStore.status === 'saving'" @click="savePreferences">
            {{ profileStore.status === 'saving' ? '저장 중' : '저장' }}
          </button>
        </div>
      </section>

      <section v-else-if="activeSection === 'qna'" class="mypage-panel" aria-label="자주 묻는 질문">
        <div class="faq-toolbar">
          <input
            v-model="faqSearch"
            class="mypage-search"
            data-testid="faq-search-input"
            type="search"
            name="faqSearch"
            aria-label="FAQ 검색"
            autocomplete="off"
            placeholder="궁금한 내용을 검색하세요"
          />
        </div>
        <div class="faq-filter-row">
          <button
            v-for="category in faqCategories"
            :key="category.value"
            class="faq-filter-button"
            :class="{ active: activeFaqCategory === category.value }"
            type="button"
            :aria-pressed="activeFaqCategory === category.value ? 'true' : 'false'"
            :data-testid="`faq-filter-${category.value}`"
            @click="activeFaqCategory = category.value"
          >
            {{ category.label }}
          </button>
        </div>
        <article v-for="item in filteredFaqItems" :key="item.q" class="faq-row">
          <strong>{{ item.q }}</strong>
          <p>{{ item.a }}</p>
        </article>
        <div v-if="filteredFaqItems.length === 0" class="mypage-empty-state" role="status">
          <strong>검색 결과가 없습니다.</strong>
          <p>다른 키워드로 검색하거나 1:1 문의를 접수해 주세요.</p>
        </div>
      </section>

      <section v-else-if="activeSection === 'inquiry'" class="mypage-panel" aria-label="1:1 문의">
        <div class="support-layout">
          <form class="support-form" @submit.prevent="submitInquiry">
            <label>
              문의 유형
              <select v-model="inquiryForm.type" name="inquiryCategory" autocomplete="off">
                <option value="ACCOUNT">계정</option>
                <option value="ERROR">오류</option>
                <option value="SUGGESTION">기능 제안</option>
                <option value="ETC">기타</option>
              </select>
            </label>
            <label>
              제목
              <input v-model="inquiryForm.title" name="inquiryTitle" autocomplete="off" placeholder="문의 제목" required />
            </label>
            <label>
              내용
              <textarea v-model="inquiryForm.body" name="inquiryBody" autocomplete="off" placeholder="문제가 발생한 화면, 기대한 동작, 실제 결과를 적어 주세요." required />
            </label>
            <button class="primary-button" type="submit" :disabled="supportSubmitting">
              {{ supportSubmitting ? '접수 중' : '문의 접수' }}
            </button>
          </form>
          <div class="support-history">
            <strong>내 문의 내역</strong>
            <span v-if="supportRequests.length === 0" class="support-empty">아직 접수된 문의가 없습니다.</span>
            <article v-for="request in supportRequests" :key="request.id ?? request.title" class="support-history-row">
              <div>
                <strong>{{ request.title }}</strong>
                <small>{{ formatSupportDate(request.createdAt ?? request.created_at) }}</small>
              </div>
              <span class="status-chip">{{ formatSupportStatus(request.status) }}</span>
            </article>
          </div>
        </div>
        <p v-if="supportStatusMessage" class="form-status" role="status">{{ supportStatusMessage }}</p>
      </section>

      <section v-else class="mypage-panel" aria-label="이용약관">
        <p class="terms-effective-date">시행일 2026.01.01</p>
        <article class="terms-paper">
          <h3>제1조 목적</h3>
          <p>본 약관은 EZ-ONE이 제공하는 채용 공고 저장, 지원 워크스페이스, 작성 자료 관리, Notion JOB_ONLY 동기화 서비스를 이용할 때 필요한 기본 사항을 정합니다.</p>
          <h3>제2조 정의</h3>
          <p>회원은 Google 로그인으로 서비스를 이용하는 사용자입니다. 공고는 사용자가 저장하거나 조회하는 채용 정보이고, 워크스페이스는 공고별 자기소개서, 참고자료, 문서 입력 정보를 관리하는 화면입니다. 외부 연동은 Google OAuth2, Chrome 확장, Notion API처럼 서비스 밖 시스템과 연결되는 기능입니다.</p>
          <h3>제3조 계정 및 로그인</h3>
          <p>회원은 본인 Google 계정으로 로그인해야 하며 계정 접근 권한을 타인에게 양도해서는 안 됩니다. EZ-ONE은 별도 비밀번호를 저장하지 않고, 로그인 세션과 회원 식별 정보는 서비스 제공과 보안 유지 범위에서만 사용합니다.</p>
          <h3>제4조 서비스 범위</h3>
          <p>현재 P1 서비스는 Google 로그인, 온보딩, 공고 저장, 바구니, 워크스페이스, 자기소개서와 참고자료 관리, 서류 입력 정보, Notion JOB_ONLY 동기화, 1:1 문의 접수로 구성됩니다. 알림, 캘린더, 자동 자료 수집, 확장 프로그램 자동 입력 등은 별도 승인 전까지 제공 범위가 아닙니다.</p>
          <h3>제5조 사용자 의무</h3>
          <p>회원은 허위 정보, 타인의 개인정보, 권리를 침해하는 자료, 서비스 운영을 방해하는 입력을 등록해서는 안 됩니다. 공고 저장과 문서 작성에 필요한 정보는 회원이 적법하게 사용할 수 있는 범위에서만 입력해야 합니다.</p>
          <h3>제6조 공고와 기업 정보 표시</h3>
          <p>서비스에 표시되는 회사명 및 로고는 채용공고 식별 목적으로만 사용되며, 각 상표와 로고는 해당 소유자의 자산입니다. EZ-ONE은 표시된 기업과 제휴 또는 후원을 의미하지 않습니다.</p>
          <h3 id="privacy">제7조 개인정보 처리 기준</h3>
          <p>서비스는 계정 식별 정보, 온보딩 선호 정보, 저장 공고, 워크스페이스 작성 자료, 문의 내용을 기능 제공과 장애 대응에 필요한 범위에서 저장합니다. 민감한 개인정보나 제3자의 개인정보는 사용자가 직접 입력하지 않아야 합니다.</p>
          <h3>제8조 외부 연동</h3>
          <p>Notion 동기화는 사용자가 연결하고 켠 경우에만 JOB_ONLY 범위로 수행됩니다. 외부 API 장애나 권한 만료가 발생해도 핵심 저장 데이터는 별도로 유지되며, 사용자는 언제든 연동을 끄거나 다시 연결할 수 있습니다.</p>
          <h3>제9조 문의 처리</h3>
          <p>1:1 문의는 계정, 오류, 기능 제안, 기타 범주로 접수됩니다. 접수된 문의는 처리 상태와 함께 보관되며, 답변 방식과 시점은 운영 상황에 따라 달라질 수 있습니다.</p>
          <h3>제10조 서비스 변경 및 중단</h3>
          <p>EZ-ONE은 안정적인 운영, 보안 조치, 기능 개선을 위해 서비스 내용을 변경하거나 일시 중단할 수 있습니다. 중요한 변경은 서비스 화면 또는 문서로 안내합니다.</p>
          <h3>제11조 책임 제한</h3>
          <p>EZ-ONE은 채용 합격, 공고의 계속 게시, 외부 서비스의 가용성, 사용자가 입력한 자료의 완전성을 보증하지 않습니다. 회원은 제출 전 공고와 작성 자료를 직접 확인해야 합니다.</p>
        </article>
      </section>
    </section>
  </AppLayout>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppLayout from '@/shared/AppLayout.vue';
import PageHeader from '@/shared/PageHeader.vue';
import MyPageNav from '@/shared/MyPageNav.vue';
import { authApi } from '@/features/auth/api/authApi';
import { supportApi } from '@/features/support/api/supportApi';
import { clearAuthSession, getCurrentUser, getRefreshToken, saveCurrentUser } from '@/features/auth/session/authSession';
import { useProfileStore } from '@/stores/profileStore';
import { showToast } from '@/shared/useToast';

const route = useRoute();
const router = useRouter();
const profileStore = useProfileStore();
const currentUser = ref(getCurrentUser());
const nickname = ref(currentUser.value?.nickname || currentUser.value?.name || '');
const saving = ref(false);
const statusMessage = ref('');
const preferenceStatusMessage = ref('');
const supportStatusMessage = ref('');
const supportSubmitting = ref(false);
const supportRequests = ref([]);
const faqSearch = ref('');
const activeFaqCategory = ref('all');

const roleOptions = ['프론트엔드', '백엔드', '데이터 엔지니어', 'AI/ML', '모바일', 'DevOps', 'PM', '디자인', 'QA', '기타'];
const companyTypeOptions = ['대기업', '공공기관', '중견기업', '중소기업', '스타트업', '기타'];
const industryOptions = ['IT/플랫폼', '제조', '금융', '커머스', '게임', '바이오/헬스', '미디어', '기타'];
const regionOptions = ['서울', '경기', '인천', '대전', '부산', '대구', '광주', '제주', '원격'];

const profileForm = reactive({
  desiredRoles: [roleOptions[0]],
  companyTypes: [companyTypeOptions[0]],
  industries: [industryOptions[0]],
  regions: [regionOptions[0]],
  skills: [],
  ssafy: false
});
const skillInput = ref('');
const inquiryForm = reactive({
  type: 'ACCOUNT',
  title: '',
  body: ''
});

const pageCopy = {
  account: {
    title: '내 계정'
  },
  onboarding: {
    title: '온보딩 정보'
  },
  qna: {
    title: '자주 묻는 질문'
  },
  inquiry: {
    title: '1:1 문의'
  },
  terms: {
    title: '이용약관'
  }
};

const activeSection = computed(() => route.meta.mypageSection ?? 'account');
const pageTitle = computed(() => pageCopy[activeSection.value]?.title ?? pageCopy.account.title);
const profileInitial = computed(() => (nickname.value || currentUser.value?.email || 'E').trim().charAt(0).toUpperCase());
const accountProfileImageUrl = computed(() => currentUser.value?.profileImageUrl || currentUser.value?.pictureUrl || currentUser.value?.photoUrl || currentUser.value?.avatarUrl || '');
const filteredFaqItems = computed(() => {
  const query = faqSearch.value.trim().toLowerCase();
  return faqItems.filter((item) => {
    const matchesCategory = activeFaqCategory.value === 'all' || item.category === activeFaqCategory.value;
    const matchesQuery = !query || `${item.q} ${item.a}`.toLowerCase().includes(query);
    return matchesCategory && matchesQuery;
  });
});

const faqCategories = [
  { value: 'all', label: '전체' },
  { value: 'account', label: '계정' },
  { value: 'notion', label: 'Notion 연동' },
  { value: 'jobs', label: '공고/바구니' },
  { value: 'workspace', label: '워크스페이스' },
  { value: 'documents', label: '서류/확장' },
  { value: 'support', label: '문의' }
];

const faqItems = [
  { category: 'account', q: 'Google 계정만으로 사용할 수 있나요?', a: '네. EZ-ONE은 Google 로그인 기반으로 동작하며 별도 비밀번호를 저장하지 않습니다.' },
  { category: 'account', q: '내 이름은 어디에서 바꾸나요?', a: '내 계정 화면에서 서비스에 표시되는 이름을 수정할 수 있습니다.' },
  { category: 'notion', q: 'Notion 이메일이 로그인 이메일과 달라도 되나요?', a: '네. 로그인 계정과 Notion 연동 계정은 분리해서 관리합니다.' },
  { category: 'notion', q: 'Notion에는 어떤 정보가 동기화되나요?', a: 'P1에서는 저장 공고 중심의 JOB_ONLY 범위만 동기화합니다.' },
  { category: 'jobs', q: '공고는 어디에 저장되나요?', a: '저장한 공고는 공고 장바구니에서 확인하고 워크스페이스로 이어갈 수 있습니다.' },
  { category: 'jobs', q: '중복 공고를 저장하면 어떻게 되나요?', a: '같은 출처의 공고는 중복 저장을 막고 기존 항목 기준으로 안내합니다.' },
  { category: 'workspace', q: '자소서는 어떻게 버전 관리하나요?', a: '워크스페이스에서 문항별 초안과 버전을 관리할 수 있습니다.' },
  { category: 'workspace', q: '공고별로 첨부 자료는 어디서 보나요?', a: '워크스페이스 오른쪽 참고자료 영역에서 JD, 뉴스, 메모를 확인합니다.' },
  { category: 'workspace', q: '기업 정보가 비어 있으면 어떻게 하나요?', a: '공식 출처로 확인되지 않은 항목은 비워 두고 저장 공고의 핵심 정보부터 사용할 수 있습니다.' },
  { category: 'documents', q: '온보딩 정보는 어디에 쓰이나요?', a: '지원 문서 기본 정보와 추천 준비 정보로 사용됩니다.' },
  { category: 'documents', q: '서류 입력 정보와 확장 프로그램은 같은 기능인가요?', a: '서류 입력 정보는 프로필 데이터이고, 확장 프로그램은 공고 미리보기와 저장을 돕는 별도 흐름입니다.' },
  { category: 'support', q: '1:1 문의는 어떤 내용만 접수하나요?', a: '계정, 오류, 기능 제안, 기타 문의를 접수합니다.' }
];

onMounted(async () => {
  await profileStore.loadProfile();
  if (profileStore.profile) {
    syncProfileForm();
  }
  if (activeSection.value === 'inquiry') {
    await loadSupportRequests();
  }
});

watch(activeSection, async (section) => {
  supportStatusMessage.value = '';
  if (section === 'inquiry') {
    await loadSupportRequests();
  }
});

async function saveProfile() {
  const nextNickname = nickname.value.trim();
  if (!nextNickname) {
    statusMessage.value = '이름을 입력해 주세요.';
    return;
  }
  saving.value = true;
  statusMessage.value = '';
  try {
    const updatedUser = await authApi.updateCurrentUser({ nickname: nextNickname });
    const nextUser = { ...(currentUser.value ?? {}), ...updatedUser };
    currentUser.value = nextUser;
    nickname.value = nextUser.nickname;
    saveCurrentUser(nextUser);
    statusMessage.value = '프로필 이름이 저장되었습니다.';
    showToast('프로필 이름이 저장되었습니다.');
  } catch {
    statusMessage.value = '프로필 이름을 저장하지 못했습니다.';
    showToast('프로필 이름을 저장하지 못했습니다.', { tone: 'red' });
  } finally {
    saving.value = false;
  }
}

function handleProfilePhotoChange(event) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) {
    return;
  }
  if (!file.type.startsWith('image/')) {
    statusMessage.value = '이미지 파일만 등록할 수 있습니다.';
    showToast(statusMessage.value, { tone: 'red' });
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = typeof reader.result === 'string' ? reader.result : '';
    if (!dataUrl) {
      statusMessage.value = '프로필 사진을 불러오지 못했습니다.';
      showToast(statusMessage.value, { tone: 'red' });
      return;
    }
    persistCurrentUserProfile({ profileImageUrl: dataUrl });
    statusMessage.value = '프로필 사진이 저장되었습니다.';
    showToast(statusMessage.value);
  };
  reader.onerror = () => {
    statusMessage.value = '프로필 사진을 불러오지 못했습니다.';
    showToast(statusMessage.value, { tone: 'red' });
  };
  reader.readAsDataURL(file);
}

function removeProfilePhoto() {
  persistCurrentUserProfile({ profileImageUrl: '', pictureUrl: '', photoUrl: '', avatarUrl: '' });
  statusMessage.value = '프로필 사진이 삭제되었습니다.';
  showToast(statusMessage.value);
}

function persistCurrentUserProfile(patch) {
  const nextUser = {
    ...(currentUser.value ?? {}),
    ...patch
  };
  currentUser.value = nextUser;
  saveCurrentUser(nextUser);
}

async function savePreferences() {
  await profileStore.saveProfile({
    desiredRoles: [...profileForm.desiredRoles],
    companyTypes: [...profileForm.companyTypes],
    industries: [...profileForm.industries],
    regions: [...profileForm.regions],
    skills: [...profileForm.skills],
    ssafy: profileForm.ssafy
  });
  if (profileStore.status === 'ready' && profileStore.profile) {
    syncProfileForm();
    preferenceStatusMessage.value = '온보딩 정보가 저장되었습니다.';
    showToast('온보딩 정보가 저장되었습니다.');
    return;
  }
  preferenceStatusMessage.value = profileStore.errorMessage || '온보딩 정보를 저장하지 못했습니다.';
  showToast(preferenceStatusMessage.value, { tone: 'red' });
}

function syncProfileForm() {
  const profile = profileStore.profile;
  if (!profile) return;
  profileForm.desiredRoles = selectedOrDefault(profile.desiredRoles, roleOptions);
  profileForm.companyTypes = selectedOrDefault(profile.companyTypes, companyTypeOptions);
  profileForm.industries = selectedOrDefault(profile.industries, industryOptions);
  profileForm.regions = selectedOrDefault(profile.regions, regionOptions);
  profileForm.skills = [...(profile.skills ?? [])];
  profileForm.ssafy = profile.ssafy ?? false;
}

function selectedOrDefault(values, options) {
  return Array.isArray(values) && values.length > 0 ? [...values] : [options[0]];
}

function toggleListValue(values, value) {
  const index = values.indexOf(value);
  if (index >= 0) {
    values.splice(index, 1);
    return;
  }
  values.push(value);
}

function addPreferenceSkill() {
  const nextSkill = skillInput.value.trim();
  if (nextSkill && !profileForm.skills.includes(nextSkill)) {
    profileForm.skills.push(nextSkill);
  }
  skillInput.value = '';
}

function removePreferenceSkill(skill) {
  const index = profileForm.skills.indexOf(skill);
  if (index >= 0) {
    profileForm.skills.splice(index, 1);
  }
}

async function handleLogout() {
  const refreshToken = getRefreshToken();
  try {
    if (refreshToken) {
      await authApi.logout(refreshToken);
    }
  } finally {
    clearAuthSession();
    await router.push('/login');
  }
}

async function handleWithdraw() {
  if (!window.confirm('정말로 탈퇴하시겠습니까? 로그인 세션이 종료되고 계정 식별 정보가 익명화됩니다.')) {
    return;
  }
  try {
    await authApi.withdrawCurrentUser();
  } finally {
    clearAuthSession();
    await router.push('/login');
  }
}

function cancelPreferences() {
  syncProfileForm();
  skillInput.value = '';
  preferenceStatusMessage.value = '저장된 온보딩 정보로 되돌렸습니다.';
  showToast('저장된 온보딩 정보로 되돌렸습니다.');
}

async function loadSupportRequests() {
  try {
    supportRequests.value = await supportApi.getMyRequests();
  } catch {
    supportRequests.value = [];
  }
}

async function submitInquiry() {
  supportSubmitting.value = true;
  supportStatusMessage.value = '';
  try {
    const created = await supportApi.createRequest({
      requestType: 'INQUIRY',
      category: inquiryForm.type,
      title: inquiryForm.title,
      body: inquiryForm.body
    });
    supportRequests.value = [created, ...supportRequests.value.filter((item) => item.id !== created.id)];
    inquiryForm.title = '';
    inquiryForm.body = '';
    supportStatusMessage.value = '1:1 문의가 접수되었습니다.';
    showToast('1:1 문의가 접수되었습니다.');
  } catch {
    supportStatusMessage.value = '문의 접수에 실패했습니다. 잠시 후 다시 시도해 주세요.';
    showToast('문의 접수에 실패했습니다.', { tone: 'red' });
  } finally {
    supportSubmitting.value = false;
  }
}

function formatSupportStatus(status) {
  if (status === 'RECEIVED') return '접수';
  if (status === 'ANSWERED') return '답변 완료';
  return status || '확인 중';
}

function formatSupportDate(value) {
  if (!value) return '최근 접수';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '최근 접수';
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(date);
}
</script>
