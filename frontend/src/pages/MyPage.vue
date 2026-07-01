<template>
  <AppLayout>
    <section class="wire-page mypage-page">
      <PageHeader
        :title="pageTitle"
      />

      <MyPageNav />

      <section v-if="activeSection === 'account'" class="mypage-panel" aria-label="내 계정">
        <article class="account-settings-card account-identity-card">
          <div class="account-setting-row account-photo-row">
            <span class="account-setting-label">프로필 사진</span>
            <div class="account-setting-value account-photo-value">
              <span class="profile-avatar-fallback large account-photo-preview">
                <img
                  v-if="accountProfileImageUrl"
                  data-testid="account-profile-photo"
                  :src="accountProfileImageUrl"
                  alt=""
                />
                <span v-else>{{ profileInitial }}</span>
              </span>
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
            <label class="account-setting-label" for="account-nickname">이름</label>
            <div class="account-setting-value">
              <input
                id="account-nickname"
                v-model="nickname"
                data-testid="nickname-input"
                name="nickname"
                autocomplete="name"
                maxlength="50"
                placeholder="서비스에서 사용할 이름"
              />
            </div>
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
            <span class="account-setting-label">Google 계정</span>
            <div class="account-setting-value">
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
        <PreferenceForm :form="profileForm" test-prefix="profile" />
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
        <div class="faq-list">
          <article v-for="item in filteredFaqItems" :key="item.q" class="faq-row">
            <strong>{{ item.q }}</strong>
            <p>{{ item.a }}</p>
          </article>
        </div>
        <div v-if="filteredFaqItems.length === 0" class="mypage-empty-state" role="status">
          <strong>검색 결과가 없습니다.</strong>
          <p>다른 키워드로 다시 검색해 주세요.</p>
        </div>
      </section>

      <section v-else class="mypage-panel" aria-label="이용약관">
        <p class="terms-effective-date">시행일 2026.01.01</p>
        <article class="terms-paper">
          <p class="terms-law-note">관련 기준: 약관의 규제에 관한 법률, 개인정보 보호법, 저작권법, 전자상거래 등에서의 소비자보호에 관한 법률</p>
          <h3>제1조 목적 및 적용</h3>
          <p>본 약관은 EZ-ONE이 제공하는 채용 공고 저장, 지원 워크스페이스, 작성 자료 관리, 서류 입력 정보, Notion 동기화 서비스의 이용 조건과 권리·의무를 정합니다. 회원이 서비스를 이용하면 본 약관에 동의한 것으로 봅니다.</p>
          <h3>제2조 용어의 정의</h3>
          <p>회원은 Google 로그인으로 서비스를 이용하는 사람을 말합니다. 공고는 회원이 저장하거나 조회하는 채용 정보를, 워크스페이스는 공고별 자기소개서·참고자료·문서 입력 정보를 관리하는 화면을 말합니다. 외부 연동은 Google OAuth, Chrome 확장, Notion API처럼 서비스 밖 시스템과 연결되는 기능을 말합니다.</p>
          <h3>제3조 약관의 게시 및 변경</h3>
          <p>EZ-ONE은 회원이 약관을 쉽게 확인할 수 있도록 서비스 화면에 게시합니다. 약관을 변경할 때에는 적용일과 주요 변경 내용을 합리적인 기간 전에 안내합니다. 회원에게 불리하거나 중요한 변경은 서비스 화면 등 명확한 방법으로 고지합니다.</p>
          <h3>제4조 계정 및 로그인</h3>
          <p>회원은 본인 Google 계정으로 로그인해야 하며 계정 접근 권한을 제3자에게 양도하거나 공유해서는 안 됩니다. EZ-ONE은 별도 비밀번호를 저장하지 않고, 로그인 세션과 회원 식별 정보는 서비스 제공과 보안 유지에 필요한 범위에서만 사용합니다.</p>
          <h3>제5조 서비스의 내용</h3>
          <p>서비스는 채용 공고 저장, 공고별 워크스페이스, 자기소개서와 참고자료 관리, 서류 입력 정보 관리, Notion 동기화 기능을 제공합니다. EZ-ONE은 채용 공고의 게시 여부, 채용 결과, 외부 사이트의 정보 정확성이나 지속 제공을 보증하지 않습니다.</p>
          <h3>제6조 회원의 의무</h3>
          <p>회원은 허위 정보, 타인의 개인정보, 권리를 침해하는 자료, 서비스 운영을 방해하는 입력을 등록해서는 안 됩니다. 공고 저장과 문서 작성에 필요한 정보는 회원이 적법하게 사용할 수 있는 범위에서만 입력해야 합니다.</p>
          <h3>제7조 저장 자료와 권리</h3>
          <p>회원이 입력한 자기소개서, 메모, 참고자료 등 작성 자료의 권리는 회원 또는 정당한 권리자에게 있습니다. 회원은 서비스 기능 제공, 저장, 백업, 동기화, 장애 대응에 필요한 범위에서 EZ-ONE이 해당 자료를 처리할 수 있도록 허용합니다.</p>
          <h3>제8조 공고와 기업 정보 표시</h3>
          <p>서비스에 표시되는 회사명, 로고, 공고 링크, 외부 자료는 채용공고 식별과 회원의 지원 준비를 돕기 위한 목적으로만 사용됩니다. 각 상표와 로고는 해당 소유자의 자산이며, EZ-ONE이 표시된 기업과 제휴 또는 후원을 의미하지 않습니다.</p>
          <h3>제9조 외부 연동</h3>
          <p>Notion 동기화는 회원이 직접 연결하고 켠 경우에만 수행됩니다. 외부 API 장애, 권한 만료, 외부 서비스 정책 변경으로 동기화가 지연되거나 실패할 수 있으며, 회원은 언제든 연동을 끄거나 다시 연결할 수 있습니다.</p>
          <h3 id="privacy">제10조 개인정보 처리 기준</h3>
          <p>EZ-ONE은 계정 식별 정보, 온보딩 선호 정보, 저장 공고, 워크스페이스 작성 자료를 서비스 제공, 본인 확인, 보안 유지, 장애 대응에 필요한 범위에서 처리합니다. 보유 기간, 파기, 제3자 제공, 처리 위탁 등 세부 사항은 서비스의 개인정보 처리 기준에 따릅니다.</p>
          <h3>제11조 탈퇴 및 이용 제한</h3>
          <p>회원은 서비스에서 제공하는 절차에 따라 계정을 탈퇴할 수 있습니다. 회원이 본 약관을 위반하거나 서비스 운영을 현저히 방해하는 경우 EZ-ONE은 관련 법령과 약관에 따라 이용을 제한하거나 필요한 조치를 할 수 있습니다.</p>
          <h3>제12조 서비스 변경 및 중단</h3>
          <p>EZ-ONE은 안정적인 운영, 보안 조치, 기능 개선을 위해 서비스 내용을 변경하거나 일시 중단할 수 있습니다. 회원에게 중대한 영향을 주는 변경은 서비스 화면 또는 문서로 안내합니다.</p>
          <h3>제13조 손해배상 및 책임 제한</h3>
          <p>EZ-ONE과 회원은 본 약관 또는 법령 위반으로 상대방에게 손해를 발생시킨 경우 관계 법령에 따라 책임을 부담합니다. 다만 EZ-ONE은 회원의 귀책사유, 외부 서비스 장애, 회원이 입력한 자료의 오류, 채용 결과에 대해서는 책임을 지지 않습니다.</p>
          <h3>제14조 준거법 및 분쟁 해결</h3>
          <p>본 약관은 대한민국 법령에 따라 해석됩니다. 서비스 이용과 관련해 분쟁이 발생하면 당사자는 성실히 협의하고, 협의로 해결되지 않는 경우 관계 법령에서 정한 관할 법원 또는 절차에 따릅니다.</p>
        </article>
      </section>
    </section>
  </AppLayout>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppLayout from '@/shared/AppLayout.vue';
