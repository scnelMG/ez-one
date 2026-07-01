# 42. 첫 운영 배포 가이드

상태: EZ-ONE을 처음 배포하는 사람이 순서대로 따라갈 수 있도록 만든 한국어 실행 가이드입니다. 최종 Go/No-go 판단과 증거 기준은 [39. Production Deployment Runbook](./39_production-deployment-runbook.md)을 기준으로 합니다.

## 먼저 이해할 것

운영 배포는 파일을 서버에 올리는 일이 아니라, 실패했을 때 되돌릴 수 있음을 증명하는 과정입니다. 아래 순서를 건너뛰면 배포가 된 것처럼 보여도 운영 준비가 끝난 것이 아닙니다.

## 명령 실행 위치

| 위치 | 의미 |
| --- | --- |
| 로컬 PC | 이 저장소가 있는 Windows PowerShell |
| EC2 | SSH로 접속한 Ubuntu 서버 |
| 콘솔 | AWS, DNS, Google Cloud, Notion 웹 콘솔 |

## 배포 전 준비물

| 준비물 | 이유 |
| --- | --- |
| AWS 계정, EC2, Elastic IP, DNS A record | 운영 서버와 도메인 |
| 운영 MySQL DB | 실제 데이터 저장 |
| staging 또는 restored-backup DB | restore와 Flyway migration 리허설 |
| 테스트 Google/Notion 계정 | 운영 사용자 데이터 없이 smoke/canary 수행 |
| Git Bash 또는 WSL | shell script 문법 검증 |
| MySQL client tools | DB 백업과 복원 리허설 |

로컬 PC에서 먼저 도구를 확인합니다.

```powershell
.\scripts\check-deployment-prereqs.ps1 -RequireDatabaseTools -RequireBash
```

## 전체 순서

1. AWS와 도메인을 준비합니다.
2. EC2 기본 패키지와 런타임을 설치합니다.
3. 운영 env 파일을 만들고 검증합니다.
4. Google/Notion 운영 redirect URL을 등록합니다.
5. 전체 로컬 릴리즈 게이트를 통과시킵니다.
6. DB 백업과 migration 리허설을 합니다.
7. release artifact를 만듭니다.
8. EC2로 artifact를 업로드합니다.
9. EC2 deploy dry-run을 실행합니다.
10. `DRY_RUN=false`로 실제 배포합니다.
11. 실제 사용자 관점 smoke test를 합니다.
12. 30분 canary를 돌립니다.
13. rollback 준비 상태를 확인합니다.
14. release evidence를 채우고 Go/No-go를 결정합니다.

## 1단계: AWS와 도메인 준비

실행 위치: AWS 콘솔, DNS 콘솔.

- Ubuntu EC2 인스턴스를 만듭니다.
- 보안 그룹은 SSH 22, HTTP 80, HTTPS 443만 엽니다.
- Elastic IP를 붙입니다.
- 도메인의 A record를 Elastic IP로 연결합니다.
- SSH 접속을 확인합니다.

## 2단계: EC2 기본 설치

실행 위치: EC2.

```bash
sudo apt update
sudo apt install -y git openjdk-17-jre-headless nginx unzip rsync curl ca-certificates certbot mysql-client
sudo useradd --system --home /opt/ez-one --shell /usr/sbin/nologin ezone || true
sudo mkdir -p /opt/ez-one/backend /opt/ez-one/incoming /opt/ez-one/releases /opt/ez-one/source /etc/ez-one /var/www/ez-one
sudo chown -R ezone:ezone /opt/ez-one/backend /opt/ez-one/releases
sudo chown -R ubuntu:ubuntu /opt/ez-one/incoming /opt/ez-one/source
```

저장소를 EC2에 복사한 뒤에는 bootstrap helper로 같은 작업을 dry-run으로 먼저 확인할 수 있습니다.

```bash
bash scripts/bootstrap-ec2-host.sh
```

출력된 명령과 경로를 확인한 뒤 실제 적용합니다.

```bash
DRY_RUN=false bash scripts/bootstrap-ec2-host.sh
```

