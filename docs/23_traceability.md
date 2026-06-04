# 23. 요구사항 추적표

기준 원본: Notion `23. 요구사항 추적표`

이 문서는 P1 요구사항이 유즈케이스, 화면, API, DB, 테스트와 연결되는지 확인하는 기준이다. User Flow는 전체 제품 흐름을 설명하고, P1 구현 판단은 이 추적표와 `docs/04_requirements.md`를 우선한다.

유즈케이스 기준 문서: `docs/07_use-case-specifications.md`

## P1 추적표

| 요구사항 | Use Case | 화면 | API | DB | 테스트 |
| --- | --- | --- | --- | --- | --- |
| AUTH-001 | UC-01 | 로그인 | `POST /api/auth/google`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/me`, `PATCH /api/me` | `users`, `user_sessions` | TC-AUTH-001~006 |
| ONB-001 | UC-02, UC-15 | 온보딩, 마이페이지 | `GET/PUT /api/me/profile` | `user_profiles` | TC-ONB-001, TC-ONB-002 |
| ONB-002 | UC-02, UC-05 | 온보딩, 추천 | `GET/PUT /api/me/profile`, `GET /api/recommendations/jobs` | `user_profiles` | TC-ONB-001, TC-REC-001 |
| DASH-001 | UC-03, UC-04 | 메인 대시보드, 장바구니 | `GET /api/dashboard/summary`, `GET /api/basket/jobs` | `basket_jobs`, `jobs` | TC-DASH-001 |
| JOB-001 | UC-06, UC-07 | 공고 장바구니 | `POST /api/basket/jobs`, `GET /api/basket/jobs` | `jobs`, `basket_jobs` | TC-JOB-001, TC-JOB-002 |
| JOB-002 | UC-06, UC-08 | 공고 장바구니, 워크스페이스 | `POST /api/basket/jobs`, `GET /api/workspaces/{id}` | `workspaces` | TC-JOB-001, TC-WS-001 |
| EXT-001 | UC-06 | Chrome Extension | `/api/extension/jobs/*` | `jobs`, `basket_jobs`, `workspaces` | TC-EXT-001, TC-EXT-002 |
| REC-001 | UC-05 | 추천 공고 | `GET /api/recommendations/jobs`, `POST /api/recommendations/jobs/{id}/save` | `basket_jobs`, `workspaces` | TC-REC-001 |
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
| MM-001 | Should/P2. raw 저장과 후보화는 별도 구현 |
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
