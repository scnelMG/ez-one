# 39. Production Deployment Runbook

Status: release execution template. Do not mark production go-live complete until every evidence row is filled with real staging or production output.

First time deploying? Read the Korean execution guide
`docs/42_first-deployment-ko.md` or the English walkthrough
`docs/41_beginner-deployment-guide.md` first, then come back to this runbook for
the release gates and evidence checklist.

## Scope

P1 release loop:

```text
login -> onboarding -> main -> job save -> basket -> workspace -> essay/reference/document profile -> Notion JOB_ONLY sync
```

Out of scope for this release: new P2 behavior, new infrastructure stack, production data mutation outside the approved migration/deploy path.

## Gate 0: Local Release Gate

Run from the repository root:

```powershell
New-Item -ItemType Directory -Force .\.codex-run-logs | Out-Null
$gateLog = ".\.codex-run-logs\release-local-gate-full-$(Get-Date -Format yyyyMMdd-HHmmss).log"
.\scripts\release-local-gate.ps1 -LogFile $gateLog
```

`-SkipSlow` is only for fast local iteration. Do not use `-SkipSlow` output as
final release evidence; `scripts/new-release-evidence.ps1 -LocalGateLog`
rejects local gate logs that contain `[SKIP]` or `[FAIL]` markers.

Evidence to attach:

| Item | Evidence |
| --- | --- |
| Command timestamp | |
| Backend tests/package | |
| Frontend audit/test/build | |
| Extension audit/test/build/build:local | |
| Diff/secret/mojibake guards | |
| Release artifact and evidence contract checks | |

After Gate 0 passes, initialize the release evidence file immediately. Later
checklist generators and import helpers write beside or into this file:

```powershell
.\scripts\new-release-evidence.ps1 -ReleaseId <release-id> -Owner <owner-name> -LocalGateLog $gateLog
```

## Gate 1: Production Env Policy

Create the first local env files with generated JWT and Notion encryption keys:

```powershell
.\scripts\new-production-env-files.ps1 -Origin https://ez-one.kr -OutputDirectory .\secrets
```

Replace every `CHANGE_ME_*` value with the real MySQL, Google, and Notion
production values before validation. The helper will not overwrite existing env
files unless `-Force` is passed.

Validate the production env file without printing secret values:

```powershell
.\scripts\check-prod-env.ps1 -EnvFile .\secrets\ez-one.prod.env
.\scripts\check-client-prod-env.ps1 -FrontendEnvFile .\secrets\frontend.prod.env -ExtensionEnvFile .\secrets\extension.prod.env
```

Generate the evidence checklist beside the release evidence file:

```powershell
.\scripts\new-production-env-evidence-checklist.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json
```

Fill `production-env-evidence-checklist.md` with command output, EC2 env file
owner/mode evidence, and secret owner/rotation notes. Do not paste raw secrets.

Required values:

