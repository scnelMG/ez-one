# EZ-ONE Infra

This directory records deployment and operations guidance for the initial AWS EC2 release.

For a first-time, step-by-step deployment walkthrough, start with
`docs/41_beginner-deployment-guide.md`. Use `docs/39_production-deployment-runbook.md`
as the formal release gate and evidence checklist.

## Deployment Baseline

- Runtime target: single AWS EC2 host behind a reverse proxy.
- Backend: Spring Boot JAR managed by systemd.
- Frontend: Vite production build served by the reverse proxy.
- Database: MySQL with Flyway enabled for schema migrations.
- Secrets: injected through an environment file or external secret manager, never committed.
- Local release evidence paths `secrets/`, `backups/`, and `release-artifacts/` are gitignored and must not be committed.
- EC2 runtime packages: `git`, `openjdk-17-jre-headless`, `nginx`, `unzip`, `rsync`, `curl`, `ca-certificates`, `certbot`, and `mysql-client`.

Reference templates:

- `infra/systemd/ez-one-backend.service`
- `infra/nginx/ez-one.conf`

## Required Release Checks

Run the local release gate before preparing artifacts:

```powershell
.\scripts\release-local-gate.ps1
```

For a first-time deployer, check local deployment tools first:

```powershell
.\scripts\check-deployment-prereqs.ps1
```

On the EC2 host, preview and apply the repeatable base setup:

```bash
bash scripts/bootstrap-ec2-host.sh
DRY_RUN=false bash scripts/bootstrap-ec2-host.sh
```

Validate the filled release evidence file before Go/No-go:

```powershell
.\scripts\new-release-evidence.ps1 -ReleaseId <release-id> -Owner <owner-name>
.\scripts\show-release-evidence-gaps.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json
.\scripts\check-release-evidence.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json
```

The gap report prints `Suggested evidence examples`, `First next command`, and
`Suggested next commands` so operators know which deployment command should
produce the missing evidence and which one to run first.

Validate the production environment file without printing secret values:

```powershell
.\scripts\new-production-env-files.ps1 -Origin https://ez-one.kr -OutputDirectory .\secrets
.\scripts\check-prod-env.ps1 -EnvFile .\secrets\ez-one.prod.env
.\scripts\check-client-prod-env.ps1 -FrontendEnvFile .\secrets\frontend.prod.env -ExtensionEnvFile .\secrets\extension.prod.env
```

Create a production MySQL backup and SHA256 checksum before migration:

```powershell
.\scripts\create-mysql-backup.ps1 -EnvFile .\secrets\ez-one.prod.env -OutputDirectory .\backups
```

Create release artifacts and SHA256 checksums from a clean worktree:

```powershell
.\scripts\package-release-artifacts.ps1 -ReleaseId <yyyyMMdd_HHmm_gitsha> -FrontendEnvFile .\secrets\frontend.prod.env -ExtensionEnvFile .\secrets\extension.prod.env
```

The EC2 deploy script verifies `RELEASE-MANIFEST.txt` and rejects
`git_worktree=dirty` unless `ALLOW_DIRTY_RELEASE=true` is intentionally set for a
rehearsal-only host.
When `BASE_URL` is set for a real deploy, the deploy script also runs
`check-ec2-runtime.sh` so post-deploy health, HTTPS, security headers, systemd
hardening, and env file permissions are checked before the command succeeds.

Dry-run artifact installation on EC2 before applying:

```bash
RELEASE_ID=<release-id> BACKEND_ARTIFACT=/opt/ez-one/incoming/ez-one-backend-<release-id>.jar FRONTEND_ARTIFACT=/opt/ez-one/incoming/ez-one-frontend-<release-id>.zip EXTENSION_ARTIFACT=/opt/ez-one/incoming/ez-one-extension-<release-id>.zip RELEASE_MANIFEST=/opt/ez-one/incoming/RELEASE-MANIFEST.txt CHECKSUM_FILE=/opt/ez-one/incoming/SHA256SUMS.txt BASE_URL=https://ez-one.kr bash scripts/deploy-ec2-release.sh
```

