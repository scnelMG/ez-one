# EZ-ONE

<p align="center">
  <img src="./docs/assets/brand/ez-one-readme-logo.png" alt="EZ-ONE" width="520" />
</p>

<p align="center">
  <strong>채용 공고 저장부터 자기소개서 준비까지 한곳에서 관리하는 취업 준비 워크스페이스</strong>
</p>

## 프로젝트 소개

EZ-ONE은 취업 준비자가 여러 채용 공고와 지원 준비 과정을 공고 단위로 관리할 수 있도록 만든 서비스입니다.

사용자는 관심 공고를 저장하고, 공고별 워크스페이스에서 자기소개서 문항, 초안, 참고자료, 기업 정보, 반복 입력하는 서류 정보를 함께 관리할 수 있습니다. Chrome Extension은 지원 사이트에서 공고를 빠르게 저장하고, 저장된 문서 프로필을 지원 페이지 입력 보조에 사용할 수 있게 합니다.

## P1 사용자 흐름

```text
Google login -> onboarding -> main -> job save -> basket -> workspace
-> essay/reference/document profile -> Notion JOB_ONLY sync
```

현재 배포 준비 기준은 위 P1 흐름입니다. 문서에 남아 있는 P2/IA 기능은 명시적으로 승인되기 전까지 운영 기능으로 홍보하거나 활성화하지 않습니다.

## 주요 기능

| 영역 | 내용 |
| --- | --- |
| 인증/계정 | Google OAuth 로그인, JWT access token, HttpOnly refresh cookie, 로그아웃, 현재 사용자 조회/수정 |
| 온보딩/마이페이지 | 희망 직무, 기업 유형, 역량, 기술 스택, SSAFY 여부 등 사용자 프로필 관리 |
| 메인 대시보드 | 지원 현황 요약, 상태 카드, 작성 중 지원서, 공고 바구니 이동 |
| 공고 바구니 | 직접 입력 또는 Chrome Extension으로 저장한 공고 목록, 검색/정렬/상태 변경, 삭제/복구 |
| 워크스페이스 | 공고 기본 정보, 자기소개서 문항/초안, 자동 저장, 버전 생성/비교 |
| 참고자료 | JD, 뉴스, DART, 인재상, 자유 메모 등 공고별 참고자료 CRUD |
| 문서 프로필 | 기본 정보, 학력, 경력, 프로젝트, 자격증, 수상/교육 등 반복 입력 정보 관리 |
| Chrome Extension | 지원 사이트 공고 추출, 미리보기, 직무 선택, 공고 저장, 로그인 오류 안내 |
| Extension 입력 보조 | 저장된 문서 프로필을 지원 페이지 입력칸에 사용자가 실행하는 방식으로 자동 입력 |
| Notion 연동 | Notion OAuth 연결, `JOB_ONLY` 범위 공고 동기화, 동기화 로그 |

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| Backend | Spring Boot, Spring MVC, Spring Security, JWT, MyBatis |
| Frontend | Vue 3, Vite, Vue Router, Pinia, Axios |
| Extension | Chrome Extension, Vite |
| Database | MySQL, Flyway |
| External | Google OAuth2, Notion API |
| Deploy | AWS EC2, Nginx, systemd |

## 저장소 구조

| 경로 | 설명 |
| --- | --- |
| `backend/` | Spring Boot REST API, 인증/인가, MyBatis mapper, 외부 API 연동 |
| `frontend/` | Vue 3 앱, 라우터, Pinia store, API client, 화면 컴포넌트 |
| `extension/` | Chrome Extension popup, content script, 공고 추출과 입력 보조 |
| `docs/` | 요구사항, 화면 설계, API 명세, ERD, 테스트 계획, 릴리즈 문서 |
| `infra/` | EC2, systemd, Nginx 배포/운영 설정 |
| `scripts/` | 로컬 검증, 보안/환경 검사, artifact packaging, deploy/rollback/canary 보조 스크립트 |

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

빌드 후 Chrome에서 `chrome://extensions`를 열고 개발자 모드를 켠 뒤 `extension/dist`를 로드합니다. 운영 배포용 zip은 `npm run package` 또는 릴리즈 artifact packaging 스크립트로 만듭니다.

