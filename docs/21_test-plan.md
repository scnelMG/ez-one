# 21. 테스트 계획서

기준 원본: Notion `21. 테스트 계획서 / 결과서`

현재 개발 전 단계에서는 테스트 계획만 확정한다. 실제 실행 결과는 구현 후 같은 문서에 별도 결과 섹션으로 추가한다.

## P1 테스트

| ID | 영역 | 케이스 | 기대 결과 |
| --- | --- | --- | --- |
| TC-AUTH-001 | Auth | Google 로그인 성공 | JWT 발급 |
| TC-AUTH-EMAIL-001 | Auth | Email signup duplicate check | New account receives JWT; duplicate email returns 409 |
| TC-AUTH-EMAIL-002 | Auth | Email/password login | JWT issued for matching credentials; invalid password returns 401 |
| TC-AUTH-002 | Auth | 미인증 요청 | 401 공통 오류 |
| TC-AUTH-003 | Auth | 다른 사용자 데이터 접근 | 403 공통 오류 |
| TC-AUTH-004 | Auth | refresh token 재발급 | 새 access token 발급 |
| TC-AUTH-005 | Auth | logout 후 refresh 재사용 | token revoke로 재발급 거부 |
| TC-AUTH-006 | Auth | 닉네임 수정 | 현재 사용자 DTO와 프론트 세션 갱신 |
| TC-AUTH-COOKIE-001 | Auth | Web refresh token storage | Backend sets HttpOnly `ezone_refresh_token`, web auth bodies return `refreshToken: null`, and frontend does not persist refresh token in localStorage |
| TC-AUTH-COOKIE-002 | Auth | Cookie refresh and extension body refresh | `POST /api/auth/refresh` accepts web cookie refresh and existing body refresh token for extension compatibility |
| TC-AUTH-LOCAL-001 | Auth | local 개발 토큰 기본 차단 | `AUTH_LOCAL_DEV_TOKEN_ENABLED=true`가 아니면 `local-dev-access-token`은 401 |
| TC-SEC-CORS-001 | Security | credential CORS exact origin 제한 | wildcard origin 거부, 실제 web/extension origin만 허용 |
| TC-ONB-001 | Onboarding | 온보딩 저장 | 프로필 저장 |
| TC-ONB-002 | Onboarding | 온보딩 건너뛰기 | 빈 editable profile 상태 유지 |
| TC-DASH-001 | Dashboard | 상태 카드 클릭 | 장바구니가 예상 filter/sort로 열린다. |
| TC-DATA-COMPANY-001 | Company | Saved job URL company info source | Company source stored as `SAVED_JOB_URL` with `UNVERIFIED` status; no automatic external scraping in P1 |
| TC-JOB-001 | Basket | 공고 저장 | basket job과 workspace 생성 |
| TC-JOB-002 | Basket | 중복 URL 저장 | 기존 공고 경로 반환 |
| TC-JOB-003 | Basket | 마감 경과 미완료 공고 | `NOT_APPLIED`로 전환 |
| TC-EXT-001 | Extension | 지원 사이트 공고 저장 | 자소설닷컴 공고에서 로그인 후 기능 선택, 미리보기, 직무 다중 선택, 저장 완료와 workspace 생성 |
| TC-EXT-002 | Extension | 추출 실패 | 미지원 페이지 또는 추출 실패 시 오류 안내, 잘못된 저장 없음 |
| TC-EXT-003 | Extension | 저장 전 수집 데이터 수정 | 회사명, 공고명, 마감일 수정값이 저장 API payload에 반영됨 |
| TC-EXT-004 | Extension | 확장 설치 안내 | 웹 랜딩과 공개 `/extension`에서 Chrome Web Store 설치 CTA와 설치 도움말을 제공하고, 운영 URL은 `VITE_EXTENSION_INSTALL_URL` 계약을 따른다 |
| TC-EXT-MANIFEST-001 | Extension | 운영 manifest 권한 축소 | production manifest는 local HTTP 권한과 broad web accessible resource를 포함하지 않음 |
| TC-EXT-DOC-AUTOFILL-001 | Extension | 서류 정보 자동 입력 보조 | label, placeholder, name/id, table, nearby text 기반 기본/표준 문서 항목 입력 |
| TC-EXT-DOC-AUTOFILL-002 | Extension | 자기소개서/장문 입력 제외 | essay/long-form textarea는 자동 입력하지 않고 수동 검토 대상으로 표시 |
| TC-PUBLIC-001 | Public Web | 공개 신뢰 페이지 | `/extension`, `/privacy`, `/support`는 미인증 상태에서도 렌더링되고 Chrome Web Store용 기능/개인정보/지원 안내를 제공한다 |
| TC-REC-001 | Recommendation | 추천 공고 별표 저장 | 장바구니 저장, 중복 처리 |
| TC-PROFILE-001 | Document Profile | 표준 섹션 저장 | 사용자별 데이터 저장 |
| TC-PROFILE-SECTION-001 | Document Profile | 표준 섹션 저장 | 재사용 가능한 서류 입력 섹션 저장 |
| TC-WS-001 | Workspace | 워크스페이스 열기 | 상단 지원 정보와 작성 데이터 조회 |
| TC-WS-002 | Workspace | 자동 저장 | debounce 후 최신 draft 저장 |
| TC-WS-003 | Workspace | 텍스트/이미지 도화지 | payload 유지 |
| TC-WS-004 | Workspace | 버전 생성/비교 | 두 버전 비교 결과 반환 |
| TC-REF-001 | References | 참고자료 생성 | 필수값 검증 후 저장 |
| TC-REF-002 | References | 전체 페이지/사이드 패널 열기 | 소유한 참고자료 내용 반환 |
| TC-NOTION-001 | Notion | Notion 연결 | 연결 계정 저장 |
| TC-NOTION-002 | Notion | 만료/실패 연결 | 경고/로그 기록, core save 유지 |
| TC-NOTION-JOB-001 | Notion | job-only sync enabled 상태에서 공고 저장 | posting sync log 생성, essay/canvas 미동기화 |

