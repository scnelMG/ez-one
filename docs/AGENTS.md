# Docs AGENTS.md

## Overview

Numbered product, architecture, API, ERD, QA, and release documents; these govern implementation scope.

## Where To Look

| Task | Start Here |
| --- | --- |
| Product requirement | `04_requirements.md` |
| P1 traceability | `23_traceability.md` |
| Screen/route behavior | `09_screen-design.md` |
| Feature behavior | `10_feature-spec.md` |
| Data model | `12_erd.md` |
| API contract | `13_api-spec.md` |
| Test scope | `21_test-plan.md` |
| Deployment | `39_production-deployment-runbook.md`, `41_beginner-deployment-guide.md`, `42_first-deployment-ko.md` |
| Policies/external data | `06_policies.md`, `28_data-collection-mm.md` |

## Conventions

- Keep requirement IDs stable; update traceability when implementation or tests move.
- P1/P2 language matters. Reserved IA is not permission to implement active behavior.
- Update the matching doc when changing API, DB schema, screens, test scope, release process, or stack/setup.
- Release docs should include commands, expected evidence, rollback path, and post-deploy checks.
- Prefer concrete dates and environment names over relative deployment wording.

## Anti-Patterns

- Do not let README or ad hoc notes override `04_requirements.md` and `23_traceability.md`.
- Do not document a feature as active unless code, tests, and release readiness match.
- Do not put secrets, OAuth codes, Notion tokens, private EC2 keys, or user data into docs.
- Do not leave stale local domains, old extension IDs, or `CHANGE_ME` placeholders in production runbooks.

## Low-Risk Verification

```powershell
rg -n "CHANGE_ME|localhost|127\.0\.0\.1|local-dev-access-token" docs
```