| Key | Required production policy |
| --- | --- |
| `APP_ENV` | `prod` |
| `SPRING_PROFILES_ACTIVE` | `mysql` |
| `AUTH_LOCAL_DEV_TOKEN_ENABLED` | `false` |
| `APP_DOCS_ENABLED` | `false` |
| `AUTH_REFRESH_COOKIE_SECURE` | `true` |
| `AUTH_REFRESH_COOKIE_SAME_SITE` | one of `Strict`, `Lax`, `None`; choose intentionally for deployed web origin |
| `AUTH_REFRESH_COOKIE_MAX_AGE_SECONDS` | positive integer |
| `FLYWAY_ENABLED` | `true` |
| `SQL_INIT_MODE` | `never` |
| `SERVER_ADDRESS` | `127.0.0.1` behind the EC2 reverse proxy |
| `CORS_ALLOWED_ORIGINS` | exact HTTPS origins only |
| `APP_PUBLIC_BASE_URL` | deployed HTTPS origin only; used for user-facing backend links such as study invite and uploaded image URLs |
| `VITE_GOOGLE_REDIRECT_URI` | exact HTTPS frontend route `/login/callback` |
| `VITE_NOTION_REDIRECT_URI` | exact HTTPS frontend route `/mypage/notion` |
| `VITE_EXTENSION_INSTALL_URL`, `VITE_EXTENSION_ID` | install URL must be a non-empty Chrome Web Store URL and must include `VITE_EXTENSION_ID`; ID must be the expected 32-character Chrome extension ID |
| `DB_HOST`, `DB_NAME`, `DB_USERNAME` | present and non-placeholder; `DB_USERNAME` must not be `root` |
| `DB_PORT` | positive integer when set |
| `DB_PASSWORD` | present, non-placeholder, and at least 16 characters |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | at least 32 characters, non-placeholder, and different from each other |
| `JWT_ACCESS_TTL_MINUTES`, `JWT_REFRESH_TTL_DAYS` | positive integer when set |
| `GOOGLE_CLIENT_ID`, `NOTION_CLIENT_ID` | present and non-placeholder |
| `GOOGLE_CLIENT_SECRET`, `NOTION_CLIENT_SECRET` | present, non-placeholder, and at least 16 characters |
| `GOOGLE_TOKEN_URI`, `GOOGLE_USER_INFO_URI` | must match the official Google production endpoints |
| `NOTION_AUTHORIZATION_URI`, `NOTION_TOKEN_URI`, `NOTION_PAGES_URI`, `NOTION_DATABASES_URI` | must match the official Notion production endpoints |
| `NOTION_TOKEN_ENCRYPTION_KEY` | Base64-encoded 32-byte key |

Enabled integrations require their matching production key. Disabled integrations may omit keys, including `PUBLIC_DATA_API_KEY`, `OPENDART_API_KEY`, `GMS_API_KEY`, and `MATTERMOST_WEBHOOK_SECRET(S)` when the related integration is off. `COMPANY_ENRICHMENT_REALTIME_ENABLED=false` is the generated production default; if realtime enrichment is enabled, record the `PUBLIC_DATA_API_KEY` validation evidence without printing the key value.
`COMPANY_DATA_STARTUP_SYNC_ENABLED=false` and
`COMPANY_DATA_BATCH_SYNC_ENABLED=false` must stay false in production unless a
future approved release policy changes that rule.

Provider URL review table:

| Provider env key | Production review rule |
| --- | --- |
| `GMS_AI_BASE_URL`, `GMS_KEY_INFO_URL` | HTTPS only, non-local, expected host `gms.ssafy.io`; key-info path is `/gmsapi/key-info`. |
| `OPENDART_API_BASE_URL`, `OPENDART_VIEWER_BASE_URL`, `OPENDART_COMPANY_OVERVIEW_SOURCE_URL` | HTTPS only, non-local, expected OpenDART/DART hosts and documented paths; the company overview source URL must preserve `apiGrpCd=DS001` and `apiId=2019002`. |
| `VENTURE_COMPANY_API_URL`, `NATIONAL_PENSION_API_URL`, `PUBLIC_INSTITUTION_API_URL`, `FTC_AFFILIATE_API_URL` | Exact `apis.data.go.kr` host/path; HTTP is allowed only for these public-data endpoints. |
| `FINANCIAL_COMPANY_BASIC_INFO_URL`, `MIDDLE_MARKET_API_URL` | May be blank; if present, HTTPS only and non-local. |

For each justified HTTP public-data endpoint, add a data-sensitivity note to
release evidence confirming no secrets, auth headers, cookies, or personal data
are sent to that endpoint. The client localhost/generic fallbacks are deferred only because production env/artifact validators require explicit HTTPS env overrides for frontend and extension artifacts.

Production env helpers reject `localhost`, `127.*`, `0.0.0.0`, and loopback
hosts for public origins, client API URLs, CORS origins, and external OAuth or
Notion API endpoints. They also require the official Google/Notion production endpoints
so a typo or proxy URL cannot become release evidence.
`SERVER_ADDRESS=127.0.0.1` remains intentional because the backend binds behind
Nginx on the EC2 host.

Evidence:

| Item | Evidence |
| --- | --- |
| Env policy check output | |
| Client env policy check output | |
| Env file path on EC2 | |
| Secret owner/rotation note | |

## Gate 2: DB Backup And Migration Rehearsal

