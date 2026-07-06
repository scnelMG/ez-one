<template>
  <main class="privacy-page" aria-labelledby="privacy-title">
    <header class="privacy-header">
      <RouterLink class="privacy-brand" to="/" aria-label="EZ-ONE 메인">
        <img src="../assets/ez-one-logo-final.png" alt="EZ-ONE" />
      </RouterLink>
      <RouterLink class="privacy-login-link" to="/login">EZ-ONE 시작하기</RouterLink>
    </header>

    <section class="privacy-hero">
      <div class="privacy-hero-copy">
        <p class="privacy-eyebrow">Privacy Policy</p>
        <h1 id="privacy-title">개인정보처리방침</h1>
        <p>
          EZ-ONE은 지원자가 채용공고와 지원 준비 자료를 안전하게 관리할 수 있도록
          필요한 정보만 처리하고, 확장 프로그램이 다루는 데이터의 범위와 목적을 명확히 공개합니다.
        </p>
      </div>

      <dl class="privacy-fact-grid" aria-label="개인정보처리방침 요약">
        <div>
          <dt>시행일</dt>
          <dd>2026년 7월 6일</dd>
        </div>
        <div>
          <dt>서비스</dt>
          <dd>EZ-ONE 웹사이트 및 EZ-ONE Job Saver</dd>
        </div>
        <div>
          <dt>처리 원칙</dt>
          <dd>서비스 제공에 필요한 범위의 최소 처리</dd>
        </div>
        <div>
          <dt>문의</dt>
          <dd><a href="mailto:qkralsrb4407@naver.com">qkralsrb4407@naver.com</a></dd>
        </div>
      </dl>
    </section>

    <section class="privacy-layout">
      <aside class="privacy-toc" aria-label="개인정보처리방침 목차">
        <strong>목차</strong>
        <nav>
          <a href="#summary">주요 안내</a>
          <a href="#items">처리 항목과 목적</a>
          <a href="#extension">확장 프로그램</a>
          <a href="#retention">보유 및 파기</a>
          <a href="#third-parties">제공 및 위탁</a>
          <a href="#rights">이용자 권리</a>
          <a href="#security">보호 조치</a>
          <a href="#contact">문의</a>
        </nav>
      </aside>

      <div class="privacy-document">
        <section id="summary" class="privacy-section">
          <span class="privacy-section-number">01</span>
          <h2>주요 안내</h2>
          <p>
            이 방침은 EZ-ONE 웹서비스와 Chrome 확장 프로그램 EZ-ONE Job Saver에 적용됩니다.
            EZ-ONE은 개인정보보호법 등 관련 법령을 준수하며, 사용자가 이해하기 쉬운 형태로
            처리 목적, 항목, 보유 기준, 외부 연동 범위를 안내합니다.
          </p>
          <div class="privacy-principles">
            <article>
              <strong>사용자 실행 기반</strong>
              <p>확장 프로그램은 사용자가 직접 실행한 현재 탭에서만 공고 저장 또는 입력 보조를 수행합니다.</p>
            </article>
            <article>
              <strong>제출 자동화 금지</strong>
              <p>지원서 제출, 최종 지원, 임시저장 버튼을 자동으로 클릭하지 않습니다.</p>
            </article>
            <article>
              <strong>목적 제한</strong>
              <p>채용공고 저장, 워크스페이스, 문서 프로필, 입력 보조 목적을 벗어나 데이터를 사용하지 않습니다.</p>
            </article>
          </div>
        </section>

        <section id="items" class="privacy-section">
          <span class="privacy-section-number">02</span>
          <h2>처리하는 개인정보 항목과 목적</h2>
          <p>
            실제 처리 항목은 사용자가 가입, 공고 저장, 문서 프로필 작성, 외부 연동을 사용하는 범위에 따라 달라집니다.
          </p>
          <div class="privacy-table-wrap">
            <table class="privacy-table">
              <thead>
                <tr>
                  <th scope="col">구분</th>
                  <th scope="col">처리 항목</th>
                  <th scope="col">처리 목적</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">계정</th>
                  <td>이메일, 이름 또는 닉네임, 프로필 이미지, 로그인 제공자 정보</td>
                  <td>회원 식별, 로그인 유지, 계정 보안 관리</td>
                </tr>
                <tr>
                  <th scope="row">지원 준비</th>
                  <td>회사명, 직무명, 마감일, 공고 URL, 지원 상태, 자기소개서 문항과 작성 자료</td>
                  <td>공고 장바구니, 워크스페이스, 지원 이력 관리</td>
                </tr>
                <tr>
                  <th scope="row">문서 프로필</th>
                  <td>사용자가 직접 입력한 기본 정보, 학력, 경력, 프로젝트, 자격증, 어학 정보</td>
                  <td>지원서 입력 보조, 공고별 작성 자료 재사용</td>
                </tr>
                <tr>
                  <th scope="row">운영 정보</th>
                  <td>접속 로그, 오류 로그, 인증 상태, 보안 이벤트 등 최소한의 기술 정보</td>
                  <td>장애 대응, 보안 유지, 부정 이용 방지</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section id="extension" class="privacy-section privacy-section-highlight">
          <span class="privacy-section-number">03</span>
          <h2>Chrome 확장 프로그램 데이터 처리</h2>
          <p>
            EZ-ONE Job Saver는 채용공고 저장과 문서 프로필 기반 지원서 입력 보조를 위해 제공됩니다.
            확장 프로그램은 전체 방문 기록을 수집하지 않으며, 사용자가 기능을 실행한 탭의 필요한 정보만 확인합니다.
          </p>
          <ul class="privacy-check-list">
            <li>채용공고 페이지에서 회사명, 직무명, 마감일, 공고 URL 등 저장에 필요한 정보를 미리 보여줍니다.</li>
            <li>지원서 입력 보조는 사용자가 EZ-ONE에 저장한 문서 프로필 정보를 바탕으로 동작합니다.</li>
            <li>브라우저 방문 기록 전체, 마우스 위치, 키 입력 로그를 추적하지 않습니다.</li>
            <li>확장 프로그램 로컬 저장소에는 로그인 상태, 인증 토큰, 사용자 정보, 패널 설정이 저장될 수 있습니다.</li>
            <li>지원서 제출 또는 최종 지원을 대신 수행하지 않으며, 사용자가 입력 결과를 직접 확인해야 합니다.</li>
          </ul>
        </section>

        <section id="retention" class="privacy-section">
          <span class="privacy-section-number">04</span>
          <h2>보유 및 파기</h2>
          <p>
            개인정보는 계정 유지 및 서비스 제공 기간 동안 보관합니다. 사용자가 계정을 삭제하거나
            정보 삭제를 요청하면 관련 법령상 보관이 필요한 경우를 제외하고 지체 없이 파기합니다.
            보안, 장애 대응, 부정 이용 방지를 위한 로그는 필요한 최소 기간 동안 분리 보관할 수 있습니다.
          </p>
        </section>

        <section id="third-parties" class="privacy-section">
          <span class="privacy-section-number">05</span>
          <h2>제3자 제공, 처리 위탁, 외부 연동</h2>
          <p>
            EZ-ONE은 개인정보를 판매하지 않으며, 서비스의 전용 목적과 무관하게 제3자에게 제공하지 않습니다.
            사용자가 Notion 같은 외부 연동을 직접 연결한 경우에는 사용자가 요청한 동기화 범위 안에서만 필요한 정보가 전송됩니다.
          </p>
          <div class="privacy-mini-grid">
            <article>
              <h3>Google OAuth</h3>
              <p>로그인과 계정 식별을 위해 사용됩니다.</p>
            </article>
            <article>
              <h3>Notion API</h3>
              <p>사용자가 직접 연결한 경우 공고 정보 동기화에 사용됩니다.</p>
            </article>
            <article>
              <h3>AWS EC2</h3>
              <p>서비스 운영과 데이터 저장을 위한 서버 인프라로 사용됩니다.</p>
            </article>
          </div>
        </section>

        <section id="rights" class="privacy-section">
          <span class="privacy-section-number">06</span>
          <h2>이용자의 권리</h2>
          <p>
            사용자는 본인의 정보를 조회, 수정, 삭제할 수 있으며 계정 삭제 또는 개인정보 처리 정지를 요청할 수 있습니다.
            문서 프로필과 저장 공고는 서비스 화면에서 직접 수정하거나 삭제할 수 있고, 추가 요청은 문의 이메일로 보낼 수 있습니다.
          </p>
        </section>

        <section id="security" class="privacy-section">
          <span class="privacy-section-number">07</span>
          <h2>안전성 확보 조치</h2>
          <ul class="privacy-check-list">
            <li>HTTPS 통신과 인증 기반 접근 제어를 적용합니다.</li>
            <li>비밀번호, 토큰, 외부 API 키 같은 비밀값은 공개 저장소에 저장하지 않습니다.</li>
            <li>개인정보 접근 범위를 서비스 운영에 필요한 기능과 인원으로 제한합니다.</li>
            <li>오류와 보안 로그는 장애 대응과 보안 유지에 필요한 범위에서만 확인합니다.</li>
          </ul>
        </section>

        <section id="contact" class="privacy-section privacy-contact-section">
          <span class="privacy-section-number">08</span>
          <h2>문의 및 변경 고지</h2>
          <p>
            개인정보 처리와 관련한 문의, 삭제 요청, 권리 행사 요청은 아래 이메일로 연락해 주세요.
            개인정보처리방침이 변경되는 경우 이 페이지를 통해 변경 내용을 고지합니다.
          </p>
          <div class="privacy-contact-card">
            <div>
              <strong>개인정보 문의</strong>
              <span>처리방침, 삭제 요청, 확장 프로그램 데이터 처리 문의</span>
            </div>
            <div class="privacy-contact-links">
              <a href="mailto:qkralsrb4407@naver.com">qkralsrb4407@naver.com</a>
              <a href="mailto:eunjaelee058@gmail.com">eunjaelee058@gmail.com</a>
            </div>
          </div>
        </section>
      </div>
    </section>
  </main>
