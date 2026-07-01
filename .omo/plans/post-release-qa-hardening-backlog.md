# post-release-qa-hardening-backlog - Work Plan

## TL;DR (For humans)

**What you'll get:** A repo-backed post-release QA and hardening backlog that tells us exactly what to verify or improve next after the first production release. It will separate urgent release evidence, security hardening, and operator-quality improvements so we do not mix “ship blocker” work with “nice polish.”

**Why this approach:** The current release docs already show strong local gates, but production remains No-go until real integration smoke, canary, rollback, and DB rehearsal evidence exist. The plan therefore creates a durable backlog document first, then checks that every item has an owner-ready acceptance test and evidence path.

**What it will NOT do:** It will not implement product features, change production resources, expand P2 scope, or touch secrets. It will not claim external QA is complete without actually running the real browser/extension/canary evidence later.

**Effort:** Short
**Risk:** Medium - the work is docs/backlog focused, but the subject matter spans security, release, DB, extension, and external integrations.
**Decisions I made for you:** Prioritize P0 release evidence and real-user smoke first; P1 security/session/env/upload/external API hardening second; P2 operator-proofing and automation third.

Your next move: Let `start-work` execute this plan. Full execution detail follows below.

---

> TL;DR (machine): Create and verify a prioritized post-release QA/hardening backlog document, with no product code or production mutation.

## Scope

### Must have

- Create `docs/43_post_release_qa_hardening_backlog.md`.
- Backlog must be ordered as P0/P1/P2 and reference the repo evidence that motivated each item.
- Include concrete acceptance criteria and exact agent-executable verification scenarios for each backlog item.
- Cover these components: real-browser P1 smoke, loaded Chrome Extension smoke, canary/release evidence, backend/session/security hardening, external integration hardening, DB/session hygiene, upload/static exposure, infra/runbook reliability.
- Keep P1/P2 boundaries intact; this is backlog documentation and follow-up task definition, not implementation of P2 features.
- Verify the doc with grep/markdown consistency checks and a reviewer pass.

### Must NOT have (guardrails, anti-slop, scope boundaries)

- Do not edit backend, frontend, extension, infra, scripts, or production env files in this plan.
- Do not use real production user data, secrets, OAuth codes, Notion tokens, API keys, cookies, screenshots with private data, or `.env` values.
- Do not mutate AWS, DNS, Google Cloud, Chrome Web Store, Notion, EC2, or production DB state.
- Do not mark release gates complete; backlog entries may describe required future evidence only.
- Do not create active P2 product behavior such as alerts, calendar, expanded Notion sync, support, or new recommendation sources.

## Verification strategy

> Zero human intervention - all verification is agent-executed.

- Test decision: no code tests for the main artifact because the change is documentation/backlog only; use docs consistency checks, targeted grep, and independent review.
- Evidence:
  - `.omo/evidence/task-1-post-release-qa-hardening-backlog.md`
  - `.omo/evidence/task-2-post-release-qa-hardening-backlog.md`
  - `.omo/evidence/task-3-post-release-qa-hardening-backlog.md`
  - `.omo/evidence/final-post-release-qa-hardening-backlog.md`

## Execution strategy

### Parallel execution waves

- Wave 1: T1 creates the backlog document.
- Wave 2: T2 validates content against source docs and P1/P2 boundaries; T3 validates security/release hardening coverage. These run in parallel after T1.
- Wave 3: F1-F4 final verification wave runs after all todos are complete.

### Dependency matrix

| Todo | Depends on | Blocks | Can parallelize with |
| --- | --- | --- | --- |
| T1 | none | T2, T3, F1-F4 | none |
| T2 | T1 | F1-F4 | T3 |
| T3 | T1 | F1-F4 | T2 |
| F1 | T1, T2, T3 | completion | F2, F3, F4 |
| F2 | T1, T2, T3 | completion | F1, F3, F4 |
| F3 | T1, T2, T3 | completion | F1, F2, F4 |
| F4 | T1, T2, T3 | completion | F1, F2, F3 |

