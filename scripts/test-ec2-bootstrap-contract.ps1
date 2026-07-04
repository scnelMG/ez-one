[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$bootstrapPath = Join-Path $repoRoot "scripts/bootstrap-ec2-host.sh"
$beginnerGuidePath = Join-Path $repoRoot "docs/41_beginner-deployment-guide.md"
$koreanBeginnerGuidePath = Join-Path $repoRoot "docs/42_first-deployment-ko.md"
$infraReadmePath = Join-Path $repoRoot "infra/README.md"

function Assert-Path {
  param(
    [string]$Path,
    [string]$Message
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    throw $Message
  }
}

function Assert-Contains {
  param(
    [string]$Text,
    [string]$Expected,
    [string]$Message
  )

  if (-not $Text.Contains($Expected)) {
    throw $Message
  }
}

Assert-Path $bootstrapPath "scripts/bootstrap-ec2-host.sh must exist for first-time EC2 setup."

$bootstrap = Get-Content -Raw -LiteralPath $bootstrapPath
$beginnerGuide = Get-Content -Raw -LiteralPath $beginnerGuidePath
$koreanBeginnerGuide = Get-Content -Raw -LiteralPath $koreanBeginnerGuidePath
$infraReadme = Get-Content -Raw -LiteralPath $infraReadmePath
$expectedPackageList = 'git openjdk-17-jre-headless nginx unzip rsync curl ca-certificates certbot mysql-client'

Assert-Contains $bootstrap 'DRY_RUN="${DRY_RUN:-true}"' "bootstrap script must default to dry-run mode."
Assert-Contains $bootstrap 'DRY_RUN must be true or false' "bootstrap script must validate DRY_RUN."
Assert-Contains $bootstrap $expectedPackageList "bootstrap script must install the documented EC2 package set."
Assert-Contains $bootstrap 'useradd --system --gid "$APP_GROUP" --home "$APP_ROOT" --shell /usr/sbin/nologin "$APP_USER"' "bootstrap script must create the non-login systemd user in the documented app group."
Assert-Contains $bootstrap 'mkdir -p "$APP_ROOT/backend" "$APP_ROOT/incoming" "$APP_ROOT/releases" "$APP_ROOT/source" "$ENV_DIR" "$FRONTEND_ROOT"' "bootstrap script must create the documented runtime directories."
Assert-Contains $bootstrap 'chown -R "$APP_USER:$APP_GROUP" "$APP_ROOT/backend" "$APP_ROOT/releases"' "bootstrap script must give backend/release ownership to the service user."
Assert-Contains $bootstrap 'chown -R "$DEPLOY_USER:$DEPLOY_GROUP" "$APP_ROOT/incoming" "$APP_ROOT/source"' "bootstrap script must keep incoming/source writable by the deploy user."
Assert-Contains $bootstrap 'chmod 750 "$ENV_DIR"' "bootstrap script must restrict the production env directory."
Assert-Contains $bootstrap 'APPLY_TEMPLATES="${APPLY_TEMPLATES:-false}"' "bootstrap script must make template installation opt-in."
Assert-Contains $bootstrap 'cp "$SOURCE_DIR/infra/systemd/ez-one-backend.service" /etc/systemd/system/ez-one-backend.service' "bootstrap script must install the checked-in systemd template when requested."
Assert-Contains $bootstrap 'cp "$SOURCE_DIR/infra/nginx/ez-one.conf" /etc/nginx/sites-available/ez-one' "bootstrap script must install the checked-in nginx template when requested."
Assert-Contains $bootstrap 'systemctl enable ez-one-backend' "bootstrap script must enable the backend service for reboot startup."
Assert-Contains $bootstrap 'systemctl enable nginx' "bootstrap script must enable nginx for reboot startup."
Assert-Contains $bootstrap 'nginx -t' "bootstrap script must validate nginx config before reload."
Assert-Contains $bootstrap 'Set DOMAIN_NAME to the real production domain and update infra/nginx/ez-one.conf before APPLY_TEMPLATES=true.' "bootstrap script must warn before applying templates with placeholder domain assumptions."

Assert-Contains $beginnerGuide 'bash scripts/bootstrap-ec2-host.sh' "English beginner guide must reference the EC2 bootstrap script."
Assert-Contains $beginnerGuide 'DRY_RUN=false bash scripts/bootstrap-ec2-host.sh' "English beginner guide must show the apply command for the EC2 bootstrap script."
Assert-Contains $beginnerGuide "sudo apt install -y $expectedPackageList" "English beginner guide must show the same EC2 package set as the bootstrap helper."
Assert-Contains $koreanBeginnerGuide 'bash scripts/bootstrap-ec2-host.sh' "Korean beginner guide must reference the EC2 bootstrap script."
Assert-Contains $koreanBeginnerGuide 'DRY_RUN=false bash scripts/bootstrap-ec2-host.sh' "Korean beginner guide must show the apply command for the EC2 bootstrap script."
Assert-Contains $koreanBeginnerGuide "sudo apt install -y $expectedPackageList" "Korean beginner guide must show the same EC2 package set as the bootstrap helper."
Assert-Contains $koreanBeginnerGuide 'sudo mkdir -p /opt/ez-one/backend /opt/ez-one/incoming /opt/ez-one/releases /opt/ez-one/source /etc/ez-one /var/www/ez-one' "Korean beginner guide must create the same runtime, source, env, and frontend directories as the bootstrap helper."
Assert-Contains $koreanBeginnerGuide 'sudo chown -R ezone:ezone /opt/ez-one/backend /opt/ez-one/releases' "Korean beginner guide must keep backend/release ownership aligned with the service user."
Assert-Contains $koreanBeginnerGuide 'sudo chown -R ubuntu:ubuntu /opt/ez-one/incoming /opt/ez-one/source' "Korean beginner guide must keep incoming/source writable by the deploy user for first SCP upload."
Assert-Contains $infraReadme 'scripts/bootstrap-ec2-host.sh' "Infra README must mention the EC2 bootstrap helper."
Assert-Contains $infraReadme 'EC2 runtime packages: `git`, `openjdk-17-jre-headless`, `nginx`, `unzip`, `rsync`, `curl`, `ca-certificates`, `certbot`, and `mysql-client`.' "Infra README must list the same EC2 package set as the bootstrap helper."

Write-Host "[PASS] EC2 bootstrap contract test passed."
