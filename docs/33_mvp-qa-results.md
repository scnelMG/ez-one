# MVP QA Results

Date: 2026-06-06
Branch: `codex/mvp-qa-verification`

## Summary

The P1 MVP automated verification passed after fixing two issues found during QA:

- Frontend lockfile still contained TypeScript-related package entries even though the approved stack forbids TypeScript.
- Backend production configuration had fallback JWT secrets in `application.yml`.

## Functional Test Matrix

| Area | Requirement scope | Verification | Result |
| --- | --- | --- | --- |
| Authentication and account | `AUTH-001`, `AUTH-006`, `AUTH-013` | Backend auth service/controller tests, frontend login/session tests | PASS |
| Current user and onboarding | `ONB-001`, profile completion flow | Backend current user tests, frontend onboarding/profile tests | PASS |
| Main dashboard | P1 main summary and status cards | Backend dashboard contract tests, frontend `MainPage` tests | PASS |
| Basket and saved jobs | P1 job save, duplicate handling, status/archive, deadline fields | Backend P1 API contract tests, frontend basket page/store/API tests | PASS |
| Workspace | P1 workspace detail, essay questions, drafts, versions | Backend workspace service/API tests, frontend workspace page/API tests | PASS |
| Reference materials | P1 reference material CRUD within workspace | Backend workspace/reference tests, frontend workspace tests | PASS |
| Document profile | P1 essay/reference/document profile inputs | Backend contract tests, frontend document profile tests | PASS |
| Notion JOB_ONLY sync | P1 Notion connection, JOB_ONLY scope, failure isolation | Backend Notion contract tests, frontend Notion settings/API tests | PASS |
| Chrome extension | P1 job preview/save, Jasoseol extraction, auth/API handoff | Extension unit tests and extension build | PASS |
| Company info source | P1 workspace company info source behavior | Backend company info contract tests | PASS |
| No TypeScript policy | Approved stack compliance | Tracked-file scan, dependency scan, text scan | PASS |

## Commands Run

```powershell
# Frontend
npm run test
npm run build
npm ls typescript

# Extension
npm run test
npm run build
npm ls typescript

# Backend
.\mvnw.cmd test

# Static checks
git ls-files | rg "(^|/)(tsconfig[^/]*|.*\.(ts|tsx|mts|cts|d\.ts))$"
rg -n "typescript|TypeScript|tsconfig|vue-tsc|\btsc\b" --glob "!**/node_modules/**" --glob "!**/dist/**" --glob "!**/target/**" .
rg -n "\| [A-Z]+-[0-9]+ \|.*\| P1 \|.*\| (시작 전|진행 중|보류)" docs/04_requirements.md
git diff --check
```

## Results

| Command | Result |
| --- | --- |
| `frontend npm run test` | PASS: 26 test files, 87 tests |
| `frontend npm run build` | PASS |
| `extension npm run test` | PASS: 6 test files, 15 tests |
| `extension npm run build` | PASS |
| `backend .\mvnw.cmd test` | PASS: 47 tests discovered, 46 executed, 1 environment-gated integration test skipped |
| TypeScript tracked-file scan | PASS: no tracked `.ts`, `.tsx`, `.d.ts`, or `tsconfig` files |
| TypeScript dependency scan | PASS: no installed TypeScript dependency in frontend or extension |
| TypeScript text scan | PASS: only documentation contains the expected TypeScript prohibition and QA evidence |
| P1 incomplete requirement scan | PASS: no P1 requirement marked `시작 전`, `진행 중`, or `보류` |
| `git diff --check` | PASS |

## Issues Fixed

| Issue | Fix |
| --- | --- |
| `frontend/package-lock.json` retained TypeScript-related entries after TypeScript removal. | Removed stale TypeScript lockfile entries and verified no tracked TypeScript files or dependencies remain. |
| `backend/src/main/resources/application.yml` provided fallback JWT secrets for production/runtime configuration. | Removed fallback JWT secret values so runtime must receive `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` from environment variables. Added test-only secrets in `backend/src/test/resources/application.yml`. |

## Remaining Limits

- Live Google OAuth and live Notion provider calls were not executed; automated tests use controlled mocks and contract coverage.
- The backend DB integration test remains environment-gated and was skipped unless a local DB test environment is explicitly enabled.
- Browser E2E with a running local app was not run in this QA pass; current coverage is unit, API contract, build, and static verification.
