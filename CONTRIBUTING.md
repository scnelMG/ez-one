# Contributing

This document defines how people contribute code and docs to EZ One. Agent-specific rules live in `AGENTS.md`.

## Before You Start

1. Find the requirement ID in `docs/04_requirements.md` for product behavior changes.
2. Confirm P1/P2/P3 scope before implementing behavior.
3. Read only the domain docs that match the task:

| Task | Read |
| --- | --- |
| Feature behavior | `docs/10_feature-spec.md`, `docs/23_traceability.md` |
| Screen, route, component, or store work | `docs/09_screen-design.md` |
| API changes | `docs/13_api-spec.md` |
| DB tables, enums, indexes, or migrations | `docs/12_erd.md` |
| Test criteria changes | `docs/21_test-plan.md` |

Do not start from memory when the docs define the behavior.

## Branch Workflow

- Keep `main` stable and deployable.
- Create a short-lived branch for each requirement, bug fix, docs update, refactor, or test task.
- Branch from the latest `main`.
- Keep branches focused on one requirement ID, bug, or mechanical change.
- Prefer small PRs that can be reviewed in one sitting.
- Do not mix unrelated backend, frontend, extension, and docs changes unless they belong to the same requirement or vertical slice.
- Delete merged branches after merge.

## Branch Rules

| Work | Branch Format | Example |
| --- | --- | --- |
| Feature | `feat/<domain>-<short-name>` | `feat/auth-google-login` |
| Bugfix | `fix/<domain>-<short-name>` | `fix/basket-duplicate-save` |
| Docs | `docs/<short-name>` | `docs/frontend-conventions` |
| Refactor | `refactor/<domain>-<short-name>` | `refactor/workspace-service` |
| Test | `test/<domain>-<short-name>` | `test/notion-sync-log` |

Use lowercase English names and hyphens.

## Commit Messages

Format:

```text
<type>(<scope>): <summary>
```

Allowed types:

| Type | Use |
| --- | --- |
| `feat` | New requirement-facing behavior |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | Internal change without behavior change |
| `test` | Test addition or fix |
| `chore` | Build, config, dependency, maintenance |

Recommended scopes:

```text
auth
onboarding
dashboard
basket
workspace
references
document-profile
recommendations
notion
extension
infra
docs
```

Examples:

```text
feat(auth): add Google login callback
feat(basket): create workspace when saving job
fix(workspace): block access to another user's draft
docs(api): update basket job response
test(notion): cover job-only sync failure log
chore(frontend): configure Vite aliases
```

Keep one commit focused on one requirement, bug, or mechanical change.

## Pull Request Checklist

Every PR should include:

- Requirement ID
- Scope: P1, P2, IA-only, docs, or chore
- Summary of behavior changes
- Screenshots or screen notes for UI changes
- API/DB/doc changes
- Tests run
- Known limitations or follow-up work

Do not mix unrelated features. A PR may touch `backend`, `frontend`, and `extension` only when the changes belong to the same requirement or vertical slice.

## Review Standard

Reviewers should check:

- Requirement scope matches `docs/04_requirements.md`.
- P2 behavior was not accidentally promoted into P1.
- API responses use DTOs and common response/error format.
- User-owned data enforces ownership.
- External failures do not roll back core saves unless explicitly required.
- Tests cover normal and representative failure cases.
- Linked docs are updated.
- No secrets, real tokens, or personal data are present.

## Code Style

- Prefer clear names over comments.
- Keep functions small enough to review.
- Keep domain logic out of controllers and page components.
- Keep request/response DTOs separate from DB models.
- Do not expose DB rows or internal models through API responses.
- Do not introduce abstractions before duplication or complexity justifies them.

## Naming Conventions

| Target | Convention | Example |
| --- | --- | --- |
| Java class | `PascalCase` | `BasketJobService` |
| Java method/variable | `camelCase` | `createBasketJob` |
| Java constant/enum | `UPPER_SNAKE_CASE` | `JOB_ONLY` |
| DB table/column | `snake_case` | `basket_jobs`, `workspace_id` |
| Vue component | `PascalCase.vue` | `BasketJobTable.vue` |
| Frontend function/variable | `camelCase` | `saveBasketJob` |
| Pinia store | `<domain>Store` | `basketStore` |
| API client file | `<domain>Api.ts` | `basketApi.ts` |
| Test file | Match target name | `BasketJobServiceTest` |