</template>

<style scoped>
.privacy-page {
  background:
    radial-gradient(circle at top left, rgba(79, 70, 229, 0.10), transparent 32rem),
    linear-gradient(180deg, #ffffff 0%, var(--bg) 28rem);
  color: var(--ink);
  min-height: 100vh;
  padding: 0 20px 72px;
}

.privacy-header,
.privacy-hero,
.privacy-layout {
  margin: 0 auto;
  max-width: 1120px;
}

.privacy-header {
  align-items: center;
  display: flex;
  justify-content: space-between;
  min-height: 76px;
}

.privacy-brand {
  align-items: center;
  display: inline-flex;
}

.privacy-brand img {
  display: block;
  height: 38px;
  width: auto;
}

.privacy-login-link {
  align-items: center;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 8px;
  color: var(--text);
  display: inline-flex;
  font-size: 14px;
  font-weight: 900;
  min-height: 40px;
  padding: 0 16px;
  transition: border-color 120ms ease, color 120ms ease, transform 120ms ease;
}

.privacy-login-link:hover,
.privacy-login-link:focus-visible {
  border-color: var(--blue-line);
  color: var(--blue);
  transform: translateY(-1px);
}

.privacy-hero {
  display: grid;
  gap: 32px;
  grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
  padding: 56px 0 44px;
}

.privacy-hero-copy {
  align-self: center;
}

.privacy-eyebrow {
  color: var(--blue);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0;
  margin: 0 0 16px;
}

.privacy-hero h1 {
  font-size: clamp(34px, 5vw, 54px);
  font-weight: 900;
  letter-spacing: 0;
  line-height: 1.12;
  margin: 0 0 18px;
}

.privacy-hero-copy > p {
  color: var(--text);
  font-size: 18px;
  font-weight: 600;
  line-height: 1.75;
  margin: 0;
  max-width: 680px;
}

.privacy-fact-grid {
  align-self: stretch;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid var(--line);
  border-radius: 8px;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
  display: grid;
  gap: 0;
  margin: 0;
  overflow: hidden;
}

.privacy-fact-grid div {
  border-bottom: 1px solid var(--line);
  padding: 18px 20px;
}

.privacy-fact-grid div:last-child {
  border-bottom: 0;
}

.privacy-fact-grid dt {
  color: var(--muted);
  font-size: 12px;
  font-weight: 900;
  margin: 0 0 8px;
}

.privacy-fact-grid dd {
  color: var(--ink);
  font-size: 15px;
  font-weight: 900;
  line-height: 1.5;
  margin: 0;
}

.privacy-fact-grid a,
.privacy-document a {
  color: var(--blue);
  font-weight: 900;
  text-decoration: underline;
  text-decoration-color: rgba(79, 70, 229, 0.28);
  text-underline-offset: 3px;
}

.privacy-layout {
  align-items: start;
  display: grid;
  gap: 28px;
  grid-template-columns: 240px minmax(0, 1fr);
  min-width: 0;
}

.privacy-toc {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  padding: 20px;
  position: sticky;
  top: 24px;
}

.privacy-toc strong {
  display: block;
  font-size: 14px;
  font-weight: 900;
  margin-bottom: 12px;
}

.privacy-toc nav {
  display: grid;
  gap: 4px;
}

.privacy-toc a {
  border-radius: 6px;
  color: var(--muted);
  font-size: 14px;
  font-weight: 800;
  padding: 8px 10px;
}

.privacy-toc a:hover,
.privacy-toc a:focus-visible {
  background: var(--blue-soft);
  color: var(--blue);
}

.privacy-document {
  display: grid;
  gap: 18px;
  min-width: 0;
}

.privacy-section {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  min-width: 0;
  padding: 32px;
  scroll-margin-top: 24px;
}

.privacy-section-highlight {
  border-color: var(--blue-line);
  box-shadow: 0 24px 70px rgba(79, 70, 229, 0.12);
}

.privacy-section-number {
  color: var(--blue);
  display: block;
  font-size: 12px;
  font-weight: 900;
  margin-bottom: 10px;
}

.privacy-section h2 {
  color: var(--ink);
  font-size: 22px;
  font-weight: 900;
  letter-spacing: 0;
  line-height: 1.35;
  margin: 0 0 14px;
}

.privacy-section h3 {
  color: var(--ink);
  font-size: 17px;
  font-weight: 900;
  letter-spacing: 0;
  margin: 0 0 8px;
}

.privacy-section p,
.privacy-section li,
.privacy-table td {
  color: var(--text);
  font-size: 15px;
  font-weight: 500;
  line-height: 1.75;
}

.privacy-section p {
  margin: 0;
}

.privacy-principles,
.privacy-mini-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: 22px;
}

