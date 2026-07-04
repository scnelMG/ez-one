# 41. Beginner Deployment Guide

Status: first-deployment walkthrough for EZ-ONE. Use this together with
`docs/39_production-deployment-runbook.md`; the runbook is the release gate,
and this file explains the steps for someone deploying for the first time.

Korean step-by-step execution guide: `docs/42_first-deployment-ko.md`.

## Mental Model

EZ-ONE deployment has four moving parts:

| Part | Runs where | What it does |
| --- | --- | --- |
| Backend JAR | EC2 | Spring Boot API on `127.0.0.1:8080` |
| Frontend build | EC2 via Nginx | Vue static files served to users |
| Chrome extension zip | Distributed/loaded separately | Saves jobs and fills supported application pages |
| MySQL | EC2 or managed MySQL | Stores users, jobs, workspaces, sessions, and sync data |

Nginx is the public door. Users connect to `https://<domain>`, Nginx serves the
frontend and forwards `/api/*` requests to the backend.

## Where Each Command Runs

Every command in this guide belongs to one of three places:

| Label | Meaning |
| --- | --- |
| Local PC | Your Windows development machine at `C:\ez-one` |
| EC2 | The Ubuntu server after you SSH in |
| Console | AWS, DNS, Google Cloud, or Notion web console |

When in doubt, do not guess. Check the heading for the step and the prompt:

```text
PS C:\ez-one>          Local PC
ubuntu@ip-...:~$       EC2
```

## Before You Start Checklist

Prepare these before the first deployment day:

| Item | Needed before | Notes |
| --- | --- | --- |
| AWS account and EC2 key pair | Step 1 | Keep the `.pem` key private |
| Production domain | Step 1 | Example: `ez-one.kr` |
| Google OAuth client | Step 4 | Must include production redirect URI |
| Notion integration | Step 4 | Must include production redirect URI |
| MySQL production DB | Step 3 | Can be on EC2 or managed MySQL |
| Staging or restored-backup DB | Step 6 | Required for migration rehearsal |
| Test Google/Notion accounts | Step 11 | Do not use real user data |
| Git Bash or WSL on Windows | Step 5+ | Needed for shell-script contract checks |

Run the first-deploy prerequisite check before investing time in packaging or
EC2 work:

```powershell
.\scripts\check-deployment-prereqs.ps1 -RequireDatabaseTools -RequireBash
```

This checks required local commands, MySQL client tools, runnable Bash, release
scripts, deployment docs, and the backend/frontend/extension build entrypoints
used by the local release gate.

If `mysql` or `mysqldump` is missing on Windows, install the MySQL client tools:

```powershell
winget install Oracle.MySQL
```

For a lighter diagnostic before installing optional tools, you can run:

```powershell
.\scripts\check-deployment-prereqs.ps1
```

## Deployment Plan

Deploy in this order:

1. Prepare the domain and AWS EC2 host.
2. Install server dependencies and create directories.
3. Prepare production secrets locally, but never commit them.
4. Register production OAuth redirect URLs.
5. Run the full local release gate.
6. Back up MySQL and rehearse restore/migration.
7. Build release artifacts.
8. Upload artifacts and env files to EC2.
9. Dry-run the deploy command on EC2.
10. Deploy with `DRY_RUN=false`.
11. Run real-user smoke tests.
12. Run the 30-minute canary.
13. Confirm the rollback plan.
14. Fill release evidence and make the Go/No-go decision.

Do not skip steps 5, 6, 9, or 11. They are the difference between "it worked on
my machine" and a recoverable production release.

## Step 1: Prepare AWS And Domain

Run this step in: Console.

Create or confirm:

- EC2 instance, preferably Ubuntu LTS.
- Security group inbound rules:
  - SSH `22` only from your IP.
  - HTTP `80` from the internet.
  - HTTPS `443` from the internet.
- Elastic IP attached to the EC2 instance.
- DNS `A` record from your domain to the Elastic IP.

Example domain placeholder used below:

```text
https://ez-one.kr
```

Replace it with the real production domain if different.

## Step 2: Prepare The EC2 Host

Run this step on: EC2.

SSH into EC2:

```bash
ssh ubuntu@<ec2-public-ip-or-domain>
```

Preview the repeatable EC2 host setup helper first:

```bash
bash scripts/bootstrap-ec2-host.sh
```