## P2 예약 테스트

| ID | 영역 | 케이스 |
| --- | --- | --- |
| TC-ALERT-P2 | Alert | 알림 채널 |
| TC-HISTORY-P2 | Past History | 기간별 통계/공고 |
| TC-CALENDAR-P2 | Basket Calendar | 마감 캘린더/주간 일정 |
| TC-SUPPORT-P2 | Support | 인증형 1:1 운영 문의 화면 |
| TC-REC-P2 | Recommendation | hover 기업 정보 |
| TC-MM-ACTIVE | Mattermost | raw 저장, 후보 공고 생성, SSAFY 전용 추천 노출 |
| TC-REF-AUTO-P2 | References | 자동 JD/news/DART/인재상 수집 |
| TC-NOTION-SCOPE-P2 | Notion | job+essay, job+essay+canvas 동기화 |

## Mattermost 활성 추천 테스트 상세

- `TC-MM-RAW`: webhook secret 검증 후 원문을 `mm_messages`에 저장한다.
- `TC-MM-FILTER`: 합격 후기/일반 공지는 raw만 저장하고 후보 공고를 만들지 않는다.
- `TC-MM-CANDIDATE`: 채용공고 메시지는 `mm_parsed_job_posts` 후보를 생성한다.
- `TC-MM-SSAFY`: `source=mattermost` 추천 조회/저장은 SSAFY 사용자에게만 허용한다.
- `TC-MM-PROMOTE`: 저장 시 필요한 경우 `jobs.source = 'MATTERMOST'`로 승격한다.

## 검증 규칙

- 모든 P1 요구사항은 화면, API, DB, 테스트 연결을 가진다.
- P2 기능은 P1 필수 테스트처럼 보이지 않도록 분리한다.
- 권한, token refresh/revoke, 중복, 외부 연동 실패, 마감 경과 상태는 대표 실패 케이스로 테스트한다.
## 2026-06-06 Added P1 Tests

- `TC-EXT-LOGO-001`: Extension extractor returns an absolute `logoUrl` candidate from explicit logo images or metadata.
- `TC-JOB-LOGO-001`: Backend stores a valid optional job `logoUrl` on the linked company record only when the company has no logo.
- `TC-JOB-LOGO-002`: Basket responses expose `companyLogoUrl`; workspace responses expose `companyDetails.logoUrl`.
- `TC-COMPANY-OFFICIAL-001`: Realtime official company enrichment stores only source-backed profile fields and keeps basket/workspace save successful when external collection fails.
- `TC-WORKSPACE-COMPANY-001`: Workspace company info renders available official fields and hides unavailable `미확인`/`unknown` placeholder rows.
- `TC-EXT-DOC-AUTOFILL-001`: Extension parser fills basic/document standard fields from labels, placeholders, name/id, tables, and nearby text.
- `TC-EXT-DOC-AUTOFILL-002`: Essay and long-form textarea fields are excluded from automatic input and reported for manual review.
- Real company application pages remain manual smoke-test territory because login, personal data, and accidental submission risk make automated E2E unsafe.