## 검증

배포 전 전체 로컬 릴리즈 게이트:

```powershell
.\scripts\release-local-gate.ps1
```

빠른 정적/계약 검사만 확인할 때:

```powershell
.\scripts\release-local-gate.ps1 -SkipSlow
```

릴리즈 준비 현황은 [docs/38_release-readiness-qa.md](./docs/38_release-readiness-qa.md)에 정리합니다.

## 배포

처음 배포하는 경우 한국어 실행본인 [docs/42_first-deployment-ko.md](./docs/42_first-deployment-ko.md)를 먼저 따라갑니다. 영문 보조 가이드는 [docs/41_beginner-deployment-guide.md](./docs/41_beginner-deployment-guide.md), 실제 Go/No-go 기준과 증거 체크리스트는 [docs/39_production-deployment-runbook.md](./docs/39_production-deployment-runbook.md)를 기준으로 합니다.

배포 순서:

1. AWS EC2, Elastic IP, DNS, HTTPS 인증서를 준비합니다.
2. 운영 env 파일을 만들고 production policy를 검증합니다.
3. 전체 로컬 릴리즈 게이트를 통과시킵니다.
4. MySQL 백업을 만들고 staging/restored DB에서 restore와 Flyway migration을 리허설합니다.
5. backend/frontend/extension release artifact를 만듭니다.
6. artifact와 backend env 파일을 EC2에 업로드합니다.
7. EC2 deploy dry-run으로 checksum, 경로, systemd/Nginx 동작을 확인합니다.
8. `DRY_RUN=false`로 실제 배포합니다.
9. 실제 사용자 smoke test를 수행합니다.
10. 30분 canary를 실행합니다.
11. release evidence를 채우고 Go/No-go를 결정합니다.

핵심 명령:

```powershell
.\scripts\check-prod-env.ps1 -EnvFile .\secrets\ez-one.prod.env
.\scripts\check-client-prod-env.ps1 -FrontendEnvFile .\secrets\frontend.prod.env -ExtensionEnvFile .\secrets\extension.prod.env
.\scripts\package-release-artifacts.ps1 -ReleaseId <release-id> -FrontendEnvFile .\secrets\frontend.prod.env -ExtensionEnvFile .\secrets\extension.prod.env
.\scripts\run-release-canary.ps1 -BaseUrl https://ez-one.kr -AccessToken <canary-access-token> -WorkspaceId <workspace-id> -RequireWorkspace
.\scripts\new-release-evidence.ps1 -ReleaseId <release-id> -Owner <owner-name> -LocalGateLog .\.codex-run-logs\release-local-gate-full-<timestamp>.log
.\scripts\show-release-evidence-gaps.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json
.\scripts\check-release-evidence.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json
```

`show-release-evidence-gaps.ps1` prints `Suggested evidence examples`,
`First next command`, and `Suggested next commands` so the next missing release
gate starts with one actionable command.

## 범위와 제한

- P1 핵심 루프는 `login -> onboarding -> main -> job save -> basket -> workspace -> essay/reference/document profile -> Notion JOB_ONLY sync`입니다.
- P2/P3 기능은 문서나 IA에 남아 있어도 사용자에게 활성 P1 기능으로 홍보하지 않습니다.
- 실제 `.env`, token, OAuth secret, API key, 개인 데이터는 저장소에 포함하지 않습니다.
- 외부 연동 실패는 핵심 DB 저장 트랜잭션을 롤백하지 않도록 분리합니다.
- 운영 배포 완료는 로컬 테스트만으로 선언하지 않습니다. EC2, DB rehearsal, 실제 smoke test, canary, release evidence가 모두 필요합니다.

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
| 기술 스택/로컬 개발 | [docs/17_tech-stack-and-local-development.md](./docs/17_tech-stack-and-local-development.md) |
| 첫 배포 한국어 실행 가이드 | [docs/42_first-deployment-ko.md](./docs/42_first-deployment-ko.md) |
| 배포 초보자 가이드 | [docs/41_beginner-deployment-guide.md](./docs/41_beginner-deployment-guide.md) |
| 운영 배포 런북 | [docs/39_production-deployment-runbook.md](./docs/39_production-deployment-runbook.md) |