HTTPS 인증서를 먼저 발급한 뒤 Nginx template을 적용합니다. checked-in Nginx template은 `/etc/letsencrypt/live/<domain>/...` 경로를 사용하므로 인증서 파일이 없으면 `nginx -t`가 실패합니다.

```bash
sudo certbot certonly --standalone -d ez-one.kr -d www.ez-one.kr
```

운영 도메인이 예시와 다르면 `infra/nginx/ez-one.conf`의 `server_name`과 `ssl_certificate`, `ssl_certificate_key`를 실제 도메인 경로로 바꿉니다. 이 template은 `Permissions-Policy`와 `Cross-Origin-Opener-Policy` 같은 보안 헤더도 포함합니다.

template 적용도 helper로 할 수 있습니다.

```bash
DRY_RUN=false APPLY_TEMPLATES=true DOMAIN_NAME=ez-one.kr bash scripts/bootstrap-ec2-host.sh
```

수동으로 적용한다면 다음 명령을 사용합니다.

```bash
sudo cp infra/systemd/ez-one-backend.service /etc/systemd/system/ez-one-backend.service
sudo cp infra/nginx/ez-one.conf /etc/nginx/sites-available/ez-one
sudo ln -sf /etc/nginx/sites-available/ez-one /etc/nginx/sites-enabled/ez-one
sudo nginx -t
sudo systemctl daemon-reload
sudo systemctl enable ez-one-backend
sudo systemctl enable nginx
```

## 3단계: 운영 env 파일 만들기

실행 위치: 로컬 PC.

```powershell
.\scripts\new-production-env-files.ps1 -Origin https://ez-one.kr -OutputDirectory .\secrets
```

생성된 파일의 `CHANGE_ME_*` 값을 실제 운영 값으로 바꿉니다. backend env는 `SPRING_PROFILES_ACTIVE=mysql`, `SQL_INIT_MODE=never`를 유지해야 합니다. `APP_PUBLIC_BASE_URL`은 `https://ez-one.kr`처럼 경로가 없는 운영 HTTPS origin이어야 하며, 스터디 초대/업로드 이미지처럼 백엔드가 만드는 사용자 노출 링크에 사용됩니다. `DB_NAME`은 실제 DB 이름이어야 하며 placeholder이면 안 됩니다. `DB_PASSWORD`, `GOOGLE_CLIENT_SECRET`, `NOTION_CLIENT_SECRET`은 placeholder가 아니어야 하고 16자 이상이어야 합니다(at least 16 characters). `VITE_EXTENSION_INSTALL_URL` must be a non-empty Chrome Web Store URL and must include `VITE_EXTENSION_ID` so users install the expected production Chrome extension. Google and Notion URL values must stay on the official Google/Notion production endpoints.

Enabled integrations require their matching production key. Disabled integrations may omit keys, including `PUBLIC_DATA_API_KEY`, `OPENDART_API_KEY`, `GMS_API_KEY`, and `MATTERMOST_WEBHOOK_SECRET(S)` when the related integration is off. Keep `COMPANY_ENRICHMENT_REALTIME_ENABLED=false` unless the release owner intentionally enables realtime enrichment and records `PUBLIC_DATA_API_KEY` validation evidence without printing the key. `COMPANY_DATA_STARTUP_SYNC_ENABLED=false` and `COMPANY_DATA_BATCH_SYNC_ENABLED=false` are the production defaults and should not be enabled for a first deploy.

Provider URL review table:

| Provider env key | Production review rule |
| --- | --- |
| `GMS_AI_BASE_URL`, `GMS_KEY_INFO_URL` | HTTPS only, non-local, expected host `gms.ssafy.io`; key-info path is `/gmsapi/key-info`. |
| `OPENDART_API_BASE_URL`, `OPENDART_VIEWER_BASE_URL`, `OPENDART_COMPANY_OVERVIEW_SOURCE_URL` | HTTPS only, non-local, expected OpenDART/DART hosts and documented paths; the company overview source URL must preserve `apiGrpCd=DS001` and `apiId=2019002`. |
| `VENTURE_COMPANY_API_URL`, `NATIONAL_PENSION_API_URL`, `PUBLIC_INSTITUTION_API_URL`, `FTC_AFFILIATE_API_URL` | Exact `apis.data.go.kr` host/path; HTTP is allowed only for these public-data endpoints. |
| `FINANCIAL_COMPANY_BASIC_INFO_URL`, `MIDDLE_MARKET_API_URL` | May be blank; if present, HTTPS only and non-local. |

