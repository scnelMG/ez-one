# 17. 기술 스택과 로컬 개발 기준

이 문서는 EZ-ONE의 승인된 구현 스택, 로컬 개발 기준, 배포 전 운영 기준을 정의합니다. 요구사항 범위와 충돌하면 [04. 요구사항](./04_requirements.md)과 [23. 요구사항 추적](./23_traceability.md)을 우선합니다.

## 승인된 기술 스택

| 영역 | 기술 | 사용 기준 |
| --- | --- | --- |
| Backend | Spring Boot, Spring MVC | REST API, 인증/인가, 비즈니스 로직, 외부 API 연동 |
| Backend Security | Spring Security, JWT | Google OAuth login, short-lived access token, web HttpOnly refresh cookie, extension refresh token handoff |
| Persistence | MyBatis | SQL이 명시적으로 필요한 도메인 조회와 저장 |
| Frontend | Vue 3, Vite | 사용자 웹 애플리케이션 |
| Frontend State/Route | Vue Router, Pinia, Axios | 화면 이동, 전역 상태, API client |
| Extension | Chrome Extension, Vite | 공고 추출, 미리보기, 공고 저장, 문서 입력 보조 |
| Database | MySQL, Flyway | 사용자, 공고, 워크스페이스, 문서 프로필, 동기화 데이터 |
| External | Google OAuth2, Notion API | 로그인과 `JOB_ONLY` Notion sync |
| Deploy | AWS EC2, Nginx, systemd | 초기 단일 서버 운영 기준 |

## 도입 금지 또는 승인 필요 기술

아래 기술은 현재 P1 승인 스택이 아닙니다. 도입하려면 요구사항, API, DB, 테스트, 운영 문서를 함께 갱신하고 사용자 승인을 받아야 합니다.

| 기술 | 기준 |
| --- | --- |
| JPA | 현재 persistence 기준은 MyBatis |
| React, Next.js | 현재 frontend 기준은 Vue 3 |
| Django, FastAPI, Node.js backend | 현재 backend 기준은 Spring Boot |
| Redis | P1은 DB 기반 refresh/session 관리로 시작 |
| S3 | 파일 업로드/이미지 저장 요구사항 확정 전까지 도입하지 않음 |
| 별도 AI 서버 | AI 기능 범위와 운영 기준 확정 전까지 도입하지 않음 |
| Elasticsearch/OpenSearch | 검색 규모와 운영 필요성이 확인된 뒤 검토 |

## 로컬 개발 기준

| 항목 | 값 |
| --- | --- |
| Backend port | `8080` |
| Frontend port | `5173` |
| MySQL port | `3306` |
| Backend env example | `backend/.env.example` |
| Frontend env example | `frontend/.env.example` |
| Extension env example | `extension/.env.example` |
| DB schema source | [12. ERD](./12_erd.md), `backend/src/main/resources/db/migration` |

Local Chrome extension testing uses the fixed unpacked extension ID `ikpeibohnopmikegoogggmdipmhmiadi`, derived from `extension/public/manifest.json` `key`. `frontend/.env.example` includes the same value, and `/extension/connect` falls back to it when `VITE_EXTENSION_ID` is not provided.

Notion OAuth access tokens are stored only as AES-GCM ciphertext. `NOTION_TOKEN_ENCRYPTION_KEY` must be a Base64-encoded 32-byte key in backend environment configuration and must never be committed.

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
npm run build:local
```

Chrome에서 `chrome://extensions`를 열고 개발자 모드를 켠 뒤 `extension/dist`를 로드합니다. 운영 배포용 extension zip은 `npm run build` 또는 `scripts/package-release-artifacts.ps1` 경로로 만듭니다.

## 검증 명령

전체 로컬 릴리즈 게이트:

```powershell
.\scripts\release-local-gate.ps1
```

빠른 정적/계약 검사:

```powershell
.\scripts\release-local-gate.ps1 -SkipSlow
```

레이어별 직접 검증:

| App | 명령 |
| --- | --- |
| Backend tests | `cd backend; .\mvnw.cmd test` |
| Backend package | `cd backend; .\mvnw.cmd -DskipTests package` |
| Frontend audit | `cd frontend; npm audit --audit-level=moderate` |
| Frontend tests/build | `cd frontend; npm run test; npm run build` |
| Extension audit | `cd extension; npm audit --audit-level=moderate` |
| Extension tests/build | `cd extension; npm run test; npm run build; npm run build:local` |

## DB 변경 관리

Flyway is the active migration tool for backend schema changes. Only reviewed versioned migration files belong under `backend/src/main/resources/db/migration`.

운영 배포 전에는 반드시 MySQL 백업을 만들고, staging 또는 restored-backup DB에서 restore와 Flyway migration을 리허설합니다. 운영 DB에서 `-Apply`를 실행하는 경우에는 release 또는 incident owner의 명시적 승인이 필요합니다.

관련 문서:

- [12. ERD](./12_erd.md)
- [34. Database Migration Policy](./34_database-migration-policy.md)
- [39. Production Deployment Runbook](./39_production-deployment-runbook.md)
- [42. 첫 배포 한국어 실행 가이드](./42_first-deployment-ko.md)

## 운영 배포 기준

운영 배포는 아래 문서를 따릅니다.

| 목적 | 문서 |
| --- | --- |
| 첫 배포 한국어 실행 가이드 | [42. 첫 배포 한국어 실행 가이드](./42_first-deployment-ko.md) |
| 영문 초보자 배포 가이드 | [41. Beginner Deployment Guide](./41_beginner-deployment-guide.md) |
| 현업형 Go/No-go 런북 | [39. Production Deployment Runbook](./39_production-deployment-runbook.md) |
| 현재 QA와 배포 차단 항목 | [38. Release Readiness QA](./38_release-readiness-qa.md) |

운영 배포 최소 조건:

- `APP_ENV=prod`
- `SERVER_ADDRESS=127.0.0.1`
- `AUTH_LOCAL_DEV_TOKEN_ENABLED=false`
- `APP_DOCS_ENABLED=false`
- `AUTH_REFRESH_COOKIE_SECURE=true`
- exact HTTPS-only `CORS_ALLOWED_ORIGINS`
- 서로 다른 non-placeholder JWT access/refresh secrets
- Base64-encoded 32-byte `NOTION_TOKEN_ENCRYPTION_KEY`
- frontend/extension production env policy 검증 통과
- artifact에 local runtime URL 또는 localdev extension manifest가 없음
- MySQL backup, restore rehearsal, Flyway migration rehearsal evidence 확보
- EC2 deploy dry-run evidence 확보
- 실제 사용자 smoke test와 30분 canary evidence 확보
- release evidence 검증 통과

## 운영 원칙

- P1 구현은 승인된 스택 안에서 시작합니다.
- P2/P3 기능을 위해 별도 서버, 캐시, AI 인프라를 미리 도입하지 않습니다.
- 외부 연동 실패는 핵심 DB 저장 트랜잭션을 롤백하지 않습니다.
- 새 기술 도입은 요구사항 ID, 도입 이유, 대안, 테스트 기준을 문서화한 뒤 결정합니다.
- 실제 `.env`, token, OAuth secret, API key, 개인 데이터는 저장소에 포함하지 않습니다.
- 운영 완료는 로컬 테스트만으로 선언하지 않습니다. EC2, DB rehearsal, 실제 smoke test, canary, release evidence가 모두 필요합니다.

## Frontend Language Boundary

Frontend and extension code must be implemented with JavaScript and Vue SFC. TypeScript, `tsconfig`, `tsc`, and `vue-tsc` are not part of the approved P1 stack unless the user explicitly approves a stack change.
