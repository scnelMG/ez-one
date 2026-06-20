# 23. 요구사항 추적표

기준 원본: Notion `23. 요구사항 추적표`

이 문서는 P1 요구사항이 유즈케이스, 화면, API, DB, 테스트와 연결되는지 확인하는 기준이다. User Flow는 전체 제품 흐름을 설명하고, P1 구현 판단은 이 추적표와 `docs/04_requirements.md`를 우선한다.

유즈케이스 기준 문서: `docs/07_use-case-specifications.md`

## P1 추적표

| 요구사항 | Use Case | 화면 | API | DB | 테스트 |
| --- | --- | --- | --- | --- | --- |
| AUTH-001 | UC-01 | 로그인 | `POST /api/auth/google`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/me`, `PATCH /api/me` | `users`, `user_sessions` | TC-AUTH-001~006 |
| ONB-001 | UC-02, UC-15 | 온보딩, 마이페이지 | `GET/PUT /api/me/profile` | `user_profiles` | TC-ONB-001, TC-ONB-002 |
| ONB-002 | UC-02 | 온보딩, 마이페이지 | `GET/PUT /api/me/profile` | `user_profiles` | TC-ONB-001 |
| DASH-001 | UC-03, UC-04 | 메인 대시보드, 장바구니 | `GET /api/dashboard/summary`, `GET /api/basket/jobs` | `basket_jobs`, `jobs` | TC-DASH-001 |
| JOB-001 | UC-06, UC-07 | 공고 장바구니 | `POST /api/basket/jobs`, `GET /api/basket/jobs` | `jobs`, `basket_jobs` | TC-JOB-001, TC-JOB-002 |
| JOB-002 | UC-06, UC-08 | 공고 장바구니, 워크스페이스 | `POST /api/basket/jobs`, `GET /api/workspaces/{id}` | `workspaces` | TC-JOB-001, TC-WS-001 |
| EXT-001 | UC-06 | Chrome Extension | `/api/extension/jobs/*` | `jobs`, `basket_jobs`, `workspaces` | TC-EXT-001, TC-EXT-002, TC-EXT-003, TC-EXT-004 |
| PROFILE-001 | UC-12, UC-13 | 서류 입력 정보 | `/api/document-profile/*` | `document_profile_sections`, `document_custom_fields` | TC-PROFILE-001, TC-PROFILE-CUSTOM-001 |
| WS-001 | UC-08 | 지원 워크스페이스 | `GET /api/workspaces/{id}` | `workspaces`, `basket_jobs`, `companies` | TC-WS-001 |
| WS-002 | UC-09 | 도화지 | `PATCH /api/workspaces/{id}/drafts/{draftId}` | `essay_drafts` | TC-WS-002, TC-WS-003 |
| WS-003 | UC-10 | 워크스페이스 기본값 | `GET /api/workspaces/{id}/defaults` | `document_profile_sections`, `document_custom_fields` | TC-WS-001 |
| WS-004 | UC-11 | 자소서 버전관리 | `/api/workspaces/{id}/versions*` | `essay_versions` | TC-WS-004 |
| REF-001 | UC-10 | 참고자료 | `GET/POST /api/workspaces/{id}/references` | `reference_materials` | TC-REF-001 |
| REF-002 | UC-10 | 참고자료 전체/패널 | `GET /api/references/{id}`, `GET /api/references/{id}/side-panel` | `reference_materials` | TC-REF-002 |
| NOTION-001 | UC-17 | Notion 설정/동기화 | `/api/integrations/notion/*` | `notion_connections`, `notion_sync_settings`, `sync_logs` | TC-NOTION-001, TC-NOTION-002, TC-NOTION-JOB-001 |

## P2 추적

| 요구사항 | 상태 |
| --- | --- |
| ALERT-001 | P2 예약. P1은 화면 내 상태 표시만 제공 |
| HISTORY-001 | P2 예약. IA에는 유지 |
| REC-002 | P2 예약. 기업 데이터 안정화 후 |
| MM-001 | Spring webhook raw 저장, 후보화, SSAFY 전용 추천 노출로 구현 |
| REF-003 | P2 예약. P1은 수동 입력 |
| EXT-002 | Should/P2. 서류 자동 입력 보조 고도화 |
| NOTION-002 | P2 예약. P1은 `JOB_ONLY` |
| ADMIN-001 | MVP 제외 |

## IA-only 항목

아래 항목은 IA와 화면설계서에는 존재하지만 아직 요구사항 ID가 없다. P1 구현 범위에서 제외한다.

| 항목 | 상태 |
| --- | --- |
| 장바구니 캘린더/주간 일정 | P2 후보. 요구사항 확정 전 구현 제외 |
| 고객지원 | P2 후보. 운영 범위 확정 전 구현 제외 |
## 2026-06-06 Traceability Addendum

| Requirement | Use Case | Surface | API | DB | Tests |
| --- | --- | --- | --- | --- | --- |
| EXT-008, JOB-021 | UC-06 | Chrome Extension job save | `POST /api/extension/jobs/preview`, `POST /api/extension/jobs/save` | `companies.logo_url`, `jobs`, `basket_jobs` | `extension/tests/jobExtractor.test.js`, `extension/tests/extensionJobApi.test.js`, `P1ApiContractTest` |
| JOB-016 | UC-08 | Basket and workspace company display | `GET /api/basket/jobs`, `GET /api/workspaces/{id}` | `companies.logo_url`, `companies.logo_source_url`, `companies.logo_status`, `companies.logo_updated_at` | `MyBatisP1WorkspaceServiceTest`, `P1ApiContractTest` |
| EXT-013, EXT-021, EXT-022, EXT-023, PROFILE-026 | UC-12, UC-13 | Extension document auto-fill | `GET /api/extension/document-profile` | `document_profile_sections`, `document_custom_fields` | `applicationAutoFill.test.js`, `extensionDocumentProfileApi.test.js`, `P1ApiContractTest` |
## 2026-06-16 History Traceability Update

| Requirement | Implementation | Verification |
| --- | --- | --- |
| `HISTORY-001` | `/history` route and nav entry; rows link to `/workspaces/{workspaceId}` | `router/index.test.js`, `AppLayout.test.js`, `PastHistoryPage.test.js` |
| `HISTORY-002` | Basket page exposes a `과거 지원 내역` link to `/history` | `BasketPage.test.js` |
| `HISTORY-003` | `GET /api/history/applications` and `PastHistoryPage` default full list with search and sorting on the loaded rows; archived basket jobs are snapshotted into history | `historyApi.test.js`, `PastHistoryPage.test.js`, `P1ApiContractTest` |
| `HISTORY-004`/`HISTORY-005` | `ALL` and `YYYY-H1`/`YYYY-H2` period options | `PastHistoryPage.test.js`, `P1ApiContractTest` |
| `HISTORY-006`/`HISTORY-007` | selected-period summary metrics use the standard status counts 지원완료, 미지원, 진행 중, 지원 전 | `PastHistoryPage.test.js`, `HistoryApplicationAssemblerTest`, `P1ApiContractTest` |
| `HISTORY-008` | company-type aggregation and table filters use explicit company/status/result labels | `PastHistoryPage.test.js`, `HistoryApplicationAssemblerTest`, `P1ApiContractTest` |
| `HISTORY-009`/`HISTORY-010` | intentionally not implemented | Out of scope |

## 2026-06-17 Study Security Traceability Update

| Requirement | Implementation | Verification |
| --- | --- | --- |
| Study active surface remediation | Study service requires membership for study read/write data access and leader role for invite/image upload | `StudyServiceAuthorizationTest` |
| Workspace ownership boundary | Shared essay creation validates `workspaceId` through the authenticated user's workspace access before insert | `StudyServiceAuthorizationTest` |
| Frontend rendering safety | Shared essay body uses text interpolation instead of raw HTML rendering | `StudyDetailPage.test.js` |

Study still needs a formal requirement ID if it remains an active product surface. Until then, this traceability entry documents a security remediation for existing active code rather than new P1 scope.

## 2026-06-18 Official Company Classification Traceability Update

| Requirement | Implementation | Verification |
| --- | --- | --- |
| `DATA-002`, `JOB-016`, `HISTORY-008` | Basket save/update checks the official company registry before internal fallback rules, writes official company type/profile data, and records source provenance in `company_profile_sources`. Existing history-linked companies are backfilled through `V31__backfill_official_company_classifications.sql`. | `MyBatisP1WorkspaceServiceTest` |
| `DATA-002`, `DATA-004`, `JOB-016`, `HISTORY-008` | Unknown companies saved from basket/recommendation/extension flows attempt realtime official API enrichment after the company row is linked. Successful matches write `REALTIME_OFFICIAL_API` profile data and source provenance; provider failures fall back without blocking save. | `MyBatisP1WorkspaceServiceTest` |

## 2026-06-19 DART GMS AI Analysis Traceability Update

| Requirement | Implementation | Verification |
| --- | --- | --- |
| `REF-003`, `JOB-018` | Workspace DART board calls backend OpenDART disclosure lookup for selected workspace company. OpenDART key absence, empty results, and provider failure return a non-blocking unavailable/empty state. | `DartAnalysisServiceTest`, `WorkspacePage.test.js` |
| `REF-008`, `AI-004`, `AI-006` | GMS-backed DART analysis produces structured evidence cards and appeal material for user review only. Saving requires an explicit user action and creates a `DART` reference material; essay drafts are not auto-mutated. | `DartAnalysisServiceTest`, `workspaceApi.test.js`, `WorkspacePage.test.js` |
| Workspace ownership | DART disclosure, analysis, read, and save-reference endpoints run through workspace/user ownership checks before returning or saving data. | `DartAnalysisServiceTest` |
| DART AI output quality | AI output is evaluated through structured JSON, prompt self-check, deterministic source/policy guardrails, score normalization, focused DART text preparation, and regression tests before it can become a completed analysis. Live smoke validation confirmed `gpt-5.4-mini` quality, but actual usage review selected `gpt-4.1` as the cost-controlled default. See `docs/34_dart-ai-evaluation.md`. | `DartAnalysisQualityEvaluatorTest`, `DartAnalysisServiceTest`, `OpenDartHttpClientTest`, `DartGmsLiveSmokeEvaluationTest`, `LocalConfigurationContractTest` |

## 2026-06-20 Mattermost Recommendation Traceability Update

| Requirement | Implementation | Verification |
| --- | --- | --- |
| `MM-001`, `MM-006`, `MM-007`, `MM-008` | Mattermost webhook/backfill persists raw messages and parsed job candidates. Parsed candidates now carry normalized deadline fields for recommendation listing. | `MattermostIngestionServiceTest`, `MattermostSchemaContractTest` |
| `MM-009`, `REC-003`, `REC-004` | SSAFY-only Mattermost recommendation listing returns all open parsed candidates with stored AI score, pending state, or rule fallback without a synchronous AI call. | `MattermostRecommendationServiceTest`, `recommendationApi.test.js` |
| Mattermost recommendation UI | `/recommendations/mattermost` shows all jobs by default, with segments for 전체 공고, AI 추천, 마감 임박 and sort modes for deadline, score, and recent post time. | `MattermostRecommendationsPage.test.js` |

## 2026-06-20 Company Enrichment Traceability Update

| Requirement | Implementation | Verification |
| --- | --- | --- |
| `DATA-002`, `DATA-004`, `JOB-016`, `WS-028` | Basket/recommendation/extension saves run a provider chain ordered as 금융위원회 기업기본정보, OpenDART 기업개황, then legacy registry/defaults. Provider failures remain non-blocking. Workspace company details include source status and source names. | `FinancialCommissionCompanyInfoProviderTest`, `OpenDartCompanyOverviewProviderTest`, `MyBatisP1WorkspaceServiceTest`, `WorkspacePage.test.js`, `workspaceApi.test.js` |
