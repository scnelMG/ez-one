# Database Migration Policy

## Decision

EZ-ONE keeps Flyway enabled for backend database schema changes.

We do not disable Flyway as a normal fix for migration failures. If a migration fails, we fix the underlying schema, permission, or migration script issue, then run the migration again through Flyway.

## Why this is the production-style choice

In production teams, database structure is treated like application code:

- Schema changes are reviewed as files in the repository.
- Each environment applies the same ordered migration history.
- CI, staging, and production can detect drift before the app runs against the wrong schema.
- Failed migrations stop the application instead of letting the backend run with a half-updated database.

Turning Flyway off can be useful only as a short local diagnostic workaround. It should not be the project default because it hides schema drift and makes future deploys harder to reason about.

## Current EZ-ONE incident

The Google login callback reached the frontend successfully, but the backend returned:

```text
Request failed with status code 404
```

Root cause:

1. The running backend process was older than the current compiled backend code.
2. The current backend code contains `POST /api/auth/google`.
3. Restarting the backend failed because Flyway migration `V4__add_common_timestamps.sql` could not complete.
4. The failing SQL attempted to create foreign keys referencing `users`.
5. The local MySQL account `ezone_dev` lacks the `REFERENCES` privilege.

Observed failure:

```text
REFERENCES command denied to user 'ezone_dev'@'localhost' for table 'ez_one.users'
```

## Required database privilege

For local development, grant the application migration account the minimum extra privilege needed by the current migrations:

```sql
GRANT REFERENCES ON ez_one.* TO 'ezone_dev'@'localhost';
FLUSH PRIVILEGES;
```

If the MySQL account is configured as `%` instead of `localhost`, use:

```sql
GRANT REFERENCES ON ez_one.* TO 'ezone_dev'@'%';
FLUSH PRIVILEGES;
```

Do not commit database passwords, admin credentials, or real `.env` files.

## Standard workflow

Use this workflow for backend schema changes:

1. Create a new versioned SQL file under `backend/src/main/resources/db/migration`.
2. Never edit a migration that has already been applied to a shared or deployed database.
3. Keep schema changes and data backfills separate when the data operation is non-trivial.
4. Run Flyway against a local database before relying on the app.
5. If Flyway fails, inspect the error, fix the root cause, then run `repair` only after understanding what failed.
6. After repair, rerun migration and verify backend startup.

Recommended commands:

```powershell
cd backend

# Load backend/.env into the current shell before running these.
.\mvnw.cmd org.flywaydb:flyway-maven-plugin:11.7.2:info
.\mvnw.cmd org.flywaydb:flyway-maven-plugin:11.7.2:migrate
.\mvnw.cmd spring-boot:run
```

Use `repair` only for cleanup after a failed migration state has been inspected:

```powershell
.\mvnw.cmd org.flywaydb:flyway-maven-plugin:11.7.2:repair
```

## When Flyway repair is acceptable

Flyway repair is acceptable when:

- A migration failed and left a failed row in `flyway_schema_history`.
- The failed database changes were inspected.
- Any half-applied schema objects were manually cleaned up or confirmed safe.
- The team intends to rerun the same fixed migration path.

Flyway repair is not a substitute for fixing the underlying SQL, permissions, or partially applied schema.

## When disabling Flyway is acceptable

Disabling Flyway is allowed only for a short local diagnostic session when:

- The goal is to inspect unrelated application behavior.
- The database schema is already known to match the code.
- The final fix still restores Flyway and verifies migrations.

Do not ship or commit a configuration change that disables Flyway for normal local, staging, or production use.

## References

- Redgate Flyway command reference: `repair` removes failed migration entries from the schema history table, but may require manual cleanup of migration side effects.
  https://documentation.red-gate.com/flyway/reference/commands/repair
- Redgate Flyway feature summary: Flyway provides migration commands such as `info`, `migrate`, `validate`, `baseline`, and `repair`, and supports versioned migrations.
  https://documentation.red-gate.com/flyway/learn-more-about-flyway/feature-summary
- Redgate Flyway deployment guidance: production rollouts should use validation/pre-flight checks to detect history drift before applying changes.
  https://documentation.red-gate.com/flyway/deploying-database-changes-using-flyway/rolling-out-updates-from-a-single-schema-to-multiple-production-databases