## Todos

> Implementation + Test = ONE todo. Never separate.

- [x] T1. Create the post-release QA and hardening backlog document
  What to do / Must NOT do: Create `docs/43_post_release_qa_hardening_backlog.md` with sections for purpose, release-state snapshot, priority legend, P0/P1/P2 backlog tables, execution order, evidence policy, and scope boundaries. Must not claim any future QA has already passed.
  Parallelization: Wave 1 | Blocked by: none | Blocks: T2, T3, F1-F4
  References (executor has NO interview context - be exhaustive): `docs/38_release-readiness-qa.md`, `docs/21_test-plan.md`, `docs/23_traceability.md`, `docs/39_production-deployment-runbook.md`, `scripts/run-release-canary.ps1`, `scripts/show-release-evidence-gaps.ps1`, `backend/src/main/resources/application.yml`, `backend/src/main/java/com/ezone/backend/config/WebMvcConfig.java`, `backend/src/main/java/com/ezone/backend/service/StudyService.java`, `backend/src/main/java/com/ezone/backend/mapper/UserSessionMapper.java`, `infra/nginx/ez-one.conf`
  Acceptance criteria (agent-executable): `test -f docs/43_post_release_qa_hardening_backlog.md`; `grep -q "P0" docs/43_post_release_qa_hardening_backlog.md`; `grep -q "P1" docs/43_post_release_qa_hardening_backlog.md`; `grep -q "P2" docs/43_post_release_qa_hardening_backlog.md`; `grep -q "Must NOT" docs/43_post_release_qa_hardening_backlog.md`; `grep -q "Evidence" docs/43_post_release_qa_hardening_backlog.md`
  QA scenarios (name the exact tool + invocation): Data-shaped doc proof with Git Bash: `sed -n '1,260p' docs/43_post_release_qa_hardening_backlog.md > .omo/evidence/task-1-post-release-qa-hardening-backlog.md`; PASS iff output contains P0/P1/P2 tables and no item is marked completed. Failure scenario: `grep -n "완료\\|passed\\|complete" docs/43_post_release_qa_hardening_backlog.md`; PASS iff any occurrence clearly refers to existing source evidence or future acceptance, not a new done claim.
  Commit: Y | `docs(release): add post-release qa hardening backlog`

- [x] T2. Validate backlog against release QA, user-flow, and P1/P2 boundaries
  What to do / Must NOT do: Review the created backlog against release docs and active P1 flows. Fix omissions in the backlog document only. Must not add new P2 product work as active implementation.
  Parallelization: Wave 2 | Blocked by: T1 | Blocks: F1-F4
  References (executor has NO interview context - be exhaustive): `docs/04_requirements.md`, `docs/21_test-plan.md`, `docs/23_traceability.md`, `docs/38_release-readiness-qa.md`, `docs/09_screen-design.md`, `extension/tests/popupScript.test.js`, `extension/tests/applicationAutoFill.test.js`, `frontend/src/pages/LoginPage.test.js`, `frontend/src/pages/BasketPage.test.js`, `frontend/src/pages/WorkspacePage.test.js`, `frontend/src/pages/NotionSettingsPage.test.js`
  Acceptance criteria (agent-executable): `grep -q "Google login" docs/43_post_release_qa_hardening_backlog.md`; `grep -q "Notion" docs/43_post_release_qa_hardening_backlog.md`; `grep -q "Extension" docs/43_post_release_qa_hardening_backlog.md`; `grep -q "workspace" docs/43_post_release_qa_hardening_backlog.md`; `grep -q "P2" docs/43_post_release_qa_hardening_backlog.md`
  QA scenarios (name the exact tool + invocation): Git Bash route-scope proof: `grep -n "login\\|onboarding\\|basket\\|workspace\\|document profile\\|Notion\\|Extension" docs/43_post_release_qa_hardening_backlog.md > .omo/evidence/task-2-post-release-qa-hardening-backlog.md`; PASS iff every P1 loop surface appears with a future verification item. Failure scenario: `grep -n "expanded Notion\\|calendar implementation\\|alert implementation\\|support implementation" docs/43_post_release_qa_hardening_backlog.md`; PASS iff no line presents those as active P1 implementation.
  Commit: amend same docs commit if needed; otherwise N

