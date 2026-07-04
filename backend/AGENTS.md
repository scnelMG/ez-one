# Backend AGENTS.md

## Overview

Spring Boot API for auth, onboarding, basket jobs, workspace, document profiles, studies, Notion sync, and external data integrations.

Local paths below are relative to `backend`; repository docs are referenced from `../docs`.

## Structure

| Path | Purpose |
| --- | --- |
| `src/main/java/com/ezone/backend/controller` | HTTP API boundaries and request/response mapping. |
| `src/main/java/com/ezone/backend/service` | Business rules, transactions, ownership checks, external failure isolation. |
| `src/main/java/com/ezone/backend/mapper` | MyBatis mapper interfaces. |
| `src/main/resources/mapper` | MyBatis XML SQL. |
| `src/main/resources/db/migration` | Flyway migrations; append-only once shared. |
| `src/main/java/com/ezone/backend/dto` | API DTOs. Do not expose persistence models. |
| `src/main/java/com/ezone/backend/security` | JWT, cookie/session, and access-control rules. |
| `src/test/java/com/ezone/backend` | Unit, controller, mapper, and P1 contract tests. |

## Where To Look

| Task | Start Here |
| --- | --- |
| API contract change | `../docs/13_api-spec.md`, then controller and DTO. |
| DB change | `../docs/12_erd.md`, then `db/migration` and mapper XML. |
| Ownership/access bug | Service method first, then mapper query and controller principal mapping. |
| Notion or external API behavior | Service/client pair; core DB save must survive optional integration failure. |
| Release env behavior | `src/main/resources/application*.yml` and `scripts/check-prod-env.ps1`. |

## Conventions

- Controllers validate shape and map responses; services own business decisions.
- MyBatis is the persistence default. Do not introduce JPA.
- Keep request/response DTOs separate from persistence/domain rows.
- Validate user ownership on every user-owned read, write, delete, sync, and export.
- Prefer focused tests: service tests with mapper/client mocks, controller/API contract tests for status/body/error format, mapper tests for SQL behavior.

## Anti-Patterns

- Do not put SQL strings in controllers or services.
- Do not let Notion, Google, Mattermost, DART, or public-data failures roll back core basket/workspace saves unless the requirement explicitly says so.
- Do not hardcode local URLs, tokens, OAuth codes, or production secrets.
- Do not edit old shared Flyway migrations to reshape production data; add a new migration.
- Do not expose stack traces, internal table names, or raw mapper rows through API errors.

## Commands

```powershell
cd backend
.\mvnw.cmd test
.\mvnw.cmd "-Dtest=ClassName" test
.\mvnw.cmd -DskipTests package
```
