<template>
  <main class="landing-page">
    <nav class="landing-scroll-nav" aria-label="랜딩 섹션 이동">
      <button class="scroll-nav-control" type="button" aria-label="이전 섹션으로 이동" @click="scrollLandingSection(-1)">↑</button>
      <div class="scroll-nav-dots">
        <a
          v-for="(section, index) in landingSections"
          :key="section.id"
          :class="{ 'is-active': currentLandingSection === index }"
          :href="`#${section.id}`"
          :aria-label="section.label"
        ></a>
      </div>
      <button class="scroll-nav-control" type="button" aria-label="다음 섹션으로 이동" @click="scrollLandingSection(1)">↓</button>
    </nav>
    <div class="landing-slides-container" :style="{ transform: `translateY(-${currentLandingSection * 100}vh)` }">
    <section id="login-hero" class="landing-hero" aria-labelledby="login-title">
      <div class="landing-hero-copy">
        <RouterLink class="landing-brand landing-brand-hero" to="/" aria-label="EZ-ONE">
          <img src="../assets/ez-one-logo-final.png" alt="" />
        </RouterLink>

        <p class="landing-eyebrow">지원 준비 워크스페이스</p>
        <h1 id="login-title">공고를 저장하면 준비가 이어집니다</h1>
        <p>확장 프로그램으로 담고, 장바구니에서 정리하고, 서류 정보로 빠르게 작성하세요.</p>

        <div class="landing-hero-actions">
          <button class="landing-primary" data-testid="google-login" type="button" @click="startGoogleLogin">
            Google로 시작하기
          </button>
          <button
            class="landing-secondary email-auth-trigger"
            data-testid="email-auth-open"
            type="button"
            :aria-expanded="showEmailAuth"
            aria-controls="email-auth-panel"
            @click="openEmailAuth"
          >
            이메일로 로그인
          </button>
        </div>

        <div class="landing-sub-actions" aria-label="보조 이동">
          <a href="#features">기능 보기</a>
          <a href="#extension-install">확장 설치</a>
        </div>

        <div v-if="isAccountSwitchFlow" class="account-switch-callout" data-testid="account-switch-callout">
          <div>
            <strong>다른 Google 계정으로 전환할까요?</strong>
            <p>현재 계정에서 로그아웃한 뒤 Google 계정 선택 화면으로 이동합니다.</p>
          </div>
          <button
            class="landing-sub-action-button"
            data-testid="google-account-switch"
            type="button"
            @click="startGoogleLogin(true)"
          >
            다른 Google 계정으로 계속
          </button>
        </div>

        <form
          v-if="showEmailAuth"
          id="email-auth-panel"
          class="email-auth-form"
          data-testid="email-login-submit"
          @submit.prevent="submitEmailAuth"
        >
          <div class="email-auth-tabs" aria-label="이메일 인증 방식">
            <button
              type="button"
              :class="{ active: authMode === 'login' }"
              data-testid="login-mode"
              @click="authMode = 'login'"
            >
              로그인
            </button>
            <button
              type="button"
              :class="{ active: authMode === 'signup' }"
              data-testid="signup-mode"
              @click="authMode = 'signup'"
            >
              회원가입
            </button>
          </div>

          <p class="email-auth-helper">
            처음 사용하는 이메일이면 회원가입을 선택해 계정을 만든 뒤 바로 시작할 수 있습니다.
          </p>

          <label v-if="authMode === 'signup'">
            <span>이름</span>
            <input
              v-model="emailForm.name"
              data-testid="name-input"
              name="name"
              autocomplete="name"
              required
            />
          </label>

          <label>
            <span>이메일</span>
            <input
              v-model="emailForm.email"
              data-testid="email-input"
              name="email"
              type="email"
              autocomplete="email"
              required
            />
          </label>

          <label>
            <span>비밀번호</span>
            <input
              v-model="emailForm.password"
              data-testid="password-input"
              name="password"
              type="password"
              autocomplete="current-password"
              required
              minlength="8"
            />
          </label>

          <button class="landing-secondary" type="submit" :disabled="isSubmitting">
            {{ authMode === 'signup' ? '이메일로 가입하기' : '이메일로 로그인' }}
          </button>
        </form>

        <p v-if="errorMessage" class="auth-note error" role="alert">{{ errorMessage }}</p>
      </div>

      <div class="landing-product-story" aria-label="EZ-ONE 지원 준비 흐름">
        <figure class="landing-product-shot" aria-label="EZ-ONE 지원 워크스페이스 화면">
          <img :src="loginWorkspacePreview" alt="공고 목록, 다음 작업, 자기소개서 작업 공간이 함께 보이는 EZ-ONE 화면" />
        </figure>
        <div class="landing-flow-summary" aria-label="EZ-ONE 핵심 흐름">
          <span>확장 저장</span>
          <span>장바구니 정리</span>
          <span>서류 정보 재사용</span>
        </div>
      </div>
    </section>

    <section id="extension-install" class="landing-story-section story-extension ez-flow-section" aria-label="Chrome 확장프로그램 설치">
      <div class="story-copy">
        <span class="story-pill">EZ-ONE Extension</span>
        <h2>보던 공고를<br />그 자리에서 담습니다.</h2>
        <p>보고 있던 채용 공고를 EZ-ONE에 저장하면 회사, 직무, 마감일이 지원 준비 흐름으로 이어집니다.</p>
        <a class="store-button" :href="extensionInstallUrl" target="_blank" rel="noreferrer">
          Chrome 웹 스토어에서 설치하기
        </a>
      </div>

      <figure class="story-visual product-screenshot-card extension-screenshot-card" aria-label="확장 프로그램 실제 저장 화면">
        <img
          :src="landingExtensionSave"
          alt="자소설닷컴 채용공고 화면 위에서 EZ-ONE 확장 프로그램으로 공고와 자소서 문항을 저장하는 실제 화면"
        />
        <figcaption>실제 확장 프로그램 화면: 공고, 직무, 자소서 문항을 확인하고 장바구니에 담습니다.</figcaption>
      </figure>
    </section>

    <section id="features" class="landing-story-section story-basket ez-flow-section" aria-label="공고 장바구니">
      <div class="story-visual basket-composition" aria-label="공고 장바구니 예시">
        <div class="basket-table-card">
          <div class="basket-table-head">
            <span>공고 장바구니</span>
            <strong>마감 임박순</strong>
          </div>
          <div class="basket-demo-row active">
            <strong>네이버</strong>
            <span>백엔드 개발자</span>
            <em>D-2</em>
          </div>
          <div class="basket-demo-row">
            <strong>카카오페이</strong>
            <span>서버 개발자</span>
            <em>D-5</em>
          </div>
          <div class="basket-demo-row">
            <strong>토스</strong>
            <span>프론트엔드 엔지니어</span>
            <em>D-7</em>
          </div>
        </div>
      </div>

      <div class="story-copy">
        <span class="story-pill">공고 장바구니</span>
        <h2>지원할 공고만<br />차분하게 정리합니다.</h2>
        <p>마감일, 지원 상태, 최근 작업을 한눈에 보고 바로 워크스페이스로 이동합니다.</p>
      </div>
    </section>

    <section id="document-info" class="landing-story-section story-document ez-flow-section" aria-label="서류 정보 재사용">
      <div class="story-copy">
        <span class="story-pill">서류 정보</span>
        <h2>반복 입력 없이<br />작성에 집중합니다.</h2>
        <p>기본 정보, 학력, 경력, 프로젝트를 저장해 공고별 자기소개서 작성에 재사용합니다.</p>
      </div>

      <div class="story-visual document-composition" aria-label="서류 정보 재사용 예시">
        <div class="document-form-card">
          <small>서류 정보</small>
          <strong>프로젝트 · 경력 · 기본 정보</strong>
          <span>홍길동 · Backend Project · MySQL Schema</span>
        </div>
        <div class="document-arrow" aria-hidden="true">↓</div>
        <div class="draft-card">
          <small>워크스페이스 초안</small>
          <strong>지원 동기 문항</strong>
          <p>저장된 프로젝트 경험을 바탕으로 초안을 이어 작성합니다.</p>
        </div>
      </div>
    </section>

    <section id="login-final" class="landing-final-cta" aria-label="EZ-ONE 시작하기">
      <p class="landing-eyebrow">READY TO APPLY?</p>
      <h2>지원 준비는<br />지금부터 이어집니다.</h2>
      <button class="landing-primary" data-testid="google-login-bottom" type="button" @click="startGoogleLogin">
        Google로 시작하기
      </button>
    </section>
    </div>
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import landingExtensionSave from '../assets/landing-extension-save.png';
import loginWorkspacePreview from '../assets/login-workspace-preview.png';
import { authApi } from '@/features/auth/api/authApi';
import { buildGoogleOAuthUrl, createOAuthState, getGoogleClientId, getGoogleRedirectUri } from '@/features/auth/oauth/googleOAuth';
import { saveAuthSession } from '@/features/auth/session/authSession';

