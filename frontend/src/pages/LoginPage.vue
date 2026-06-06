<template>
  <main class="landing-page">
    <section class="landing-hero" aria-labelledby="login-title">
      <div class="landing-hero-copy">
        <RouterLink class="landing-brand landing-brand-hero" to="/" aria-label="EZ-ONE">
          <img src="../assets/ez-one-logo.svg" alt="" />
          <strong>EZ-ONE</strong>
        </RouterLink>

        <p class="landing-eyebrow">지원 준비 워크스페이스</p>
        <h1 id="login-title">공고부터 자소서까지 한 곳에서 준비하세요</h1>
        <p>
          저장한 공고, 마감 일정, 서류 정보, 자기소개서 초안을 공고별로 정리해
          다음에 해야 할 일을 바로 보여줍니다.
        </p>

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
          <a href="#features">작동 방식 보기</a>
          <a href="#extension-install">확장 프로그램 보기</a>
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

      <aside class="landing-preview" aria-label="EZ-ONE 미리보기">
        <div class="preview-topbar">
          <span>오늘의 지원 보드</span>
          <strong>실시간 정리</strong>
        </div>
        <div class="preview-metrics">
          <div>
            <span>저장 공고</span>
            <strong>12</strong>
          </div>
          <div>
            <span>작성 중</span>
            <strong>5</strong>
          </div>
          <div>
            <span>마감 임박</span>
            <strong>3</strong>
          </div>
        </div>
        <div class="preview-focus-card">
          <span>다음 작업</span>
          <strong>네이버 백엔드 개발자 자기소개서 2번 문항 이어쓰기</strong>
          <p>참고자료 4개와 저장된 서류 정보가 연결되어 있습니다.</p>
        </div>
        <div class="preview-table">
          <div class="preview-row head">
            <span>회사명</span>
            <span>직무</span>
            <span>마감</span>
          </div>
          <div class="preview-row">
            <span>네이버</span>
            <span>백엔드 개발자</span>
            <strong>D-2</strong>
          </div>
          <div class="preview-row">
            <span>카카오페이</span>
            <span>서버 개발자</span>
            <strong>D-5</strong>
          </div>
          <div class="preview-row">
            <span>토스</span>
            <span>플랫폼 엔지니어</span>
            <strong>오늘</strong>
          </div>
        </div>
      </aside>
    </section>

    <section class="landing-proof-strip" aria-label="EZ-ONE이 정리하는 범위">
      <article>
        <span>01</span>
        <strong>공고별로 묶기</strong>
        <p>회사, 직무, 마감, 상태를 하나의 지원 단위로 정리합니다.</p>
      </article>
      <article>
        <span>02</span>
        <strong>작성 흐름 유지</strong>
        <p>자기소개서 문항과 참고자료를 같은 작업 공간에서 이어봅니다.</p>
      </article>
      <article>
        <span>03</span>
        <strong>반복 입력 줄이기</strong>
        <p>학력, 경력, 프로젝트 등 서류 정보를 재사용합니다.</p>
      </article>
    </section>

    <section id="features" class="landing-section" aria-label="핵심 기능">
      <div class="landing-section-heading">
        <p class="landing-eyebrow">핵심 기능</p>
        <h2>지원 준비에 필요한 화면만 깔끔하게 연결합니다</h2>
      </div>

      <div class="landing-feature-grid">
        <article>
          <span>공고함</span>
          <h3>저장한 공고와 마감일을 한눈에</h3>
          <p>관심 공고를 모아 상태를 바꾸고, 마감이 가까운 지원을 먼저 확인합니다.</p>
        </article>
        <article>
          <span>워크스페이스</span>
          <h3>자기소개서와 참고자료를 공고별로</h3>
          <p>공고마다 문항, 초안, 버전, 참고자료를 한 곳에서 이어서 작성합니다.</p>
        </article>
        <article>
          <span>서류 정보</span>
          <h3>반복 입력하는 내 정보를 저장</h3>
          <p>프로필, 학력, 경력, 프로젝트, 자격증 정보를 지원서 작성에 재사용합니다.</p>
        </article>
      </div>
    </section>

    <section id="extension-install" class="landing-section extension-install" aria-label="Chrome 확장프로그램 설치">
      <div class="landing-section-heading">
        <p class="landing-eyebrow">Chrome 확장 프로그램</p>
        <h2>Chrome 웹 스토어에서 설치하고, 보고 있던 공고를 바로 저장하세요</h2>
      </div>

      <div class="extension-showcase">
        <article class="extension-copy-card">
          <span>Chrome Extension</span>
          <h3>채용 공고를 발견한 순간, 지원 준비가 시작됩니다</h3>
          <p>
            공고 페이지에서 확장 버튼을 누르면 회사명, 직무, 마감일을 확인하고
            EZ-ONE 공고함으로 저장합니다. 저장한 공고는 워크스페이스에서 자기소개서 작성으로 이어집니다.
          </p>
          <a class="store-button" :href="extensionInstallUrl" target="_blank" rel="noreferrer">
            Chrome 웹 스토어에서 설치하기
          </a>
        </article>

        <div class="extension-visual" aria-label="확장 프로그램 사용 예시">
          <div class="mock-browser">
            <div class="mock-browser-bar">
              <span></span>
              <span></span>
              <span></span>
              <strong>jasoseol.com/jobs/backend</strong>
            </div>
            <div class="mock-job-page">
              <div>
                <span class="mock-company">네이버</span>
                <strong>백엔드 개발자</strong>
                <p>마감 D-2 · 서버 플랫폼 · 신입/주니어</p>
              </div>
              <button type="button">EZ-ONE에 저장</button>
            </div>
          </div>

          <div class="extension-flow-cards">
            <div>
              <span>1</span>
              <strong>공고 정보 확인</strong>
            </div>
            <div>
              <span>2</span>
              <strong>공고함 저장</strong>
            </div>
            <div>
              <span>3</span>
              <strong>워크스페이스 생성</strong>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section id="workflow" class="landing-workflow" aria-label="사용 흐름">
      <div>
        <p class="landing-eyebrow">지원 준비 흐름</p>
        <h2>공고를 저장하면 바로 작성 공간까지 이어집니다</h2>
      </div>
      <ol>
        <li>
          <span>01</span>
          <strong>로그인</strong>
        </li>
        <li>
          <span>02</span>
          <strong>온보딩</strong>
        </li>
        <li>
          <span>03</span>
          <strong>공고 저장</strong>
        </li>
        <li>
          <span>04</span>
          <strong>공고함</strong>
        </li>
        <li>
          <span>05</span>
          <strong>워크스페이스</strong>
        </li>
        <li>
          <span>06</span>
          <strong>Notion 동기화</strong>
        </li>
      </ol>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
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
const emailForm = reactive({
    name: '',
    email: '',
    password: ''
});

onMounted(() => {
    redirectToConfiguredLocalOAuthOrigin();
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

function getRedirectTarget() {
    return typeof route.query.redirect === 'string' ? route.query.redirect : '/';
}

function redirectToConfiguredLocalOAuthOrigin() {
    const redirectUri = getGoogleRedirectUri();
    const currentOrigin = new URL(window.location.origin);
    const redirectOrigin = new URL(redirectUri);
    if (currentOrigin.hostname === redirectOrigin.hostname) {
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
