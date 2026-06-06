# AGENTS.md

This file defines the rules that AI coding agents must follow in this repository.

For human contribution rules, use `CONTRIBUTING.md`. For project onboarding, use `README.md`.

## Mission

EZ-ONE is a job application workspace service. The P1 product loop is:

```text
Google login -> onboarding -> main -> job save -> basket -> workspace -> essay/reference/document profile -> Notion JOB_ONLY sync
```

P2 features may appear in IA and screen documents, but must not be implemented as active P1 behavior unless the user explicitly approves the scope change.

## Authority Order

When documents conflict, follow this order:

1. User's latest instruction
2. `docs/04_requirements.md`
3. `docs/23_traceability.md`
4. Domain document: `docs/09_screen-design.md`, `docs/10_feature-spec.md`, `docs/12_erd.md`, `docs/13_api-spec.md`, `docs/21_test-plan.md`
5. `README.md`, `CONTRIBUTING.md`, app-level README files

Before implementing, identify the requirement ID. If there is no requirement ID, treat the work as docs/planning or ask before implementing product behavior.

## Required Reading By Task

| Task | Read First |
| --- | --- |
| Any P1 feature | `docs/04_requirements.md`, `docs/23_traceability.md` |
| Frontend route/page/store work | `docs/09_screen-design.md` |
| API work | `docs/13_api-spec.md`, `docs/10_feature-spec.md` |
| DB or migration work | `docs/12_erd.md` |
| Tests | `docs/21_test-plan.md` |
| Stack/setup decisions | `docs/17_tech-stack-and-local-development.md` |
| External collection/sync | `docs/06_policies.md`, `docs/28_data-collection-mm.md` |

## Non-Negotiables

- Do not change the approved stack without explicit user approval.
- Do not promote P2 or IA-only features into P1 implementation.
- Do not push, publish, merge, deploy, or modify third-party resources without explicit user approval.
- Do not commit secrets, real `.env` files, raw tokens, OAuth codes, Notion tokens, or personal data.
- Do not revert user changes unless explicitly requested.
- Do not mark work complete when tests were skipped without saying so.

## Approved Stack

| Area | Stack |
| --- | --- |
| Backend | Spring Boot, Spring MVC, Spring Security, JWT, MyBatis |
| Frontend | Vue 3, Vite, Vue Router, Pinia, Axios |
| Extension | Chrome Extension |
| Database | MySQL |
| External | Google OAuth2, Notion API |
| Deploy | AWS EC2 |

Approval is required before introducing JPA, React, Next.js, Django, FastAPI, Node.js backend, Redis, S3, a separate AI server, or a different database.

## Agent Workflow

1. Inspect the relevant docs and existing files.
2. State the requirement ID and intended scope in your working notes or final response.
3. For non-trivial features, bug fixes, and refactors, write or update the smallest meaningful test first.
4. Make the smallest scoped change that satisfies the request.
5. Update linked docs when API, DB, screen, test, or requirement behavior changes.
6. Run the relevant verification command.
7. Report what changed, what was verified, and what remains risky or untested.

## TDD Workflow

Use TDD by default for non-trivial features, bug fixes, and refactors, but apply it in proportion to risk. The goal is requirement-linked confidence, not ritual or blanket coverage.

1. Identify the requirement ID before writing tests.
2. Write or update the smallest meaningful test for the intended behavior.
3. Run the relevant test and confirm RED for the intended reason.
4. Implement the smallest scoped production change.
5. Rerun the same test and confirm GREEN.
6. Refactor only after GREEN.
7. Run the narrowest meaningful verification before reporting completion.

Prefer confirming a valid RED state before editing production behavior. If the test harness is not ready, the change is scaffolding/exploratory, or the task is a mechanical rename/format change, keep the production change small and state why RED was not practical.

Use lightweight verification instead of full RED/GREEN when the change is low-risk, such as copy changes, static layout polish, reserved route shells, mechanical renames, formatting, or docs-only edits. In those cases, implement narrowly and run the smallest useful check, such as build, typecheck, lint, or an `rg` consistency check.

Keep strict RED/GREEN for behavior that carries product or security risk: business rules, bug fixes with a reproducible failure, API contracts, ownership and authorization checks, validation, duplicate handling, persistence rules, and external integration failure isolation.

Recommended first tests by layer:

| Layer | First TDD Target |
| --- | --- |
| Backend service rule | Service unit test with mapper/client mocks |
| Backend API contract | Controller or API slice test for status, body, and error format |
| MyBatis query | Mapper test or integration test with representative rows |
| Frontend store/API state | Pinia store or API client unit test |
| Frontend page behavior | Component test for a representative success state and the highest-risk failure or permission state |
| Extension extraction | DOM fixture extraction test before popup or save behavior |

Do not chase 80% coverage by adding low-value tests. Prefer requirement-linked tests that cover ownership, validation, duplicate handling, external failure handling, and P1/P2 boundaries. A single high-signal test for the riskiest behavior is better than broad low-value coverage.

## Development Practices

Adopt these practices as part of normal development:

| Practice | Adoption | Why |
| --- | --- | --- |
| TDD red-green-refactor | Default for non-trivial code changes | Keeps implementation tied to requirement IDs and prevents untested behavior drift |
| Outside-in thin slice | Default for P1 user flows | Preserves the product loop without overbuilding P2 behavior |
| Contract-first API changes | Default for API work | Keeps frontend, backend, and docs aligned with `docs/13_api-spec.md` |
| Ownership and authorization checks | Mandatory for user-owned data | Prevents cross-user data access |
| External failure isolation | Mandatory for Google/Notion/extension side effects | Core saves must not roll back because optional sync failed |
| Small commits/checkpoints | Recommended after meaningful green states | Makes review and rollback easier |
| Reserved shells | Use only for documented P2 placeholders | Keeps IA visible without enabling P2 behavior |

Defer these practices until the project actually needs them:

| Practice | Current Decision | Revisit When |
| --- | --- | --- |
| Heavy E2E suite for every screen | Defer | Core P1 routes are scaffolded and stable |
| Performance budgets | Defer | Real frontend pages and API latency baselines exist |
| Mutation testing | Defer | Unit test suite is mature enough to justify the runtime cost |
| Load testing | Defer | Multi-user usage or sync throughput becomes a real requirement |
| Separate AI evaluation harness | Defer | AI-assisted scoring, summarization, or recommendation enters approved scope |

## P1/P2 Boundary

P1 should leave extension points for P2 without implementing P2 behavior.

| P2 Area | P1 Preparation | Do Not Implement In P1 |
| --- | --- | --- |
| Alerts | Keep clear status/deadline events | Independent alert channel |
| Calendar | Store reliable deadlines | Calendar UI/API |
| Mattermost | Keep recommendation source extensible | Raw collection/candidate approval |
| Auto reference collection | Keep reference types explicit | Automated JD/news/DART/persona collection |
| Extension document input | Stabilize document profile model | Auto-fill side panel |
| Notion expanded sync | Keep `sync_scope` enum | Essay/canvas sync |
| Support | Keep IA route reserved | QnA/FAQ/1:1/terms screens |

## Backend Rules

- Keep Controller, Service, Mapper, Client, and DTO responsibilities separate.
- Controllers validate request shape and map responses; services own business rules and transactions.
- Use DTOs for all API requests and responses.
- Do not expose DB rows, MyBatis result maps, or internal models directly.
- Follow `docs/13_api-spec.md` for common response and error format.
- Validate ownership for every user-owned read, update, delete, and side effect.
- Keep external API failures separate from core DB save transactions.
- Use MyBatis as the default persistence approach.

Recommended naming:

```text
AuthController
AuthService
GoogleOAuthClient
CreateBasketJobRequest
BasketJobResponse
BasketJobMapper
BasketJobMapper.xml
```

## Frontend Rules

- Follow the route, page, feature, store, and API mapping in `docs/09_screen-design.md`.
- Page components compose route-level state and feature components.
- Domain UI belongs under `features/<domain>/components`.
- Cross-domain UI belongs under `shared/components`.
- API calls belong in API client modules, not deep UI components.
- Every API-backed page must handle loading, empty, error, unauthorized, and forbidden states.
- P2 routes may exist as disabled/reserved shells only when docs explicitly call for IA preservation.

Recommended naming:

```text
LoginPage.vue
BasketPage.vue
BasketJobTable.vue
ApplicationStatusBadge.vue
basketStore
workspaceStore
basketApi.js
```

## Extension Rules

- P1 extension scope is job posting preview and save, starting with Jasoseol.com.
- Keep site extraction logic separate from popup rendering.
- Treat DOM extraction results as untrusted input.
- Show preview before saving.
- Never silently save incomplete posting data.
- Keep document input automation separate as P2.

## Naming Rules

| Target | Convention | Example |
| --- | --- | --- |
| Java class | `PascalCase` | `BasketJobService` |
| Java method/variable | `camelCase` | `createBasketJob` |
| Java constant/enum | `UPPER_SNAKE_CASE` | `JOB_ONLY` |
| DB table/column | `snake_case` | `basket_jobs` |
| Vue component | `PascalCase.vue` | `BasketJobTable.vue` |
| Pinia store | `<domain>Store` | `basketStore` |
| API client | `<domain>Api.js` | `basketApi.js` |

Preferred terms: `basketJob`, `job`, `workspace`, `documentProfile`, `referenceMaterial`, `essayDraft`, `essayVersion`, `syncScope`.

## Comment Rules

Write comments to explain why, not what. Add comments for ownership checks, transaction boundaries, external failure handling, security decisions, and non-obvious browser/extension behavior.

Good:

```java
// Notion sync failure must not roll back the saved basket job.
```

Avoid:

```java
// Save the job.
```

## Documentation Sync

| Change | Required Doc |
| --- | --- |
| Requirement scope | `docs/04_requirements.md`, `docs/23_traceability.md` |
| API contract | `docs/13_api-spec.md` |
| DB schema, enum, index, migration | `docs/12_erd.md` |
| Screen, route, store, component | `docs/09_screen-design.md` |
| Feature behavior | `docs/10_feature-spec.md` |
| Test behavior | `docs/21_test-plan.md` |
| Stack/setup | `docs/17_tech-stack-and-local-development.md`, `README.md` |

## Verification

Use the narrowest meaningful verification:

- Backend: unit/service tests, API slice tests, or `./mvnw test` once scaffolded.
- Frontend: typecheck/build/unit tests once scaffolded.
- Extension: build and extraction tests once scaffolded.
- Docs-only: run `rg` checks for stale filenames, old IDs, and P1/P2 wording conflicts.

Final responses must mention verification performed and any tests not run.