## 2026-06-06 MVP Main Dashboard Tests

- `TC-MAIN-WIREFRAME-001`: Main page removes the left sidebar and top filter bar, then renders dashboard metrics, basket preview, and recommendation thumbnails.
- `TC-MAIN-BASKET-RECENT-001`: Main basket preview is sorted by nearest deadline and marks recently opened workspaces with `최근 방문`.
- `TC-BASKET-RECENT-001`: Basket page rows also show the same `최근 방문` marker for recently opened workspaces.
- `TC-HEADER-PROFILE-001`: Header shows the signed-in user's profile photo/name and keeps logout/account-switch actions inside the mypage dropdown.

## 2026-06-06 MVP Basket Layout Tests

- `TC-BASKET-CALENDAR-001`: Basket page keeps dashboard metrics, removes weekly/manual panels, and places `공고 캘린더` above the basket table.
- `TC-BASKET-CALENDAR-002`: Calendar cards render only saved job deadlines with company, position, status, and workspace links.
- `TC-BASKET-INLINE-CREATE-001`: Basket table supports manual job creation from the inline add row instead of a separate side panel.
- `TC-BASKET-SORT-001`: Basket table supports status filtering plus `마감일순` and `담은 순` sorting.

## 2026-06-06 MVP Workspace Push Drawer Tests

- `TC-WS-PUSH-DRAWER-001`: Workspace renders support/company info, fixed bottom `도화지` and `자소서 버전관리` modes, and the right-side persistent drawer together.
- `TC-WS-PUSH-DRAWER-002`: Reference board triggers open `JD`, `NEWS`, `DART`, `TALENT_PROFILE`, `AWARDS_PROJECTS`, `PROMPT`, and `FREE_MEMO` inside the same route without page navigation.
- `TC-WS-PUSH-DRAWER-003`: Drawer width control updates the push layout variable so main content reflows instead of being covered by an overlay.
- `TC-WS-REFERENCE-EDIT-001`: Existing references open in the drawer and can be edited or deleted through the existing reference API.
- `TC-WS-VERSION-DRAWER-001`: Version management mode keeps the side drawer available while comparing two saved essay versions.

## 2026-06-06 MVP Recommendation Page Tests

- `TC-REC-DEADLINE-SORT-001`: Recommendation page removes filter chips/search and renders jobs sorted by nearest deadline.
- `TC-REC-SAVE-CTA-001`: Recommendation save CTA uses `담기` wording instead of star wording.
- `TC-REC-SAVE-ALERT-001`: Successful save shows `공고를 담았습니다` and a `워크스페이스 열기` link to the returned workspace.
- `TC-REC-LOGO-001`: Recommendation cards render company logos when `companyLogoUrl` or `logoUrl` is provided, with initial fallback otherwise.

## 2026-06-06 MVP Document Profile Tests

- `TC-PROFILE-FOCUSED-LAYOUT-001`: Document profile removes the right helper panel and keeps section navigation plus the main editor only.
- `TC-PROFILE-SINGLE-SAVE-001`: Section-specific save buttons are removed; the top-level `저장` button saves the active section.
- `TC-PROFILE-AUTOSAVE-001`: Edited basic/reusable section values auto-save after two idle seconds and expose visible auto-save status.
- `TC-PROFILE-REPEATABLE-001`: Repeatable document items can be added, selected, deleted, and persisted through the single save button.

## 2026-06-06 MVP MyPage Dropdown/Page Tests