Create a MySQL backup before migration:

```powershell
.\scripts\create-mysql-backup.ps1 -EnvFile .\secrets\ez-one.prod.env -OutputDirectory .\backups
```

Verify that the backup can be restored into staging or a restored-backup rehearsal database:

```powershell
.\scripts\rehearse-mysql-restore.ps1 -EnvFile .\secrets\ez-one.staging.env -BackupFile .\backups\ez_one_<yyyyMMdd_HHmmss>.sql -ExpectedAppEnv staging
.\scripts\rehearse-mysql-restore.ps1 -EnvFile .\secrets\ez-one.staging.env -BackupFile .\backups\ez_one_<yyyyMMdd_HHmmss>.sql -ExpectedAppEnv staging -Apply
```

Run Flyway against that restored database:

```powershell
.\scripts\rehearse-flyway-release.ps1 -EnvFile .\secrets\ez-one.staging.env -ExpectedAppEnv staging
.\scripts\rehearse-flyway-release.ps1 -EnvFile .\secrets\ez-one.staging.env -ExpectedAppEnv staging -Apply
```

The backup script creates a single-database dump without embedding the source
database name. The restore script applies it to the `DB_NAME` in the staging or
restored-backup env file, so that database must already exist and be safe to
overwrite before running restore `-Apply`.

Use `-ExpectedAppEnv prod` with `-AllowProductionRestore` only for an
incident-owner approved production restore, and include `-ProductionApprovalNote`
with the incident/release owner, reason, and approval record path or ticket.
Use `-ExpectedAppEnv prod` with Flyway `-Apply -AllowProductionMigration` only
for an incident-owner approved production migration, also with
`-ProductionApprovalNote`; production Flyway info/validate dry-runs may run
without `-AllowProductionMigration`.

Emergency production restore example:

```powershell
.\scripts\rehearse-mysql-restore.ps1 -EnvFile .\secrets\ez-one.prod.env -BackupFile .\backups\ez_one_<yyyyMMdd_HHmmss>.sql -ExpectedAppEnv prod -Apply -AllowProductionRestore -ProductionApprovalNote "incident/release owner <name>, reason <incident-id>, approval <ticket-or-record-path>"
```

Emergency production Flyway apply example:

```powershell
.\scripts\rehearse-flyway-release.ps1 -EnvFile .\secrets\ez-one.prod.env -ExpectedAppEnv prod -Apply -AllowProductionMigration -ProductionApprovalNote "incident/release owner <name>, reason <incident-id>, approval <ticket-or-record-path>"
```

Evidence:

| Item | Evidence |
| --- | --- |
| Backup file name and `.sha256` checksum | |
| Restore dry-run output | |
| Restore apply output on staging/restored backup | |
| Flyway info output | |
| Flyway validate output | |
| Flyway migrate output on staging/restored backup | |
| Rollback restore rehearsal output | |

## Gate 3: Artifact Build And Install

After Gate 0 passes, create release artifacts from a clean worktree:

```powershell
.\scripts\package-release-artifacts.ps1 -ReleaseId <yyyyMMdd_HHmm_gitsha> -FrontendEnvFile .\secrets\frontend.prod.env -ExtensionEnvFile .\secrets\extension.prod.env
```

Use rehearsal-only artifacts only when the worktree is intentionally dirty:

```powershell
.\scripts\package-release-artifacts.ps1 -ReleaseId rehearsal-<yyyyMMdd_HHmm> -AllowDirty -FrontendEnvFile .\secrets\frontend.prod.env -ExtensionEnvFile .\secrets\extension.prod.env
```

Do not deploy rehearsal artifacts to production. `deploy-ec2-release.sh` verifies
`RELEASE-MANIFEST.txt` and rejects `git_worktree=dirty` unless
`ALLOW_DIRTY_RELEASE=true` is explicitly set for a rehearsal-only host.
update-release-evidence.ps1 rejects artifact evidence with `git_worktree=dirty`,
so rehearsal artifacts cannot become final release evidence.
`package-release-artifacts.ps1` requires the frontend and extension production
env files even when `-SkipBuild` is used, so client origin and OAuth policy
checks cannot be bypassed by packaging an existing `dist` directory.
It also verifies that `frontend/dist/index.html` exists before creating the
release ZIP, and verifies that the backend JAR is a valid executable JAR with
`BOOT-INF`, so misbuilt frontend or backend artifacts are rejected before EC2
upload.