After reviewing the printed commands, apply the base package, user, directory,
and permission setup:

```bash
DRY_RUN=false bash scripts/bootstrap-ec2-host.sh
```

The helper intentionally does not issue certificates or apply the final Nginx
template unless you opt in later. The manual commands below show exactly what it
prepares.

Install runtime packages:

```bash
sudo apt update
sudo apt install -y git openjdk-17-jre-headless nginx unzip rsync curl ca-certificates certbot mysql-client
```

Create the app user and directories:

```bash
sudo useradd --system --home /opt/ez-one --shell /usr/sbin/nologin ezone || true
sudo mkdir -p /opt/ez-one/backend /opt/ez-one/incoming /opt/ez-one/releases /etc/ez-one /var/www/ez-one
sudo chown -R ezone:ezone /opt/ez-one/backend /opt/ez-one/releases
sudo chown -R ubuntu:ubuntu /opt/ez-one/incoming
```

Put deployment scripts and infra templates on EC2. The simplest first-deploy
option is to clone the repository:

```bash
sudo mkdir -p /opt/ez-one/source
sudo chown -R ubuntu:ubuntu /opt/ez-one/source
git clone <repo-url> /opt/ez-one/source/current
cd /opt/ez-one/source/current
```

If the repository is private, configure SSH deploy key or GitHub access first.
If you cannot clone from EC2, copy only `scripts/` and `infra/` from your local
PC to `/opt/ez-one/source/current`.

Issue HTTPS certificates before enabling the final Nginx template. The checked-in
Nginx template references `/etc/letsencrypt/live/<domain>/...`, so `nginx -t`
will fail until those files exist.

For the example domain:

```bash
sudo systemctl stop nginx
sudo certbot certonly --standalone -d ez-one.kr -d www.ez-one.kr
sudo systemctl start nginx
```

If you use a different domain, replace both the `server_name` and
`ssl_certificate` paths in `infra/nginx/ez-one.conf` before copying it.

Copy the checked-in templates to the EC2 system locations after the certificate
exists:

```bash
DRY_RUN=false APPLY_TEMPLATES=true DOMAIN_NAME=ez-one.kr bash scripts/bootstrap-ec2-host.sh
```

Or run the equivalent manual commands:

```bash
sudo cp infra/systemd/ez-one-backend.service /etc/systemd/system/ez-one-backend.service
sudo cp infra/nginx/ez-one.conf /etc/nginx/sites-available/ez-one
sudo ln -sf /etc/nginx/sites-available/ez-one /etc/nginx/sites-enabled/ez-one
sudo nginx -t
sudo systemctl daemon-reload
sudo systemctl enable ez-one-backend
sudo systemctl enable nginx
```

## Step 3: Prepare Production Env Files Locally

Run this step on: Local PC.

Create local secret files outside Git tracking:

```powershell
New-Item -ItemType Directory -Force .\secrets
.\scripts\new-production-env-files.ps1 -Origin https://ez-one.kr -OutputDirectory .\secrets
```

The helper writes strong generated JWT secrets and `NOTION_TOKEN_ENCRYPTION_KEY`,
sets production-safe flags, and leaves `CHANGE_ME_*` placeholders for values you
must get from MySQL, Google, and Notion. It will not overwrite existing files
unless you pass `-Force`. Edit the three files with real production values.
Never commit these files.

Backend minimum policy:

```text
APP_ENV=prod
SPRING_PROFILES_ACTIVE=mysql
SERVER_ADDRESS=127.0.0.1
AUTH_LOCAL_DEV_TOKEN_ENABLED=false
APP_DOCS_ENABLED=false
AUTH_REFRESH_COOKIE_SECURE=true
AUTH_REFRESH_COOKIE_SAME_SITE=Lax
FLYWAY_ENABLED=true
SQL_INIT_MODE=never
CORS_ALLOWED_ORIGINS=https://ez-one.kr
APP_PUBLIC_BASE_URL=https://ez-one.kr
```

Also set real DB credentials, Google credentials, Notion credentials,
different non-placeholder JWT secrets, and a Base64-encoded 32-byte
`NOTION_TOKEN_ENCRYPTION_KEY`. `DB_NAME` must be real and non-placeholder.
`DB_PASSWORD`, `GOOGLE_CLIENT_SECRET`, and `NOTION_CLIENT_SECRET` must be
non-placeholder and at least 16 characters. `VITE_EXTENSION_INSTALL_URL` must be
a non-empty Chrome Web Store URL and must include `VITE_EXTENSION_ID` so users
install the expected production Chrome extension. Google and Notion URL values
must stay on the official Google/Notion production endpoints.