- `TC-MYPAGE-DROPDOWN-001`: Header profile trigger opens the mypage dropdown by hover/click and exposes links for account, Notion sync, and onboarding. MyPage tabs expose QnA and terms.
- `TC-MYPAGE-ACCOUNT-001`: Account page removes the old left board list and shows profile, Google login account, Notion account mismatch guidance, and account actions.
- `TC-MYPAGE-NOTION-001`: Notion sync page removes the old left board list, separates Google and Notion accounts, and toggles auto sync items.
- `TC-MYPAGE-ONBOARDING-001`: Onboarding page and MyPage onboarding edit page share `PreferenceForm`, start without forced default preferences, and save broad role groups, detailed positions, company, industry, region, skills, and SSAFY values from chip-style controls.
- `TC-MYPAGE-ONBOARDING-002`: `profileApi.test.js` verifies `/api/me/profile` load uses the shared auth client refresh path instead of bypassing token refresh with `skipAuthRefresh`.
- `TC-MYPAGE-ONBOARDING-003`: `PreferenceForm.test.js` verifies broad role groups, conditional detailed positions, undecided-role clearing, and suggested skill chips.
- `TC-MYPAGE-ONBOARDING-004`: `P1ApiContractTest.onboardingProfileUpdatePersistsPreferencesThroughUserProfileMapper` verifies onboarding preferences are persisted through `user_profiles` mapper upsert.
- `TC-MYPAGE-SUPPORT-001`: QnA and terms routes render as independent mypage support pages. QnA search uses a labeled search input and button filters.
- `TC-AUTH-SWITCH-ENTRY-001`: Default `/login` hides account switching, while `/login?switch=account` renders the account-switch callout and starts Google OAuth with `prompt=select_account`.
- `TC-AUTH-OAUTH-STATE-001`: OAuth state is stored by nonce so parallel login tabs or retries do not overwrite each other.
- `TC-AUTH-OAUTH-CANCEL-001`: Google OAuth error callbacks such as `access_denied` show a clear retry message without calling the backend token exchange.
- `TC-AUTH-REFRESH-FAIL-001`: A revoked or expired refresh token clears the local session after a protected API returns 401.
## 2026-06-16 History Tests

- `TC-HISTORY-001`: Router registers `/history` and the common nav exposes the active history link while remaining P2 routes stay disabled.
- `TC-HISTORY-002`: `historyApi.listApplications` calls `GET /api/history/applications` with period/result-stage params and normalizes row IDs.
- `TC-HISTORY-002A`: History API rows preserve `companyLogoUrl`; `PastHistoryPage` renders the logo when present and falls back to the initials badge otherwise.
- `TC-HISTORY-003`: `PastHistoryPage` renders period options, selected-period metrics, company-type counts, and imported rows.
- `TC-HISTORY-004`: Changing the half-year period reloads history data.
- `TC-HISTORY-005`: Clicking a history row navigates to `/workspaces/{workspaceId}`.
- `TC-HISTORY-006`: Backend contract returns periods, summary, rows, result-stage filtering, and keeps `HISTORY_IMPORT` rows out of active basket listing.
- `TC-HISTORY-007`: Migration contract verifies `application_history` schema and confirms personal email/data are not embedded in migration SQL.
- `TC-HISTORY-008`: Basket page exposes a `과거 지원 내역` link to `/history`.
- `TC-HISTORY-009`: History summary exposes past-result metrics 전체 공고, 서류 탈락, 필기 탈락, 면접 탈락, 미지원 instead of active-progress labels.
- `TC-HISTORY-009A`: History mapper contract includes current active basket `READY` jobs in `/api/history/applications` so 지원 전 counts reflect jobs still in the basket; past-deadline `READY` remains normalized to 미지원.
- `TC-HISTORY-010`: History table search filters visible rows by keyword while explicit status filtering and sorting work independently, and reset clears search, filters, and custom sort.
- `TC-HISTORY-010A`: History table rows display normalized 지원 결과 labels such as 서류 탈락, 필기 탈락, 면접 탈락, 진행 중, and 미지원 without exposing raw CSV result strings.
- `TC-HISTORY-012`: History table defaults to deadline latest order, parses Korean deadline labels, and still supports deadline ascending and company-name sorting without changing the loaded period/result-stage data.
- `TC-HISTORY-011`: History row navigation opens the workspace while the original posting link remains a separate external link.
- `TC-HISTORY-013`: Basket save prefers official company classification over job-board URL fallback when a company matches the official registry, and records provenance in `company_profile_sources`.
- `TC-HISTORY-014`: Basket save attempts realtime official company enrichment for unknown companies, records official provenance on success, and still saves the job/workspace when the realtime provider fails.
- `TC-HISTORY-015`: History label edits call `PATCH /api/history/applications/{historyApplicationId}/labels`, persist `applicationStatus` and `resultStage` server-side, and reload with the edited labels instead of relying on browser local storage.