For each justified HTTP public-data endpoint, write a data-sensitivity note confirming no secrets, auth headers, cookies, or personal data are sent to that endpoint. The client localhost/generic fallbacks are deferred only because production env/artifact validators require explicit HTTPS env overrides for frontend and extension artifacts.

검증:

```powershell
.\scripts\check-prod-env.ps1 -EnvFile .\secrets\ez-one.prod.env
.\scripts\check-client-prod-env.ps1 -FrontendEnvFile .\secrets\frontend.prod.env -ExtensionEnvFile .\secrets\extension.prod.env
```

검증 명령 출력은 보관합니다. env evidence 체크리스트는 5단계에서 `release-evidence.json`을 만든 뒤 생성합니다.

## 4단계: Google/Notion redirect URL 등록

실행 위치: Google Cloud Console, Notion integration 설정.

프론트 env와 콘솔 설정이 정확히 같아야 합니다.

```text
VITE_API_BASE_URL=https://ez-one.kr/api
VITE_GOOGLE_REDIRECT_URI=https://ez-one.kr/login/callback
VITE_NOTION_REDIRECT_URI=https://ez-one.kr/mypage/notion
```

한 글자라도 다르면 Google 로그인 또는 Notion 연결이 실패할 수 있습니다.

## 5단계: 전체 로컬 릴리즈 게이트

실행 위치: 로컬 PC.

```powershell
$gateLog = ".\.codex-run-logs\release-local-gate-full-$(Get-Date -Format yyyyMMdd-HHmmss).log"
.\scripts\release-local-gate.ps1 -LogFile $gateLog
```

`-SkipSlow`는 로컬에서 빠르게 확인할 때만 사용합니다. 최종 release evidence로는 사용할 수 없습니다. backend/frontend/extension의 느린 test/build gate를 건너뛰기 때문이며, `new-release-evidence.ps1 -LocalGateLog`는 `[SKIP]` 또는 `[FAIL]` 마커가 있는 local gate log를 거부합니다.

이 명령은 backend test/package, frontend audit/test/build, extension audit/test/build, 보안/배포/rollback/evidence 계약을 모두 실행합니다. 실패하면 배포를 멈추고 원인을 먼저 고칩니다.

전체 로컬 게이트가 통과하면 바로 release evidence 파일을 만듭니다.

```powershell
.\scripts\new-release-evidence.ps1 -ReleaseId <release-id> -Owner <owner-name> -LocalGateLog $gateLog
```

그 다음 env evidence 체크리스트를 생성합니다.

```powershell
.\scripts\new-production-env-evidence-checklist.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json
```

같은 release-artifacts 폴더에 생성된 `production-env-evidence-checklist.md`에 명령 출력, EC2 env 파일 owner/mode, secret owner/rotation note를 기록합니다. 원본 secret 값은 붙여넣지 않습니다.

## 6단계: DB 백업과 migration 리허설

실행 위치: 로컬 PC 또는 운영 접근이 가능한 안전한 admin 환경.

운영 DB를 건드리기 전 백업과 checksum을 남깁니다.

```powershell
.\scripts\create-mysql-backup.ps1 -EnvFile .\secrets\ez-one.prod.env -OutputDirectory .\db-backups
```

복원은 staging 또는 restored-backup DB에서 먼저 검증합니다. 운영 DB restore는 staging 리허설이 끝났거나 incident owner가 긴급 복원을 명시 승인한 경우에만 합니다. 운영 restore에는 `-AllowProductionRestore`와 `-ProductionApprovalNote`가 모두 필요합니다.

Flyway도 staging 또는 restored-backup DB에서 먼저 검증합니다. 운영 Flyway `-Apply`는 `-AllowProductionMigration`과 `-ProductionApprovalNote`가 모두 필요합니다. `-ProductionApprovalNote`에는 incident/release owner, 사유, 승인 티켓 또는 기록 경로를 적습니다.

