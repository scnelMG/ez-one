# 13. API 명세서

기준 원본: Notion `13. API 명세서`

모든 API는 공통 응답 형식을 사용한다. Controller는 DB row/entity를 직접 반환하지 않고 DTO를 반환한다.

## 공통 응답

```json
{
  "success": true,
  "data": {},
  "error": null
}
```

오류 응답은 stable code, message, optional details를 포함한다.

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "FORBIDDEN",
    "message": "접근 권한이 없습니다.",
    "details": {}
  }
}
```

## 인증 / 프로필

| 메서드 | 경로 | 목적 |
| --- | --- | --- |
| POST | `/api/auth/signup` | Email/password signup. Rejects duplicate email with `409 CONFLICT`. |
| POST | `/api/auth/login` | Email/password login. Invalid credentials return `401 UNAUTHORIZED`. |
| POST | `/api/auth/google` | Google OAuth 로그인 |
| POST | `/api/auth/refresh` | refresh token으로 access token 재발급 |
| POST | `/api/auth/logout` | refresh token revoke |
| GET | `/api/me` | 현재 사용자 조회 |
| PATCH | `/api/me` | 현재 사용자 닉네임 수정 |
| GET | `/api/me/profile` | 온보딩/마이페이지 프로필 조회 |
| PUT | `/api/me/profile` | 온보딩/마이페이지 프로필 저장 |

## 대시보드 / 장바구니

| 메서드 | 경로 | 목적 |
| --- | --- | --- |
| GET | `/api/dashboard/summary` | 지원 상태 수와 마감 요약 |
| GET | `/api/basket/jobs?status=&sort=` | 장바구니 목록, 상태 필터, 마감 정렬 |
| POST | `/api/basket/jobs` | 공고 저장. 확장/추천/직접 입력 공통 |
| GET | `/api/basket/jobs/{basketJobId}` | 저장 공고 상세 |
| PATCH | `/api/basket/jobs/{basketJobId}` | 저장 공고 회사명/직무/마감/URL/지원 메모 수정 |
| PATCH | `/api/basket/jobs/{basketJobId}/status` | 지원 상태 변경 |
| DELETE | `/api/basket/jobs/{basketJobId}` | soft delete from the active basket list. Deleting a mistakenly saved job does not create past application history. |

장바구니와 대시보드 조회는 마감 경과 normalization을 적용한다. 마감된 미완료 공고는 `NOT_APPLIED`로 처리한다.

## 추천

| 메서드 | 경로 | 목적 |
| --- | --- | --- |
| GET | `/api/recommendations/jobs` | 입력 정보와 저장 이력 기반 추천 공고 목록 |
| GET | `/api/recommendations/jobs?source=mattermost` | SSAFY 사용자 전용 Mattermost 마감 전 후보 목록 |
| POST | `/api/recommendations/jobs/{recommendationId}/save` | 추천 공고 장바구니 저장 |
| POST | `/api/recommendations/jobs/{recommendationId}/save?source=mattermost` | SSAFY 사용자 전용 Mattermost 추천 공고 장바구니 저장 |
| GET | `/api/recommendations/jobs/{recommendationId}/summary` | P2 추천 hover 기업 요약 |

Mattermost source는 서버에서 `user_profiles.is_ssafy = true`를 재검증한다. 비SSAFY 사용자 또는 프로필 미작성 사용자는 `403 FORBIDDEN`을 반환한다.

## Mattermost 수집/검토

| 메서드 | 경로 | 목적 |
| --- | --- | --- |
| POST | `/api/integrations/mattermost/webhook` | `X-MM-Webhook-Secret` 또는 body `token` 검증 후 Mattermost 원문을 저장하고 채용공고 후보를 생성 |
| GET | `/api/admin/mattermost/job-candidates?status=NEEDS_REVIEW` | 검토 대기 Mattermost 후보 조회 |
| PATCH | `/api/admin/mattermost/job-candidates/{candidateId}/review` | 후보를 `APPROVED` 또는 `REJECTED`로 검토. 승인 시 추천 공고로 승격 |

Mattermost webhook secret은 단일 채널이면 `MATTERMOST_WEBHOOK_SECRET`, 여러 채널이면 쉼표 구분 `MATTERMOST_WEBHOOK_SECRETS`로 설정한다. 두 설정이 모두 있으면 두 목록을 합쳐 허용한다.

## 서류 입력 정보

| 메서드 | 경로 | 목적 |
| --- | --- | --- |
| GET | `/api/document-profile` | 전체 서류 입력 정보 조회 |
| PUT | `/api/document-profile/sections/{sectionType}` | 표준 섹션 저장 |

## 워크스페이스

| 메서드 | 경로 | 목적 |
| --- | --- | --- |
| GET | `/api/workspaces/{workspaceId}` | 워크스페이스 상세 |
| GET | `/api/workspaces/{workspaceId}/defaults` | 서류 입력 정보 기반 기본값 |
| POST | `/api/workspaces/{workspaceId}/questions` | 자소서 문항 추가 |
| PATCH | `/api/workspaces/{workspaceId}/questions/{questionId}` | 자소서 문항 수정 |
| DELETE | `/api/workspaces/{workspaceId}/questions/{questionId}` | 자소서 문항 삭제 |
| PATCH | `/api/workspaces/{workspaceId}/drafts/{draftId}` | 도화지/초안 자동 저장 |
| POST | `/api/workspaces/{workspaceId}/versions` | 자소서 버전 생성 |
| GET | `/api/workspaces/{workspaceId}/versions` | 버전 목록 |
| POST | `/api/workspaces/{workspaceId}/versions/compare` | 두 버전 비교 |

## 참고자료

| 메서드 | 경로 | 목적 |
| --- | --- | --- |
| GET | `/api/workspaces/{workspaceId}/references` | 참고자료 목록 |
| POST | `/api/workspaces/{workspaceId}/references` | 참고자료 생성 |
| GET | `/api/references/{referenceId}` | 전체 페이지 참고자료 조회 |
| GET | `/api/references/{referenceId}/side-panel` | 사이드 패널 참고자료 조회 |
| PATCH | `/api/references/{referenceId}` | 참고자료 수정 |
| DELETE | `/api/references/{referenceId}` | 참고자료 삭제 |

생성 시 `boardName`, `referenceType`, `title`은 필수다. `body`, `imagePayload`, `url` 중 하나 이상을 포함해야 한다.

## Notion

| 메서드 | 경로 | 목적 |
| --- | --- | --- |
| GET | `/api/integrations/notion` | 연결 상태와 계정 정보 조회 |
| POST | `/api/integrations/notion/connect` | Notion OAuth 연결 시작/완료 |
| DELETE | `/api/integrations/notion` | Notion 연결 해제 |
| PUT | `/api/integrations/notion/sync-settings` | 자동 동기화 설정 저장. P1 scope는 `JOB_ONLY` |
| GET | `/api/integrations/notion/sync-logs` | 동기화 이력/실패 로그 조회 |

## Chrome Extension

| 메서드 | 경로 | 목적 |
| --- | --- | --- |
| POST | `/api/extension/jobs/preview` | 현재 페이지 공고 추출 미리보기 |
| POST | `/api/extension/jobs/save` | 추출 공고 장바구니 저장 |
| GET | `/api/extension/document-profile` | 확장 프로그램 서류 자동 입력 보조용 서류 입력 정보 조회 |

## P2 / 예약 API

아래 API는 IA에는 남기지만 P1 구현 계약이 아니다. 구현 시 요구사항, 권한, 테스트를 다시 확정한다.

| 메서드 | 경로 | 목적 |
| --- | --- | --- |
| GET | `/api/basket/calendar` | 장바구니 마감 캘린더/주간 일정 |

> AUTH-001 상세 계약은 `docs/32_auth-google-api-contract.md`를 기준으로 한다.
## 2026-06-06 P1 Extension Logo Contract

- `POST /api/extension/jobs/preview` accepts optional `logoUrl` and echoes it in the preview response.
- `POST /api/extension/jobs/save` accepts optional `logoUrl` with the extracted posting payload.
- `POST /api/basket/jobs` also accepts optional `logoUrl` for manually or externally created saved jobs.
- `BasketJobResponse` includes `companyLogoUrl`.
- `GET /api/recommendations/jobs` returns each recommendation with `companyLogoUrl` when stored company logo metadata exists. Mattermost recommendations may also include `companyDomain`, `companyType`, `postedAt` for the original Mattermost post time, and `collectedAt` for backend receipt time.
- `GET /api/workspaces/{workspaceId}` includes `companyDetails.logoUrl`.
- Invalid or missing `logoUrl` values must not fail the core job save flow; the server ignores invalid logo candidates.
- `GET /api/extension/document-profile` is part of the approved P1 extension auto-fill scope. It uses the existing Bearer token and returns the current user's document profile for the active-tab injection flow.
## 2026-06-16 History API

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/history/applications?period=ALL&resultStage=` | Returns past application periods, selected-period summary, company-type counts, and rows with `workspaceId` links plus `companyLogoUrl` when stored company logo metadata exists. `period` uses `ALL` or `YYYY-H1`/`YYYY-H2`. `resultStage` is optional and may be `DOCUMENT_FAILED`, `TEST_FAILED`, `INTERVIEW_FAILED`, `NOT_APPLIED`, or `IN_PROGRESS`. |