After artifacts are created, import their manifest and checksum evidence instead
of copying the lines manually:

```powershell
.\scripts\update-release-evidence.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json -ArtifactDirectory .\release-artifacts\<release-id>
```

Dry-run artifact installation on the EC2 host:

```bash
RELEASE_ID=<release-id> \
BACKEND_ARTIFACT=/opt/ez-one/incoming/ez-one-backend-<release-id>.jar \
FRONTEND_ARTIFACT=/opt/ez-one/incoming/ez-one-frontend-<release-id>.zip \
EXTENSION_ARTIFACT=/opt/ez-one/incoming/ez-one-extension-<release-id>.zip \
RELEASE_MANIFEST=/opt/ez-one/incoming/RELEASE-MANIFEST.txt \
CHECKSUM_FILE=/opt/ez-one/incoming/SHA256SUMS.txt \
BASE_URL=https://ez-one.kr \
bash scripts/deploy-ec2-release.sh
```

Save the dry-run output and import it into release evidence:

```powershell
$deployDryRunLog = ".\.codex-run-logs\deploy-dry-run-<release-id>.log"
.\scripts\update-release-evidence.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json -DeployDryRunLog $deployDryRunLog
```

The deploy script rejects artifact files whose names do not match the
`RELEASE_ID`: `ez-one-backend-<release-id>.jar`,
`ez-one-frontend-<release-id>.zip`, and
`ez-one-extension-<release-id>.zip`. `RELEASE-MANIFEST.txt` and
`SHA256SUMS.txt` must also use those exact file names. It also verifies that
the backend artifact is a valid executable JAR with `BOOT-INF`, and that the
frontend and extension artifacts are valid zip files before installing the
release. The frontend artifact must also contain `index.html`, so a corrupt or
mispackaged frontend bundle cannot be applied after the backend has already
been restarted. The extension artifact must contain `manifest.json`, so a
mispackaged Chrome extension cannot be treated as release-ready.

After confirming the dry-run output and previous artifact paths, deploy:

```bash
DRY_RUN=false \
RELEASE_ID=<release-id> \
BACKEND_ARTIFACT=/opt/ez-one/incoming/ez-one-backend-<release-id>.jar \
FRONTEND_ARTIFACT=/opt/ez-one/incoming/ez-one-frontend-<release-id>.zip \
EXTENSION_ARTIFACT=/opt/ez-one/incoming/ez-one-extension-<release-id>.zip \
RELEASE_MANIFEST=/opt/ez-one/incoming/RELEASE-MANIFEST.txt \
CHECKSUM_FILE=/opt/ez-one/incoming/SHA256SUMS.txt \
BASE_URL=https://ez-one.kr \
bash scripts/deploy-ec2-release.sh
```

Save the apply output and import it into release evidence:

```powershell
$deployApplyLog = ".\.codex-run-logs\deploy-apply-<release-id>.log"
.\scripts\update-release-evidence.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json -DeployApplyLog $deployApplyLog
```

`BASE_URL` must be the deployed HTTPS origin only. Do not include `/api`, a
path, query string, fragment, `localhost`, or a loopback IP address.
When `BASE_URL` is set and `DRY_RUN=false`, the deploy script automatically runs
`check-ec2-runtime.sh` after the health check. Override `RUNTIME_CHECK_SCRIPT`
only when the checker has been copied to a non-standard EC2 path.

Evidence:

| Item | Evidence |
| --- | --- |
| Release artifact directory | |
| `RELEASE-MANIFEST.txt` content | |
| `SHA256SUMS.txt` content | |
| Backend JAR path and checksum | |
| Frontend dist zip path and checksum | |
| Extension zip path and checksum | |
| Previous artifact paths preserved | |
| EC2 deploy dry-run output | |
| EC2 deploy output with `DRY_RUN=false` | |