Enabled integrations require their matching production key. Disabled integrations may omit keys, including `PUBLIC_DATA_API_KEY`, `OPENDART_API_KEY`, `GMS_API_KEY`, and `MATTERMOST_WEBHOOK_SECRET(S)` when the related integration is off. Keep `COMPANY_ENRICHMENT_REALTIME_ENABLED=false` unless the release owner intentionally enables realtime enrichment and records `PUBLIC_DATA_API_KEY` validation evidence without printing the key.
`COMPANY_DATA_STARTUP_SYNC_ENABLED=false` and
`COMPANY_DATA_BATCH_SYNC_ENABLED=false` are the production defaults and should
not be enabled for a first deploy.

Provider URL review table:

| Provider env key | Production review rule |
| --- | --- |
| `GMS_AI_BASE_URL`, `GMS_KEY_INFO_URL` | HTTPS only, non-local, expected host `gms.ssafy.io`; key-info path is `/gmsapi/key-info`. |
| `OPENDART_API_BASE_URL`, `OPENDART_VIEWER_BASE_URL`, `OPENDART_COMPANY_OVERVIEW_SOURCE_URL` | HTTPS only, non-local, expected OpenDART/DART hosts and documented paths; the company overview source URL must preserve `apiGrpCd=DS001` and `apiId=2019002`. |
| `VENTURE_COMPANY_API_URL`, `NATIONAL_PENSION_API_URL`, `PUBLIC_INSTITUTION_API_URL`, `FTC_AFFILIATE_API_URL` | Exact `apis.data.go.kr` host/path; HTTP is allowed only for these public-data endpoints. |
| `FINANCIAL_COMPANY_BASIC_INFO_URL`, `MIDDLE_MARKET_API_URL` | May be blank; if present, HTTPS only and non-local. |

For each justified HTTP public-data endpoint, write a data-sensitivity note
confirming no secrets, auth headers, cookies, or personal data are sent to that
endpoint. The client localhost/generic fallbacks are deferred only because production env/artifact validators require explicit HTTPS env overrides for frontend and extension artifacts.

Generate a Notion encryption key locally:

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

Validate env policy:

```powershell
.\scripts\check-prod-env.ps1 -EnvFile .\secrets\ez-one.prod.env
.\scripts\check-client-prod-env.ps1 -FrontendEnvFile .\secrets\frontend.prod.env -ExtensionEnvFile .\secrets\extension.prod.env
```

Keep the validation command output. You will generate the env evidence
checklist after Step 5 creates `release-evidence.json`.

## Step 4: Register OAuth Redirect URLs

Run this step in: Console.

In Google Cloud Console and Notion integration settings, register the production
redirect URLs that your frontend env uses.

Typical frontend values:

```text
VITE_API_BASE_URL=https://ez-one.kr/api
VITE_GOOGLE_REDIRECT_URI=https://ez-one.kr/login/callback
VITE_NOTION_REDIRECT_URI=https://ez-one.kr/mypage/notion
```

The exact route must match the app and provider settings. A single character
difference can cause OAuth failure.

## Step 5: Run Local Release Gate

Run this step on: Local PC.

From the repository root:

```powershell
New-Item -ItemType Directory -Force .\.codex-run-logs | Out-Null
$gateLog = ".\.codex-run-logs\release-local-gate-full-$(Get-Date -Format yyyyMMdd-HHmmss).log"
.\scripts\release-local-gate.ps1 -LogFile $gateLog
```

Use `-SkipSlow` only while iterating locally. It is not valid final release
evidence because it skips backend, frontend, and extension build/test gates;
`new-release-evidence.ps1 -LocalGateLog` rejects logs that contain `[SKIP]` or
`[FAIL]` markers.

If this times out on a slow machine, run the failed remaining gates directly and
record each command output. A production release still needs evidence for every
gate.

Create the release evidence file immediately after the full local gate passes:

```powershell
.\scripts\new-release-evidence.ps1 -ReleaseId <release-id> -Owner <owner-name> -LocalGateLog $gateLog
```

Now create the env evidence checklist beside that release evidence file:

```powershell
.\scripts\new-production-env-evidence-checklist.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json
```

Open `production-env-evidence-checklist.md` from the same release-artifacts
folder and record command output, EC2 env file owner/mode, and secret
owner/rotation notes. Do not paste raw secrets.

## Step 6: Back Up And Rehearse DB Restore/Migration

Run this step on: Local PC, connecting to production/staging MySQL.

Before touching production data:

```powershell
.\scripts\create-mysql-backup.ps1 -EnvFile .\secrets\ez-one.prod.env -OutputDirectory .\backups
```

Restore the backup into staging or a restored-backup database:

```powershell
.\scripts\rehearse-mysql-restore.ps1 -EnvFile .\secrets\ez-one.staging.env -BackupFile .\backups\ez_one_<timestamp>.sql -ExpectedAppEnv staging
.\scripts\rehearse-mysql-restore.ps1 -EnvFile .\secrets\ez-one.staging.env -BackupFile .\backups\ez_one_<timestamp>.sql -ExpectedAppEnv staging -Apply
```

The restore target is the `DB_NAME` in `ez-one.staging.env`. Create that
staging/restored-backup database first and make sure it is safe to overwrite.
The backup file itself does not choose the target database.

Then rehearse Flyway:

```powershell
.\scripts\rehearse-flyway-release.ps1 -EnvFile .\secrets\ez-one.staging.env -ExpectedAppEnv staging
.\scripts\rehearse-flyway-release.ps1 -EnvFile .\secrets\ez-one.staging.env -ExpectedAppEnv staging -Apply
```

If you do not have staging yet, create one before production deployment. Do not
use the first production deploy as the first migration rehearsal.

## Step 7: Build Release Artifacts

Run this step on: Local PC.

Production artifacts should be built from a clean, reviewed commit. Before this
step, finish review, commit the release branch, and confirm there are no
unexpected local changes:

```powershell
git status --short
```

If this prints changed files, stop and decide whether to commit them or discard
only your own unwanted local edits. Use `-AllowDirty` only for rehearsal
artifacts that will not be deployed to production.
The EC2 deploy script also rejects `RELEASE-MANIFEST.txt` with
`git_worktree=dirty` unless `ALLOW_DIRTY_RELEASE=true` is explicitly set for a
rehearsal-only host.
update-release-evidence.ps1 rejects artifact evidence with `git_worktree=dirty`,
so rehearsal artifacts cannot become final release evidence.

Use a unique release ID:

```powershell
$releaseId = "20260629_1200_<gitsha>"
.\scripts\package-release-artifacts.ps1 -ReleaseId $releaseId -FrontendEnvFile .\secrets\frontend.prod.env -ExtensionEnvFile .\secrets\extension.prod.env
```

The script creates:

```text
release-artifacts/<release-id>/ez-one-backend-<release-id>.jar
release-artifacts/<release-id>/ez-one-frontend-<release-id>.zip
release-artifacts/<release-id>/ez-one-extension-<release-id>.zip
release-artifacts/<release-id>/RELEASE-MANIFEST.txt
release-artifacts/<release-id>/SHA256SUMS.txt
```

Import the artifact manifest and checksum evidence right after packaging:

```powershell
.\scripts\update-release-evidence.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json -ArtifactDirectory .\release-artifacts\<release-id>
```

## Step 8: Upload Files To EC2

Run the `scp` commands on: Local PC.

Upload artifacts:

```powershell
scp .\release-artifacts\<release-id>\* ubuntu@<ec2-host>:/opt/ez-one/incoming/
```

Upload deploy helper scripts to the same `scripts/` path used by the EC2
commands:

```powershell
ssh ubuntu@<ec2-host> "mkdir -p /opt/ez-one/incoming/scripts"
scp .\scripts\deploy-ec2-release.sh ubuntu@<ec2-host>:/opt/ez-one/incoming/scripts/
scp .\scripts\rollback-ec2-release.sh ubuntu@<ec2-host>:/opt/ez-one/incoming/scripts/
scp .\scripts\check-ec2-runtime.sh ubuntu@<ec2-host>:/opt/ez-one/incoming/scripts/
```

Upload backend env separately:

```powershell
scp .\secrets\ez-one.prod.env ubuntu@<ec2-host>:/tmp/ez-one.prod.env
```

Run the following on: EC2.

