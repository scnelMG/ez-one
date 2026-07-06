<template>
  <main class="privacy-page" aria-labelledby="privacy-title">
    <section class="privacy-hero">
      <RouterLink class="privacy-brand" to="/" aria-label="EZ-ONE 메인">
        <img src="../assets/ez-one-logo-final.png" alt="EZ-ONE" />
      </RouterLink>
      <p class="privacy-eyebrow">개인정보처리방침</p>
      <h1 id="privacy-title">EZ-ONE 개인정보처리방침</h1>
      <p>
        EZ-ONE은 채용공고 저장, 지원 준비 워크스페이스, Chrome 확장 프로그램 기능을 제공하기 위해
        필요한 범위에서만 개인정보를 처리합니다.
      </p>
      <dl class="privacy-summary">
        <div>
          <dt>시행일</dt>
          <dd>2026년 7월 6일</dd>
        </div>
        <div>
          <dt>문의</dt>
          <dd><a href="mailto:qkralsrb4407@naver.com">qkralsrb4407@naver.com</a></dd>
        </div>
      </dl>
    </section>

    <section class="privacy-content" aria-label="개인정보 처리 세부 내용">
      <article>
        <h2>1. 처리하는 개인정보 항목</h2>
        <p>EZ-ONE은 서비스 제공에 필요한 다음 정보를 처리할 수 있습니다.</p>
        <ul>
          <li>계정 식별 정보: 이메일, 이름 또는 닉네임, 프로필 이미지, 로그인 제공자 정보</li>
          <li>지원 준비 정보: 저장한 채용공고, 회사명, 직무명, 마감일, 공고 URL, 지원 상태</li>
          <li>문서 프로필 정보: 사용자가 직접 입력한 기본 정보, 학력, 경력, 프로젝트, 자격증, 어학 등 지원서 작성 보조 정보</li>
          <li>워크스페이스 정보: 자기소개서 문항, 작성 내용, 참고자료, 작업 이력</li>
          <li>서비스 운영 정보: 접속 로그, 오류 로그, 인증 토큰 상태, 보안 및 장애 대응에 필요한 최소한의 기술 정보</li>
        </ul>
      </article>

      <article>
        <h2>2. 개인정보 처리 목적</h2>
        <ul>
          <li>회원 식별, 로그인 유지, 계정 보안 관리</li>
          <li>채용공고 저장, 장바구니, 워크스페이스, 문서 프로필 기능 제공</li>
          <li>Chrome 확장 프로그램과 EZ-ONE 계정 연결 및 공고 저장 기능 제공</li>
          <li>사용자가 직접 실행한 지원서 입력 보조 기능 제공</li>
          <li>오류 확인, 악용 방지, 서비스 안정성 개선</li>
        </ul>
      </article>

      <article>
        <h2>3. Chrome 확장 프로그램 데이터 처리</h2>
        <p>
          EZ-ONE Job Saver 확장 프로그램은 사용자가 직접 실행한 현재 탭에서만 동작합니다.
          지원되는 채용 사이트의 공고 정보 또는 지원서 입력 항목을 읽어 미리보기, 공고 저장,
          문서 프로필 기반 입력 보조를 제공합니다.
        </p>
        <ul>
          <li>확장 프로그램은 사용자의 명시적 실행 없이 공고를 저장하거나 지원서를 제출하지 않습니다.</li>
          <li>지원서 제출, 최종 지원, 임시저장 버튼을 자동으로 클릭하지 않습니다.</li>
          <li>브라우저 방문 기록 전체, 마우스 위치, 키 입력 로그를 추적하지 않습니다.</li>
          <li>확장 프로그램 로컬 저장소에는 로그인 상태, 인증 토큰, 사용자 정보, 패널 설정 등 기능 동작에 필요한 정보가 저장될 수 있습니다.</li>
        </ul>
      </article>

      <article>
        <h2>4. 보유 및 파기</h2>
        <p>
          개인정보는 계정 유지 및 서비스 제공 기간 동안 보관합니다. 사용자가 계정을 삭제하거나
          정보 삭제를 요청하면 관련 법령상 보관이 필요한 경우를 제외하고 지체 없이 파기합니다.
          보안, 장애 대응, 부정 이용 방지를 위한 로그는 필요한 최소 기간 동안 분리 보관할 수 있습니다.
        </p>
      </article>

      <article>
        <h2>5. 제3자 제공 및 외부 연동</h2>
        <p>
          EZ-ONE은 사용자의 개인정보를 판매하지 않으며, 서비스의 전용 목적과 무관한 제3자 제공을 하지 않습니다.
          사용자가 Notion 같은 외부 연동을 직접 연결한 경우에는 사용자가 요청한 동기화 범위 안에서만 필요한 정보가 전송됩니다.
        </p>
      </article>

      <article>
        <h2>6. 이용자의 권리</h2>
        <p>
          사용자는 본인의 정보를 조회, 수정, 삭제할 수 있으며 계정 삭제 또는 개인정보 처리 정지를 요청할 수 있습니다.
          요청은 아래 문의 이메일로 보낼 수 있습니다.
        </p>
      </article>

      <article>
        <h2>7. 안전성 확보 조치</h2>
        <ul>
          <li>HTTPS 통신과 인증 기반 접근 제어를 적용합니다.</li>
          <li>비밀번호, 토큰, 외부 API 키 같은 비밀값은 공개 저장소에 저장하지 않습니다.</li>
          <li>개인정보 접근 범위를 서비스 운영에 필요한 인원과 기능으로 제한합니다.</li>
          <li>오류와 보안 로그는 필요한 범위에서만 확인합니다.</li>
        </ul>
      </article>

      <article>
        <h2>8. 문의</h2>
        <p>
          개인정보 처리와 관련한 문의, 삭제 요청, 권리 행사 요청은 아래 이메일로 연락해 주세요.
        </p>
        <div class="privacy-contact">
          <a href="mailto:qkralsrb4407@naver.com">qkralsrb4407@naver.com</a>
          <a href="mailto:eunjaelee058@gmail.com">eunjaelee058@gmail.com</a>
        </div>
      </article>

      <article>
        <h2>9. 변경 고지</h2>
        <p>
          개인정보처리방침이 변경되는 경우 이 페이지를 통해 변경 내용을 고지합니다.
          중요한 변경 사항이 있을 때에는 서비스 화면 또는 이메일 등 적절한 방법으로 안내할 수 있습니다.
        </p>
      </article>
    </section>
  </main>
