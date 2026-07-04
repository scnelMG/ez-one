# 38. Release Readiness QA

## 2026-06-30 Latest Local Evidence

Status: local release gate is currently green after the `EXT-032` timeout fix,
the Korean first-deployment guide recovery, the shared release evidence schema
hardening, and the production env evidence checklist hardening. Production
go-live is still blocked until EC2, production env, DB rehearsal, real
integration smoke, rollback, and 30-minute canary evidence are collected.

Fresh local evidence:

- Full local gate log: `.codex-run-logs/release-local-gate-full-20260630-173050.log`
- Full local gate result: exit code 0, `[DONE] Local release gate completed.` No `[SKIP]` or `[FAIL]` gate markers were present.
- Latest direct full gate rerun: `.\scripts\release-local-gate.ps1 -LogFile .\.codex-run-logs\release-local-gate-full-20260630-173050.log` completed with exit code 0 on 2026-06-30 after the production env evidence checklist hardening.
- `scripts/release-local-gate.ps1` now supports `-LogFile`, so Gate 0 evidence can be captured directly for `scripts/new-release-evidence.ps1 -LocalGateLog`.
- Backend: 231 tests passed with 0 failures and 0 errors, and the release package passed.
- Frontend: dependency audit found 0 vulnerabilities, 39 files / 244 tests passed, and the production build passed.
- Extension: dependency audit found 0 vulnerabilities, 16 files / 320 tests passed, and production plus local-dev builds passed.
- Extension test count: 16 files / 320 tests passed.
- `EXT-032: commits SQLD after existing certificate rows without moving its details into ADsP` passed after reducing repeated DOM matching work in `extension/src/content/applicationAutoFill.js`.
- Focused `applicationAutoFill` suite passed: 165 tests.
- Korean first-deployment guide was restored as valid UTF-8 at `docs/42_first-deployment-ko.md`.
- Fast gate after the guide recovery passed: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\release-local-gate.ps1 -SkipSlow`.
- Mojibake guard now includes additional codepoint-based checks so release docs fail the gate if common corrupted Korean markers reappear.
- `scripts/new-release-evidence.ps1` can import Gate 0 evidence from a full local gate log with `-LocalGateLog`, rejects incomplete local gate logs, and rejects logs that contain `[SKIP]` or `[FAIL]` markers.
- A fresh Gate 0 import smoke using `.codex-run-logs/release-local-gate-full-20260630-173050.log` succeeded; `show-release-evidence-gaps.ps1` then reported 47 remaining external evidence fields across production env, DB rehearsal, artifacts/EC2 runtime, real integration smoke, canary, and rollback.
- `scripts/show-release-evidence-gaps.ps1` now prints `First next command` and `Suggested next commands` in addition to field-level evidence examples, so operators can start with one concrete command and then continue through the remaining gate commands without guessing.
- `scripts/show-release-evidence-gaps.ps1` lists all empty, missing, placeholder, or unknown release evidence fields at once before the stricter final evidence check, summarizes the remaining gaps by evidence gate, and prints the runbook anchor for each remaining gate.
- Korean first-deployment env generation now shows the required `-Origin https://ez-one.kr` argument for `scripts/new-production-env-files.ps1`, and the contract test prevents docs from omitting that mandatory argument again.
- Beginner deployment docs now upload EC2 deploy helper scripts to `/opt/ez-one/incoming/scripts/`, matching the documented `bash scripts/deploy-ec2-release.sh`, `bash scripts/rollback-ec2-release.sh`, and runtime checker commands.
- Beginner deployment docs now use `ubuntu@<ec2-host>` for release artifact, helper script, and env uploads, keeping the public service domain distinct from the SSH/SCP target.
- Korean first-deployment EC2 setup now creates `/opt/ez-one/source`, `/etc/ez-one`, and `/var/www/ez-one`, and keeps `/opt/ez-one/incoming` plus `/opt/ez-one/source` writable by the deploy user so the first SCP upload path works.
- Korean first-deployment EC2 package installation now matches `scripts/bootstrap-ec2-host.sh`, including `git`, `rsync`, `ca-certificates`, and `certbot`, so clone, artifact sync, and HTTPS certificate steps have their required tools.
- Production env validation now requires `SPRING_PROFILES_ACTIVE=mysql` and `SQL_INIT_MODE=never`, preventing accidental local/test profiles or schema initialization from passing release evidence.
- Client production env validation now requires a non-empty Chrome Web Store `VITE_EXTENSION_INSTALL_URL` that includes `VITE_EXTENSION_ID`, preventing the deployed login page from pointing users to a generic or wrong Chrome extension install target.
- `scripts/release-evidence-schema.ps1` is the shared evidence schema used by both the strict release evidence checker and the gap reporter, preventing required-field drift between the two tools.
- Full local gate now includes the release evidence schema contract, so future field drift between `check-release-evidence.ps1` and `show-release-evidence-gaps.ps1` blocks the local release gate.
- `scripts/new-release-evidence.ps1` validates `docs/40_release-evidence.template.json` against the shared schema before creating a release evidence file, so a stale template cannot silently create incomplete evidence.
- The shared schema validation rejects unknown or stale fields in `docs/40_release-evidence.template.json`, so operators are not asked to fill evidence fields that the strict checker ignores.
- `scripts/check-release-evidence.ps1` also rejects unknown or stale fields in actual `release-evidence.json` files, so a final Go/No-go check cannot pass with ignored evidence fields.
- The shared evidence placeholder check now rejects vague one-word values such as `ok`, `pass`, `done`, or `success`, so release evidence must point to concrete command output, logs, screenshots, or owner notes.
- `scripts/check-release-evidence.ps1` and `scripts/show-release-evidence-gaps.ps1` now reject object or array evidence values as `invalid-type`; every evidence field must remain a plain text string.
- `scripts/new-release-evidence.ps1` now prints the gap report command before the strict final evidence check, guiding operators to fill remaining evidence in the safer order.
- `scripts/new-production-env-evidence-checklist.ps1` now generates `production-env-evidence-checklist.md` beside release evidence, giving operators field-specific production env evidence items and `set-release-evidence-field.ps1` commands without exposing raw secrets.
- `scripts/new-real-smoke-checklist.ps1` now generates `real-integration-smoke-checklist.md` beside release evidence, giving operators field-specific smoke items and `set-release-evidence-field.ps1` commands for the P1 real-user smoke gate.
- `scripts/new-real-smoke-checklist.ps1` rejects smoke `-BaseUrl` values that are not HTTPS origins, preventing `/api`, local, loopback, query, or fragment targets from becoming release smoke evidence.
- The shared release evidence schema contract verifies that every gap report runbook anchor resolves to an actual heading in `docs/39_production-deployment-runbook.md`.
- `scripts/check-deployment-prereqs.ps1` now verifies the backend Maven wrapper, backend POM, frontend package manifest/lockfile, and extension package manifest/lockfile before operators spend time on packaging or EC2 work.
- `scripts/package-release-artifacts.ps1` now requires frontend and extension production env files even with `-SkipBuild`, preventing existing `dist` directories from being packaged without client origin/OAuth policy validation.
- `scripts/package-release-artifacts.ps1` now rejects frontend dist directories without `index.html`, preventing a misbuilt SPA bundle from becoming a release artifact.
- `scripts/package-release-artifacts.ps1` now rejects backend JAR candidates that are not valid zip/JAR archives or do not contain `BOOT-INF`, preventing invalid backend artifacts from entering `release-artifacts`.
- `scripts/update-release-evidence.ps1` now rejects artifact evidence with `git_worktree=dirty`, so `-AllowDirty` rehearsal artifacts cannot become final release evidence.
- `scripts/deploy-ec2-release.sh` now rejects EC2 deploy artifact filenames that do not match the `RELEASE_ID`, preventing manifest/checksum-consistent but mislabeled artifacts from being installed.
- `scripts/rollback-ec2-release.sh` now rejects rollback artifact filenames that do not match the previous release manifest `release_id`, preventing mislabeled previous artifacts from being restored during an incident.
- `scripts/deploy-ec2-release.sh` and `scripts/rollback-ec2-release.sh` now validate the backend artifact with `unzip -t` and require `BOOT-INF` before apply steps, so checksum-matching but non-executable backend files cannot be deployed or restored.
- `scripts/deploy-ec2-release.sh` and `scripts/rollback-ec2-release.sh` now validate the extension artifact with `unzip -t`, so checksum-matching but corrupt extension ZIP files cannot pass deploy or rollback dry-runs.
- `scripts/deploy-ec2-release.sh` and `scripts/rollback-ec2-release.sh` now validate the frontend artifact with `unzip -t` and require `index.html` before apply steps, so a corrupt or mispackaged frontend ZIP cannot fail only after backend restart or rollback actions have begun.
- `scripts/deploy-ec2-release.sh` and `scripts/rollback-ec2-release.sh` now require extension ZIP artifacts to contain `manifest.json`, so checksum-matching but unloadable extension bundles cannot pass deploy or rollback dry-runs.

