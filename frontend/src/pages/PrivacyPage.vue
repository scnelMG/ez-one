<template>
  <main class="public-page public-page-shell public-privacy-page">
    <nav class="public-topbar" aria-label="공개 페이지 이동">
      <RouterLink class="public-brand" to="/login" aria-label="EZ-ONE 로그인">
        <img :src="logoUrl" alt="" />
      </RouterLink>
      <div class="public-nav-links">
        <RouterLink to="/extension">확장 프로그램</RouterLink>
        <RouterLink to="/support">도움말</RouterLink>
      </div>
    </nav>

    <article class="public-paper public-section" aria-labelledby="privacy-title">
      <p class="public-eyebrow">시행일 2026.01.01</p>
      <h1 id="privacy-title">개인정보 처리 기준</h1>
      <p>
        EZ-ONE은 서비스 제공에 필요한 범위에서 계정 식별 정보, 온보딩 선호 정보, 저장 공고, 워크스페이스 작성 자료를 처리합니다.
      </p>

      <h2>처리 목적</h2>
      <p>
        개인정보는 서비스 제공, 본인 확인, 보안 유지, 장애 대응, 공고 저장과 지원 워크스페이스 기능 제공을 위해 사용합니다.
      </p>

      <h2>처리하는 정보</h2>
      <ul>
        <li>Google 로그인으로 확인되는 계정 식별 정보</li>
        <li>사용자가 입력한 온보딩 선호 정보와 서류 입력 정보</li>
        <li>저장 공고, 워크스페이스 작성 자료, 참고자료, Notion 연동 설정</li>
      </ul>

      <h2>외부 연동</h2>
      <p>
        Notion 동기화와 Chrome 확장 프로그램 연결은 사용자가 직접 시작한 경우에만 수행됩니다.
        외부 서비스 장애나 권한 만료가 발생하면 핵심 저장 데이터와 분리해 안내합니다.
      </p>

      <h2>문의</h2>
      <p>
        개인정보 처리 기준에 대한 문의는 <RouterLink to="/support">도움말 및 운영 문의</RouterLink> 페이지의 연락처로 보낼 수 있습니다.
      </p>
    </article>
  </main>
</template>

<script setup>
import logoUrl from '@/assets/ez-one-logo-final.png';
</script>

<style scoped>
.public-page {
  background: var(--bg);
  color: var(--ink);
  min-height: 100dvh;
  padding: var(--space-6);
}

.public-topbar {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  justify-content: space-between;
  margin: 0 auto;
  max-width: 920px;
  min-width: 0;
}

.public-brand,
.public-nav-links {
  align-items: center;
  display: flex;
  gap: var(--space-3);
  min-width: 0;
}

.public-brand,
.public-nav-links a,
.public-paper a {
  color: #334155;
  font-weight: 750;
  line-height: 1.35;
  overflow-wrap: anywhere;
  text-decoration: none;
}

.public-brand img {
  height: 30px;
  width: auto;
}

.public-paper {
  background: #ffffff;
  border: 1px solid #dbe3ee;
  border-radius: 8px;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.06);
  margin: var(--space-12) auto 0;
  max-width: 920px;
  padding: clamp(24px, 5vw, 48px);
}

.public-eyebrow {
  color: #6d4dff;
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0;
}

.public-paper h1 {
  font-size: clamp(2rem, 5vw, 3.2rem);
  font-weight: 750;
  letter-spacing: 0;
  line-height: 1.14;
  margin: 12px 0 24px;
  text-wrap: balance;
}

.public-paper h2 {
  font-size: 1.2rem;
  font-weight: 750;
  letter-spacing: 0;
  margin: 28px 0 10px;
}

.public-paper p,
.public-paper li {
  color: #475569;
  font-size: 0.98rem;
  font-weight: 500;
  line-height: 1.75;
  text-wrap: pretty;
}

.public-paper ul {
  margin: 0;
  padding-left: 20px;
}

@media (max-width: 720px) {
  .public-page {
    padding: 18px;
  }

  .public-topbar,
  .public-nav-links {
    align-items: flex-start;
    flex-direction: column;
  }

  .public-paper {
    margin-top: var(--space-10);
  }
}
</style>