const route = useRoute();
const router = useRouter();
const errorMessage = ref('');
const authMode = ref('login');
const isSubmitting = ref(false);
const showEmailAuth = ref(false);
const isAccountSwitchFlow = computed(() => route.query.switch === 'account');
const extensionInstallUrl = import.meta.env.VITE_EXTENSION_INSTALL_URL || 'https://chromewebstore.google.com/';
const landingSections = [
    { id: 'login-hero', label: '첫 화면으로 이동' },
    { id: 'extension-install', label: '확장 프로그램 섹션으로 이동' },
    { id: 'features', label: '공고 장바구니 섹션으로 이동' },
    { id: 'document-info', label: '서류 정보 섹션으로 이동' },
    { id: 'login-final', label: '시작하기 섹션으로 이동' }
];
const currentLandingSection = ref(0);
const emailForm = reactive({
    name: '',
    email: '',
    password: ''
});

let isAnimating = false;

function handleWheel(e) {
    if (isAnimating) return;
    if (e.deltaY > 30) {
        scrollLandingSection(1);
    } else if (e.deltaY < -30) {
        scrollLandingSection(-1);
    }
}

function handleKeydown(e) {
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        scrollLandingSection(1);
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        scrollLandingSection(-1);
    }
}

onMounted(() => {
    redirectToConfiguredLocalOAuthOrigin();
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
    window.removeEventListener('wheel', handleWheel);
    window.removeEventListener('keydown', handleKeydown);
});