Current release decision: No-go for production until external evidence is filled
in `release-evidence.json` and validated by `scripts/check-release-evidence.ps1`.

## 2026-06-29 Local Gate Snapshot

Status: local release blockers `EXT-031` and `EXT-032` are resolved in local verification. Local code, release tooling, and deployment documentation are improved, but production go-live remains blocked until the external gates in the Release Gate table have real evidence.

Local release gate command:

```powershell
New-Item -ItemType Directory -Force .\.codex-run-logs | Out-Null
$gateLog = ".\.codex-run-logs\release-local-gate-full-$(Get-Date -Format yyyyMMdd-HHmmss).log"
.\scripts\release-local-gate.ps1 -LogFile $gateLog
```

Use `.\scripts\release-local-gate.ps1 -SkipSlow` only to validate the gate script and fast static guards while iterating. It is not a production release substitute.

Production env policy check:

```powershell
.\scripts\check-prod-env.ps1 -EnvFile .\secrets\ez-one.prod.env
.\scripts\check-client-prod-env.ps1 -FrontendEnvFile .\secrets\frontend.prod.env -ExtensionEnvFile .\secrets\extension.prod.env
```

Verified scope:

- Backend: `.\mvnw.cmd test` passed 231 tests, 0 failures, 0 errors, 2 skipped.
- Backend artifact: `.\mvnw.cmd -DskipTests package` built `backend/target/backend-0.0.1-SNAPSHOT.jar`.
- Frontend: `npm run test` passed 39 files / 244 tests; `npm run build` passed.
- Extension: `npm run test` passed 16 files / 320 tests; `npm run build` and `npm run build:local` passed.
- Frontend and extension: `npm audit --audit-level=moderate` returned 0 vulnerabilities after upgrading Vitest to 4.1.9 and refreshing lockfiles.
- Auth/session: web refresh now uses an HttpOnly `ezone_refresh_token` cookie and web bodies return `refreshToken: null`, while extension refresh keeps the existing request-body token path.
- Targeted extension regression bundle passed `EXT-031` school/major cases and `EXT-032` mixed section, SQLD, blocked date, and delayed date cases.
- Frontend production runtime no longer adds implicit local API fallback candidates. Local fallback candidates are development-only.
- Release packaging rejects localdev extension manifests and frontend/extension dist bundles that contain local runtime endpoints such as `localhost:8080`, `localhost:5173`, or `127.0.0.1:8080`.
- Release packaging rejects unreadable production extension action labels so `EZ-ONE 열기` cannot regress into mojibake in the shipped manifest.
- Client production env checks now reject mismatched frontend and extension primary origins, covering API base URL, web app URL, and OAuth redirect routes; API fallback URLs must not repeat the primary API URL.
- Backend production env checks reject non-positive JWT access/refresh TTL overrides.
- Backend production env checks reject placeholder Google/Notion OAuth client IDs as well as client secrets.
- Backend production env checks reject placeholder DB host/user values and disallow `DB_USERNAME=root`.
- Production env generation and validation reject `localhost`, `127.*`, `0.0.0.0`, and loopback hosts for public origins, client API URLs, CORS origins, and external OAuth/Notion endpoints while preserving `SERVER_ADDRESS=127.0.0.1` behind Nginx.
- Production env validation now requires official Google/Notion production endpoints for OAuth and Notion API URLs, preventing typo, proxy, or wrong-host URLs from becoming release evidence.
- EC2 deploy, rollback, runtime check, and canary commands all require `BASE_URL`/`BaseUrl` to be an HTTPS origin only, without `/api`, paths, query strings, or fragments.
- EC2 deploy, rollback, runtime check, and canary commands reject `localhost`, `127.0.0.1`, `0.0.0.0`, and loopback hosts so release verification cannot accidentally pass against a local service.
- Canary checks now include the frontend shell and `/login` SPA fallback, and `-AllowAnonymousOnly` cannot be combined with authenticated production gates such as `-WorkspaceId`, `-RequireWorkspace`, or `-RunNotionSync`.
- EC2 runtime preflight now verifies that the backend systemd service and nginx are active and enabled for reboot startup.
- Local deployment prerequisite checks now require the Korean first-deployment guide alongside the formal runbook and English beginner guide.
- Debug residue scan for `TEMP_`, `console.log`, and `it.only` in the touched auto-fill files returned no matches.
- `.\scripts\release-local-gate.ps1 -SkipSlow` completed successfully on 2026-06-30 after the latest deploy/runtime, packaging, and documentation hardening.
- `.\scripts\release-local-gate.ps1` completed successfully on 2026-06-30 with all slow gates included: backend tests/package, frontend audit/test/build, extension audit/test/build/build:local, and all release contracts.
- A source scan for common mojibake markers found no stored Korean corruption in backend, frontend, extension, README, infra, scripts, or release docs beyond the intentional checklist pattern in `docs/24_development-start-checklist.md`.
- A production-env artifact smoke using temporary frontend/extension production env files completed successfully and wrote backend/frontend/extension artifacts plus `SHA256SUMS.txt`.
- `git diff --check` passed with line-ending warnings only; no whitespace errors were reported.

