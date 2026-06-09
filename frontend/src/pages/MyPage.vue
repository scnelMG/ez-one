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
          <section class="onboarding-field-group" aria-label="보유 스킬">
            <strong>보유 스킬</strong>
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
              <button
                type="button"
                :class="{ active: profileForm.ssafy }"
                data-testid="profile-ssafy-true"
                @click="profileForm.ssafy = true"
              >
                예
              </button>
              <button
                type="button"
                :class="{ active: !profileForm.ssafy }"
                data-testid="profile-ssafy-false"
                @click="profileForm.ssafy = false"
              >
                아니오
              </button>
            </div>
          </section>
          <p class="mattermost-note">'예' 선택 시 추천 공고에 Mattermost 공고가 함께 표시돼요.</p>
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
          <h3>제3조 상표 및 로고 표시</h3>
          <p>서비스에 표시되는 회사명 및 로고는 채용공고 식별 목적으로만 사용되며, 각 상표와 로고는 해당 소유자의 자산입니다. EZ-ONE은 표시된 기업과 제휴 또는 후원을 의미하지 않습니다.</p>
        </article>
      </section>
    </section>
  </AppLayout>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
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
const roleOptions = ['프론트엔드', '백엔드', '데이터 엔지니어', 'AI/ML', '모바일', 'DevOps', 'PM', '디자인', 'QA', '기타'];
const companyTypeOptions = ['대기업', '공공기관', '중견기업', '중소기업', '스타트업', '기타'];
const industryOptions = ['IT/플랫폼', '제조', '금융', '커머스', '게임', '바이오/헬스', '미디어', '기타'];
const regionOptions = ['서울', '경기', '인천', '대전', '부산', '대구', '광주', '제주', '원격(재택)'];
const profileForm = reactive({
  desiredRoles: [roleOptions[0]],
  companyTypes: [companyTypeOptions[0]],
  industries: [industryOptions[0]],
  regions: [regionOptions[0]],
  skills: [],
  ssafy: false
});
const skillInput = ref('');

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

const faqItems = [
  { q: '노션 이메일이 로그인 이메일과 달라도 되나요?', a: '네. 로그인 계정과 노션 연동 계정은 다를 수 있고, 내 계정에서 차이를 안내합니다.' },
  { q: '자소서는 어떻게 버전 관리하나요?', a: '공고 워크스페이스에서 도화지와 자소서 버전관리를 전환해 비교할 수 있습니다.' },
  { q: '공고별로 첨부한 자료는 어디서 보나요?', a: '워크스페이스 오른쪽 참고자료 패널에서 JD, 뉴스, DART, 메모를 확인합니다.' },
  { q: '추천 공고는 어떤 기준으로 보여지나요?', a: '온보딩에서 입력한 선호 직무와 기술 스택을 바탕으로 마감순 공고를 제안합니다.' }
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
    return;
  }
  preferenceStatusMessage.value = profileStore.errorMessage || '온보딩 정보를 저장하지 못했습니다.';
}

function syncProfileForm() {
  const profile = profileStore.profile;
  if (!profile) return;
  profileForm.desiredRoles = selectedOrDefault(profile.desiredRoles, roleOptions);
  profileForm.companyTypes = selectedOrDefault(profile.companyTypes, companyTypeOptions);
  profileForm.industries = selectedOrDefault(profile.industries, industryOptions);
  profileForm.regions = selectedOrDefault(profile.regions, regionOptions);
  profileForm.skills = [...profile.skills];
  profileForm.ssafy = profile.ssafy;
}

function selectedOrDefault(values, options) {
  return values.length > 0 ? [...values] : [options[0]];
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
</script>