.privacy-principles article,
.privacy-mini-grid article {
  background: var(--surface-soft);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 18px;
}

.privacy-principles strong {
  color: var(--ink);
  display: block;
  font-size: 15px;
  font-weight: 900;
  margin-bottom: 8px;
}

.privacy-principles p,
.privacy-mini-grid p {
  font-size: 14px;
  line-height: 1.65;
}

.privacy-table-wrap {
  border: 1px solid var(--line);
  border-radius: 8px;
  margin-top: 20px;
  max-width: 100%;
  overflow-x: auto;
}

.privacy-table {
  border-collapse: collapse;
  min-width: 720px;
  width: 100%;
}

.privacy-table th,
.privacy-table td {
  border-bottom: 1px solid var(--line);
  padding: 16px;
  text-align: left;
  vertical-align: top;
}

.privacy-table thead th {
  background: var(--surface-soft);
  color: var(--muted);
  font-size: 12px;
  font-weight: 900;
}

.privacy-table tbody th {
  color: var(--ink);
  font-size: 14px;
  font-weight: 900;
  width: 120px;
}

.privacy-table tbody tr:last-child th,
.privacy-table tbody tr:last-child td {
  border-bottom: 0;
}

.privacy-check-list {
  display: grid;
  gap: 10px;
  list-style: none;
  margin: 20px 0 0;
  padding: 0;
}

