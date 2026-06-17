# 36. Project Risk Remediation Log

Date: 2026-06-17

This document records the issues found in the current project review, the fixes applied, and the remaining risks that should be handled before production use.

## Fixed Issues

### Study API authorization

Problem:

- Study endpoints accepted authenticated users but did not consistently verify that the requester belonged to the target study.
- Some write actions did not distinguish between normal study members and study leaders.
- Essay sharing accepted a `workspaceId` from the request without first proving that the workspace belonged to the requester.

Fix:

- Study detail, shared essays, read logs, shared jobs, shared essay detail, feedback, job recommendation, and essay sharing now require study membership.
- User invitation and study image upload now require the requester to be the study leader.
- Essay sharing now validates the requested workspace through `P1WorkspaceService.getWorkspace(userId, workspaceId)` before inserting a shared essay.
- Study controller methods now pass the authenticated JWT user's email and, where needed, user ID into the service layer instead of letting the service infer or default the user.

Verification:

- `StudyServiceAuthorizationTest` covers non-member rejection, leader-only invitation, workspace ownership checks, and feedback rejection for outsiders.

### Shared essay XSS risk

Problem:

- `StudyDetailPage.vue` rendered shared essay body content with `v-html`.
- Shared essay body text is user-controlled content, so rendering it as raw HTML could execute injected markup or script-like payloads in the browser.

Fix:

- Shared essay bodies are now rendered as Vue text interpolation.
- CSS preserves line breaks with `white-space: pre-wrap`, so UX remains readable without raw HTML rendering.

Verification:

- `StudyDetailPage.test.js` asserts that shared essay bodies no longer use `v-html` and are rendered as text.

### Invalid temporary migration

Problem:

- `backend/src/main/resources/db/migration/V20_temp.sql` was tracked in Flyway's migration directory.
- The file name and contents were temporary/invalid, so a normal Flyway startup could try to apply an unsafe migration.

Fix:

- `V20_temp.sql` was removed from the tracked Flyway migration path.
- The migration policy now explicitly forbids temporary, scratch, or invalid SQL files under `backend/src/main/resources/db/migration`.

Verification:

- Backend tests compile resources after the file removal.

### Flyway documentation drift

Problem:

- `docs/17_tech-stack-and-local-development.md` still said Flyway was deferred.
- `docs/34_database-migration-policy.md` correctly said Flyway is enabled for schema changes.

Fix:

- The latest dated addendum in the stack document now supersedes the older deferred note.
- The migration policy now links this incident to the rule that Flyway remains enabled and only reviewed migrations belong in the migration directory.

## Remaining Risks

- Study remains outside the documented P1 product loop. Because active routes and APIs already exist, this remediation locks the feature down instead of deleting it. A later product decision should either promote Study with a requirement ID or hide it as a reserved/non-P1 surface.
- Several legacy files still contain mojibake Korean text. This change avoids broad copy rewrites and records encoding cleanup as separate debt.
- Development CORS configuration still allows broad Chrome extension origins. Before production, replace wildcard extension origins with the exact deployed extension ID and documented environment values.
- Notion integration still needs a DB-backed service implementation and real Notion API token exchange/page creation. The schema exists, but `NotionIntegrationService` still uses in-memory state in the current code path.

## 2026-06-17 Service Trust Remediation Addendum

Fixed:

- Rebuilt the app footer with service identity, support/policy/partnership links, support mail, trademark notice, and explicit pre-launch business-information wording.
- Removed Mattermost from the global P1 navigation while leaving its direct route available for product-scope review.
- Restored the Study global navigation entry as `취업 스터디` by explicit product-owner request; the route remains active while Study scope is reviewed.
- Rebuilt `MyPage.vue` and `MyPageNav.vue` with clean Korean copy.
- Added `DELETE /api/me` for account withdrawal. The endpoint revokes active sessions and anonymizes the user account.
- Added `support_requests` persistence plus `/api/support/requests` GET/POST APIs.
- Replaced MyPage inquiry/partnership `alert()`-only behavior with API-backed submission and persisted inquiry history.
- Removed the hardcoded Study permission email fallback from `StudyDetailPage.vue`.

Verification:

- `.\mvnw.cmd test "-Dtest=P1ApiContractTest,CurrentUserControllerAuthTest"`
- `npm run test -- MyPage.test.js AppLayout.test.js authApi.test.js supportApi.test.js`

## 2026-06-17 Document Profile Data Diagnosis

Problem:

- The current local MySQL database contains past application data (`application_history`, `basket_jobs`, and `workspaces`) for the Google account that was inspected, but `document_profile_sections` and `document_custom_fields` are empty.
- Recent backend logs did not show successful `/api/document-profile` save requests, so the available evidence does not show that the entered document profile data reached the current backend database.
- The frontend `documentProfileApi.getDocumentProfile()` swallowed every load failure and returned an empty profile. Authentication or server failures could therefore appear to the user as "my saved document profile disappeared."

Fix:

- `getDocumentProfile()` now propagates authentication and server failures instead of converting them into an empty document profile.
- The document profile store now surfaces readable Korean error messages for load/save failures.

Verification:

- `npm run test -- documentProfileApi.test.js DocumentProfilePage.test.js`
- `.\mvnw.cmd test -Dtest=DocumentProfilePersistenceServiceTest`

Remaining recovery risk:

- No rows for document profile data were found in the current local DB. If the user previously saw the data after entering it, the next recovery sources to inspect are the browser session that submitted it, older/local MySQL snapshots, or another database instance used before the current server restart.

## 2026-06-17 Document Profile DB Persistence Enforcement

Problem:

- The profile service still had an in-memory fallback path for document profile sections when `DocumentProfileMapper` was not configured.
- That fallback made tests and some runtime paths capable of reporting a successful document profile save without writing to `document_profile_sections`.

Fix:

- Document profile read/write now requires `DocumentProfileMapper`.
- `PUT /api/document-profile/sections/{sectionType}` always routes through `document_profile_sections` via `DocumentProfileMapper.upsertSection`.
- If persistence is not configured, the service fails instead of silently storing document profile data in memory.

Verification:

- `.\mvnw.cmd test "-Dtest=DocumentProfilePersistenceServiceTest,InMemoryProfileServiceTest,P1ApiContractTest"`

## Commands Used

```powershell
cd backend
.\mvnw.cmd -Dtest=StudyServiceAuthorizationTest test

cd frontend
npm run test -- StudyDetailPage.test.js
```
