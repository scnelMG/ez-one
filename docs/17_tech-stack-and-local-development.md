# 17. 기술 스택 및 로컬 개발 기준

이 문서는 EZ-ONE의 구현 기준 기술 스택과 로컬 개발 기준을 정의한다.

기술 선택이 다른 문서와 충돌하면 이 문서를 우선 확인하고, 요구사항 범위 충돌은 [04. 요구사항 정의서](./04_requirements.md)를 우선한다.

## 확정 기술 스택

| 영역 | 기술 | 사용 기준 |
| --- | --- | --- |
| Backend | Spring Boot, Spring MVC | REST API, 인증/인가, 외부 연동, 비즈니스 로직 |
| Backend Security | Spring Security, JWT | Google 로그인 후 access/refresh token 기반 인증 |
| Persistence | MyBatis | SQL 명시성이 필요한 도메인 조회/저장 |
| Frontend | Vue 3, Vite | 사용자 웹 애플리케이션 |
| Frontend State/Route | Vue Router, Pinia, Axios | 라우팅, 전역 상태, API client |
| Extension | Chrome Extension | 공고 추출, 미리보기, 장바구니 저장 |
| Database | MySQL | 사용자, 공고, 워크스페이스, 서류 입력 정보, 동기화 데이터 |
| External | Google OAuth2, Notion API | 로그인, `JOB_ONLY` 자동 동기화 |
| Deploy | AWS EC2 | 초기 단일 서버 배포 기준 |

## 보류 / 추후 결정

| 항목 | 현재 결정 | 재검토 시점 |
| --- | --- | --- |
| DB migration tool | 보류. 초기에는 ERD와 SQL 파일 기준으로 관리 | 첫 배포 전 또는 협업 DB를 공유하기 전 |
| Flyway | 후보 도구로만 유지. 현재 확정 스택 아님 | schema 변경 이력 관리가 필요해질 때 |
| Spring Batch | P1 필수 아님 | 마감 상태 전환이나 주기 작업이 실제 요구사항으로 확정될 때 |
| Spring AI | P1/P2 제외 | AI 요약, 평가, 추천 보조가 승인된 뒤 |
| ChatBot | P1/P2 제외 | 내부 AI 실행 또는 상담 기능이 승인된 뒤 |

## 학습 기술 반영 기준

사용자가 학습했거나 학습 예정인 기술은 아래 기준으로만 반영한다. 학습 목록이 곧 프로젝트 스택을 의미하지 않는다.

| 학습/사용 가능 기술 | 반영 기준 |
| --- | --- |
| Framework intro, DI | Spring Boot 기본 구조에서 자연스럽게 사용 |
| AOP | 인증, 로깅, 예외 공통 처리 등 반복 횡단 관심사가 생길 때 제한적으로 사용 |
| MVC1, MVC2 | 개념 학습 범위. 구현은 Spring MVC REST API 기준 |
| Spring Boot, Spring MVC, REST API | Backend 기본 구조로 사용 |
| Interceptor | 인증/인가 흐름은 Spring Security를 우선하고, 요청 공통 처리 필요 시 검토 |
| MyBatis, 동적쿼리 | DB 접근 기본 방식으로 사용 |
| Spring Security, JWT | 로그인, 인증, 인가 기본 방식 |
| Vue, SFC | Frontend 컴포넌트 기본 구조 |
| Vue Router, Pinia, Axios | 화면 이동, 상태 관리, 서버 연동 기본 방식 |

## 도입 금지 / 승인 필요

아래 기술은 현재 P1 구현 기준이 아니다. 도입하려면 요구사항, API, DB, 테스트 문서를 함께 갱신하고 사용자 승인을 받는다.

| 기술 | 기준 |
| --- | --- |
| JPA | 현재 persistence 기준은 MyBatis |
| React, Next.js | 현재 frontend 기준은 Vue 3 |
| Django, FastAPI, Node.js backend | 현재 backend 기준은 Spring Boot |
| Redis | P1은 DB 기반 refresh token/session 관리로 시작 |
| S3 | 파일 업로드/이미지 저장 요구사항 확정 전에는 도입하지 않음 |
| 별도 AI 서버 | AI 기능 승인 및 운영 기준 확정 전에는 도입하지 않음 |
| Elasticsearch/OpenSearch | 검색 규모와 운영 필요성이 확인된 뒤 검토 |

## 로컬 개발 기준

| 항목 | 기준 |
| --- | --- |
| Backend port | `8080` |
| Frontend port | `5173` |
| MySQL port | `3306` |
| Backend env | `backend/.env.example` |
| Frontend env | `frontend/.env.example` |
| Extension env | `extension/.env.example` |
| DB schema source | [12. ERD](./12_erd.md) |

Local Chrome extension testing uses the fixed unpacked extension ID `ikpeibohnopmikegoogggmdipmhmiadi`, derived from `extension/public/manifest.json` `key`. `frontend/.env.example` includes the same value, and `/extension/connect` falls back to it when `VITE_EXTENSION_ID` is not provided.

## 초기 명령어 기준

앱 scaffolding 이후 각 앱 README에 실제 명령어를 확정한다.

| App | 명령어 그룹 |
| --- | --- |
| Backend | build, test, run |
| Frontend | install, dev, build, test |
| Extension | install, build, package |

## DB 변경 관리

초기 개발 단계에서는 [12. ERD](./12_erd.md)를 기준으로 schema를 관리하고, 필요한 SQL은 구현 단계에서 명시적인 파일로 남긴다.

Flyway는 당장 도입하지 않는다. 첫 배포 전 또는 여러 개발자가 같은 DB schema를 공유하기 전에 migration 도구 도입 여부를 다시 결정한다.

예상 SQL 관리 경로는 migration 도구 확정 전까지 보류한다.

## 운영 원칙

- P1 구현은 확정 기술 스택 안에서 시작한다.
- P2/P3 기능을 위해 미리 별도 서버, 캐시, AI 인프라를 도입하지 않는다.
- 외부 연동 실패는 핵심 DB 저장 흐름을 롤백하지 않는다.
- 새로운 기술 도입은 요구사항 ID, 도입 이유, 대체안, 테스트 기준을 남긴 뒤 결정한다.

## Frontend Language Boundary

Frontend and extension code must be implemented with JavaScript and Vue SFC. TypeScript, `tsconfig`, `tsc`, and `vue-tsc` are not part of the approved P1 stack unless the user explicitly approves a stack change.
