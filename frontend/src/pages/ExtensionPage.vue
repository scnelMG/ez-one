<template>
  <main class="public-page public-page-shell public-extension-page">
    <nav class="public-topbar" aria-label="공개 페이지 이동">
      <RouterLink class="public-brand" to="/login" aria-label="EZ-ONE 로그인">
        <img :src="logoUrl" alt="" />
      </RouterLink>
      <div class="public-nav-links">
        <RouterLink to="/privacy">개인정보 처리 기준</RouterLink>
        <RouterLink to="/support">도움말</RouterLink>
      </div>
    </nav>

    <section class="public-hero public-section" aria-labelledby="extension-title">
      <p class="public-eyebrow">Chrome Web Store 안내</p>
      <h1 id="extension-title">EZ-ONE Chrome 확장 프로그램</h1>
      <p class="public-lead">
        채용 공고를 보던 자리에서 지원 공고 미리보기와 저장을 시작하고, 저장된 서류 입력 정보를 바탕으로 지원서 입력을 보조합니다.
      </p>
      <div class="public-actions public-cta-row">
        <a
          v-if="extensionInstallUrl"
          class="public-primary-link"
          data-testid="extension-install-link"
          :href="extensionInstallUrl"
          target="_blank"
          rel="noreferrer"
        >
          Chrome 웹 스토어에서 설치
        </a>
        <RouterLink v-else class="public-primary-link" data-testid="extension-install-link" to="/support">
          설치 도움말 보기
        </RouterLink>
        <RouterLink class="public-secondary-link" to="/support">설치 도움말 보기</RouterLink>
      </div>
    </section>

    <section class="public-section public-grid" aria-label="확장 프로그램 기능">
      <article class="public-card">
        <span class="public-card-kicker">공고 저장</span>
        <h2>지원 공고 미리보기와 저장</h2>
        <p>
          지원 중인 공고 페이지에서 회사명, 직무, 마감일, 원문 URL을 확인한 뒤 EZ-ONE 공고 장바구니와 워크스페이스로 이어갑니다.
        </p>
      </article>
      <article class="public-card">
        <span class="public-card-kicker">입력 보조</span>
        <h2>서류 입력 정보 기반 지원서 입력 보조</h2>
        <p>
          사용자가 저장한 기본 정보, 학력, 경력, 프로젝트 같은 문서 프로필 값을 지원서 입력칸에 채우는 데 도움을 줍니다.
          자기소개서 문항은 자동 입력하지 않습니다.
        </p>
      </article>
      <article class="public-card">
        <span class="public-card-kicker">사용자 확인</span>
        <h2>저장 전 확인</h2>
        <p>
          추출 결과가 충분하지 않으면 조용히 저장하지 않고 사용자가 직접 확인하거나 보완할 수 있도록 안내합니다.
        </p>
      </article>
    </section>
  </main>
</template>

<script setup>
import logoUrl from '@/assets/ez-one-logo-final.png';

const extensionInstallUrl = import.meta.env.VITE_EXTENSION_INSTALL_URL || '';
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
  max-width: 1080px;
  min-width: 0;
}

.public-brand,
.public-nav-links,
.public-actions {
  align-items: center;
  display: flex;
  gap: var(--space-3);
  min-width: 0;
}

.public-brand,
.public-nav-links a,
.public-secondary-link {
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

.public-hero {
  margin: var(--space-16) auto var(--space-8);
  max-width: 1080px;
}

.public-eyebrow,
.public-card-kicker {
  color: #6d4dff;
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0;
}

.public-hero h1 {
  font-size: clamp(2.35rem, 6vw, 4.2rem);
  font-weight: 750;
  letter-spacing: 0;
  line-height: 1.12;
  margin: var(--space-3) 0 var(--space-5);
  max-width: 760px;
  text-wrap: balance;
}

.public-lead {
  color: #475569;
  font-size: 1.05rem;
  font-weight: 500;
  line-height: 1.75;
  max-width: 720px;
  text-wrap: pretty;
}

.public-actions {
  flex-wrap: wrap;
  margin-top: var(--space-8);
}

.public-primary-link,
.public-secondary-link {
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  font-weight: 900;
  justify-content: center;
  line-height: 1.25;
  min-width: 0;
  min-height: 46px;
  overflow-wrap: anywhere;
  padding: 12px 18px;
  text-align: center;
  transition: background-color 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease, color 0.16s ease, transform 0.16s ease;
  white-space: normal;
}

.public-primary-link {
  background: var(--ink);
  color: #ffffff;
  text-decoration: none;
}

.public-primary-link:hover {
  background: #263244;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.14);
}

.public-secondary-link {
  background: #ffffff;
  border: 1px solid #dbe3ee;
}

.public-secondary-link:hover {
  border-color: var(--line-strong);
  background: #f8fafc;
}

.public-primary-link:active,
.public-secondary-link:active {
  transform: translateY(1px);
}

.public-primary-link:focus-visible,
.public-secondary-link:focus-visible,
.public-nav-links a:focus-visible {
  outline: 3px solid rgba(79, 70, 229, 0.22);
  outline-offset: 2px;
}

.public-grid {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 0 auto;
  max-width: 1080px;
}

.public-card {
  background: #ffffff;
  border: 1px solid #dbe3ee;
  border-radius: 8px;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.06);
  padding: var(--space-6);
}

.public-card h2 {
  font-size: 1.2rem;
  font-weight: 750;
  letter-spacing: 0;
  margin: 10px 0;
}

.public-card p {
  color: #475569;
  line-height: 1.7;
  margin: 0;
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

  .public-hero {
    margin-top: var(--space-12);
  }

  .public-actions,
  .public-primary-link,
  .public-secondary-link {
    width: 100%;
  }

  .public-grid {
    grid-template-columns: 1fr;
  }
}
</style>
