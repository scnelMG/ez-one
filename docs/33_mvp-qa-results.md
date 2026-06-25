# MVP QA Results

Date: 2026-06-25
Branch: `main`

## Summary

The final submission verification passed for the backend, frontend, and Chrome Extension. This report covers automated tests and build checks for the implemented submission scope.

The final scope is summarized in `docs/37_final-submission-report.md`. P2/P3 items that remain in the requirements database are not automatically part of the submitted feature set unless they are explicitly listed there as implemented.

## Functional Test Matrix

| Area | Requirement scope | Verification | Result |
| --- | --- | --- | --- |
| Authentication and account | `AUTH-*` P1 account flow | Backend auth service/controller tests, frontend login/session tests | PASS |
| Current user and onboarding | `ONB-*`, profile completion flow | Backend current user tests, frontend onboarding/profile tests | PASS |
| Main dashboard | P1 main summary, status cards, active main UI | Backend dashboard contract tests, frontend `MainPage` tests | PASS |
| Basket and saved jobs | P1 job save, duplicate handling, status/archive, deadline fields | Backend P1 API contract tests, frontend basket page/store/API tests | PASS |
| Workspace | P1 workspace detail, essay questions, drafts, versions | Backend workspace service/API tests, frontend workspace page/API tests | PASS |
| Reference materials | P1 reference material CRUD within workspace | Backend workspace/reference tests, frontend workspace tests | PASS |
| Document profile | P1 essay/reference/document profile inputs | Backend contract tests, frontend document profile tests | PASS |
| Notion JOB_ONLY sync | P1 Notion connection, JOB_ONLY scope, failure isolation | Backend Notion contract tests, frontend Notion settings/API tests | PASS |
| Chrome extension | P1 job preview/save, Jasoseol extraction, auth/API handoff | Extension unit tests and extension build | PASS |
| Extension document input assist | Implemented extension scope | Extension auto-fill tests, backend document profile API tests | PASS |
| Company info source | Workspace company info source behavior | Backend company info contract tests | PASS |
| Past application history | Implemented extension scope | Backend history contract tests, frontend `PastHistoryPage` tests | PASS |
| Study | Implemented extension scope | Backend study authorization tests, frontend study page tests | PASS |
| Support/QnA | Implemented account/support scope | Backend support contract tests, frontend mypage tests | PASS |
| SSAFY Mattermost recommendations | Implemented extension scope | Backend Mattermost recommendation tests, frontend recommendation tests | PASS |
| DART analysis assist | Implemented extension scope | Backend DART service/evaluation tests, frontend workspace/API tests | PASS |

## Commands Run

```powershell
# Backend
cd backend
.\mvnw.cmd test

# Frontend
cd frontend
npm test
npm run build

# Extension
cd extension
npm test
npm run build
```

## Results

| Command | Result |
| --- | --- |
| `backend .\mvnw.cmd test` | PASS: 225 tests run, 0 failures, 0 errors, 2 skipped |
| `frontend npm test` | PASS: 39 test files, 243 tests |
| `frontend npm run build` | PASS |
| `extension npm test` | PASS: 16 test files, 316 tests |
| `extension npm run build` | PASS |

## Remaining Limits

- Live Google OAuth and live Notion provider calls were not executed; automated tests use controlled mocks and contract coverage.
- Some live smoke or external-provider tests remain environment-gated and are skipped unless the required local DB/API credentials are explicitly enabled.
- Frontend unit tests print non-failing jsdom/router warnings in a few suites, but the full test command exits successfully.
- Browser E2E with a running local app was not run in this final pass; current coverage is unit, API contract, build, and extension tests.