## Gate 4: EC2 Runtime

Use the checked-in templates as the baseline unless the EC2 host already has an
equivalent hardened configuration:

- `infra/systemd/ez-one-backend.service` -> `/etc/systemd/system/ez-one-backend.service`
- `infra/nginx/ez-one.conf` -> `/etc/nginx/sites-available/ez-one`

Verify on the EC2 host after installing artifacts and before opening traffic:

```bash
BASE_URL=https://ez-one.kr SERVICE_NAME=ez-one-backend bash scripts/check-ec2-runtime.sh
```

The deploy script automatically runs `check-ec2-runtime.sh` during the real
deploy when `BASE_URL` is set. Run the command above again if you need a separate
runtime evidence block for the release record.

| Item | Required evidence |
| --- | --- |
| systemd | preflight output with active/enabled state, unit path, `Restart=on-failure` or `always`, non-root app user, env file path |
| Reverse proxy | nginx active/enabled preflight, `nginx -t` output, and HTTP-to-HTTPS redirect check |
| Security headers | HSTS, X-Content-Type-Options, frame protection, Referrer-Policy check |
| Logs | backend log path, proxy access/error log path |
| Health | `/api/health` returns deploy-safe status only |

## Gate 5: Real Integration Smoke

Use test accounts only.

Generate the operator checklist beside the release evidence file before running
manual smoke:

```powershell
.\scripts\new-real-smoke-checklist.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json -BaseUrl https://ez-one.kr
```

The smoke checklist `-BaseUrl` must be the HTTPS origin only. Do not include
`/api`, another path, a query string, a fragment, `localhost`, or a loopback IP.

Fill `real-integration-smoke-checklist.md` with screenshot or log paths, then
copy each concrete result into the matching release evidence field.

| Flow | Evidence |
| --- | --- |
| Google login and web refresh cookie rotation | |
| Onboarding profile save/read | |
| Job save -> basket -> workspace read | |
| Essay draft save and version create/list | |
| Reference create/read/update/delete | |
| Document profile save/read | |
| Notion JOB_ONLY sync success/failure isolation | |
| Loaded Chrome extension job save | |
| Loaded Chrome extension document autofill on supported page | |

## Gate 6: Canary

Run for 30 minutes after deploy:

```powershell
$canaryLog = ".\.codex-run-logs\release-canary-$(Get-Date -Format yyyyMMdd-HHmmss).log"
.\scripts\run-release-canary.ps1 -BaseUrl https://ez-one.kr -AccessToken <canary-access-token> -WorkspaceId <workspace-id> -RequireWorkspace -LogFile $canaryLog
.\scripts\update-release-evidence.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json -CanaryLog $canaryLog
```

`-BaseUrl` must be the deployed HTTPS origin only. Do not include `/api`, a
path, query string, fragment, `localhost`, or a loopback IP address.

The canary fails if authenticated checks are requested without `-AccessToken`.
Use `-AllowAnonymousOnly` only for a frontend shell, `/login` SPA fallback, and
health smoke check before a canary test account token is available. It cannot be
combined with `-AccessToken`, `-WorkspaceId`, `-RequireWorkspace`, or
`-RunNotionSync`. For a production Go decision, use a canary test account that
already has at least one basket job and workspace, pass that workspace as
`-WorkspaceId`, and keep `-RequireWorkspace` in the command.

Optional Notion side-effect check:

```powershell
$canaryLog = ".\.codex-run-logs\release-canary-notion-$(Get-Date -Format yyyyMMdd-HHmmss).log"
.\scripts\run-release-canary.ps1 -BaseUrl https://ez-one.kr -AccessToken <canary-access-token> -WorkspaceId <workspace-id> -RequireWorkspace -RunNotionSync -LogFile $canaryLog
.\scripts\update-release-evidence.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json -CanaryLog $canaryLog -RequireNotionSync
```

