<template>
  <main class="landing-page">
    <header class="landing-nav">
      <RouterLink class="landing-brand" to="/" aria-label="EZ One">
        <img src="../assets/ez-one-logo.svg" alt="" />
        <strong>EZ One</strong>
      </RouterLink>

      <nav class="landing-nav-links" aria-label="서비스 소개">
        <a href="#features">기능</a>
        <a href="#extension-install">확장 설치</a>
        <a href="#workflow">흐름</a>
        <button type="button" class="landing-login-button" @click="startGoogleLogin">
          로그인
        </button>
      </nav>
    </header>

    <section class="landing-hero" aria-labelledby="login-title">
      <div class="landing-hero-copy">
        <p class="landing-eyebrow">EZ One Workspace</p>
        <h1 id="login-title">지원할 공고와 자기소개서를 한 곳에서 정리하세요</h1>
        <p>
          EZ One은 채용 공고, 마감 일정, 참고자료, 자기소개서 초안을 공고별로 묶어
          지원 준비 흐름을 놓치지 않게 도와줍니다.
        </p>

        <div class="landing-hero-actions">
          <button class="landing-primary" data-testid="google-login" type="button" @click="startGoogleLogin">
            Google로 시작하기
          </button>
        </div>
        <p v-if="errorMessage" class="auth-note error" role="alert">{{ errorMessage }}</p>
        <small>로그인과 회원가입은 Google 계정으로 진행합니다.</small>
      </div>

      <aside class="landing-preview" aria-label="EZ One 미리보기">
        <div class="preview-topbar">
          <span>EZ One</span>
          <strong>지원 현황</strong>
        </div>
        <div class="preview-metrics">
          <div>
            <span>전체 지원</span>
            <strong>12</strong>
          </div>
          <div>
            <span>진행 중</span>
            <strong>5</strong>
          </div>
          <div>
            <span>마감 임박</span>
            <strong>3</strong>
          </div>
        </div>
        <div class="preview-table">
          <div class="preview-row head">
            <span>회사명</span>
            <span>직무</span>
            <span>마감</span>
          </div>
          <div class="preview-row">
            <span>네이버</span>
            <span>Backend Engineer</span>
            <strong>D-2</strong>
          </div>
          <div class="preview-row">
            <span>카카오페이</span>
            <span>Server Developer</span>
            <strong>D-5</strong>
          </div>
          <div class="preview-row">
            <span>토스</span>
            <span>Platform Engineer</span>
            <strong>오늘</strong>
          </div>
        </div>
      </aside>
    </section>

    <section id="features" class="landing-section" aria-label="핵심 기능">
      <div class="landing-section-heading">
        <p class="landing-eyebrow">Core Features</p>
        <h2>지원 준비에 필요한 화면만 깔끔하게 연결합니다</h2>
      </div>

      <div class="landing-feature-grid">
        <article>
          <span>01</span>
          <h3>공고 장바구니</h3>
          <p>관심 공고를 모아 마감일과 지원 상태를 한눈에 확인합니다.</p>
        </article>
        <article>
          <span>02</span>
          <h3>지원 워크스페이스</h3>
          <p>공고마다 필요한 문항, 초안, 참고자료를 하나의 작업 공간에 모읍니다.</p>
        </article>
        <article>
          <span>03</span>
          <h3>서류 입력 정보</h3>
          <p>반복 입력하는 기본 정보와 경력 항목을 저장해 지원서 작성 시간을 줄입니다.</p>
        </article>
      </div>
    </section>

    <section id="extension-install" class="landing-section extension-install" aria-label="Chrome 확장프로그램 설치">
      <div class="landing-section-heading">
        <p class="landing-eyebrow">Chrome Extension</p>
        <h2>Chrome 확장프로그램 설치</h2>
      </div>

      <div class="landing-feature-grid">
        <article>
          <span>01</span>
          <h3>빌드 생성</h3>
          <p>터미널에서 <code>cd C:\ez-one\extension</code> 후 <code>npm run build</code>를 실행합니다.</p>
        </article>
        <article>
          <span>02</span>
          <h3>Chrome에 로드</h3>
          <p><code>chrome://extensions</code>에서 개발자 모드를 켠 뒤 <code>C:\ez-one\extension\dist</code> 폴더를 로드합니다.</p>
        </article>
        <article>
          <span>03</span>
          <h3>자소설닷컴에서 실행</h3>
          <p>자소설닷컴 공고 페이지에서 EZ One 확장 아이콘을 눌러 공고 저장 흐름을 시작합니다.</p>
        </article>
      </div>
    </section>

    <section id="workflow" class="landing-workflow" aria-label="사용 흐름">
      <div>
        <p class="landing-eyebrow">지원 준비 흐름</p>
        <h2>공고를 저장하면 바로 작성 공간을 만들 수 있습니다</h2>
      </div>
      <ol>
        <li>
          <span>01</span>
          <strong>Google 로그인</strong>
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
          <strong>장바구니</strong>
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

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  buildGoogleOAuthUrl,
  createOAuthState,
  getGoogleClientId,
  getGoogleRedirectUri
} from '@/features/auth/oauth/googleOAuth'

const route = useRoute()
const errorMessage = ref('')

function startGoogleLogin() {
  const clientId = getGoogleClientId()

  if (!clientId) {
    errorMessage.value = 'Google OAuth 클라이언트 ID가 설정되지 않았습니다. VITE_GOOGLE_CLIENT_ID를 설정해 주세요.'
    return
  }

  const redirectTarget = typeof route.query.redirect === 'string' ? route.query.redirect : '/main'
  const state = createOAuthState(redirectTarget)
  const url = buildGoogleOAuthUrl({
    clientId,
    redirectUri: getGoogleRedirectUri(),
    state
  })

  window.location.assign(url.toString())
}
</script>
