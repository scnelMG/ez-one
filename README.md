# EZ-ONE

<p align="center">
  <img src="./docs/assets/brand/ez-one-readme-logo.png" alt="EZ-ONE" width="520" />
</p>

<p align="center">
  <strong>채용 공고 저장부터 자기소개서 준비까지 한곳에서 관리하는 취업 준비 워크스페이스</strong>
</p>

[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-Backend-6DB33F?logo=springboot&logoColor=white)](./backend)
[![Vue](https://img.shields.io/badge/Vue%203-Frontend-4FC08D?logo=vuedotjs&logoColor=white)](./frontend)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)](./extension)
[![Portfolio](https://img.shields.io/badge/Portfolio-Service%20Project-2ea44f)](./docs/37_final-submission-report.md)

## 프로젝트 소개

EZ-ONE은 취업 준비자가 여러 채용 공고와 지원 준비 과정을 공고 단위로 관리할 수 있도록 만든 웹 서비스입니다.

사용자는 관심 공고를 저장하고, 공고별 워크스페이스에서 자기소개서 문항, 초안, 참고자료, 기업 정보, 반복 입력하는 서류 정보를 함께 관리할 수 있습니다. Chrome Extension으로 공고를 빠르게 저장하고, 선택한 공고 정보는 Notion에 `JOB_ONLY` 범위로 동기화할 수 있습니다.

이 저장소는 최종 제출 기능, 아키텍처, 요구사항 추적, 테스트 근거, 발표 자료를 함께 확인할 수 있도록 정리한 포트폴리오 버전입니다.

## 포트폴리오 리뷰 경로

| 먼저 볼 것 | 확인할 내용 |
| --- | --- |
| [docs/presentations/ez-one-final-presentation.pdf](./docs/presentations/ez-one-final-presentation.pdf) | 프로젝트 문제 정의, 서비스 흐름, 최종 발표 요약 |
| [docs/37_final-submission-report.md](./docs/37_final-submission-report.md) | 최종 제출 범위, 구현 결과, 검증 요약 |
| [docs/16_system-architecture.md](./docs/16_system-architecture.md) | 백엔드, 프론트엔드, 확장 프로그램, 외부 API 연동 구조 |
| [docs/13_api-spec.md](./docs/13_api-spec.md) | REST API 명세와 요청/응답 구조 |
| [docs/23_traceability.md](./docs/23_traceability.md) | 요구사항과 구현/검증 산출물 연결 |

## 직무 연결점

- **은행 IT / 디지털**: 사용자 업무 흐름을 공고 단위 workspace로 구조화하고, 인증, 데이터 저장, 외부 서비스 연동을 포함한 웹 서비스를 구현했습니다.
- **금융권 데이터·서비스 개발**: OpenDART와 금융위원회 기업기본정보를 활용해 기업 참고자료를 보강하는 흐름을 설계했습니다.
- **공기업 전산직**: 요구사항, API 명세, ERD, 테스트 계획, 추적성 문서까지 남겨 협업과 운영 관점의 산출물을 정리했습니다.

## 발표 자료

| 자료 | 설명 |
| --- | --- |
| [최종 발표 PDF](./docs/presentations/ez-one-final-presentation.pdf) | GitHub에서 바로 열어볼 수 있는 발표 자료 |
| [최종 발표 PPTX](./docs/presentations/ez-one-final-presentation.pptx) | 편집 가능한 원본 발표 파일 |

## 핵심 사용자 흐름

```text
Google 로그인
-> 온보딩
-> 메인 대시보드
-> 공고 저장
-> 공고함
-> 지원 워크스페이스
-> 자기소개서/참고자료/서류 입력 정보 관리
-> Notion JOB_ONLY 동기화
```

## 주요 기능

| 영역 | 구현 내용 |
| --- | --- |
| 인증/계정 | 이메일 회원가입/로그인, Google OAuth 로그인, JWT 발급/재발급/로그아웃, 현재 사용자 조회/수정 |
| 온보딩/마이페이지 | 희망 직무, 기업 유형, 산업, 지역, 기술스택, SSAFY 여부 저장 및 수정, 프로필/FAQ/약관 화면 |
| 메인 대시보드 | 지원 현황 요약, 상태 카드 이동, 작성 중 지원서, 취업 스터디 카드, 공고 장바구니 이동 |
| 공고함 | 직접 입력/확장 프로그램 저장 공고 목록, 검색, 정렬, 상태 필터, 상태 변경, 상세 화면, 삭제/보관 |
| 지원 워크스페이스 | 공고 기본 정보, 회사 정보, 자기소개서 문항/초안, 자동 저장, 버전 생성/비교 |
| 참고자료 | JD, 뉴스, DART, 인재상, 자유 메모 등 공고별 참고자료 생성/조회/수정/삭제 |
| 서류 입력 정보 | 기본 정보, 학력, 경력, 프로젝트, 자격증, 수상/교육, 커스텀 항목 관리 |
| Chrome Extension | Jasoseol.com 공고 추출, 미리보기, 직무 선택, 공고 저장, 로그인/오류 안내 |
| Extension 입력 보조 | 저장된 서류 입력 정보를 현재 지원 페이지 입력칸에 사용자 실행 방식으로 채움 |
| Notion 연동 | Notion OAuth 연결, `JOB_ONLY` 동기화 설정, 저장 공고 동기화, 동기화 로그 |
| 확장 구현 | 과거 지원 이력, 취업 스터디, SSAFY Mattermost 추천 공고, DART 참고자료 보조, 기업 정보 보강 |

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| Backend | Spring Boot, Spring MVC, Spring Security, JWT, MyBatis |
| Frontend | Vue 3, Vite, Vue Router, Pinia, Axios |
| Extension | Chrome Extension, Vite |
| Database | MySQL, Flyway |
| External | Google OAuth2, Notion API, OpenDART, 금융위원회 기업기본정보, Mattermost, GMS/OpenAI-compatible API |
| Deploy | AWS EC2 |

## 저장소 구조

| 경로 | 설명 |
| --- | --- |
| `backend/` | Spring Boot REST API, 인증/인가, MyBatis mapper, 외부 API 연동 |
| `frontend/` | Vue 3 웹 앱, 라우터, Pinia store, API client, 화면 컴포넌트 |
| `extension/` | Chrome Extension popup, content script, 공고 추출과 입력 보조 |
| `docs/` | 요구사항, 화면 설계, API 명세, ERD, 테스트 계획, 최종 제출 보고서, 발표 자료 |
| `infra/` | 배포와 운영 관련 설정 |
| `tools/` | 로컬 개발, 데이터 수집, 검증 보조 스크립트 |

## 로컬 실행

### Backend

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

### Chrome Extension

```powershell
cd extension
npm install
npm run build
```

빌드 후 Chrome의 `chrome://extensions`에서 개발자 모드를 켜고 `extension/dist`를 로드합니다.

## 검증

2026-06-25 제출 직전 기준으로 아래 검증을 통과했습니다.

| 영역 | 명령 | 결과 |
| --- | --- | --- |
| Backend | `cd backend; .\mvnw.cmd test` | PASS: Tests run 225, Failures 0, Errors 0, Skipped 2 |
| Frontend | `cd frontend; npm test` | PASS: 39 test files, 243 tests |
| Frontend | `cd frontend; npm run build` | PASS |
| Extension | `cd extension; npm test` | PASS: 16 test files, 316 tests |
| Extension | `cd extension; npm run build` | PASS |

## 범위와 제한

- 최종 제출 기능은 [최종 제출 보고서](./docs/37_final-submission-report.md)를 기준으로 봅니다.
- `docs/04_requirements.md`에는 P1/P2/P3 백로그가 함께 남아 있으므로, 모든 행이 최종 제출 기능이라는 뜻은 아닙니다.
- 알림 센터, 외부 캘린더 연동, 관리자 운영 화면, 자소서/참고자료까지 포함하는 확장 Notion 동기화는 제출 범위에서 제외했습니다.
- AI/DART/추천 보조 결과는 사용자가 확인해야 하며, 자기소개서나 외부 지원서에 자동 확정 반영하지 않습니다.
- 실제 `.env`, token, OAuth secret, API key는 저장소와 제출물에 포함하지 않습니다. 실행 환경에서는 각 모듈의 `.env.example`을 기준으로 값을 설정해야 합니다.

## 주요 문서

| 목적 | 문서 |
| --- | --- |
| 요구사항 | [docs/04_requirements.md](./docs/04_requirements.md) |
| 화면 설계 | [docs/09_screen-design.md](./docs/09_screen-design.md) |
| 기능 명세 | [docs/10_feature-spec.md](./docs/10_feature-spec.md) |
| ERD | [docs/12_erd.md](./docs/12_erd.md) |
| API 명세 | [docs/13_api-spec.md](./docs/13_api-spec.md) |
| 테스트 계획 | [docs/21_test-plan.md](./docs/21_test-plan.md) |
| 요구사항 추적 | [docs/23_traceability.md](./docs/23_traceability.md) |
| 최종 제출 보고서 | [docs/37_final-submission-report.md](./docs/37_final-submission-report.md) |