Fixed extension blocker scope:

- Midas school autocomplete waits for dependent education fields before filling them.
- Midas major autocomplete/detail rows no longer shift indexes when university department controls are nearby.
- Midas language/certificate mixed sections keep add buttons and rows separated.
- SQLD/ADsP certificate rows stay isolated, including delayed certificate date inputs and blocked date-button cases.
- Action buttons such as add/navigation are excluded from option/detail fill candidates where they can cause duplicate row creation.

## Release Gate

Production go-live is still on hold until every gate below has evidence.

Use `docs/39_production-deployment-runbook.md` as the execution-day checklist and evidence template.
Before marking Go/No-go, create the release evidence file with `.\scripts\new-release-evidence.ps1 -ReleaseId <release-id> -Owner <owner-name>`, fill every field, run `.\scripts\show-release-evidence-gaps.ps1 -EvidenceFile <release-evidence.json>` until no gaps remain, and then run `.\scripts\check-release-evidence.ps1 -EvidenceFile <release-evidence.json>`.

| Gate | Required evidence | Current status |
| --- | --- | --- |
| Backend test | `backend` `.\mvnw.cmd test` log | Passed locally |
| Frontend test/build | `frontend` `npm run test`, `npm run build` logs | Passed locally |
| Extension test/build | `extension` `npm run test`, `npm run build`, `npm run build:local` logs | Passed locally |
| Security hardening | local dev token opt-in, exact CORS origins, HttpOnly web refresh cookie, production extension manifest restrictions, dependency audit | Passed locally by tests/build/audit |
| Release artifact safety | validated production client env injection, no local runtime URLs in dist bundles, no localdev extension manifest in production zip, SHA256 manifest verification | Passed locally by package smoke and contracts |
| EC2 script safety | deploy/rollback checksum verification, required extension artifact preservation, HTTPS-origin-only `BASE_URL`, runtime security header checks | Passed locally by contracts |
| Migration rehearsal | production-like MySQL backup plus Flyway migrate dry-run or staging migrate log | Pending external environment |
| Rollback rehearsal | previous artifact restore command and DB restore rehearsal evidence | Pending external environment |
| Real integration smoke | Google login, Notion sync failure isolation, loaded Chrome extension save/autofill smoke | Pending external accounts/browser |
| Canary | 30-minute health/auth/basket/workspace/Notion failure-isolation check after deploy | Pending deploy |