History rows are stored in `application_history`. The import process creates linked `basket_jobs` and `workspaces` for workspace navigation, but `basket_jobs.saved_source = 'HISTORY_IMPORT'` is excluded from the active basket list. Normal basket jobs are copied into `application_history` when their status changes away from `READY`. The history query also includes existing active basket jobs whose status is already `COMPLETED`, `IN_PROGRESS`, `NOT_APPLIED`, or past-deadline `READY`, so previously saved application progress remains visible without requiring delete/archive. Delete alone is treated as removing a mistaken basket entry, not as evidence of a past application.

## 2026-06-17 Study API Authorization Addendum

- All `/api/studies/{studyId}` read and write endpoints must verify that the authenticated user is a member of the target study before returning or mutating study data.
- Leader-only actions include inviting users and uploading the study image.
- Shared essay creation is allowed for study members only after the requested `workspaceId` is verified against the authenticated user's own workspace access.
- Shared essay detail, read logs, feedback, and shared job recommendation must reject non-members instead of relying only on authenticated login state.

## 2026-06-17 Account Withdrawal and Support API Addendum

### `DELETE /api/me`

- Requirement: `AUTH-012`
- Auth: required
- Revokes all active refresh sessions for the current user.
- Soft-deletes the account by anonymizing email, name, nickname, provider id, and password hash.
- Response envelope uses `success: true`, `data: null`, `error: null`.

