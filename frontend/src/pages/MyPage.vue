<template>
  <AppLayout>
    <section class="wire-page mypage-page">
      <PageHeader
        eyebrow="마이페이지"
        :title="pageTitle"
        :description="pageDescription"
      />

      <section v-if="activeSection === 'account'" class="mypage-panel" aria-label="내 계정">
        <div class="section-heading">
          <div>
            <p class="section-kicker">프로필</p>
            <h2>마이페이지 · 내 계정</h2>
          </div>
        </div>
        <article class="account-profile-card">
          <span class="profile-avatar-fallback large">{{ profileInitial }}</span>
          <label>
            이름
            <input v-model="nickname" data-testid="nickname-input" maxlength="50" />
          </label>
          <button class="icon-edit-button" type="button" aria-label="이름 수정">✎</button>
        </article>

        <article class="account-login-card">
          <div class="section-heading compact-heading">
            <div>
              <p class="section-kicker">로그인 정보</p>
              <h3>Google 계정으로 로그인 중</h3>
            </div>
            <span class="status-chip green">Google 로그인</span>
          </div>
          <p>{{ currentUser?.email }}</p>
          <small>이 서비스는 Google(Gmail) 계정으로 로그인해, 별도 비밀번호는 없어요.</small>
        </article>

        <article class="account-warning-card">
          <strong>노션 연동 계정과 우리 서비스 로그인 계정이 다를 수 있어요.</strong>
          <p>노션 연동은 ‘노션 연동 관리’에서 설정·확인할 수 있어요.</p>
          <RouterLink to="/mypage/notion">노션 연동 관리 →</RouterLink>
        </article>

        <div class="account-actions">
          <button class="ghost-button" type="button">로그아웃</button>
          <button class="text-button danger" type="button">회원 탈퇴</button>
          <button class="primary-button" type="button" data-testid="save-account-profile" @click="saveProfile">
            {{ saving ? '저장 중' : '저장' }}
          </button>
        </div>
        <p v-if="statusMessage" class="form-status" role="status">{{ statusMessage }}</p>
      </section>

      <section v-else-if="activeSection === 'onboarding'" class="mypage-panel" aria-label="온보딩 정보">
        <div class="section-heading">
          <div>
            <p class="section-kicker">맞춤 추천 정보</p>
            <h2>마이페이지 · 온보딩 정보</h2>
          </div>
          <small>추천 공고에 반영돼요 · 언제든 수정 가능</small>
        </div>
        <div class="preference-chip-form">
          <PreferenceGroup title="희망 직무" :items="roleChips" />
          <PreferenceGroup title="희망 기업 유형" :items="companyTypeChips" />
          <PreferenceGroup title="계열 / 업종" :items="industryChips" />
          <PreferenceGroup title="희망 근무 지역" :items="regionChips" />
          <label>
            보유 스킬
            <input v-model="profileForm.skills" data-testid="profile-skills" />
          </label>
          <label>
            희망 직무
            <input v-model="profileForm.desiredRoles" data-testid="profile-desired-roles" />
          </label>
          <label>
            희망 기업 유형
            <input v-model="profileForm.companyTypes" data-testid="profile-company-types" />
          </label>
          <label>
            계열/업종
            <input v-model="profileForm.industries" data-testid="profile-industries" />
          </label>
          <label>
            희망 근무 지역
            <input v-model="profileForm.regions" data-testid="profile-regions" />
          </label>
          <label>
            SSAFY 교육생 여부
            <select v-model="profileForm.ssafy" data-testid="profile-ssafy">
              <option value="true">예</option>
              <option value="false">아니오</option>
            </select>
          </label>
          <p class="mattermost-note">‘예’ 선택 시 추천 공고에 Mattermost 공고가 함께 표시돼요.</p>
        </div>
        <div class="form-actions">
          <p v-if="preferenceStatusMessage" class="form-status" role="status">{{ preferenceStatusMessage }}</p>
          <button class="ghost-button" type="button">취소</button>
          <button class="primary-button" type="button" data-testid="save-onboarding-profile" @click="savePreferences">
            저장
          </button>
        </div>
      </section>

      <section v-else-if="activeSection === 'qna'" class="mypage-panel" aria-label="QnA">
        <div class="section-heading">
          <div>
            <p class="section-kicker">QnA</p>
            <h2>마이페이지 · QnA</h2>
          </div>
          <input class="mypage-search" placeholder="궁금한 점을 검색하세요" />
        </div>
        <div class="faq-filter-row">
          <span>전체</span>
          <span>계정</span>
          <span>노션 연동</span>
          <span>공고/장바구니</span>
          <span>자소서</span>
          <span>확장 프로그램</span>
        </div>
        <article v-for="item in faqItems" :key="item.q" class="faq-row">
          <strong>Q {{ item.q }}</strong>
          <p>A {{ item.a }}</p>
        </article>
      </section>

      <section v-else-if="activeSection === 'inquiry'" class="mypage-panel" aria-label="1:1 문의">
        <div class="section-heading">
          <div>
            <p class="section-kicker">문의</p>
            <h2>1:1 문의 작성</h2>
          </div>
        </div>
        <form class="support-form">
          <label>
            문의 유형
            <select>
              <option>계정 / 오류 / 기능 제안 / 기타</option>
            </select>
          </label>
          <label>
            제목
            <input />
          </label>
          <label>
            내용
            <textarea />
          </label>
          <button class="primary-button" type="button">문의 접수</button>
        </form>
        <div class="support-history">
          <strong>내 문의 내역</strong>
          <span>노션 연동이 자꾸 풀려요 · 답변 완료</span>
          <span>확장 프로그램 자동 입력 오류 · 접수중</span>
        </div>
      </section>

      <section v-else-if="activeSection === 'partnership'" class="mypage-panel" aria-label="제휴 문의">
        <div class="section-heading">
          <div>
            <p class="section-kicker">제휴</p>
            <h2>제휴 문의</h2>
          </div>
          <small>영업일 기준 3일 내 회신</small>
        </div>
        <form class="support-form">
          <label>회사 / 단체명 <input /></label>
          <label>담당자명 <input /></label>
          <label>이메일 <input /></label>
          <label>연락처 <input /></label>
          <label>
            제휴 유형
            <select><option>콘텐츠 제휴 / 채용 연계 / 기술 제휴 / 기타</option></select>
          </label>
          <label>제안 내용 <textarea /></label>
          <button class="primary-button" type="button">제휴 문의 보내기</button>
        </form>
      </section>

      <section v-else class="mypage-panel" aria-label="이용약관">
        <div class="section-heading">
          <div>
            <p class="section-kicker">약관</p>
            <h2>서비스 이용약관</h2>
          </div>
          <small>시행일 2026.01.01 · 인쇄/다운로드</small>
        </div>
        <div class="terms-tabs">
          <span>제1조 목적</span>
          <span>제2조 정의</span>
          <span>제3조 약관의 효력 및 변경</span>
          <span>제4조 회원 가입 및 관리</span>
        </div>
        <article class="terms-paper">
          <h3>제1조 목적</h3>
          <p>본 약관은 EZ-ONE이 제공하는 공고 관리, 서류 입력 정보, 워크스페이스 서비스를 이용함에 있어 필요한 사항을 정합니다.</p>
          <h3>제2조 정의</h3>
          <p>회원, 공고, 워크스페이스, 외부 연동의 의미와 서비스 이용 범위를 정의합니다.</p>
        </article>
      </section>
    </section>
  </AppLayout>