The authenticated canary checks the frontend shell, `/login` SPA fallback,
`/api/me`, `/api/me/profile`, `/api/document-profile`,
`/api/extension/document-profile`, basket list, and Notion connection on every
iteration. With the production command above, it also checks workspace read,
defaults, versions, and references on every iteration.
Do not reduce `-Iterations` or `-IntervalSeconds` for a production Go decision;
`update-release-evidence.ps1` imports canary evidence only when the log proves
the 7-iteration, 5-minute interval, 30-minute schedule.
The log must also include actual elapsed time evidence with
`elapsedSeconds` of at least `1800`; the `startedAtUtc` and `endedAtUtc`
timestamps must also prove at least 30 minutes.
The log must include every `[CANARY] Iteration 1 / 7` through
`[CANARY] Iteration 7 / 7` marker.
Each required check, including frontend, auth, basket, Notion connection, and
workspace reads, must show 7 PASS entries, with every required PASS present
inside each iteration block.
If the canary log contains `[FAIL]`, PowerShell error records, exceptions, or
stack traces, the evidence import is rejected; rerun the canary after fixing the
cause instead of editing the log.

Evidence:

| Item | Evidence |
| --- | --- |
| 30-minute canary command output | |
| Backend/proxy log review | |
| Error rate or observed failures | |
| Go/no-go decision time and owner | |

For a `Go` decision, `gates.canary.errorRateOrObservedFailures` must explicitly
state `0 observed failures and 0 observed errors`. If the canary found any
failure, timeout, repeated error, or unexplained log spike, record `No-go` and
rerun the canary only after the cause is fixed.

## Rollback

Rollback is required if Critical/High/Medium release issues appear during deploy or canary. Rehearse the command first with the default dry-run mode:

Rollback also verifies `RELEASE-MANIFEST.txt`, artifact file names, and
`SHA256SUMS.txt`. A previous release with `git_worktree=dirty` is rejected unless
`ALLOW_DIRTY_ROLLBACK=true` is explicitly set for a rehearsal-only rollback test.
The rollback script uses `release_id` inside the previous
`RELEASE-MANIFEST.txt` as the naming source of truth, so previous artifacts must
be named `ez-one-backend-<previous>.jar`, `ez-one-frontend-<previous>.zip`, and
`ez-one-extension-<previous>.zip` with exact `RELEASE-MANIFEST.txt` and
`SHA256SUMS.txt` file names. It also verifies that the previous backend
artifact is a valid executable JAR with `BOOT-INF`, and that the previous
extension artifact and previous frontend artifact are valid zip files before
restoring the release. The previous frontend artifact must also contain
`index.html`, and the previous extension artifact must contain `manifest.json`.

```bash
BACKEND_ARTIFACT=/opt/ez-one/releases/<previous>/ez-one-backend-<previous>.jar \
FRONTEND_ARTIFACT=/opt/ez-one/releases/<previous>/ez-one-frontend-<previous>.zip \
EXTENSION_ARTIFACT=/opt/ez-one/releases/<previous>/ez-one-extension-<previous>.zip \
RELEASE_MANIFEST=/opt/ez-one/releases/<previous>/RELEASE-MANIFEST.txt \
CHECKSUM_FILE=/opt/ez-one/releases/<previous>/SHA256SUMS.txt \
BASE_URL=https://ez-one.kr \
bash scripts/rollback-ec2-release.sh
```

Save the rollback dry-run output and import it into release evidence:

```powershell
$rollbackDryRunLog = ".\.codex-run-logs\rollback-dry-run-<release-id>.log"
.\scripts\update-release-evidence.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json -RollbackDryRunLog $rollbackDryRunLog
```

After confirming the paths and previous artifacts, execute rollback:

```bash
DRY_RUN=false \
BACKEND_ARTIFACT=/opt/ez-one/releases/<previous>/ez-one-backend-<previous>.jar \
FRONTEND_ARTIFACT=/opt/ez-one/releases/<previous>/ez-one-frontend-<previous>.zip \
EXTENSION_ARTIFACT=/opt/ez-one/releases/<previous>/ez-one-extension-<previous>.zip \
RELEASE_MANIFEST=/opt/ez-one/releases/<previous>/RELEASE-MANIFEST.txt \
CHECKSUM_FILE=/opt/ez-one/releases/<previous>/SHA256SUMS.txt \
BASE_URL=https://ez-one.kr \
bash scripts/rollback-ec2-release.sh
```

