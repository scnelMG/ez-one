[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$rollbackScript = Join-Path $PSScriptRoot "rollback-ec2-release.sh"
$evidenceCheckScript = Join-Path $PSScriptRoot "check-release-evidence.ps1"
$evidenceSchemaScript = Join-Path $PSScriptRoot "release-evidence-schema.ps1"
$templatePath = Join-Path $PSScriptRoot "..\docs\40_release-evidence.template.json"
$runbookPath = Join-Path $PSScriptRoot "..\docs\39_production-deployment-runbook.md"

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

$rollbackSource = Get-Content -Raw -LiteralPath $rollbackScript
$evidenceCheckSource = Get-Content -Raw -LiteralPath $evidenceCheckScript
$evidenceSchemaSource = Get-Content -Raw -LiteralPath $evidenceSchemaScript
$template = Get-Content -Raw -LiteralPath $templatePath | ConvertFrom-Json
$runbook = Get-Content -Raw -LiteralPath $runbookPath

Assert-Contains $rollbackSource 'EXTENSION_ARTIFACT' "rollback-ec2-release.sh must accept EXTENSION_ARTIFACT."
Assert-Contains $rollbackSource 'RELEASE_MANIFEST' "rollback-ec2-release.sh must accept RELEASE_MANIFEST."
Assert-Contains $rollbackSource 'CHECKSUM_FILE' "rollback-ec2-release.sh must accept CHECKSUM_FILE."
Assert-Contains $rollbackSource 'extension rollback artifact checked' "rollback-ec2-release.sh must validate the previous extension artifact."
Assert-Contains $rollbackSource 'verify_checksum_entry "\$BACKEND_ARTIFACT"' "rollback-ec2-release.sh must verify the previous backend artifact against SHA256SUMS.txt."
Assert-Contains $rollbackSource 'verify_checksum_entry "\$FRONTEND_ARTIFACT"' "rollback-ec2-release.sh must verify the previous frontend artifact against SHA256SUMS.txt."
Assert-Contains $rollbackSource 'verify_checksum_entry "\$EXTENSION_ARTIFACT"' "rollback-ec2-release.sh must verify the previous extension artifact against SHA256SUMS.txt."
Assert-Contains $rollbackSource 'verify_checksum_entry "\$RELEASE_MANIFEST"' "rollback-ec2-release.sh must verify the previous release manifest against SHA256SUMS.txt."
Assert-Contains $rollbackSource 'verify_release_manifest' "rollback-ec2-release.sh must validate RELEASE-MANIFEST.txt before rollback."
Assert-Contains $rollbackSource "tr -d '\\r'" "rollback-ec2-release.sh must normalize CRLF release manifest values before comparing them on Linux."
Assert-Contains $rollbackSource 'git_worktree=dirty' "rollback-ec2-release.sh must reject dirty previous release manifests by default."
Assert-Contains $rollbackSource 'ALLOW_DIRTY_ROLLBACK' "rollback-ec2-release.sh must require an explicit override for dirty previous artifacts."
Assert-Contains $rollbackSource 'require_command sha256sum' "rollback-ec2-release.sh must preflight sha256sum before checksum verification."
Assert-Contains $rollbackSource 'require_command unzip' "rollback-ec2-release.sh must preflight unzip before extracting the frontend artifact."
Assert-Contains $rollbackSource 'require_command grep' "rollback-ec2-release.sh must preflight grep before checking frontend artifact contents."
Assert-Contains $rollbackSource 'Backend artifact must be a valid executable jar' "rollback-ec2-release.sh must verify the previous backend artifact is a valid jar before rollback steps."
Assert-Contains $rollbackSource 'Backend artifact must contain BOOT-INF' "rollback-ec2-release.sh must verify the previous backend artifact looks like a Spring Boot executable jar before rollback steps."
Assert-Contains $rollbackSource 'END \{ exit found \? 0 : 1 \}' "rollback-ec2-release.sh must avoid pipefail/grep short-read failures when checking BOOT-INF."
Assert-Contains $rollbackSource 'backend artifact jar verified' "rollback-ec2-release.sh must report backend jar verification before rollback steps."
Assert-Contains $rollbackSource 'Frontend artifact must contain index.html' "rollback-ec2-release.sh must verify the previous frontend artifact contains the SPA entrypoint before rollback steps."
Assert-Contains $rollbackSource 'Extension artifact must contain manifest.json' "rollback-ec2-release.sh must verify the previous extension artifact contains the Chrome manifest before rollback steps."
Assert-Contains $rollbackSource 'require_command rsync' "rollback-ec2-release.sh must preflight rsync before applying a real frontend rollback."
Assert-Contains $rollbackSource 'require_command curl' "rollback-ec2-release.sh must preflight curl before running a real health check."
Assert-Contains $rollbackSource 'BASE_URL must be an HTTPS origin only, without path, query string, or fragment' "rollback-ec2-release.sh must reject BASE_URL values that include /api, a path, query string, or fragment."
Assert-Contains $rollbackSource 'RUNTIME_CHECK_SCRIPT' "rollback-ec2-release.sh must allow the EC2 runtime hardening checker path to be configured."
Assert-Contains $rollbackSource 'check-ec2-runtime\.sh' "rollback-ec2-release.sh must default to the bundled EC2 runtime hardening checker."
Assert-Contains $rollbackSource 'run_runtime_check' "rollback-ec2-release.sh must run the EC2 runtime hardening checker after a real rollback when BASE_URL is set."
Assert-Contains $rollbackSource 'SERVICE_NAME="\$SERVICE_NAME"\s+bash "\$RUNTIME_CHECK_SCRIPT"' "rollback-ec2-release.sh must pass BASE_URL and SERVICE_NAME into the EC2 runtime hardening checker."
Assert-Contains $rollbackSource 'post-rollback EC2 runtime check passed' "rollback-ec2-release.sh must report a post-rollback EC2 runtime hardening check."
Assert-Contains $evidenceCheckSource 'release-evidence-schema\.ps1' "check-release-evidence.ps1 must use the shared release evidence schema."
Assert-Contains $evidenceSchemaSource '"previousExtensionArtifactPath"' "release-evidence-schema.ps1 must require rollback.previousExtensionArtifactPath."
Assert-Contains $evidenceSchemaSource '"previousReleaseManifestPath"' "release-evidence-schema.ps1 must require rollback.previousReleaseManifestPath."
Assert-Contains $evidenceSchemaSource '"previousChecksumFilePath"' "release-evidence-schema.ps1 must require rollback.previousChecksumFilePath."
Assert-Contains $runbook 'EXTENSION_ARTIFACT=/opt/ez-one/releases/<previous>/ez-one-extension-<previous>\.zip' "Rollback runbook must include EXTENSION_ARTIFACT."
Assert-Contains $runbook 'RELEASE_MANIFEST=/opt/ez-one/releases/<previous>/RELEASE-MANIFEST\.txt' "Rollback runbook must include RELEASE_MANIFEST."
Assert-Contains $runbook 'CHECKSUM_FILE=/opt/ez-one/releases/<previous>/SHA256SUMS\.txt' "Rollback runbook must include CHECKSUM_FILE."
Assert-Contains $runbook 'Rollback also verifies `RELEASE-MANIFEST.txt`' "Rollback runbook must document previous release manifest validation."
Assert-Contains $runbook 'rollback script automatically runs `check-ec2-runtime\.sh`' "Rollback runbook must document automatic EC2 runtime hardening verification after rollback."

if ($template.gates.rollback.PSObject.Properties.Name -notcontains "previousExtensionArtifactPath") {
  throw "docs/40_release-evidence.template.json must include gates.rollback.previousExtensionArtifactPath."
}
if ($template.gates.rollback.PSObject.Properties.Name -notcontains "previousReleaseManifestPath") {
  throw "docs/40_release-evidence.template.json must include gates.rollback.previousReleaseManifestPath."
}
if ($template.gates.rollback.PSObject.Properties.Name -notcontains "previousChecksumFilePath") {
  throw "docs/40_release-evidence.template.json must include gates.rollback.previousChecksumFilePath."
}

Write-Host "[PASS] rollback contract test passed."