</template>

<script setup>
import { computed, defineComponent, h, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import AppLayout from '@/shared/AppLayout.vue';
import PageHeader from '@/shared/PageHeader.vue';
import { authApi } from '@/features/auth/api/authApi';
import { getCurrentUser, saveCurrentUser } from '@/features/auth/session/authSession';
import { useProfileStore } from '@/stores/profileStore';

const route = useRoute();
const profileStore = useProfileStore();
const currentUser = ref(getCurrentUser());
const nickname = ref(currentUser.value?.nickname || currentUser.value?.name || '');
const saving = ref(false);
const statusMessage = ref('');
const preferenceStatusMessage = ref('');
const profileForm = reactive({
  desiredRoles: '',
  companyTypes: '',
  industries: '',
  regions: '',
  skills: '',
  ssafy: 'false'
});

const pageCopy = {
  account: {
    title: '마이페이지 · 내 계정',
    description: '로그인 계정과 노션 연동 계정이 다를 수 있음을 안내하고 계정 정보를 관리합니다.'
  },
  onboarding: {
    title: '마이페이지 · 온보딩 정보',
    description: '추천 공고에 반영되는 직무, 기업 유형, 지역, 스킬 정보를 수정합니다.'
  },
  qna: {
    title: '마이페이지 · QnA',
    description: '자주 묻는 질문을 검색하고 바로 확인합니다.'
  },
  inquiry: {
    title: '마이페이지 · 1:1 문의',
    description: '계정, 오류, 기능 문의를 접수하고 처리 상태를 확인합니다.'
  },
  partnership: {
    title: '마이페이지 · 제휴 문의',
    description: '채용, 콘텐츠, 기술 제휴 제안을 접수합니다.'
  },
  terms: {
    title: '마이페이지 · 이용약관',
    description: '서비스 이용약관과 개인정보 처리 기준을 확인합니다.'
  }
};

const activeSection = computed(() => route.meta.mypageSection ?? 'account');
const pageTitle = computed(() => pageCopy[activeSection.value]?.title ?? pageCopy.account.title);
const pageDescription = computed(() => pageCopy[activeSection.value]?.description ?? pageCopy.account.description);
const profileInitial = computed(() => (nickname.value || currentUser.value?.email || 'E').trim().charAt(0).toUpperCase());
const roleChips = computed(() => splitCsv(profileForm.desiredRoles));
const companyTypeChips = computed(() => splitCsv(profileForm.companyTypes));
const industryChips = computed(() => splitCsv(profileForm.industries));
const regionChips = computed(() => splitCsv(profileForm.regions));

const faqItems = [
  { q: '노션 이메일이 로그인 이메일과 달라도 되나요?', a: '네. 로그인 계정과 노션 연동 계정은 다를 수 있고, 내 계정에서 차이를 안내합니다.' },
  { q: '자소서는 어떻게 버전 관리하나요?', a: '공고 워크스페이스에서 도화지와 자소서 버전관리를 전환해 비교할 수 있습니다.' },
  { q: '공고별로 첨부한 자료는 어디서 보나요?', a: '워크스페이스 오른쪽 참고자료 패널에서 JD, 뉴스, DART, 메모를 확인합니다.' },
  { q: '추천 공고는 어떤 기준으로 보여지나요?', a: '온보딩에서 입력한 선호 직무와 기술 스택을 바탕으로 마감순 공고를 제안합니다.' }
];

const PreferenceGroup = defineComponent({
  name: 'PreferenceGroup',
  props: {
    title: { type: String, required: true },
    items: { type: Array, required: true }
  },
  setup(props) {
    return () => h('div', { class: 'preference-group' }, [
      h('strong', props.title),
      h('div', { class: 'keyword-row' }, props.items.map((item) => h('span', String(item))))
    ]);
  }
});

onMounted(async () => {
  await profileStore.loadProfile();
  if (profileStore.profile) {
    syncProfileForm();
  }
});

async function saveProfile() {
  const nextNickname = nickname.value.trim();
  if (!nextNickname) {
    statusMessage.value = '닉네임을 입력해 주세요.';
    return;
  }
  saving.value = true;
  statusMessage.value = '';
  try {
    const updatedUser = await authApi.updateCurrentUser({ nickname: nextNickname });
    currentUser.value = updatedUser;
    nickname.value = updatedUser.nickname;
    saveCurrentUser(updatedUser);
    statusMessage.value = '저장되었습니다.';
  } catch {
    statusMessage.value = '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.';
  } finally {
    saving.value = false;
  }
}

async function savePreferences() {
  await profileStore.saveProfile({
    desiredRoles: splitCsv(profileForm.desiredRoles),
    companyTypes: splitCsv(profileForm.companyTypes),
    industries: splitCsv(profileForm.industries),
    regions: splitCsv(profileForm.regions),
    skills: splitCsv(profileForm.skills),
    ssafy: profileForm.ssafy === 'true'
  });
  if (profileStore.status === 'ready' && profileStore.profile) {
    syncProfileForm();
    preferenceStatusMessage.value = '온보딩 정보가 저장되었습니다.';
    return;
  }
  preferenceStatusMessage.value = profileStore.errorMessage || '온보딩 정보를 저장하지 못했습니다.';
}

function syncProfileForm() {
  const profile = profileStore.profile;
  if (!profile) return;
  profileForm.desiredRoles = profile.desiredRoles.join(', ');
  profileForm.companyTypes = profile.companyTypes.join(', ');
  profileForm.industries = profile.industries.join(', ');
  profileForm.regions = profile.regions.join(', ');
  profileForm.skills = profile.skills.join(', ');
  profileForm.ssafy = String(profile.ssafy);
}

function splitCsv(value) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}
</script>
