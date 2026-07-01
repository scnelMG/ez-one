# 29. Decision Log

This document records approved technical and operational decisions for EZ-ONE.
For deployment-specific gates, use `docs/39_production-deployment-runbook.md`.

## Approved Decisions

| ID | Decision | Status | Date | Rationale |
| --- | --- | --- | --- | --- |
| DEC-001 | Use a monorepo containing `backend`, `frontend`, `extension`, `docs`, and `infra`. | Approved | 2026-05-31 | Keeps API contracts, application code, extension code, and release docs close together. |
| DEC-002 | Use MyBatis with MySQL for persistence. | Approved | 2026-05-31 | Fits the approved stack and avoids introducing JPA without explicit scope approval. |
| DEC-003 | Store refresh token hashes in `user_sessions`. | Approved | 2026-05-31 | Supports the single-server MVP without adding Redis while still allowing session revocation. |
| DEC-004 | Store raw Mattermost messages before parsing. | Approved | 2026-05-31 | Preserves source data for parser fixes, deduplication, and auditability. |
| DEC-005 | Use Flyway as the active backend schema migration tool. | Approved | 2026-06-29 | Production deploys need ordered, repeatable schema history. Before production deploy, collect MySQL backup, restore rehearsal, and Flyway rehearsal evidence on staging or a restored-backup database. |

## Pending Decisions

| ID | Decision Needed | Current Direction |
| --- | --- | --- |
| PEND-002 | GitHub repository name | `job-application-workspace` |
| PEND-003 | Repository visibility | Private |

## Release Notes

- Flyway migration files live under `backend/src/main/resources/db/migration`.
- Do not edit migrations that have already run in a shared, staging, or production database.
- Do not run production Flyway `-Apply` without explicit `-AllowProductionMigration` approval and release evidence.
- Do not run production DB restore without explicit `-AllowProductionRestore` approval and release evidence.
