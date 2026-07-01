[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$deployScript = Join-Path $PSScriptRoot "deploy-ec2-release.sh"
$runbookPath = Join-Path $PSScriptRoot "..\docs\39_production-deployment-runbook.md"
$infraReadmePath = Join-Path $PSScriptRoot "..\infra\README.md"

function Assert-Contains {
  param(
    [string]$Text,
    [string]$Pattern,
    [string]$Message
  )

  if ($Text -notmatch $Pattern) {
    throw $Message
  }
}

$deploySource = Get-Content -Raw -LiteralPath $deployScript
$runbook = Get-Content -Raw -LiteralPath $runbookPath
$infraReadme = Get-Content -Raw -LiteralPath $infraReadmePath

Assert-Contains $deploySource 'EXTENSION_ARTIFACT is required' "deploy-ec2-release.sh must fail when EXTENSION_ARTIFACT is missing."
Assert-Contains $deploySource 'RELEASE_MANIFEST is required' "deploy-ec2-release.sh must fail when RELEASE_MANIFEST is missing."
Assert-Contains $deploySource 'CHECKSUM_FILE is required' "deploy-ec2-release.sh must fail when CHECKSUM_FILE is missing."
Assert-Contains $deploySource 'require_file "\$EXTENSION_ARTIFACT"' "deploy-ec2-release.sh must require the extension artifact file."
Assert-Contains $deploySource 'require_file "\$RELEASE_MANIFEST"' "deploy-ec2-release.sh must require the release manifest file."
Assert-Contains $deploySource 'verify_checksum_entry "\$BACKEND_ARTIFACT"' "deploy-ec2-release.sh must verify the provided backend artifact path against SHA256SUMS.txt."
Assert-Contains $deploySource 'verify_checksum_entry "\$FRONTEND_ARTIFACT"' "deploy-ec2-release.sh must verify the provided frontend artifact path against SHA256SUMS.txt."
Assert-Contains $deploySource 'verify_checksum_entry "\$EXTENSION_ARTIFACT"' "deploy-ec2-release.sh must verify the provided extension artifact path against SHA256SUMS.txt."
Assert-Contains $deploySource 'verify_checksum_entry "\$RELEASE_MANIFEST"' "deploy-ec2-release.sh must verify the provided release manifest path against SHA256SUMS.txt."
Assert-Contains $deploySource 'verify_checksum_manifest_shape' "deploy-ec2-release.sh must reject missing, malformed, or unexpected SHA256SUMS.txt entries."
Assert-Contains $deploySource 'verify_release_manifest' "deploy-ec2-release.sh must validate RELEASE-MANIFEST.txt before deployment."
Assert-Contains $deploySource "tr -d '\\r'" "deploy-ec2-release.sh must normalize CRLF release manifest values before comparing them on Linux."
Assert-Contains $deploySource 'git_worktree=dirty' "deploy-ec2-release.sh must reject dirty release manifests by default."
Assert-Contains $deploySource 'ALLOW_DIRTY_RELEASE' "deploy-ec2-release.sh must require an explicit override for dirty rehearsal artifacts."
Assert-Contains $deploySource 'require_command sha256sum' "deploy-ec2-release.sh must preflight sha256sum before checksum verification."
Assert-Contains $deploySource 'require_command unzip' "deploy-ec2-release.sh must preflight unzip before extracting the frontend artifact."
Assert-Contains $deploySource 'require_command grep' "deploy-ec2-release.sh must preflight grep before checking frontend artifact contents."
Assert-Contains $deploySource 'Backend artifact must be a valid executable jar' "deploy-ec2-release.sh must verify the backend artifact is a valid jar before apply steps."
Assert-Contains $deploySource 'Backend artifact must contain BOOT-INF' "deploy-ec2-release.sh must verify the backend artifact looks like a Spring Boot executable jar before apply steps."
Assert-Contains $deploySource 'END \{ exit found \? 0 : 1 \}' "deploy-ec2-release.sh must avoid pipefail/grep short-read failures when checking BOOT-INF."
Assert-Contains $deploySource 'backend artifact jar verified' "deploy-ec2-release.sh must report backend jar verification before apply steps."
Assert-Contains $deploySource 'Frontend artifact must contain index.html' "deploy-ec2-release.sh must verify the frontend artifact contains the SPA entrypoint before apply steps."
Assert-Contains $deploySource 'Extension artifact must contain manifest.json' "deploy-ec2-release.sh must verify the extension artifact contains the Chrome manifest before apply steps."
Assert-Contains $deploySource 'require_command rsync' "deploy-ec2-release.sh must preflight rsync before applying a real frontend deploy."
Assert-Contains $deploySource 'find "\$FRONTEND_TARGET" -type d -exec chmod 755' "deploy-ec2-release.sh must make deployed frontend directories readable by nginx."
Assert-Contains $deploySource 'find "\$FRONTEND_TARGET" -type f -exec chmod 644' "deploy-ec2-release.sh must make deployed frontend files readable by nginx."
Assert-Contains $deploySource 'require_command curl' "deploy-ec2-release.sh must preflight curl before running a real health check."
Assert-Contains $deploySource 'HEALTH_TIMEOUT_SECONDS' "deploy-ec2-release.sh must allow post-deploy health check timeout configuration."
Assert-Contains $deploySource 'wait_for_health' "deploy-ec2-release.sh must wait for Spring Boot to become healthy after restart."
Assert-Contains $deploySource 'health check not ready yet, retrying' "deploy-ec2-release.sh must retry transient post-restart 502/connection failures instead of failing immediately."
Assert-Contains $deploySource 'BASE_URL must be an HTTPS origin only, without path, query string, or fragment' "deploy-ec2-release.sh must reject BASE_URL values that include /api, a path, query string, or fragment."
Assert-Contains $deploySource 'RUNTIME_CHECK_SCRIPT' "deploy-ec2-release.sh must allow the EC2 runtime hardening checker path to be configured."
Assert-Contains $deploySource 'check-ec2-runtime\.sh' "deploy-ec2-release.sh must default to the bundled EC2 runtime hardening checker."
Assert-Contains $deploySource 'run_runtime_check' "deploy-ec2-release.sh must run the EC2 runtime hardening checker after a real deploy when BASE_URL is set."
Assert-Contains $deploySource 'SERVICE_NAME="\$SERVICE_NAME"\s+bash "\$RUNTIME_CHECK_SCRIPT"' "deploy-ec2-release.sh must pass BASE_URL and SERVICE_NAME into the EC2 runtime hardening checker."
Assert-Contains $deploySource 'post-deploy EC2 runtime check passed' "deploy-ec2-release.sh must report a post-deploy EC2 runtime hardening check."
Assert-Contains $deploySource 'sudo cp "\$EXTENSION_ARTIFACT"' "deploy-ec2-release.sh must archive the extension artifact in the release directory."
Assert-Contains $deploySource 'sudo cp "\$RELEASE_MANIFEST"' "deploy-ec2-release.sh must archive RELEASE-MANIFEST.txt in the release directory."
Assert-Contains $deploySource 'sudo cp "\$CHECKSUM_FILE"' "deploy-ec2-release.sh must archive SHA256SUMS.txt in the release directory."
Assert-Contains $runbook 'EXTENSION_ARTIFACT=/opt/ez-one/incoming/ez-one-extension-<release-id>\.zip' "Deployment runbook must include EXTENSION_ARTIFACT."
Assert-Contains $runbook 'RELEASE_MANIFEST=/opt/ez-one/incoming/RELEASE-MANIFEST\.txt' "Deployment runbook must include RELEASE_MANIFEST."
Assert-Contains $runbook 'rejects `git_worktree=dirty` unless\s+`ALLOW_DIRTY_RELEASE=true`' "Deployment runbook must document dirty manifest rejection and the rehearsal-only override."
Assert-Contains $runbook 'deploy script automatically runs `check-ec2-runtime\.sh`' "Deployment runbook must document automatic EC2 runtime hardening verification after deploy."
Assert-Contains $infraReadme 'EXTENSION_ARTIFACT=/opt/ez-one/incoming/ez-one-extension-<release-id>\.zip' "Infra README deploy quick reference must include EXTENSION_ARTIFACT."
Assert-Contains $infraReadme 'RELEASE_MANIFEST=/opt/ez-one/incoming/RELEASE-MANIFEST\.txt' "Infra README deploy quick reference must include RELEASE_MANIFEST."
Assert-Contains $infraReadme 'rejects\s+`git_worktree=dirty`\s+unless\s+`ALLOW_DIRTY_RELEASE=true`' "Infra README must document dirty manifest rejection and the rehearsal-only override."
Assert-Contains $infraReadme 'check-ec2-runtime\.sh' "Infra README must document the EC2 runtime hardening checker used by deploy."

Write-Host "[PASS] deploy contract test passed."
