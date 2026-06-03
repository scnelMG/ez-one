# EZ One

EZ One is a job application workspace service for job seekers. Users save job postings, manage them in a basket, write essays in a posting-specific workspace, collect reference materials, and reuse document profile data for application forms.

## Current Status

The repository is in the pre-development/scaffolding phase. Planning documents are ready for P1 implementation, and app scaffolding is the next engineering step.

## Product Scope

P1 focuses on the core preparation loop:

```text
Google login -> onboarding -> main -> job save -> basket -> workspace -> essay/reference/document profile -> Notion JOB_ONLY sync
```

P2 and IA-only items are intentionally deferred:

- Mattermost recommendation collection
- Past application statistics
- Calendar/weekly deadline view
- Independent alert channel
- Automatic JD/news/DART/persona collection
- Extension document input automation
- Customer support screens
- AI/chatbot features

## Tech Stack

| Area | Stack |
| --- | --- |
| Backend | Spring Boot, Spring MVC, Spring Security, JWT, MyBatis |
| Frontend | Vue 3, Vite, Vue Router, Pinia, Axios |
| Extension | Chrome Extension |
| Database | MySQL |
| External | Google OAuth2, Notion API |
| Deploy | AWS EC2 |

## Monorepo Structure

| Path | Purpose |
| --- | --- |
| `backend/` | Spring Boot REST API, authentication, authorization, DB, external integrations |
| `frontend/` | Vue 3 web app, routes, pages, stores, API clients |
| `extension/` | Chrome Extension popup, job extraction, preview, save |
| `docs/` | Implementation-facing Markdown docs copied or summarized from Notion |
| `infra/` | Deployment, environment, database setup, operation scripts |
| `.github/` | Pull request templates and CI configuration |

## Start Here

| Goal | Read |
| --- | --- |
| Understand the product | [docs/04_requirements.md](./docs/04_requirements.md) |
| Start frontend structure | [docs/09_screen-design.md](./docs/09_screen-design.md) |
| Implement backend APIs | [docs/13_api-spec.md](./docs/13_api-spec.md), [docs/10_feature-spec.md](./docs/10_feature-spec.md) |
| Implement DB/migrations | [docs/12_erd.md](./docs/12_erd.md) |
| Plan work order | [docs/18_wbs.md](./docs/18_wbs.md) |
| Verify P1 coverage | [docs/23_traceability.md](./docs/23_traceability.md), [docs/21_test-plan.md](./docs/21_test-plan.md) |
| Use Codex/AI agents | [AGENTS.md](./AGENTS.md) |
| Contribute code | [CONTRIBUTING.md](./CONTRIBUTING.md) |

## Local Setup

App scaffolding is not finalized yet. Once generated, each app must keep setup and run commands in its own README.

Expected files:

```text
backend/.env.example
frontend/.env.example
extension/.env.example
```

Expected ports:

| App | Port |
| --- | --- |
| Backend | `8080` |
| Frontend | `5173` |
| MySQL | `3306` |

Planned command groups:

| App | Commands To Define After Scaffolding |
| --- | --- |
| Backend | build, test, run |
| Frontend | install, dev, build, test |
| Extension | install, build, package |

## Development Rules

- P1/P2/P3 conflicts are resolved by [docs/04_requirements.md](./docs/04_requirements.md).
- API contract changes must update [docs/13_api-spec.md](./docs/13_api-spec.md).
- Database schema or enum changes must update [docs/12_erd.md](./docs/12_erd.md).
- User-visible screen, route, component, or store behavior changes must update [docs/09_screen-design.md](./docs/09_screen-design.md).
- Requirement linkage changes must update [docs/23_traceability.md](./docs/23_traceability.md).
- Test criteria changes must update [docs/21_test-plan.md](./docs/21_test-plan.md).
- Secrets must not be committed.

## Recommended Development Order

1. Scaffold `backend`, `frontend`, and `extension`.
2. Add `.env.example` files and app-level README files.
3. Implement `AUTH-001`, `ONB-001`, and `ONB-002`.
4. Implement the first vertical slice: login, onboarding, main, basket save, workspace auto-creation.
5. Complete the P1 writing loop: canvas, autosave, versions, references, document profile defaults.
6. Complete P1 external integration: Extension job save and Notion `JOB_ONLY` sync.
7. Reassess P2 entry using traceability, tests, and product value.

## Document Index

| Document | Purpose |
| --- | --- |
| [00. Glossary](./docs/00_glossary.md) | Domain terms |
| [04. Requirements](./docs/04_requirements.md) | P1/P2/P3 source of truth |
| [05. Feature Priority](./docs/05_feature-priority.md) | Must/Should/Could scope |
| [06. Policies](./docs/06_policies.md) | Auth, ownership, external failure, Notion policies |
| [07. Use Case Specifications](./docs/07_use-case-specifications.md) | MVP use-case flows |
| [08. User Flow](./docs/08_user-flow.md) | Whole-product user flow and IA |
| [09. Screen Design](./docs/09_screen-design.md) | Frontend route/page/component/store mapping |
| [10. Feature Spec](./docs/10_feature-spec.md) | Feature input/process/output/failure rules |
| [12. ERD](./docs/12_erd.md) | Database design |
| [13. API Spec](./docs/13_api-spec.md) | API contracts |
| [16. System Architecture](./docs/16_system-architecture.md) | System boundaries |
| [17. Tech Stack](./docs/17_tech-stack-and-local-development.md) | Stack and local development baseline |
| [18. WBS](./docs/18_wbs.md) | Work breakdown |
| [20. Codex Instructions](./docs/20_codex-instructions.md) | Agent implementation guide |
| [21. Test Plan](./docs/21_test-plan.md) | P1 test criteria |
| [23. Traceability](./docs/23_traceability.md) | Requirement to API/DB/screen/test linkage |
| [24. Development Start Checklist](./docs/24_development-start-checklist.md) | Pre-development checklist |
| [25. Pre-development Agreements](./docs/25_pre-development-agreements.md) | Fixed agreements |
| [28. mm Data Collection](./docs/28_data-collection-mm.md) | Deferred Mattermost collection scope |
| [29. Decisions](./docs/29_decisions.md) | Decision log |