- [x] T3. Validate backlog against security, external integration, DB, upload, and infra hardening gaps
  What to do / Must NOT do: Review the created backlog against backend/security/release evidence findings. Fix omissions in the backlog document only. Must not change env files or production scripts in this plan.
  Parallelization: Wave 2 | Blocked by: T1 | Blocks: F1-F4
  References (executor has NO interview context - be exhaustive): `backend/src/main/resources/application.yml`, `backend/src/main/resources/db/migration/V1__create_p1_schema.sql`, `backend/src/main/resources/schema-mysql.sql`, `backend/src/main/java/com/ezone/backend/mapper/UserSessionMapper.java`, `backend/src/main/java/com/ezone/backend/config/WebMvcConfig.java`, `backend/src/main/java/com/ezone/backend/service/StudyService.java`, `scripts/check-prod-env.ps1`, `scripts/check-client-prod-env.ps1`, `scripts/check-ec2-runtime.sh`, `infra/nginx/ez-one.conf`
  Acceptance criteria (agent-executable): `grep -q "PUBLIC_DATA_API_KEY" docs/43_post_release_qa_hardening_backlog.md`; `grep -q "HTTPS" docs/43_post_release_qa_hardening_backlog.md`; `grep -q "refresh" docs/43_post_release_qa_hardening_backlog.md`; `grep -q "uploads" docs/43_post_release_qa_hardening_backlog.md`; `grep -q "Nginx" docs/43_post_release_qa_hardening_backlog.md`
  QA scenarios (name the exact tool + invocation): Git Bash hardening proof: `grep -n "PUBLIC_DATA_API_KEY\\|GMS\\|Mattermost\\|HTTPS\\|refresh\\|uploads\\|Nginx\\|rollback\\|DB rehearsal" docs/43_post_release_qa_hardening_backlog.md > .omo/evidence/task-3-post-release-qa-hardening-backlog.md`; PASS iff all named hardening surfaces are present. Failure scenario: `grep -n "secret\\|token\\|cookie\\|password" docs/43_post_release_qa_hardening_backlog.md`; PASS iff lines are policy/guidance only and do not expose raw values.
  Commit: amend same docs commit if needed; otherwise N

## Final verification wave

> Runs in parallel after ALL todos. ALL must APPROVE. Surface results and wait for the user's explicit okay before declaring complete.

- [x] F1. Plan compliance audit
- [x] F2. Code quality review
- [x] F3. Real manual QA
- [x] F4. Scope fidelity

## Commit strategy

- Commit once after T1-T3 and final verification pass.
- Conventional commit: `docs(release): add post-release qa hardening backlog`
- Do not commit `.omo/evidence` unless the user explicitly wants evidence artifacts in git.
- Include plan footer if committing through OMO flow: `Plan: .omo/plans/post-release-qa-hardening-backlog.md`

## Success criteria

- `docs/43_post_release_qa_hardening_backlog.md` exists and is actionable by a developer/operator without this chat context.
- The backlog contains P0/P1/P2 priorities and maps every item to acceptance criteria plus an evidence command or manual QA channel.
- The backlog covers P1 real-browser flows, loaded extension flows, release evidence/canary, backend/session/security, external integration, DB/session hygiene, upload/static handling, and infra/runbook reliability.
- The backlog does not claim future external QA has passed and does not expand P2 behavior into P1.
- `git diff --check` passes.
- Independent reviewer confirms the backlog is accurate, non-secret, and executable.