### `GET /api/support/requests`

- Requirement: `SUPPORT-001`
- Auth: required
- Returns support requests created by the current user, newest first.

### `POST /api/support/requests`

- Requirement: `SUPPORT-001`
- Auth: required
- `requestType` must be `INQUIRY`.
- Required fields are `category`, `title`, and `body`.
- Created requests start with `status: "RECEIVED"`.
- Public request and response DTOs do not expose legacy business-contact columns.

## 2026-06-18 Realtime Official Company Enrichment Addendum

- Requirement: `DATA-002`, `DATA-004`, `JOB-016`, `HISTORY-008`.
- `POST /api/basket/jobs`, `PATCH /api/basket/jobs/{basketJobId}`, recommendation save, and extension save share the same company enrichment path.
- If the static official registry has no match, the backend attempts realtime official-provider enrichment by company name.
- Realtime enrichment is best-effort. API timeouts, missing keys, malformed responses, or empty matches must not roll back the basket job, workspace, or imported history link.
- Successful realtime matches update `companies.company_type`, `companies.size`, and eligible placeholder/job-board domains, then upsert `company_profiles` with `source_priority = REALTIME_OFFICIAL_API`.
- Public institution matches may populate `company_profiles.industry`, `homepage_url`, `founded_at`, `profile_summary`, and `address` from the official response.
- FTC business-group affiliate matches may populate `company_profiles.industry`, `founded_at`, `ceo_name`, and `profile_summary`; legal/business registration numbers are not exposed in the workspace UI.
- Realtime provenance is recorded in `company_profile_sources` with one of `ALIO_PUBLIC_INSTITUTION`, `FTC_BUSINESS_GROUP`, or `MME_CONFIRMATION`.
- Saved posting URLs remain in `company_info_sources` as `SAVED_JOB_URL/UNVERIFIED`; they are context, not official classification evidence.
- Runtime configuration: `PUBLIC_DATA_API_KEY`, `COMPANY_ENRICHMENT_REALTIME_ENABLED`, `PUBLIC_INSTITUTION_API_URL`, `FTC_AFFILIATE_API_URL`, optional `FTC_PRESENTN_YEAR`, `FTC_AFFILIATE_MAX_PAGES`, and optional `MIDDLE_MARKET_API_URL`.
- `PUBLIC_INSTITUTION_API_URL` defaults to the public institution `/list` operation, not only the API base URL.
- The FTC affiliate API requires `presentnYear`; when `FTC_PRESENTN_YEAR` is empty, the backend uses the current year and scans pages up to `FTC_AFFILIATE_MAX_PAGES`.

## 2026-06-18 Official Company Classification Addendum