Critical, High, and Medium issues must be 0 before production go-live. Low issues must also be fixed when they affect first impression, accessibility, mobile usability, or can mislead users.

## Security Checklist

| Area | Check | Gate |
| --- | --- | --- |
| Auth/session | `local-dev-access-token` only works when `AUTH_LOCAL_DEV_TOKEN_ENABLED=true`; web refresh token is HttpOnly cookie based; extension body refresh remains supported | Required |
| CORS | `CORS_ALLOWED_ORIGINS` uses exact origins, never wildcard with credentials | Required |
| Production env | backend prod env rejects duplicate keys, local/dev access, docs exposure, non-HTTPS CORS, placeholder DB/OAuth/Notion/JWT secrets, shared JWT secrets, invalid Notion encryption keys, and local OAuth/Notion API URLs | Required |
| Client env | frontend and extension production `VITE_*` URLs use HTTPS, no localhost, correct `/api` path, and a real Chrome extension ID | Required |
| Release packaging | production artifact builds require validated frontend and extension env files, inject those values into Vite build processes, reject local runtime URLs in dist bundles, and reject localdev extension manifests | Required |
| Extension handoff | production manifest allows only the production web origin and real extension origin | Required |
| Extension permissions | production manifest excludes local HTTP permissions and broad web accessible resources | Required |
| Secrets | no `.env`, OAuth secret, Notion token, JWT secret, API key, or personal data committed | Required |
| Release evidence files | local `secrets/`, `backups/`, and `release-artifacts/` paths are gitignored and must not be committed | Required |
| Dependencies | frontend and extension `npm audit --audit-level=moderate` return 0 vulnerabilities | Required |
| Upload/static | uploaded files are authenticated, ownership-checked, type-limited, and size-limited | Required |
| External failure isolation | Notion/GMS/OpenDART/Mattermost failures do not roll back core user saves | Required |