</template>

<style scoped>
.privacy-page {
  background: #f8fafc;
  color: #111827;
  min-height: 100vh;
  padding: 40px 20px 72px;
}

.privacy-hero,
.privacy-content {
  margin: 0 auto;
  max-width: 980px;
}

.privacy-hero {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.08);
  padding: 36px;
}

.privacy-brand {
  display: inline-flex;
  margin-bottom: 28px;
}

.privacy-brand img {
  display: block;
  height: 34px;
  width: auto;
}

.privacy-eyebrow {
  color: #5b42f3;
  font-size: 14px;
  font-weight: 800;
  margin: 0 0 12px;
}

.privacy-hero h1 {
  font-size: clamp(30px, 5vw, 48px);
  letter-spacing: 0;
  line-height: 1.16;
  margin: 0 0 16px;
}

.privacy-hero > p {
  color: #475569;
  font-size: 18px;
  line-height: 1.7;
  margin: 0;
  max-width: 760px;
}

.privacy-summary {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: 28px 0 0;
}

.privacy-summary div {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
}

.privacy-summary dt {
  color: #64748b;
  font-size: 13px;
  font-weight: 800;
  margin-bottom: 6px;
}

.privacy-summary dd {
  color: #111827;
  font-weight: 800;
  margin: 0;
}

.privacy-content {
  display: grid;
  gap: 16px;
  margin-top: 18px;
}

.privacy-content article {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 28px;
}

.privacy-content h2 {
  font-size: 20px;
  letter-spacing: 0;
  margin: 0 0 14px;
}

.privacy-content p,
.privacy-content li {
  color: #475569;
  font-size: 15px;
  line-height: 1.8;
}

.privacy-content p {
  margin: 0;
}

.privacy-content ul {
  margin: 0;
  padding-left: 20px;
}

.privacy-content p + ul {
  margin-top: 12px;
}

.privacy-contact {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.privacy-contact a,
.privacy-summary a {
  color: #4f46e5;
  font-weight: 800;
}

.privacy-contact a {
  background: #eef2ff;
  border: 1px solid #c7d2fe;
  border-radius: 8px;
  padding: 10px 12px;
  text-decoration: none;
}

@media (max-width: 720px) {
  .privacy-page {
    padding: 24px 14px 48px;
  }

  .privacy-hero,
  .privacy-content article {
    padding: 22px;
  }

  .privacy-summary {
    grid-template-columns: 1fr;
  }
}
</style>