## 7단계: release artifact 만들기

실행 위치: 로컬 PC.

운영 배포용으로는 dirty worktree를 사용하지 않습니다.

```powershell
$releaseId = "20260630_1200_<gitsha>"
.\scripts\package-release-artifacts.ps1 -ReleaseId $releaseId -FrontendEnvFile .\secrets\frontend.prod.env -ExtensionEnvFile .\secrets\extension.prod.env
```

`-AllowDirty`는 리허설 artifact에만 사용합니다. update-release-evidence.ps1 rejects artifact evidence with `git_worktree=dirty`, 그래서 dirty worktree에서 만든 artifact는 최종 release evidence가 될 수 없습니다.

생성 결과:

```text
release-artifacts/<release-id>/
  ez-one-backend-<release-id>.jar
  ez-one-frontend-<release-id>.zip
  ez-one-extension-<release-id>.zip
  RELEASE-MANIFEST.txt
  SHA256SUMS.txt
```

artifact manifest와 checksum evidence는 사람이 복사하지 말고 release evidence 생성 후 import합니다.

```powershell
.\scripts\update-release-evidence.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json -ArtifactDirectory .\release-artifacts\<release-id>
```

## 8단계: EC2로 업로드

실행 위치: 로컬 PC.

```powershell
scp .\release-artifacts\<release-id>\* ubuntu@<ec2-host>:/opt/ez-one/incoming/
ssh ubuntu@<ec2-host> "mkdir -p /opt/ez-one/incoming/scripts"
scp .\scripts\deploy-ec2-release.sh ubuntu@<ec2-host>:/opt/ez-one/incoming/scripts/
scp .\scripts\rollback-ec2-release.sh ubuntu@<ec2-host>:/opt/ez-one/incoming/scripts/
scp .\scripts\check-ec2-runtime.sh ubuntu@<ec2-host>:/opt/ez-one/incoming/scripts/
```

## 9단계: EC2 deploy dry-run

실행 위치: EC2.

```bash
cd /opt/ez-one/incoming
RELEASE_ID=<release-id> \
BACKEND_ARTIFACT=/opt/ez-one/incoming/ez-one-backend-<release-id>.jar \
FRONTEND_ARTIFACT=/opt/ez-one/incoming/ez-one-frontend-<release-id>.zip \
EXTENSION_ARTIFACT=/opt/ez-one/incoming/ez-one-extension-<release-id>.zip \
RELEASE_MANIFEST=/opt/ez-one/incoming/RELEASE-MANIFEST.txt \
CHECKSUM_FILE=/opt/ez-one/incoming/SHA256SUMS.txt \
BASE_URL=https://ez-one.kr \
bash scripts/deploy-ec2-release.sh
```

dry-run 출력에서 checksum 검증, manifest 검증, 복사 대상 경로가 맞는지 확인합니다.
dry-run 출력은 로그로 저장한 뒤 release evidence로 import합니다.

```powershell
$deployDryRunLog = ".\.codex-run-logs\deploy-dry-run-<release-id>.log"
.\scripts\update-release-evidence.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json -DeployDryRunLog $deployDryRunLog
```

## 10단계: 실제 배포

실행 위치: EC2.

```bash
cd /opt/ez-one/incoming
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

`BASE_URL`을 넣고 `DRY_RUN=false`로 실제 배포하면 deploy script automatically runs `check-ec2-runtime.sh` after the health check.
실제 배포 출력도 로그로 저장한 뒤 release evidence로 import합니다.

```powershell
$deployApplyLog = ".\.codex-run-logs\deploy-apply-<release-id>.log"
.\scripts\update-release-evidence.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json -DeployApplyLog $deployApplyLog
```

## 11단계: 실제 사용자 smoke test

실행 위치: 브라우저, 테스트 Google/Notion 계정, 로드된 Chrome Extension.

먼저 smoke evidence 체크리스트를 생성합니다.

```powershell
.\scripts\new-real-smoke-checklist.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json -BaseUrl https://ez-one.kr
```

The smoke checklist `-BaseUrl` must be the HTTPS origin only. Do not include `/api`, another path, a query string, a fragment, `localhost`, or a loopback IP.

같은 release-artifacts 폴더에 생성된 `real-integration-smoke-checklist.md`에 스크린샷 또는 로그 경로를 적으면서 테스트합니다.

1. `https://ez-one.kr` 접속.
2. Google 로그인.
3. 온보딩 저장과 reload 확인.
4. 공고 저장, 바구니, 워크스페이스 조회 확인.
5. essay draft/version, reference CRUD, document profile 저장 확인.
6. Notion JOB_ONLY sync 실패가 core save를 깨뜨리지 않는지 확인.
7. 로드된 Extension으로 공고 저장과 지원서 자동입력 확인.

