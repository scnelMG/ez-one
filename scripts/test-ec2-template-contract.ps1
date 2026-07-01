[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$systemdPath = Join-Path $repoRoot "infra/systemd/ez-one-backend.service"
$nginxPath = Join-Path $repoRoot "infra/nginx/ez-one.conf"
$deployPath = Join-Path $repoRoot "scripts/deploy-ec2-release.sh"
$rollbackPath = Join-Path $repoRoot "scripts/rollback-ec2-release.sh"
$bootstrapPath = Join-Path $repoRoot "scripts/bootstrap-ec2-host.sh"
$beginnerGuidePath = Join-Path $repoRoot "docs/41_beginner-deployment-guide.md"
$koreanBeginnerGuidePath = Join-Path $repoRoot "docs/42_first-deployment-ko.md"
$infraReadmePath = Join-Path $repoRoot "infra/README.md"

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

$systemd = Get-Content -Raw -LiteralPath $systemdPath
$nginx = Get-Content -Raw -LiteralPath $nginxPath
$deploy = Get-Content -Raw -LiteralPath $deployPath
$rollback = Get-Content -Raw -LiteralPath $rollbackPath
$bootstrap = Get-Content -Raw -LiteralPath $bootstrapPath
$runtime = Get-Content -Raw -LiteralPath (Join-Path $repoRoot "scripts/check-ec2-runtime.sh")
$beginnerGuide = Get-Content -Raw -LiteralPath $beginnerGuidePath
$koreanBeginnerGuide = Get-Content -Raw -LiteralPath $koreanBeginnerGuidePath
$infraReadme = Get-Content -Raw -LiteralPath $infraReadmePath

Assert-Contains $systemd "User=ezone" "systemd service must run as the documented ezone user."
Assert-Contains $systemd "Group=ezone" "systemd service must run as the documented ezone group."
Assert-Contains $systemd "WorkingDirectory=/opt/ez-one/backend" "systemd working directory must match deploy backend directory."
Assert-Contains $systemd "EnvironmentFile=/etc/ez-one/ez-one.prod.env" "systemd env file path must match beginner deployment guide."
Assert-Contains $systemd "ExecStart=/usr/bin/java -jar /opt/ez-one/backend/app.jar" "systemd backend jar path must match deploy target."
Assert-Contains $systemd "NoNewPrivileges=true" "systemd service must prevent privilege escalation."
Assert-Contains $systemd "PrivateTmp=true" "systemd service must isolate temporary files."
Assert-Contains $systemd "ProtectSystem=full" "systemd service must make OS/vendor paths read-only."
Assert-Contains $systemd "ProtectHome=true" "systemd service must hide home directories from the backend process."
Assert-Contains $systemd "PrivateDevices=true" "systemd service must deny device access."
Assert-Contains $systemd "CapabilityBoundingSet=" "systemd service must drop Linux capabilities by default."
Assert-Contains $systemd "RestrictSUIDSGID=true" "systemd service must block SUID/SGID privilege paths."
Assert-Contains $systemd "LockPersonality=true" "systemd service must lock process personality changes."

Assert-Contains $deploy 'BACKEND_TARGET="${BACKEND_TARGET:-/opt/ez-one/backend/app.jar}"' "deploy backend target must match systemd ExecStart."
Assert-Contains $rollback 'BACKEND_TARGET="${BACKEND_TARGET:-/opt/ez-one/backend/app.jar}"' "rollback backend target must match systemd ExecStart."
Assert-Contains $deploy 'FRONTEND_TARGET="${FRONTEND_TARGET:-/var/www/ez-one}"' "deploy frontend target must match nginx root."
Assert-Contains $rollback 'FRONTEND_TARGET="${FRONTEND_TARGET:-/var/www/ez-one}"' "rollback frontend target must match nginx root."
Assert-Contains $bootstrap 'useradd --system --gid "$APP_GROUP" --home "$APP_ROOT" --shell /usr/sbin/nologin "$APP_USER"' "bootstrap must create the app user in the documented app group when the group already exists."
Assert-Contains $runtime "BASE_URL must be an HTTPS origin only, without path, query string, or fragment" "runtime check must reject BASE_URL values that include /api, a path, query string, or fragment."
Assert-Contains $runtime "BASE_URL must not use a local host" "runtime check must reject localhost or loopback BASE_URL values."
Assert-Contains $runtime 'systemctl is-enabled "$SERVICE_NAME"' "runtime check must verify that the backend service is enabled for EC2 reboots."
Assert-Contains $runtime 'systemctl is-active nginx' "runtime check must verify that nginx is active."
Assert-Contains $runtime 'systemctl is-enabled nginx' "runtime check must verify that nginx is enabled for EC2 reboots."
Assert-Contains $runtime 'stat -c' "runtime check must verify systemd EnvironmentFile owner, group, and mode."
Assert-Contains $runtime 'EnvironmentFile must not be world-readable or world-writable' "runtime check must reject loose production env file permissions."
Assert-Contains $runtime 'EnvironmentFile group must match service user' "runtime check must ensure the backend service user can read the env file without exposing it broadly."
Assert-Contains $runtime "NoNewPrivileges" "runtime check must verify systemd NoNewPrivileges."
Assert-Contains $runtime "ProtectSystem" "runtime check must verify systemd ProtectSystem."
Assert-Contains $runtime "ProtectHome" "runtime check must verify systemd ProtectHome."
Assert-Contains $runtime "PrivateDevices" "runtime check must verify systemd PrivateDevices."
Assert-Contains $runtime "CapabilityBoundingSet" "runtime check must verify systemd capability bounding."
Assert-Contains $runtime "RestrictSUIDSGID" "runtime check must verify systemd RestrictSUIDSGID."
Assert-Contains $runtime "LockPersonality" "runtime check must verify systemd LockPersonality."
Assert-Contains $runtime "permissions-policy" "runtime check must verify that the deployed site sends Permissions-Policy."
Assert-Contains $runtime "cross-origin-opener-policy" "runtime check must verify that the deployed site sends Cross-Origin-Opener-Policy."
Assert-Contains $nginx "root /var/www/ez-one;" "nginx root must match deploy frontend target."
Assert-Contains $nginx "proxy_pass http://127.0.0.1:8080;" "nginx API proxy must match backend server address and port."
Assert-Contains $nginx 'add_header Permissions-Policy' "nginx template must send Permissions-Policy."
Assert-Contains $nginx 'add_header Cross-Origin-Opener-Policy' "nginx template must send Cross-Origin-Opener-Policy."

Assert-Contains $beginnerGuide "useradd --system --home /opt/ez-one --shell /usr/sbin/nologin ezone" "beginner guide must create the systemd user."
Assert-Contains $beginnerGuide "chown -R ezone:ezone /opt/ez-one/backend /opt/ez-one/releases" "beginner guide must chown backend directories to the systemd user."
Assert-Contains $beginnerGuide "/etc/ez-one/ez-one.prod.env" "beginner guide env file path must match systemd EnvironmentFile."
Assert-Contains $beginnerGuide "git openjdk-17-jre-headless nginx unzip rsync curl ca-certificates certbot mysql-client" "beginner guide must install every package required by source checkout, TLS setup, deploy, rollback, runtime, and DB checks."
Assert-Contains $beginnerGuide "sudo certbot certonly --standalone -d ez-one.kr -d www.ez-one.kr" "beginner guide must create Let's Encrypt certificate files before enabling the SSL nginx template."
Assert-Contains $beginnerGuide 'replace both the `server_name` and' "beginner guide must tell deployers to update nginx domain-specific fields when the production domain differs."
Assert-Contains $beginnerGuide "git status --short" "beginner guide must tell first-time deployers to confirm a clean worktree before packaging production artifacts."
Assert-Contains $beginnerGuide 'Use `-AllowDirty` only for rehearsal' "beginner guide must reserve dirty artifact builds for rehearsals only."
Assert-Contains $beginnerGuide "sudo systemctl enable ez-one-backend" "beginner guide must enable the backend service so it starts after EC2 reboot."
Assert-Contains $beginnerGuide "sudo systemctl enable nginx" "beginner guide must explicitly enable nginx so it starts after EC2 reboot."

Assert-Contains $koreanBeginnerGuide "sudo systemctl enable ez-one-backend" "Korean beginner guide must enable the backend service so it starts after EC2 reboot."
Assert-Contains $koreanBeginnerGuide "sudo systemctl enable nginx" "Korean beginner guide must explicitly enable nginx so it starts after EC2 reboot."
Assert-Contains $koreanBeginnerGuide "server_name" "Korean beginner guide must mention updating nginx domain-specific server_name values."
Assert-Contains $koreanBeginnerGuide "ssl_certificate" "Korean beginner guide must mention updating nginx certificate paths when the production domain differs."
Assert-Contains $beginnerGuide "Permissions-Policy" "beginner guide must mention the required security headers checked by runtime preflight."
Assert-Contains $koreanBeginnerGuide "Permissions-Policy" "Korean beginner guide must mention the required security headers checked by runtime preflight."
foreach ($package in @("git", "openjdk-17-jre-headless", "nginx", "unzip", "rsync", "curl", "ca-certificates", "certbot", "mysql-client")) {
  Assert-Contains $infraReadme $package "infra README must document required EC2 package: $package."
}

Write-Host "[PASS] EC2 template contract test passed."
