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
| TC-EXT-004 | Extension | 확장 설치 안내 | 웹 랜딩에서 Chrome 확장프로그램 로컬 설치 안내와 `dist` 경로 제공 |
| TC-REC-001 | Recommendation | 추천 공고 별표 저장 | 장바구니 저장, 중복 처리 |
| TC-PROFILE-001 | Document Profile | 표준 섹션 저장 | 사용자별 데이터 저장 |
| TC-PROFILE-CUSTOM-001 | Document Profile | 커스텀 항목 추가 | 재사용 가능한 항목 생성 |
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
| TC-SUPPORT-P2 | Support | 고객지원/문의/약관 |
| TC-REC-P2 | Recommendation | hover 기업 정보 |
| TC-MM-P2 | Mattermost | raw 저장과 후보 공고 승인 |
| TC-REF-AUTO-P2 | References | 자동 JD/news/DART/인재상 수집 |
| TC-NOTION-SCOPE-P2 | Notion | job+essay, job+essay+canvas 동기화 |

## 검증 규칙

- 모든 P1 요구사항은 화면, API, DB, 테스트 연결을 가진다.
- P2 기능은 P1 필수 테스트처럼 보이지 않도록 분리한다.
- 권한, token refresh/revoke, 중복, 외부 연동 실패, 마감 경과 상태는 대표 실패 케이스로 테스트한다.
## 2026-06-06 Added P1 Tests

- `TC-EXT-LOGO-001`: Extension extractor returns an absolute `logoUrl` candidate from explicit logo images or metadata.
- `TC-JOB-LOGO-001`: Backend stores a valid optional job `logoUrl` on the linked company record only when the company has no logo.
- `TC-JOB-LOGO-002`: Basket responses expose `companyLogoUrl`; workspace responses expose `companyDetails.logoUrl`.
- `TC-EXT-DOC-AUTOFILL-001`: Extension parser fills basic/document/custom fields from labels, placeholders, name/id, tables, and nearby text.
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

- `TC-MYPAGE-DROPDOWN-001`: Header profile trigger opens the mypage dropdown by hover/click and exposes links for account, Notion sync, onboarding, QnA, inquiry, partnership, and terms.
- `TC-MYPAGE-ACCOUNT-001`: Account page removes the old left board list and shows profile, Google login account, Notion account mismatch guidance, and account actions.
- `TC-MYPAGE-NOTION-001`: Notion sync page removes the old left board list, separates Google and Notion accounts, and toggles auto sync items.
- `TC-MYPAGE-ONBOARDING-001`: Onboarding page saves recommendation preferences from chip-style controls.
- `TC-MYPAGE-SUPPORT-001`: QnA, 1:1 inquiry, partnership inquiry, and terms routes render as independent mypage support pages.