```bash
sudo mv /tmp/ez-one.prod.env /etc/ez-one/ez-one.prod.env
sudo chown root:ezone /etc/ez-one/ez-one.prod.env
sudo chmod 640 /etc/ez-one/ez-one.prod.env
```

Do not put frontend or extension secret env files on EC2 unless needed for an
explicit release audit. Their values are already baked into the artifacts.

## Step 9: Dry-Run Deploy On EC2

Run this step on: EC2.

From EC2:

```bash
cd /opt/ez-one/incoming
```

Then run:

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

Dry-run must show checksum verification and the commands it would run. If the
paths look wrong, stop and fix paths before deploying.
Save the dry-run output and import it into release evidence:

```powershell
$deployDryRunLog = ".\.codex-run-logs\deploy-dry-run-<release-id>.log"
.\scripts\update-release-evidence.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json -DeployDryRunLog $deployDryRunLog
```

## Step 10: Deploy

Run this step on: EC2.

Run the same command with `DRY_RUN=false`:

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

Then verify EC2 runtime:

```bash
BASE_URL=https://ez-one.kr SERVICE_NAME=ez-one-backend bash scripts/check-ec2-runtime.sh
```

This checks HTTPS redirect, health response safety, and security headers
including HSTS, X-Content-Type-Options, Referrer-Policy, frame protection,
Permissions-Policy, and Cross-Origin-Opener-Policy.

## Step 11: Smoke Test As A Real User

Run this step in: Browser plus loaded Chrome extension.

Use test accounts only:

Create the smoke evidence checklist first:

```powershell
.\scripts\new-real-smoke-checklist.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json -BaseUrl https://ez-one.kr
```

The smoke checklist `-BaseUrl` must be the HTTPS origin only. Do not include
`/api`, another path, a query string, a fragment, `localhost`, or a loopback IP.

Open `real-integration-smoke-checklist.md` from the same release-artifacts
folder and write screenshot or log paths while testing.

1. Open `https://ez-one.kr`.
2. Login with Google.
3. Complete or skip onboarding.
4. Save a job.
5. Confirm basket and workspace open.
6. Save essay/reference/document profile data.
7. Trigger or observe Notion `JOB_ONLY` sync.
8. Load the production extension and test job save.
9. Test document autofill on a supported page.

If any Critical/High/Medium issue appears, stop the release and rollback.

## Step 12: Run Canary

Run this step on: Local PC.

Run for 30 minutes:

```powershell
$canaryLog = ".\.codex-run-logs\release-canary-$(Get-Date -Format yyyyMMdd-HHmmss).log"
.\scripts\run-release-canary.ps1 -BaseUrl https://ez-one.kr -AccessToken <canary-access-token> -WorkspaceId <workspace-id> -RequireWorkspace -LogFile $canaryLog
.\scripts\update-release-evidence.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json -CanaryLog $canaryLog
```

Use the site origin only for `-BaseUrl`. Do not write
`https://ez-one.kr/api`.

The script also checks that the frontend shell and `/login` SPA fallback are
served by Nginx. Use `-AllowAnonymousOnly` only before a canary test account is
ready; it cannot be combined with `-WorkspaceId`, `-RequireWorkspace`, or
`-RunNotionSync`.

Use a canary test account that has at least one saved job and workspace. The
`-RequireWorkspace` flag prevents accidentally running a final production canary
without workspace checks.
Do not shorten `-Iterations` or `-IntervalSeconds` for the final Go decision.
The evidence import command only accepts a canary log that proves the default
7-iteration, 5-minute interval, 30-minute schedule.
The log must also include actual elapsed time evidence with `elapsedSeconds` of
at least `1800`; the `startedAtUtc` and `endedAtUtc` timestamps must also prove
at least 30 minutes.
The log must include every `[CANARY] Iteration 1 / 7` through
`[CANARY] Iteration 7 / 7` marker.
Each required check, including frontend, auth, basket, Notion connection, and
workspace reads, must show 7 PASS entries, with every required PASS present
inside each iteration block.
If the log contains `[FAIL]`, PowerShell error records, exceptions, or stack
traces, the import is rejected. Fix the cause and rerun the canary instead of
editing the log.
For the final Go decision, the evidence field
`gates.canary.errorRateOrObservedFailures` must say
`0 observed failures and 0 observed errors`. Any other result is a No-go until
the cause is fixed and the canary is rerun.