- Requirement: `DATA-002`, `JOB-016`, `HISTORY-008`.
- When a basket job is created or updated, the backend first checks the official company registry by company name.
- Official registry matches override job-board URL domains such as `jasoseol.com` and populate `companies.company_type`, `companies.size`, and `company_profiles.homepage_url`.
- The backend records official provenance in `company_profile_sources`.
- Initial official classification sources:
  - `FTC_BUSINESS_GROUP`: 공정거래위원회 기업집단포털, used for 대기업/공시대상기업집단 affiliate classification.
  - `ALIO_PUBLIC_INSTITUTION`: ALIO 공공기관 경영정보 공개시스템, used for 공공기관 classification.
- `company_info_sources` still records the saved posting URL as `SAVED_JOB_URL/UNVERIFIED`; it is not treated as official company classification evidence.

## 2026-06-19 DART GMS AI Analysis API

Requirement: `REF-003`, `JOB-018`, `REF-008`, `AI-004`, `AI-006`.

All endpoints require the authenticated user to own `{workspaceId}`.

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/workspaces/{workspaceId}/dart/disclosures` | Returns OpenDART periodic disclosure candidates for the workspace company. Provider failure returns `available=false` and does not block the workspace. |
| POST | `/api/workspaces/{workspaceId}/dart/analyses` | Creates a GMS AI analysis for the selected disclosure. The request includes `rceptNo`, `reportName`, optional company/position context, essay questions, and optional manual DART text. |
| GET | `/api/workspaces/{workspaceId}/dart/analyses/{analysisId}` | Returns a stored analysis preview for the same owner/workspace. |
| POST | `/api/workspaces/{workspaceId}/dart/analyses/{analysisId}/save-reference` | Saves a completed analysis as a `DART` reference material and returns the created reference. |

Analysis response `result` is structured as:

```json
{
  "evidenceCards": [
    {
      "title": "string",
      "summary": "string",
      "sourceSection": "string",
      "rceptNo": "string",
      "relevanceScore": 0
    }
  ],
  "appealPoints": ["string"],
  "suggestedSentences": ["string"],
  "cautions": ["string"],
  "missingInfo": ["string"]
}
```

AI output is preview-only until the user explicitly saves it as reference material. It must not update essay drafts automatically.

## 2026-06-20 Company Enrichment API Addendum

Requirement: `DATA-002`, `DATA-004`, `JOB-016`, `WS-028`.

- 공고 저장 API(`POST /api/basket/jobs`, 추천 저장, 확장 저장)는 core 저장을 먼저 성공시킨 뒤 기업정보 보강을 best-effort로 수행한다. 금융위원회/OpenDART API 키 누락, 응답 오류, 미매칭은 저장 실패로 전파하지 않는다.
- 기업 보강 우선순위는 `FINANCIAL_COMMISSION_COMPANY_BASIC` -> `OPENDART_COMPANY_OVERVIEW` -> 기존 공식 registry/내부 기본값이다. OpenDART는 금융위 결과의 누락 필드를 보강한다.
- `GET /api/workspaces/{workspaceId}`의 `companyDetails`는 기존 필드를 유지하고 `sourceStatus`, `sourceNames`, `lastUpdatedAt`을 추가로 내려줄 수 있다.
- `sourceStatus`는 `OFFICIAL`, `PARTIAL`, `UNVERIFIED` 중 하나다. 공식 출처에서 유효 필드가 2개 이상이면 `OFFICIAL`, 출처는 있으나 핵심 필드가 부족하면 `PARTIAL`, 공식 API 매칭이 없으면 `UNVERIFIED`다.
- Runtime configuration: `PUBLIC_DATA_API_KEY`, `FINANCIAL_COMPANY_BASIC_INFO_URL`, `OPENDART_API_KEY`, `COMPANY_ENRICHMENT_REALTIME_ENABLED`.

## 2026-06-20 Mattermost Recommendation API

Requirement: `MM-001`, `MM-006`, `MM-007`, `MM-008`, `MM-009`, `REC-003`, `REC-004`.

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/recommendations/jobs?source=mattermost` | Returns all open parsed Mattermost job candidates for SSAFY users. The list includes stored AI score when ready, pending score state when not ready, or rule fallback score. This endpoint must not call the AI client synchronously. |
| POST | `/api/recommendations/jobs/{recommendationId}/save?source=mattermost` | Saves the selected Mattermost candidate through the normal basket/workspace flow. Missing AI score does not block save. |

Mattermost recommendation rows may include `companyDomain`, `companyType`, `companyLogoUrl`, `postedAt`, `collectedAt`, `recommendationScore`, and `recommendationReason`. `recommendationScore` may be `null` while the stored score status is pending; clients should render this as a calculating state instead of hiding the job.