Save the rollback apply output and import it into release evidence:

```powershell
$rollbackApplyLog = ".\.codex-run-logs\rollback-apply-<release-id>.log"
.\scripts\update-release-evidence.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json -RollbackApplyLog $rollbackApplyLog
```

When `BASE_URL` is set and `DRY_RUN=false`, rollback script automatically runs `check-ec2-runtime.sh` after the post-rollback health check. Override
`RUNTIME_CHECK_SCRIPT` only when the checker has been copied to a non-standard EC2 path.

Database restore must be rehearsed on staging before production restore unless production data is actively corrupted and the incident owner approves emergency restore.

Evidence:

| Item | Evidence |
| --- | --- |
| Previous backend artifact path | |
| Previous frontend artifact path | |
| Previous extension artifact path | |
| Previous release manifest path | |
| Previous checksum file path | |
| DB backup restore rehearsal | |
| Rollback dry-run output | |
| Rollback command output with `DRY_RUN=false` | |
| Post-rollback health/canary output | |

## Final Decision

Confirm that the release-specific evidence file already exists from Gate 0. If
Gate 0 was run before this workflow was updated, create it now and import Gate 0
evidence from the full local release gate log before filling the remaining
fields:

```powershell
.\scripts\new-release-evidence.ps1 -ReleaseId <release-id> -Owner <owner-name> -LocalGateLog $gateLog
```

Then fill every remaining field with real command output paths, screenshots,
log excerpts, or owner notes. Use the field helper instead of manually editing
JSON:

```powershell
.\scripts\set-release-evidence-field.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json -Path gates.productionEnvPolicy.envPolicyCheckOutput -Value "check-prod-env.ps1 passed on 2026-06-30 with real production env file"
```

Before the final completeness check, list all missing, empty, placeholder,
unknown, invalid-type, or invalid-format evidence at once. The report first
summarizes remaining gaps by evidence gate, then prints the runbook anchor for
each remaining gate, the field-level gaps to fill, and `Suggested evidence examples`
for the concrete command output or operator note expected. It also prints
`First next command` for the one command to run first, followed by
`Suggested next commands` for the deployment commands likely to produce the
missing evidence:

```powershell
.\scripts\show-release-evidence-gaps.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json
```

When the gap report is clean, run the strict final completeness check:

```powershell
.\scripts\check-release-evidence.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json
```

Record the final decision with the helper instead of manually editing JSON:

`Go` is accepted only after every evidence field is complete and the canary
failure evidence explicitly says `0 observed failures and 0 observed errors`.

```powershell
.\scripts\set-release-decision.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json -Decision Go -Owner <owner-name> -Reason "all release gates have real production evidence"
```

If any release gate is still incomplete or a stop condition appears, record
`No-go` with the concrete reason:

```powershell
.\scripts\set-release-decision.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json -Decision No-go -Owner <owner-name> -Reason "production env evidence is still incomplete"
```

Evidence fields must be plain text strings containing concrete output paths,
screenshots, log excerpts, or owner notes. Do not replace evidence strings with
JSON objects or arrays. Placeholder values such as `set`, `todo`, `tbd`, `pending`, or
`n/a` are rejected by the evidence checker. Vague one-word status values such
as `ok`, `pass`, `done`, or `success` are also rejected because they do not
prove which command, screen, log, or owner decision was checked. `releaseId`
may contain only letters, numbers, dot, underscore, and dash.
`decisionTimestamp` must be an ISO-8601 timestamp with a timezone, for example
`2026-06-29T21:30:00+09:00`.
The gap report also flags invalid top-level decision formats before the strict
final checker runs, including a malformed `releaseId`, a decision other than
`Go` or `No-go`, or a timestamp without timezone.
For a `Go` decision, the gap report also flags
`gates.canary.errorRateOrObservedFailures` unless it explicitly states
`0 observed failures and 0 observed errors`.

| Decision | Owner | Timestamp | Notes |
| --- | --- | --- | --- |
| Go / No-go | | | |

Production go-live requires every gate above to have real evidence. A local passing gate alone is not sufficient.