`BASE_URL`/`BaseUrl` must be the deployed HTTPS domain, not `localhost`,
`127.0.0.1`, `0.0.0.0`, or an origin with `/api` appended.

Rehearse Flyway against staging or a restored production backup before touching production:

```powershell
.\scripts\rehearse-mysql-restore.ps1 -EnvFile .\secrets\ez-one.staging.env -BackupFile .\backups\ez_one_<yyyyMMdd_HHmmss>.sql -ExpectedAppEnv staging
.\scripts\rehearse-mysql-restore.ps1 -EnvFile .\secrets\ez-one.staging.env -BackupFile .\backups\ez_one_<yyyyMMdd_HHmmss>.sql -ExpectedAppEnv staging -Apply
.\scripts\rehearse-flyway-release.ps1 -EnvFile .\secrets\ez-one.staging.env -ExpectedAppEnv staging
.\scripts\rehearse-flyway-release.ps1 -EnvFile .\secrets\ez-one.staging.env -ExpectedAppEnv staging -Apply
```

Run the post-deploy canary every 5 minutes for 30 minutes:

```powershell
$canaryLog = ".\.codex-run-logs\release-canary-$(Get-Date -Format yyyyMMdd-HHmmss).log"
.\scripts\run-release-canary.ps1 -BaseUrl https://ez-one.kr -AccessToken <canary-access-token> -WorkspaceId <workspace-id> -RequireWorkspace -LogFile $canaryLog
```

Authenticated canary checks fail when `-AccessToken` is missing. Use `-AllowAnonymousOnly` only for a frontend shell, `/login` SPA fallback, and health smoke check; it cannot be combined with `-WorkspaceId`, `-RequireWorkspace`, or `-RunNotionSync`. For a production Go decision, use a canary test account that already has at least one workspace and keep `-RequireWorkspace` in the command. Use `-RunNotionSync` only with a test account and a Notion database intended for release verification.

Run this on the EC2 host before opening traffic:

```bash
BASE_URL=https://ez-one.kr SERVICE_NAME=ez-one-backend bash scripts/check-ec2-runtime.sh
```

The same checker is invoked automatically by deploy and rollback when
`BASE_URL` is set with `DRY_RUN=false`; run it manually when you need a separate
evidence log.

Dry-run rollback paths before executing an emergency rollback:

```bash
BACKEND_ARTIFACT=/opt/ez-one/releases/<previous>/ez-one-backend-<previous>.jar FRONTEND_ARTIFACT=/opt/ez-one/releases/<previous>/ez-one-frontend-<previous>.zip EXTENSION_ARTIFACT=/opt/ez-one/releases/<previous>/ez-one-extension-<previous>.zip RELEASE_MANIFEST=/opt/ez-one/releases/<previous>/RELEASE-MANIFEST.txt CHECKSUM_FILE=/opt/ez-one/releases/<previous>/SHA256SUMS.txt BASE_URL=https://ez-one.kr bash scripts/rollback-ec2-release.sh
```

## Production Rules

- Do not commit real `.env` files, OAuth secrets, JWT secrets, Notion tokens, or user data.
- Keep `APP_ENV=prod`, `SPRING_PROFILES_ACTIVE=mysql`, `SERVER_ADDRESS=127.0.0.1`, `AUTH_LOCAL_DEV_TOKEN_ENABLED=false`, `APP_DOCS_ENABLED=false`, `AUTH_REFRESH_COOKIE_SECURE=true`, `AUTH_REFRESH_COOKIE_SAME_SITE` intentional, `FLYWAY_ENABLED=true`, and `SQL_INIT_MODE=never`.
- Use exact HTTPS values in `CORS_ALLOWED_ORIGINS`; no wildcard, localhost, or plain HTTP origins.
- Use non-placeholder, distinct `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` values, a Base64-encoded 32-byte `NOTION_TOKEN_ENCRYPTION_KEY`, and HTTPS non-local OAuth/Notion API URLs when overriding defaults.
- Keep the previous backend JAR, frontend `dist`, extension artifact, and DB backup available for rollback.
- Keep `ez-one-backend` and `nginx` enabled so both services start after an EC2 reboot.
- Document the systemd unit, env file path, reverse proxy config path, and log paths for the deployed host.
