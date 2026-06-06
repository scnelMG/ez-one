# EZ-ONE

<p align="center">
  <img src="./docs/assets/brand/ez-one-logo.svg" alt="EZ-ONE 로고" width="560" />
</p>

<p align="center">
  <strong>채용 공고 저장부터 자기소개서 준비까지 한곳에서 관리하는 취업 준비 워크스페이스</strong>
</p>

## 프로젝트 소개

EZ-ONE은 취업 준비자가 여러 채용 공고와 지원 준비 과정을 공고 단위로 정리할 수 있도록 돕는 서비스입니다.

채용 공고를 저장하고, 마감일과 지원 상태를 확인하며, 공고별 워크스페이스에서 자기소개서와 참고자료를 함께 관리합니다. 반복해서 입력해야 하는 학력, 경력, 프로젝트, 자격증 같은 서류 정보도 한 번 정리해 재사용할 수 있습니다.

## 해결하려는 문제

취업 준비를 하다 보면 정보가 쉽게 흩어집니다.

- 공고 링크는 브라우저 북마크나 메신저에 흩어집니다.
- 마감일은 캘린더나 메모장에 따로 적게 됩니다.
- 자기소개서는 문서 파일마다 분리됩니다.
- 기업 조사, JD, 뉴스, DART 자료는 별도 탭과 메모 앱에 쌓입니다.
- 반복 입력해야 하는 서류 정보는 매번 다시 찾게 됩니다.

EZ-ONE은 이 흐름을 공고 중심으로 묶어, 어떤 공고를 저장했고 어디까지 준비했으며 다음에 무엇을 해야 하는지 한눈에 볼 수 있게 합니다.

## 핵심 사용자 흐름

```text
Google 로그인 -> 온보딩 -> 메인 -> 공고 저장 -> 공고함 -> 지원 워크스페이스 -> 자기소개서/참고자료/서류 정보 관리 -> Notion 동기화
```

## 주요 기능

| 기능 | 설명 |
| --- | --- |
| 공고 저장 | 관심 있는 채용 공고를 저장하고 중복 저장을 방지합니다. |
| 공고함 | 저장한 공고의 마감일, 지원 상태, 준비 현황을 관리합니다. |
| 지원 워크스페이스 | 공고별 자기소개서, 참고자료, 지원 메모를 한곳에서 관리합니다. |
| 서류 입력 정보 | 학력, 경력, 프로젝트, 자격증 등 반복 입력 정보를 정리해 재사용합니다. |
| 추천 공고 | 온보딩에서 입력한 선호 조건을 바탕으로 확인할 공고 후보를 보여줍니다. |
| Chrome Extension | 채용 사이트에서 공고 정보를 추출하고 미리보기 후 저장합니다. |
| Notion 동기화 | 저장한 공고 정보만 Notion으로 동기화합니다. |

## 현재 개발 상태

현재는 P1 제품 흐름을 기준으로 프론트 화면, 라우터, API 클라이언트, 로컬 QA용 폴백 데이터가 준비된 상태입니다.

P1 범위는 공고 저장, 공고함, 지원 워크스페이스, 서류 입력 정보, 추천 공고, Notion 공고 정보 동기화입니다. 알림, 캘린더 확장, 과거 지원 이력, 확장된 Notion 동기화는 P2 또는 예약 영역으로 둡니다.

자세한 구현 진행 기록은 [docs/18_wbs.md](./docs/18_wbs.md)와 [docs/24_development-start-checklist.md](./docs/24_development-start-checklist.md)를 참고합니다.

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
| `frontend/` | Vue 3 프론트엔드, 라우터, API 클라이언트, 상태 관리 |
| `extension/` | Chrome Extension 팝업, 공고 추출, 미리보기, 저장 |
| `docs/` | 요구사항, 화면 설계, API, ERD, 테스트 계획, 작업 문서 |
| `infra/` | 배포, 환경, 운영 스크립트 |

## 문서

| 목적 | 문서 |
| --- | --- |
| 요구사항 | [docs/04_requirements.md](./docs/04_requirements.md) |
| 전체 IA | [docs/08_information-architecture.md](./docs/08_information-architecture.md) |
| 화면 설계 | [docs/09_screen-design.md](./docs/09_screen-design.md) |
| 기능 명세 | [docs/10_feature-spec.md](./docs/10_feature-spec.md) |
| API 명세 | [docs/13_api-spec.md](./docs/13_api-spec.md) |
| DB 설계 | [docs/12_erd.md](./docs/12_erd.md) |
| 테스트 계획 | [docs/21_test-plan.md](./docs/21_test-plan.md) |
| 작업 계획 | [docs/18_wbs.md](./docs/18_wbs.md) |
| 협업 규칙 | [docs/30_team-collaboration-workflow.md](./docs/30_team-collaboration-workflow.md) |