## Deployment Rehearsal

1. Create a MySQL backup before migration.

```powershell
.\scripts\create-mysql-backup.ps1 -EnvFile .\secrets\ez-one.prod.env -OutputDirectory .\backups
```

2. Rehearse migrations on staging or a production-like database copy before EC2 deploy.

```powershell
.\scripts\rehearse-mysql-restore.ps1 -EnvFile .\secrets\ez-one.staging.env -BackupFile .\backups\ez_one_<yyyyMMdd_HHmmss>.sql -ExpectedAppEnv staging
.\scripts\rehearse-mysql-restore.ps1 -EnvFile .\secrets\ez-one.staging.env -BackupFile .\backups\ez_one_<yyyyMMdd_HHmmss>.sql -ExpectedAppEnv staging -Apply
.\scripts\rehearse-flyway-release.ps1 -EnvFile .\secrets\ez-one.staging.env -ExpectedAppEnv staging
.\scripts\rehearse-flyway-release.ps1 -EnvFile .\secrets\ez-one.staging.env -ExpectedAppEnv staging -Apply
```

The first restore command verifies env policy and backup checksum without writing to the database. The restore `-Apply` command and Flyway `-Apply` command must run only against staging or a restored production backup before production. Use `-ExpectedAppEnv prod` and `-AllowProductionRestore` only for an incident-owner approved production restore. Use Flyway `-ExpectedAppEnv prod -Apply -AllowProductionMigration` only for an incident-owner approved production migration.

MySQL backups are single-database dumps without embedded source `CREATE DATABASE` or `USE` statements. Restore applies to the `DB_NAME` in the target env file, so the staging/restored-backup database must exist and be safe to overwrite before restore `-Apply`.

3. Build release artifacts.

```powershell
.\scripts\package-release-artifacts.ps1 -ReleaseId <yyyyMMdd_HHmm_gitsha> -FrontendEnvFile .\secrets\frontend.prod.env -ExtensionEnvFile .\secrets\extension.prod.env
```

The script validates the production client env files, injects those values into the frontend and extension production builds, verifies that the backend JAR is a valid executable JAR with `BOOT-INF`, writes artifacts under `release-artifacts/<ReleaseId>`, and creates `RELEASE-MANIFEST.txt` plus `SHA256SUMS.txt`. Use `-AllowDirty` only for rehearsal artifacts, never for production go-live artifacts. Use `npm run build:local` only for local extension validation.
Packaging also scans frontend and extension dist files for local runtime endpoints and validates that the extension dist manifest is production-safe before creating the release zip files.