Critical/High/Medium 문제가 하나라도 나오면 배포를 멈추고 rollback합니다.

## 12단계: 30분 canary

실행 위치: 로컬 PC.

```powershell
$canaryLog = ".\.codex-run-logs\release-canary-$(Get-Date -Format yyyyMMdd-HHmmss).log"
.\scripts\run-release-canary.ps1 -BaseUrl https://ez-one.kr -AccessToken <canary-access-token> -WorkspaceId <workspace-id> -RequireWorkspace -LogFile $canaryLog
.\scripts\update-release-evidence.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json -CanaryLog $canaryLog
```

최종 Go 판단용 canary에서는 `-Iterations` 또는 `-IntervalSeconds`를 줄이지 않습니다. evidence import는 기본 7회, 5분 간격, 30분 schedule을 증명하는 로그만 받습니다. 운영 Go 판단에는 canary 테스트 계정에 최소 1개 공고와 1개 workspace가 있어야 하며 `-RequireWorkspace`를 유지합니다.

Notion side effect까지 확인할 때만:

```powershell
$canaryLog = ".\.codex-run-logs\release-canary-notion-$(Get-Date -Format yyyyMMdd-HHmmss).log"
.\scripts\run-release-canary.ps1 -BaseUrl https://ez-one.kr -AccessToken <canary-access-token> -WorkspaceId <workspace-id> -RequireWorkspace -RunNotionSync -LogFile $canaryLog
.\scripts\update-release-evidence.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json -CanaryLog $canaryLog -RequireNotionSync
```

최종 Go 판단에서는 `gates.canary.errorRateOrObservedFailures` evidence가 반드시 `0 observed failures and 0 observed errors`라고 명시해야 합니다.

## 13단계: rollback 준비

실행 위치: EC2.

첫 성공 배포 이후부터는 이전 release artifact를 `/opt/ez-one/releases/<previous>`에 보관합니다.

rollback dry-run:

```bash
cd /opt/ez-one/incoming
BACKEND_ARTIFACT=/opt/ez-one/releases/<previous>/ez-one-backend-<previous>.jar \
FRONTEND_ARTIFACT=/opt/ez-one/releases/<previous>/ez-one-frontend-<previous>.zip \
EXTENSION_ARTIFACT=/opt/ez-one/releases/<previous>/ez-one-extension-<previous>.zip \
RELEASE_MANIFEST=/opt/ez-one/releases/<previous>/RELEASE-MANIFEST.txt \
CHECKSUM_FILE=/opt/ez-one/releases/<previous>/SHA256SUMS.txt \
BASE_URL=https://ez-one.kr \
bash scripts/rollback-ec2-release.sh
```

rollback dry-run 출력은 로그로 저장한 뒤 release evidence로 import합니다.

```powershell
$rollbackDryRunLog = ".\.codex-run-logs\rollback-dry-run-<release-id>.log"
.\scripts\update-release-evidence.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json -RollbackDryRunLog $rollbackDryRunLog
```

rollback 실행:

```bash
cd /opt/ez-one/incoming
DRY_RUN=false \
BACKEND_ARTIFACT=/opt/ez-one/releases/<previous>/ez-one-backend-<previous>.jar \
FRONTEND_ARTIFACT=/opt/ez-one/releases/<previous>/ez-one-frontend-<previous>.zip \
EXTENSION_ARTIFACT=/opt/ez-one/releases/<previous>/ez-one-extension-<previous>.zip \
RELEASE_MANIFEST=/opt/ez-one/releases/<previous>/RELEASE-MANIFEST.txt \
CHECKSUM_FILE=/opt/ez-one/releases/<previous>/SHA256SUMS.txt \
BASE_URL=https://ez-one.kr \
bash scripts/rollback-ec2-release.sh
```