## 2026-06-17 Study Security Regression Tests

- `TC-STUDY-AUTH-001`: Non-members cannot read study detail.
- `TC-STUDY-AUTH-002`: Non-members cannot read shared essay detail or add shared essay feedback.
- `TC-STUDY-AUTH-003`: Study invitation is leader-only.
- `TC-STUDY-AUTH-004`: Study members cannot share an essay from a workspace they do not own.
- `TC-STUDY-XSS-001`: Shared essay body content is rendered as text, not raw HTML.

## 2026-06-17 Service Trust Remediation Tests

- `TC-LAYOUT-FOOTER-001`: `AppLayout.test.js` verifies P1-only global navigation, disabled alert affordance, and production-style footer links, 운영 문의 메일, 저작권 및 상표 고지.
- `TC-AUTH-WITHDRAW-001`: `P1ApiContractTest.currentUserCanWithdrawAndRevokeSessions` verifies `DELETE /api/me` revokes sessions and anonymizes the user.
- `TC-SUPPORT-REQUEST-001`: Backend contract tests and frontend `supportApi.test.js` verify support request API behavior while the 1:1 inquiry page remains unavailable in the web UI.
- `TC-STUDY-PERMISSION-UI-001`: `StudyDetailPage.test.js` verifies the page uses the authenticated session email instead of a hardcoded user fallback.

## 2026-06-19 DART GMS AI Analysis Tests

Requirement: `REF-003`, `JOB-018`, `REF-008`, `AI-004`, `AI-006`.

- `TC-DART-API-001`: `DartAnalysisServiceTest` verifies disclosure lookup uses workspace ownership and returns periodic reports without exposing secrets.
- `TC-DART-GMS-001`: `DartAnalysisServiceTest` verifies missing/exhausted GMS credit blocks analysis while preserving manual DART memo flow.
- `TC-DART-AI-001`: `DartAnalysisServiceTest` verifies structured evidence cards, appeal points, cautions, and receipt numbers are stored for user review.
- `TC-DART-AI-EVAL-001`: `DartAnalysisQualityEvaluatorTest` verifies ungrounded cards, prohibited investment/hiring-probability wording, score overflow, and duplicate/blank output are corrected before user review.
- `TC-DART-AI-LIVE-001`: `DartGmsLiveSmokeEvaluationTest` is opt-in with `DART_LIVE_SMOKE_ENABLED=true` and verifies live OpenDART/GMS analysis for Samsung Electronics, Kakao, and KB Financial Group without logging secrets, raw DART text, full prompts, or full AI output.
- `TC-DART-OPENDART-001`: `OpenDartHttpClientTest` verifies long DART documents are focused to job-application signal sections and user company names such as `KB금융지주` resolve to the most specific OpenDART corp name.
- `TC-DART-REFERENCE-001`: `DartAnalysisServiceTest` verifies completed analysis is saved as `reference_type = DART`, and another user cannot save it.
- `TC-DART-FRONTEND-001`: `workspaceApi.test.js` verifies DART disclosure, analysis, analysis read, and save-reference endpoint paths.
- `TC-DART-FRONTEND-002`: `WorkspacePage.test.js` verifies the DART board loads disclosures, renders AI evidence cards, saves only after user action, and does not auto-insert AI text into the essay draft.

## 2026-06-20 Company Enrichment Tests

Requirement: `DATA-002`, `DATA-004`, `JOB-016`, `WS-028`.

- `TC-COMPANY-FINANCIAL-001`: `FinancialCommissionCompanyInfoProviderTest` verifies company-name exact match, field mapping, missing key, empty match, and non-blocking empty result.
- `TC-COMPANY-OPENDART-001`: `OpenDartCompanyOverviewProviderTest` verifies `corpCode.xml` matching, `company.json` mapping, and most-specific bidirectional name selection.
- `TC-COMPANY-BULK-SYNC-001`: `StartupSyncRunnerTest` and `CompanyDataSchedulerTest` verify startup and scheduled bulk company data sync are disabled by default and run only when explicitly enabled.

## 2026-06-20 Mattermost Recommendation Tests