function startGoogleLogin(selectAccount = false) {
    const clientId = getGoogleClientId();
    if (!clientId) {
        errorMessage.value = 'Google OAuth 클라이언트 ID가 설정되지 않았습니다. VITE_GOOGLE_CLIENT_ID를 설정해 주세요.';
        return;
    }
    const state = createOAuthState(getRedirectTarget());
    const url = buildGoogleOAuthUrl({
        clientId,
        redirectUri: getGoogleRedirectUri(),
        state,
        selectAccount
    });
    window.location.assign(url.toString());
}

async function submitEmailAuth() {
    errorMessage.value = '';
    isSubmitting.value = true;
    try {
        const request = {
            email: emailForm.email.trim(),
            password: emailForm.password
        };
        const response = authMode.value === 'signup'
            ? await authApi.signup({ ...request, name: emailForm.name.trim() })
            : await authApi.loginWithEmail(request);
        saveAuthSession(response);
        await router.push(getRedirectTarget());
    } catch (error) {
        const message = error instanceof Error ? error.message : '이메일 인증에 실패했습니다.';
        if (authMode.value === 'login' && message.includes('이메일/비밀번호')) {
            authMode.value = 'signup';
            errorMessage.value = '등록된 계정이 아니거나 비밀번호가 달라요. 처음 사용하는 이메일이면 회원가입으로 진행해 주세요.';
            return;
        }
        errorMessage.value = message;
    } finally {
        isSubmitting.value = false;
    }
}

function openEmailAuth() {
    showEmailAuth.value = true;
    errorMessage.value = '';
}

function scrollLandingSection(direction) {
    if (isAnimating) return;
    const nextIndex = currentLandingSection.value + direction;
    if (nextIndex >= 0 && nextIndex < landingSections.length) {
        isAnimating = true;
        currentLandingSection.value = nextIndex;
        setTimeout(() => {
            isAnimating = false;
        }, 700); // 0.7s transition
    }
}

function updateCurrentLandingSection() {
    const viewportAnchor = window.scrollY + window.innerHeight * 0.42;
    let activeIndex = 0;
    landingSections.forEach((section, index) => {
        const element = document.getElementById(section.id);
        if (element && element.offsetTop <= viewportAnchor) {
            activeIndex = index;
        }
    });
    currentLandingSection.value = activeIndex;
}

function getRedirectTarget() {
    return typeof route.query.redirect === 'string' ? route.query.redirect : '/';
}

function redirectToConfiguredLocalOAuthOrigin() {
    const redirectUri = getGoogleRedirectUri();
    const currentOrigin = new URL(window.location.origin);
    const redirectOrigin = new URL(redirectUri);
    if (currentOrigin.origin === redirectOrigin.origin) {
        return;
    }
    if (!isLocalHostname(currentOrigin.hostname) || !isLocalHostname(redirectOrigin.hostname)) {
        return;
    }
    window.location.replace(`${redirectOrigin.origin}${route.fullPath}`);
}

function isLocalHostname(hostname) {
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}
</script>