Use `-RunNotionSync` only with a test Notion database:

```powershell
$canaryLog = ".\.codex-run-logs\release-canary-notion-$(Get-Date -Format yyyyMMdd-HHmmss).log"
.\scripts\run-release-canary.ps1 -BaseUrl https://ez-one.kr -AccessToken <canary-access-token> -WorkspaceId <workspace-id> -RequireWorkspace -RunNotionSync -LogFile $canaryLog
.\scripts\update-release-evidence.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json -CanaryLog $canaryLog -RequireNotionSync
```

## Step 13: Rollback Plan

Run rollback commands on: EC2.

After the first successful deployment, every release must keep the previous
release directory under `/opt/ez-one/releases/<previous>`.

Rollback dry-run:

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

Rollback execute:

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

For the first ever deployment, there may be no previous release artifact yet.
In that case, your rollback safety is the DB backup plus the ability to stop the
new service quickly:

```bash
sudo systemctl stop ez-one-backend
```

Do not run production DB restore unless a restore rehearsal has already passed
or an incident owner explicitly approves emergency restore. Production restore
requires both `-AllowProductionRestore` and `-ProductionApprovalNote`; the note
must include the incident/release owner, reason, and approval record path or
ticket. Do not run production Flyway `-Apply` unless an incident or release
owner explicitly approves it; production Flyway apply requires both
`-AllowProductionMigration` and `-ProductionApprovalNote`.

## Step 14: Fill Release Evidence

Run this step on: Local PC.

Confirm that the release evidence file already exists from Step 5. If Step 5
was run before this workflow was updated, create the file now and import Gate 0
evidence from the full local gate log:

```powershell
.\scripts\new-release-evidence.ps1 -ReleaseId <release-id> -Owner <owner-name> -LocalGateLog $gateLog
```

Fill every field with command output paths, screenshots, log excerpts, or owner
notes. Use the field helper instead of manually editing JSON:

```powershell
.\scripts\set-release-evidence-field.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json -Path gates.productionEnvPolicy.envPolicyCheckOutput -Value "check-prod-env.ps1 passed on 2026-06-30 with real production env file"
```

To see all empty, missing, placeholder, unknown, invalid-type, or invalid-format
fields at once:

```powershell
.\scripts\show-release-evidence-gaps.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json
```

The report also prints `Suggested evidence examples` so you can see which
command output, screenshot path, log excerpt, or owner note should fill each
remaining field.
It also prints `Suggested next commands` so the next missing release gate is
something you can run instead of guess.
Start with `First next command`, then use the full `Suggested next commands`
list only when you need the rest of the gate's evidence.
For a `Go` decision, the report also flags
`gates.canary.errorRateOrObservedFailures` unless it explicitly says
`0 observed failures and 0 observed errors`.

When the gap report is clean, run the strict final validation:

```powershell
.\scripts\check-release-evidence.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json
```

After the strict validation passes, record the final Go decision with the helper:

The helper accepts `Go` only when every field is complete and the canary
evidence explicitly says `0 observed failures and 0 observed errors`.

```powershell
.\scripts\set-release-decision.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json -Decision Go -Owner <owner-name> -Reason "all release gates have real production evidence"
```

If something is still missing or a stop condition appears, record No-go instead:

```powershell
.\scripts\set-release-decision.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json -Decision No-go -Owner <owner-name> -Reason "production env evidence is still incomplete"
```

Use a release ID made only of letters, numbers, dots, underscores, and dashes.
The decision timestamp must include a timezone, such as
`2026-06-29T21:30:00+09:00`.

Only after this passes and the smoke/canary results are clean should the release
be marked Go.

## Stop Conditions

Stop and do not deploy when any of these happens:

- `release-local-gate.ps1` has a failing gate that has not been rerun and fixed.
- Production env validation fails.
- MySQL backup is missing or has no checksum.
- Restore or Flyway rehearsal has not run on staging/restored backup.
- Deploy dry-run shows wrong paths or checksum failure.
- Google login fails on the production domain.
- Basket/workspace/document profile smoke fails.
- Notion failure breaks core job save.
- Loaded extension cannot save a supported job or autofill supported fields.
- Canary reports frontend shell failure, API failure, sensitive response leakage,
  or repeated errors.

When a stop condition appears, fix the issue, rerun the same gate, and only then
continue. Do not "try production and see."
