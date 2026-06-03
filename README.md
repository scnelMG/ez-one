# EZ One

<p align="center">
  <img src="./docs/assets/brand/ez-one-logo.svg" alt="EZ-ONE 로고" width="720" />
</p>

<p align="center">
  <strong>채용 공고 저장부터 자기소개서 작성, 참고자료 정리, 서류 정보 재사용까지 한 번에 관리하는 지원 준비 워크스페이스</strong>
</p>

## 프로젝트 소개

EZ One은 취업 준비자가 여러 채용 공고를 저장하고, 공고별 지원 준비 과정을 한 곳에서 이어갈 수 있도록 돕는 서비스입니다.

취업 준비 과정에서는 공고 링크, 마감일, 자기소개서 초안, 기업 참고자료, 반복 입력해야 하는 서류 정보가 여러 도구에 흩어지기 쉽습니다. EZ One은 이 정보를 공고 단위로 묶어, 사용자가 “어디까지 준비했는지”와 “다음에 무엇을 해야 하는지”를 놓치지 않게 만드는 것을 목표로 합니다.

## 현재 개발 상태

현재 저장소는 **개발 착수 전 스캐폴딩 단계**입니다.

- P1 구현 기준 문서가 준비되어 있습니다.
- 다음 단계는 `backend`, `frontend`, `extension` 앱 스캐폴딩입니다.
- 실제 설치, 실행, 테스트 명령은 스캐폴딩 후 각 앱 README에 정리합니다.

## 핵심 사용자 흐름

```text
Google login
-> onboarding
-> main
-> job save
-> basket
-> workspace
-> essay/reference/document profile
-> Notion JOB_ONLY sync
```

## 주요 기능

| 기능 | 설명 |
| --- | --- |
| 공고 저장 | 채용 공고를 저장하고 장바구니에서 상태와 마감일을 관리합니다. |
| 공고 장바구니 | 저장한 공고를 지원 상태, 마감일, 워크스페이스 진입점과 함께 확인합니다. |
| 지원 워크스페이스 | 공고별 자기소개서, 참고자료, 지원 정보를 한 화면에서 관리합니다. |
| 서류 입력 정보 | 기본정보, 학력, 경력, 프로젝트 등 반복 입력 정보를 재사용합니다. |
| Chrome Extension | 지원 사이트에서 공고 정보를 추출하고 미리보기 후 저장합니다. |
| 추천 공고 저장 | 추천 공고를 확인하고 장바구니에 저장합니다. |
| Notion 동기화 | P1에서는 저장 공고만 `JOB_ONLY` 범위로 Notion에 동기화합니다. |

## P1 범위

P1은 공고 저장 이후 지원 준비를 이어가는 핵심 루프에 집중합니다.

- Google 로그인과 온보딩
- 메인 대시보드와 공고 장바구니
- 공고 저장 및 워크스페이스 자동 생성
- 자기소개서 작성, 버전관리, 참고자료 관리
- 서류 입력 정보 관리
- Chrome Extension 기반 공고 저장
- Notion `JOB_ONLY` 동기화

다음 기능은 후속 범위로 분리합니다.

- 독립 알림 채널
- 캘린더/주간 마감일 보기
- 과거 지원 통계
- Mattermost 추천 수집
- 자동 참고자료 수집
- 서류 자동 입력 고도화
- AI/chatbot 기능

## 기술 스택

| 영역 | 스택 |
| --- | --- |
| Backend | Spring Boot, Spring MVC, Spring Security, JWT, MyBatis |
| Frontend | Vue 3, Vite, Vue Router, Pinia, Axios |
| Extension | Chrome Extension |
| Database | MySQL |
| External | Google OAuth2, Notion API |
| Deploy | AWS EC2 |

## 저장소 구조

| 경로 | 설명 |
| --- | --- |
| `backend/` | Spring Boot REST API, 인증/인가, DB, 외부 연동 |
| `frontend/` | Vue 3 웹 앱, 라우트, 페이지, 스토어, API 클라이언트 |
| `extension/` | Chrome Extension 팝업, 공고 추출, 미리보기, 저장 |
| `docs/` | 요구사항, 화면설계, API, ERD, 테스트 계획 등 구현 기준 문서 |
| `infra/` | 배포, 환경, 데이터베이스 설정, 운영 스크립트 |

## 문서

| 목적 | 문서 |
| --- | --- |
| 요구사항과 P1/P2/P3 범위 | [docs/04_requirements.md](./docs/04_requirements.md) |
| 화면/라우트/컴포넌트 기준 | [docs/09_screen-design.md](./docs/09_screen-design.md) |
| API 계약 | [docs/13_api-spec.md](./docs/13_api-spec.md) |
| DB 설계 | [docs/12_erd.md](./docs/12_erd.md) |
| 테스트 기준 | [docs/21_test-plan.md](./docs/21_test-plan.md) |
| 요구사항 추적표 | [docs/23_traceability.md](./docs/23_traceability.md) |
| 기여 규칙 | [CONTRIBUTING.md](./CONTRIBUTING.md) |
| AI 에이전트 작업 규칙 | [AGENTS.md](./AGENTS.md) |
