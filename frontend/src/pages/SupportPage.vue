<template>
  <main class="public-page public-page-shell public-support-page">
    <nav class="public-topbar" aria-label="공개 페이지 이동">
      <RouterLink class="public-brand" to="/login" aria-label="EZ-ONE 로그인">
        <img :src="logoUrl" alt="" />
      </RouterLink>
      <div class="public-nav-links">
        <RouterLink to="/extension">확장 프로그램</RouterLink>
        <RouterLink to="/privacy">개인정보 처리 기준</RouterLink>
      </div>
    </nav>

    <section class="public-hero public-section" aria-labelledby="support-title">
      <p class="public-eyebrow">Support</p>
      <h1 id="support-title">도움말 및 운영 문의</h1>
      <p class="public-lead">
        계정, 공고 저장, 워크스페이스, 서류 입력 정보, 확장 프로그램 사용 중 막히는 부분을 확인할 수 있습니다.
        운영 문의는 아래 메일로 보내 주세요.
      </p>
      <address class="support-contact">
        <a href="mailto:qkralsrb4407@naver.com">qkralsrb4407@naver.com</a>
        <a href="mailto:eunjaelee058@gmail.com">eunjaelee058@gmail.com</a>
      </address>
    </section>

    <section class="faq-list public-section" aria-label="자주 묻는 질문">
      <article v-for="item in faqItems" :key="item.q" class="faq-row">
        <h2>{{ item.q }}</h2>
        <p>{{ item.a }}</p>
      </article>
    </section>
  </main>
</template>

<script setup>
import logoUrl from '@/assets/ez-one-logo-final.png';

const faqItems = [
  { q: 'Google 계정만으로 사용할 수 있나요?', a: '네. Google 로그인으로 바로 사용할 수 있고, 별도 비밀번호는 만들지 않습니다.' },
  { q: '공고는 어디에 저장되나요?', a: '저장한 공고는 공고 장바구니에서 확인하고 워크스페이스로 이어갈 수 있습니다.' },
  { q: 'Notion에는 어떤 정보가 동기화되나요?', a: '저장한 공고 정보가 Notion에 동기화됩니다.' },
  { q: '서류 입력 정보와 확장 프로그램은 같은 기능인가요?', a: '서류 입력 정보는 내 프로필이고, 확장 프로그램은 공고 미리보기와 저장, 입력 보조를 돕는 도구입니다.' },
  { q: '확장 프로그램 연결이 실패하면 어떻게 하나요?', a: 'Chrome 웹 스토어에서 설치된 확장 프로그램을 최신 상태로 유지하고, EZ-ONE에 다시 로그인한 뒤 지원 중인 공고 페이지에서 다시 열어 주세요.' }
];
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
  max-width: 1000px;
  min-width: 0;
}

.public-brand,
.public-nav-links,
.support-contact {
  align-items: center;
  display: flex;
  gap: var(--space-3);
  min-width: 0;
}

.public-brand,
.public-nav-links a,
.support-contact a {
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

.public-hero,
.faq-list {
  margin-left: auto;
  margin-right: auto;
  max-width: 1000px;
}

.public-hero {
  margin-top: var(--space-16);
}

.public-eyebrow {
  color: #6d4dff;
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0;
}

.public-hero h1 {
  font-size: clamp(2.2rem, 5.5vw, 3.9rem);
  font-weight: 750;
  letter-spacing: 0;
  line-height: 1.14;
  margin: 12px 0 18px;
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

.support-contact {
  flex-wrap: wrap;
  margin-top: var(--space-6);
}

.support-contact a {
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #ffffff;
  min-width: 0;
  overflow-wrap: anywhere;
  padding: 10px 14px;
}

.support-contact a:hover,
.support-contact a:focus-visible,
.public-nav-links a:focus-visible {
  border-color: var(--line-strong);
  background: #f8fafc;
  outline: 3px solid rgba(79, 70, 229, 0.22);
  outline-offset: 2px;
}

.faq-list {
  display: grid;
  gap: var(--space-4);
  margin-top: var(--space-8);
}

.faq-row {
  background: #ffffff;
  border: 1px solid #dbe3ee;
  border-radius: 8px;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.06);
  padding: 22px;
}

.faq-row h2 {
  font-size: 1.1rem;
  font-weight: 750;
  letter-spacing: 0;
  margin: 0 0 8px;
}

.faq-row p {
  color: #475569;
  font-weight: 500;
  line-height: 1.7;
  margin: 0;
  text-wrap: pretty;
}

@media (max-width: 720px) {
  .public-page {
    padding: 18px;
  }

  .public-topbar,
  .public-nav-links,
  .support-contact {
    align-items: flex-start;
    flex-direction: column;
  }

  .public-hero {
    margin-top: var(--space-12);
  }
}
</style>