import PageHeader from '@/shared/PageHeader.vue';
import MyPageNav from '@/shared/MyPageNav.vue';
import PreferenceForm from '@/features/profile/components/PreferenceForm.vue';
import { authApi } from '@/features/auth/api/authApi';
import { clearAuthSession, getCurrentUser, saveCurrentUser } from '@/features/auth/session/authSession';
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
const faqSearch = ref('');
const activeFaqCategory = ref('all');

const profileForm = reactive({
  desiredRoles: [],
  companyTypes: [],
  industries: [],
  regions: [],
  skills: [],
  ssafy: false
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
  { value: 'documents', label: '서류/확장' }
];

const faqItems = [
  { category: 'account', q: 'Google 계정만으로 사용할 수 있나요?', a: '네. Google 로그인으로 바로 사용할 수 있고, 별도 비밀번호는 만들지 않습니다.' },
  { category: 'account', q: '내 이름은 어디에서 바꾸나요?', a: '내 계정에서 서비스에 표시되는 이름을 바꿀 수 있습니다.' },
  { category: 'notion', q: 'Notion 이메일이 로그인 이메일과 달라도 되나요?', a: '네. 로그인 계정과 Notion 계정은 달라도 됩니다.' },
  { category: 'notion', q: 'Notion에는 어떤 정보가 동기화되나요?', a: '저장한 공고 정보가 Notion에 동기화됩니다.' },
  { category: 'jobs', q: '공고는 어디에 저장되나요?', a: '저장한 공고는 공고 장바구니에서 확인하고 워크스페이스로 이어갈 수 있습니다.' },
  { category: 'jobs', q: '중복 공고를 저장하면 어떻게 되나요?', a: '같은 출처의 공고는 중복 저장되지 않고 기존 공고로 안내됩니다.' },
  { category: 'workspace', q: '자소서는 어떻게 버전 관리하나요?', a: '워크스페이스에서 문항별 초안과 버전을 관리합니다.' },
  { category: 'workspace', q: '공고별 첨부 자료는 어디서 보나요?', a: '워크스페이스의 참고자료 영역에서 공고 설명, 뉴스, 메모를 확인할 수 있습니다.' },
  { category: 'workspace', q: '기업 정보가 비어 있으면 어떻게 하나요?', a: '확인되지 않은 정보는 비워 두고, 저장된 공고의 핵심 정보부터 사용할 수 있습니다.' },
  { category: 'documents', q: '온보딩 정보는 어디에 쓰이나요?', a: '추천 기준과 지원 문서의 기본값으로 사용됩니다.' },
  { category: 'documents', q: '서류 입력 정보와 확장 프로그램은 같은 기능인가요?', a: '서류 입력 정보는 내 프로필이고, 확장 프로그램은 공고 미리보기와 저장을 돕는 도구입니다.' }
];

onMounted(async () => {
  await profileStore.loadProfile();
  if (profileStore.profile) {
    syncProfileForm();
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
  reader.onload = async () => {
    const dataUrl = typeof reader.result === 'string' ? reader.result : '';
    if (!dataUrl) {
      statusMessage.value = '프로필 사진을 불러오지 못했습니다.';
      showToast(statusMessage.value, { tone: 'red' });
      return;
    }
    if (!(await saveProfileImage(dataUrl))) return;
    statusMessage.value = '프로필 사진이 저장되었습니다.';
    showToast(statusMessage.value);
  };
  reader.onerror = () => {
    statusMessage.value = '프로필 사진을 불러오지 못했습니다.';
    showToast(statusMessage.value, { tone: 'red' });
  };
  reader.readAsDataURL(file);
}

async function removeProfilePhoto() {
  if (!(await saveProfileImage(''))) return;
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

async function saveProfileImage(profileImageUrl) {
  statusMessage.value = '';
  try {
    const updatedUser = await authApi.updateCurrentUser({
      nickname: nickname.value.trim() || currentUser.value?.nickname || currentUser.value?.name || '',
      profileImageUrl
    });
    const nextUser = {
      ...(currentUser.value ?? {}),
      ...updatedUser,
      profileImageUrl: updatedUser.profileImageUrl || ''
    };
    currentUser.value = nextUser;
    saveCurrentUser(nextUser);
    return true;
  } catch (error) {
    statusMessage.value = '프로필 사진을 저장하지 못했습니다.';
    showToast(statusMessage.value, { tone: 'red' });
    return false;
  }
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
  profileForm.desiredRoles = copyList(profile.desiredRoles);
  profileForm.companyTypes = copyList(profile.companyTypes);
  profileForm.industries = copyList(profile.industries);
  profileForm.regions = copyList(profile.regions);
  profileForm.skills = [...(profile.skills ?? [])];
  profileForm.ssafy = profile.ssafy ?? false;
}

function copyList(values) {
  return Array.isArray(values) ? [...values] : [];
}

async function handleLogout() {
  try {
    await authApi.logout();
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
  preferenceStatusMessage.value = '저장된 온보딩 정보로 되돌렸습니다.';
  showToast('저장된 온보딩 정보로 되돌렸습니다.');
}

</script>