Requirement: `MM-001`, `MM-006`, `MM-007`, `MM-008`, `MM-009`, `REC-003`, `REC-004`.

- `TC-MM-REC-001`: `MattermostRecommendationServiceTest` verifies that the list API returns open parsed candidates and filters expired deadlines.
- `TC-MM-REC-002`: `MattermostRecommendationServiceTest` verifies that listing Mattermost recommendations does not call the AI client synchronously.
- `TC-MM-REC-003`: `MattermostRecommendationServiceTest` verifies stored `READY` scores, `PENDING` score display, and rule fallback scoring.
- `TC-MM-REC-004`: `MattermostSchemaContractTest` verifies normalized deadline columns and durable `mm_recommendation_scores`.
- `TC-MM-REC-FRONTEND-001`: `MattermostRecommendationsPage.test.js` verifies 전체 공고, 검토 추천, 마감 임박 segments and deadline/score/recent sort controls.
- `TC-MM-REC-FRONTEND-002`: `recommendationApi.test.js` verifies source-scoped list and save API calls.

## 2026-06-24 AI Prompt Quality Tests

Requirement: `AI-003`, `AI-006`, `MM-009`.

- `TC-AI-ACTIVITY-PROMPT-001`: `GmsApplicationActivityAssistAiClientTest` verifies the real activity-assist prompt, schema-constrained output request, token budget, fact-only instruction, and char/byte limit.
- `TC-AI-ACTIVITY-FALLBACK-001`: `ApplicationActivityAssistServiceTest` verifies readable Korean fallback recommendations when GMS AI is unavailable.
- `TC-AI-ACTIVITY-LENGTH-001`: `ApplicationActivityAssistServiceTest` verifies short AI activity drafts are expanded toward 90% of long character limits using saved activity facts without exceeding the limit.
- `TC-AI-MM-PROMPT-001`: `GmsAiJobRecommendationClientTest` verifies Mattermost review-priority prompt wording, schema-constrained output request, token budget, and incomplete JSON fallback.
- `TC-MM-REC-FRONTEND-003`: `MattermostRecommendationsPage.test.js` verifies readable Korean review-priority copy, pending state, and save actions.

## 2026-06-28 Extension Auto-Fill Release Regressions

Requirement: `EXT-031`, `EXT-032`.

- `TC-EXT-AUTOFILL-031-MIDAS-SCHOOL-001`: `applicationAutoFill.test.js` verifies Midas school autocomplete options are selected before dependent education fields are filled.
- `TC-EXT-AUTOFILL-031-MIDAS-MAJOR-001`: `applicationAutoFill.test.js` verifies university department controls do not shift nested Midas major row indexes.
- `TC-EXT-AUTOFILL-032-MIXED-CERT-001`: `applicationAutoFill.test.js` verifies mixed Midas language/certificate sections do not click certificate add buttons repeatedly or fill the wrong section.
- `TC-EXT-AUTOFILL-032-SQLD-001`: `applicationAutoFill.test.js` verifies SQLD can be committed after existing certificate rows without moving details into ADsP.
- `TC-EXT-AUTOFILL-032-DELAYED-DATE-001`: `applicationAutoFill.test.js` verifies delayed Kakao ATS certificate date inputs are filled after certificate selection.

## 2026-06-20 Company Enrichment Tests Continued

- `TC-COMPANY-MERGE-001`: `MyBatisP1WorkspaceServiceTest` verifies 금융위 primary fields plus OpenDART provenance are persisted and both sources are recorded.
- `TC-WORKSPACE-COMPANY-STATUS-001`: `WorkspacePage.test.js` verifies `공식 확인됨`, `일부 확인됨`, and `미확인` rendering while hidden fields stay hidden.

## 2026-06-19 Document Profile Photo Auto-Fill Tests

- `TC-PROFILE-PHOTO-001`: `DocumentProfilePage.test.js` verifies that the basic-info section can read an image file, show the file name/preview, save `profilePhoto`, and remove it before saving.
- `TC-EXT-DOC-PHOTO-001`: `applicationAutoFill.test.js` verifies that the extension attaches a saved resume photo to generic image file inputs, including hidden file inputs used by custom upload buttons.
- `TC-EXT-DOC-PHOTO-002`: `applicationAutoFill.test.js` verifies that non-image file inputs and ambiguous multiple image uploads are not filled automatically.