`BASE_URL`을 넣고 `DRY_RUN=false`로 rollback하면 rollback script automatically runs `check-ec2-runtime.sh` after the post-rollback health check.

rollback 실행 출력도 로그로 저장한 뒤 release evidence로 import합니다.

```powershell
$rollbackApplyLog = ".\.codex-run-logs\rollback-apply-<release-id>.log"
.\scripts\update-release-evidence.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json -RollbackApplyLog $rollbackApplyLog
```

## 14단계: release evidence 작성

실행 위치: 로컬 PC.

release evidence 파일은 5단계에서 이미 만들어져 있어야 합니다. 이전 흐름으로 5단계를 실행했다면 아래 명령으로 지금 생성하고 Gate 0 증거를 가져옵니다.

```powershell
.\scripts\new-release-evidence.ps1 -ReleaseId <release-id> -Owner <owner-name> -LocalGateLog $gateLog
```

release artifact를 만든 뒤에는 manifest와 checksum evidence를 자동으로 가져옵니다.

```powershell
.\scripts\update-release-evidence.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json -ArtifactDirectory .\release-artifacts\<release-id>
```

모든 항목은 실제 명령 출력, 스크린샷 경로, 로그 발췌, 담당자 메모로 채웁니다. JSON을 직접 편집하지 말고 helper로 필요한 항목을 채웁니다.

```powershell
.\scripts\set-release-evidence-field.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json -Path gates.productionEnvPolicy.envPolicyCheckOutput -Value "check-prod-env.ps1 passed on 2026-06-30 with real production env file"
```

비어 있거나 placeholder로 남은 항목을 한 번에 확인합니다.

```powershell
.\scripts\show-release-evidence-gaps.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json
```

출력의 `Suggested evidence examples`를 보면 각 항목에 어떤 명령 출력, 스크린샷 경로, 로그 발췌, 담당자 메모를 넣어야 하는지 알 수 있습니다. 초보자 기준으로는 gap report가 `0`개가 될 때까지 운영 Go를 결정하지 않습니다.
`Suggested next commands`에는 다음에 실행할 배포 명령 후보가 같이 나오므로, 남은 gate를 추측하지 말고 그 순서대로 증거를 채웁니다.
가장 먼저 실행할 것은 `First next command` 한 줄입니다. 그 다음 필요한 경우 전체 `Suggested next commands` 목록을 따라갑니다.
`Go`로 판단한 경우 gap report도 `gates.canary.errorRateOrObservedFailures`에 `0 observed failures and 0 observed errors`가 명시되어 있는지 확인합니다.

```powershell
.\scripts\check-release-evidence.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json
```

검증이 통과하면 helper로 최종 Go를 기록합니다.

```powershell
.\scripts\set-release-decision.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json -Decision Go -Owner <owner-name> -Reason "all release gates have real production evidence"
```

아직 빠진 증거가 있거나 즉시 멈춰야 하는 조건이 있으면 No-go를 기록합니다.

```powershell
.\scripts\set-release-decision.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json -Decision No-go -Owner <owner-name> -Reason "production env evidence is still incomplete"
```

## 즉시 멈춰야 하는 경우

- `release-local-gate.ps1` 실패.
- production env 검증 실패.
- MySQL 백업 또는 checksum 누락.
- staging/restored DB에서 restore/Flyway rehearsal 미실행.
- deploy dry-run checksum 실패 또는 경로 이상.
- 운영 도메인에서 Google login 실패.
- 바구니, 워크스페이스, 문서 프로필 smoke 실패.
- Notion 실패가 공고 저장을 깨뜨림.
- 로드된 Extension의 공고 저장 또는 지원서 자동입력 실패.
- canary에서 frontend shell 실패, API 실패, 민감 정보 노출, 반복 오류 발생.

멈춤 조건이 나오면 수정, 같은 게이트 재실행, 통과 확인 순서로 진행합니다. 운영에서 먼저 시험해보는 방식으로 진행하지 않습니다.