Dry-run EC2 artifact install before applying:

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

`BASE_URL` must be the HTTPS origin only. Do not use `https://ez-one.kr/api`.

## EC2 Runtime Checklist

Baseline templates:

- `infra/systemd/ez-one-backend.service`
- `infra/nginx/ez-one.conf`

| Item | Gate |
| --- | --- |
| HTTPS | reverse proxy forces HTTPS and redirects HTTP |
| Security headers | HSTS, X-Content-Type-Options, X-Frame-Options or CSP frame-ancestors, Referrer-Policy |
| Env | `APP_ENV=prod`, `SERVER_ADDRESS=127.0.0.1`, `AUTH_LOCAL_DEV_TOKEN_ENABLED=false`, `AUTH_REFRESH_COOKIE_SECURE=true`, intentional production `AUTH_REFRESH_COOKIE_SAME_SITE`, positive refresh cookie max age, exact HTTPS-only `CORS_ALLOWED_ORIGINS`, non-placeholder DB/OAuth/Notion secrets, non-placeholder distinct JWT secrets, Base64 32-byte Notion encryption key, HTTPS non-local OAuth/Notion API URLs |
| Logs | app log and reverse proxy access/error log locations are documented |
| systemd/proxy services | backend `Restart=on-failure`, backend and nginx enabled startup, working directory, env file, and user are explicit |
| Health | `/api/health` exposes no sensitive internals and returns only deploy-safe status |

EC2 runtime preflight helper:

```bash
BASE_URL=https://ez-one.kr SERVICE_NAME=ez-one-backend bash scripts/check-ec2-runtime.sh
```

## Rollback

1. Record the current artifact names and env file names.
2. Restore the previous backend JAR and restart systemd.
3. Restore the previous frontend `dist` or nginx root.
4. Keep the previous extension zip/artifact available.
5. If a migration is destructive or data looks corrupted, verify DB restore on staging before production restore.

Dry-run the rollback paths before executing:

```bash
BACKEND_ARTIFACT=/opt/ez-one/releases/<previous>/ez-one-backend-<previous>.jar \
FRONTEND_ARTIFACT=/opt/ez-one/releases/<previous>/ez-one-frontend-<previous>.zip \
EXTENSION_ARTIFACT=/opt/ez-one/releases/<previous>/ez-one-extension-<previous>.zip \
RELEASE_MANIFEST=/opt/ez-one/releases/<previous>/RELEASE-MANIFEST.txt \
CHECKSUM_FILE=/opt/ez-one/releases/<previous>/SHA256SUMS.txt \
BASE_URL=https://ez-one.kr \
bash scripts/rollback-ec2-release.sh
```

Execute only after confirming the dry-run output:

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

## Canary

Run every 5 minutes for 30 minutes after deploy:

- `/api/health`
- Google login and refresh
- Basket list and save
- Onboarding profile, document profile, and extension document profile read
- Workspace open, defaults, version list, and reference list read when `-WorkspaceId` is provided
- Notion JOB_ONLY sync with failure isolation
- Extension save/autofill smoke on supported pages
- Backend/frontend/proxy logs for errors or auth anomalies

Canary helper:

```powershell
$canaryLog = ".\.codex-run-logs\release-canary-$(Get-Date -Format yyyyMMdd-HHmmss).log"
.\scripts\run-release-canary.ps1 -BaseUrl https://ez-one.kr -AccessToken <canary-access-token> -WorkspaceId <workspace-id> -RequireWorkspace -LogFile $canaryLog
```

The helper validates HTTP status, obvious sensitive response leakage, and `ApiResponse.success` for API responses. `-BaseUrl` must be the HTTPS origin only, without `/api` or other paths. It fails authenticated checks when `-AccessToken` is missing; use `-AllowAnonymousOnly` only for a health-only smoke check. Use `-WorkspaceId <id> -RequireWorkspace` for production Go canaries so workspace read checks cannot be skipped accidentally. Use `-RunNotionSync` only with a test account and release-test Notion database because it performs a sync side effect.

Production go-live remains blocked until migration rehearsal, rollback evidence, real integration smoke, and canary evidence are complete.