Preferred domain terms:

| Meaning | Code Term |
| --- | --- |
| Saved posting | `basketJob` |
| Original posting | `job` |
| Application workspace | `workspace` |
| Document input information | `documentProfile` |
| Reference material | `referenceMaterial` |
| Essay draft | `essayDraft` |
| Essay version | `essayVersion` |
| Sync scope | `syncScope` |

## Backend Conventions

Recommended package direction:

```text
backend/src/main/java/.../
  auth/
  profile/
  dashboard/
  basket/
  workspace/
  reference/
  documentprofile/
  recommendation/
  notion/
  common/
```

Layer rules:

- `Controller`: request shape, auth principal, response mapping
- `Service`: transaction boundary and business rules
- `Mapper`: MyBatis DB access
- `Client`: external API calls
- `DTO`: API request/response contract

Transaction rules:

- Core DB save should not be rolled back by optional external sync failure.
- Ownership checks must happen before returning or mutating user-owned data.
- Duplicate job save should return the existing basket job/workspace path.

Migration rules:

- DB changes must update `docs/12_erd.md`.
- Enum changes must update API docs, tests, and any frontend constants.
- Migration filenames and rollback expectations must be documented once the migration tool is finalized.

## Frontend Conventions

Use the route and feature mapping in `docs/09_screen-design.md`.

Recommended structure:

```text
frontend/src/
  app/
    router/
    stores/
    layouts/
  pages/
  features/
  shared/
```

Rules:

- Page components compose feature components and route-level state.
- Feature components own domain UI.
- Shared components must be domain-neutral.
- API calls should live in `features/<domain>/api` or `shared/api`.
- Pinia stores keep state and actions, not large rendering logic.
- Every API-backed page handles loading, empty, error, unauthorized, and forbidden states.
- P2 routes should be disabled/reserved unless explicitly approved.

## Extension Conventions

Recommended structure:

```text
extension/src/
  popup/
  content/
  background/
  shared/
```

Rules:

- Keep site extraction separate from popup rendering.
- Treat DOM extraction results as untrusted input.
- Show preview before saving.
- Never silently save incomplete posting data.
- Keep P2 document input automation separate from P1 job save.

## Comment Rules

Write comments when they explain a decision the code cannot express well.

Comment when:

- Ownership or permission logic is easy to misuse
- Transaction boundaries matter
- External API failure must not block core save
- Browser/extension behavior depends on site-specific DOM assumptions
- A policy from `docs/06_policies.md` affects implementation

Avoid comments that restate the code.

Good:

```java
// Notion sync failure must not roll back the saved basket job.
```

Avoid:

```java
// Save basket job.
```

## Test Rules

P1 work requires normal and representative failure cases.

| Domain | Required Cases |
| --- | --- |
| Auth | unauthenticated, expired token, forbidden ownership |
| Basket | duplicate URL, workspace auto-creation, deadline state |
| Workspace | autosave success/failure, version creation, forbidden access |
| References | create, read side panel, ownership failure |
| Document Profile | section save, custom field CRUD |
| Extension | extraction success, missing field, duplicate save, DOM change failure |
| Notion | expired connection, schema change, sync failure log, core save continuation |

If tests cannot be run, state the reason in the PR or final handoff.

## Documentation Update Rules

| Change | Required Doc |
| --- | --- |
| Requirement scope | `docs/04_requirements.md`, `docs/23_traceability.md` |
| API contract | `docs/13_api-spec.md` |
| DB table, enum, index, migration | `docs/12_erd.md` |
| Screen, route, store, component | `docs/09_screen-design.md` |
| Feature behavior | `docs/10_feature-spec.md` |
| Test criteria | `docs/21_test-plan.md` |
| Tech stack or local setup | `docs/17_tech-stack-and-local-development.md`, `README.md` |

## Security Rules

- Do not commit real secrets or `.env` files.
- Do not log tokens, OAuth codes, Notion tokens, or raw personal data.
- Validate user input at API boundaries.
- Validate extracted external site data before saving.
- Check ownership on every user-owned query and mutation.
- Keep examples synthetic.

## Definition Of Done

A task is done only when:

- The requirement ID is satisfied within its approved scope.
- API, DB, screen, and test docs still match the implementation.
- Relevant tests pass or skipped tests are explained.
- Ownership and external failure behavior are handled.
- P2 behavior was not accidentally promoted into P1.