.privacy-check-list li {
  background: var(--surface-soft);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 14px 16px;
}

.privacy-contact-card {
  align-items: center;
  background: var(--ink);
  border-radius: 8px;
  color: #ffffff;
  display: flex;
  gap: 20px;
  justify-content: space-between;
  margin-top: 22px;
  padding: 22px;
}

.privacy-contact-card strong,
.privacy-contact-card span {
  display: block;
}

.privacy-contact-card strong {
  font-size: 17px;
  font-weight: 900;
  margin-bottom: 6px;
}

.privacy-contact-card span {
  color: #cbd5e1;
  font-size: 14px;
  line-height: 1.6;
}

.privacy-contact-links {
  display: grid;
  flex: 0 0 auto;
  gap: 8px;
}

.privacy-contact-links a {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 8px;
  color: #ffffff;
  padding: 10px 12px;
  text-decoration: none;
}

@media (max-width: 980px) {
  .privacy-hero,
  .privacy-layout {
    grid-template-columns: 1fr;
  }

  .privacy-toc {
    position: static;
  }

  .privacy-toc nav {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .privacy-principles,
  .privacy-mini-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .privacy-page {
    padding: 0 14px 48px;
  }

  .privacy-header {
    min-height: 68px;
  }

  .privacy-brand img {
    height: 32px;
  }

  .privacy-login-link {
    font-size: 13px;
    min-height: 36px;
    padding: 0 12px;
  }

  .privacy-hero {
    gap: 22px;
    padding: 32px 0;
  }

  .privacy-hero-copy > p {
    font-size: 16px;
  }

  .privacy-section {
    padding: 24px 18px;
  }

  .privacy-toc {
    padding: 16px;
  }

  .privacy-toc nav {
    grid-template-columns: 1fr;
  }

  .privacy-contact-card {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
