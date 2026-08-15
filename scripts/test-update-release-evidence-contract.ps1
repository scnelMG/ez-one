param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$scriptPath = Join-Path $repoRoot "scripts/update-release-evidence.ps1"
$templatePath = Join-Path $repoRoot "docs/40_release-evidence.template.json"
$runbookPath = Join-Path $repoRoot "docs/39_production-deployment-runbook.md"
$beginnerGuidePath = Join-Path $repoRoot "docs/41_beginner-deployment-guide.md"
$koreanGuidePath = Join-Path $repoRoot "docs/42_first-deployment-ko.md"
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("ez-one-update-evidence-test-" + [Guid]::NewGuid().ToString("N"))

function Assert-Contains {
  param(
    [string]$Text,
    [string]$Needle,
    [string]$Message
  )

  if (-not $Text.Contains($Needle)) {
    throw $Message
  }
}

function Invoke-Updater {
  param([string[]]$Arguments)

  $powerShellExe = (Get-Command powershell).Source
  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $output = & $powerShellExe -NoProfile -ExecutionPolicy Bypass -File $scriptPath @Arguments 2>&1
    return [pscustomobject]@{
      ExitCode = $LASTEXITCODE
      Output = ($output -join "`n")
    }
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
}

function Get-CanaryPassMarkers {
  return @(
    "[PASS] frontend shell",
    "[PASS] frontend login route",
    "[PASS] backend health",
    "[PASS] current user",
    "[PASS] onboarding profile",
    "[PASS] document profile",
    "[PASS] extension document profile",
    "[PASS] basket list",
    "[PASS] notion connection",
    "[PASS] workspace read",
    "[PASS] workspace defaults",
    "[PASS] workspace versions",
    "[PASS] workspace references"
  )
}

function Get-CompleteCanaryLogLines {
  $lines = @("[INFO] Canary schedule: iterations=7 intervalSeconds=300 expectedDurationSeconds=1800")
  $passMarkers = Get-CanaryPassMarkers
  for ($iteration = 1; $iteration -le 7; $iteration += 1) {
    $lines += "[CANARY] Iteration $iteration / 7"
    $lines += $passMarkers
  }
  $lines += "[INFO] Canary elapsedSeconds=1801 startedAtUtc=2026-06-30T00:00:00.0000000Z endedAtUtc=2026-06-30T00:30:01.0000000Z"
  $lines += "[DONE] Release canary completed."
  return $lines
}

function Get-CompleteNotionCanaryLogLines {
  $lines = @("[INFO] Canary schedule: iterations=7 intervalSeconds=300 expectedDurationSeconds=1800")
  $passMarkers = (Get-CanaryPassMarkers) + "[PASS] notion sync-now"
  for ($iteration = 1; $iteration -le 7; $iteration += 1) {
    $lines += "[CANARY] Iteration $iteration / 7"
    $lines += $passMarkers
  }
  $lines += "[INFO] Canary elapsedSeconds=1801 startedAtUtc=2026-06-30T00:00:00.0000000Z endedAtUtc=2026-06-30T00:30:01.0000000Z"
  $lines += "[DONE] Release canary completed."
  return $lines
}

function Get-CompleteDeployDryRunLogLines {
  return @(
    "[PASS] SHA256SUMS verified",
    "[PASS] backend artifact jar verified",
    "[PASS] frontend artifact zip verified",
    "[PASS] extension artifact zip verified",
    "[PASS] RELEASE-MANIFEST verified",
    "[INFO] Dry run only. Re-run with DRY_RUN=false after confirming paths.",
    "[RUN] curl --fail --silent --show-error --max-time 20 https://ez-one.kr/api/health",
    "[RUN] BASE_URL=https://ez-one.kr SERVICE_NAME=ez-one-backend bash scripts/check-ec2-runtime.sh",
    "[PASS] deploy script completed"
  )
}

function Get-CompleteDeployApplyLogLines {
  return @(
    "[PASS] SHA256SUMS verified",
    "[PASS] backend artifact jar verified",
    "[PASS] frontend artifact zip verified",
    "[PASS] extension artifact zip verified",
    "[PASS] RELEASE-MANIFEST verified",
    "[PASS] backend deploy target checked for ez-one-backend",
    "[PASS] frontend deploy target checked for /var/www/ez-one",
    "[PASS] post-deploy health check passed",
    "[PASS] post-deploy EC2 runtime check passed",
    "[PASS] deploy script completed"
  )
}

function Get-CompleteRollbackDryRunLogLines {
  return @(
    "[PASS] SHA256SUMS verified",
    "[PASS] backend artifact jar verified",
    "[PASS] frontend artifact zip verified",
    "[PASS] extension artifact zip verified",
    "[PASS] RELEASE-MANIFEST verified",
    "[INFO] Dry run only. Re-run with DRY_RUN=false after confirming paths.",
    "[RUN] curl --fail --silent --show-error --max-time 20 https://ez-one.kr/api/health",
    "[RUN] BASE_URL=https://ez-one.kr SERVICE_NAME=ez-one-backend bash scripts/check-ec2-runtime.sh",
    "[PASS] rollback script completed"
  )
}

function Get-CompleteRollbackApplyLogLines {
  return @(
    "[PASS] SHA256SUMS verified",
    "[PASS] backend artifact jar verified",
    "[PASS] frontend artifact zip verified",
    "[PASS] extension artifact zip verified",
    "[PASS] RELEASE-MANIFEST verified",
    "[PASS] backend rollback target checked for ez-one-backend",
    "[PASS] frontend rollback target checked for /var/www/ez-one",
    "[PASS] extension rollback artifact checked: /opt/ez-one/releases/previous/ez-one-extension-previous.zip",
    "[PASS] post-rollback health check passed",
    "[PASS] post-rollback EC2 runtime check passed",
    "[PASS] rollback script completed"
  )
}

function New-TestEvidenceFile {
  param([string]$Path)

  $evidence = Get-Content -Raw -LiteralPath $templatePath | ConvertFrom-Json
  $evidence.releaseId = "release-test"
  $evidence.owner = "release-owner"
  $evidence.decision = "No-go"
  $evidence.decisionTimestamp = "2026-06-30T21:30:00+09:00"
  $evidence | ConvertTo-Json -Depth 20 | Set-Content -Encoding ASCII -LiteralPath $Path
}

function New-TestArtifactDirectory {
  param(
    [string]$Path,
    [string]$ReleaseId = "release-test",
    [string]$GitWorktree = "clean"
  )

  New-Item -ItemType Directory -Force -Path $Path | Out-Null
  $backendArtifact = Join-Path $Path "ez-one-backend-$ReleaseId.jar"
  $frontendArtifact = Join-Path $Path "ez-one-frontend-$ReleaseId.zip"
  $extensionArtifact = Join-Path $Path "ez-one-extension-$ReleaseId.zip"
  $manifestPath = Join-Path $Path "RELEASE-MANIFEST.txt"
  $hashPath = Join-Path $Path "SHA256SUMS.txt"

  Set-Content -Encoding ASCII -LiteralPath $backendArtifact -Value "backend artifact content"
  Set-Content -Encoding ASCII -LiteralPath $frontendArtifact -Value "frontend artifact content"
  Set-Content -Encoding ASCII -LiteralPath $extensionArtifact -Value "extension artifact content"
  @(
    "release_id=$ReleaseId",
    "generated_at=2026-06-30T12:30:00.0000000+09:00",
    "git_branch=codex/release-readiness-hardening",
    "git_commit=0123456789abcdef0123456789abcdef01234567",
    "git_worktree=$GitWorktree",
    "backend_jar=$([System.IO.Path]::GetFileName($backendArtifact))",
    "frontend_zip=$([System.IO.Path]::GetFileName($frontendArtifact))",
    "extension_zip=$([System.IO.Path]::GetFileName($extensionArtifact))"
  ) | Set-Content -Encoding ASCII -LiteralPath $manifestPath

  foreach ($artifact in @($backendArtifact, $frontendArtifact, $extensionArtifact, $manifestPath)) {
    $stream = [System.IO.File]::OpenRead($artifact)
    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    try {
      $hash = $sha256.ComputeHash($stream)
    } finally {
      $sha256.Dispose()
      $stream.Dispose()
    }

    $hexHash = -join ($hash | ForEach-Object { $_.ToString("x2") })
    "$hexHash  $([System.IO.Path]::GetFileName($artifact))" | Add-Content -Encoding ASCII -LiteralPath $hashPath
  }
}

New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null

try {
  if (-not (Test-Path -LiteralPath $scriptPath)) {
    throw "scripts/update-release-evidence.ps1 must exist so operators do not manually copy canary log paths into release-evidence.json."
  }

  $missingEvidencePath = Join-Path $tempRoot "missing-release-evidence.json"
  $missingEvidenceResult = Invoke-Updater -Arguments @(
    "-EvidenceFile", $missingEvidencePath,
    "-ArtifactDirectory", (Join-Path $tempRoot "unused-artifacts")
  )
  if ($missingEvidenceResult.ExitCode -eq 0) {
    throw "update-release-evidence.ps1 should fail when release-evidence.json does not exist."
  }
  Assert-Contains $missingEvidenceResult.Output "Release evidence file was not found" "Missing evidence failure must explain that release-evidence.json is missing."
  Assert-Contains $missingEvidenceResult.Output ".\scripts\new-release-evidence.ps1 -ReleaseId <release-id> -Owner <owner-name> -LocalGateLog `$gateLog" "Missing evidence failure must show the command that creates release evidence after Gate 0."

  $evidencePath = Join-Path $tempRoot "release-evidence.json"
  New-TestEvidenceFile -Path $evidencePath

  $artifactDirectory = Join-Path $tempRoot "release-artifacts\release-test"
  New-TestArtifactDirectory -Path $artifactDirectory

  $artifactResult = Invoke-Updater -Arguments @(
    "-EvidenceFile", $evidencePath,
    "-ArtifactDirectory", $artifactDirectory
  )
  if ($artifactResult.ExitCode -ne 0) {
    throw "update-release-evidence.ps1 rejected a valid artifact directory: $($artifactResult.Output)"
  }
  Assert-Contains $artifactResult.Output "[PASS] Artifact evidence imported" "Successful artifact import must be visible in command output."

  $artifactEvidence = Get-Content -Raw -LiteralPath $evidencePath | ConvertFrom-Json
  $resolvedArtifactDirectory = (Resolve-Path -LiteralPath $artifactDirectory).Path
  Assert-Contains $artifactEvidence.gates.artifactBuildInstall.releaseArtifactDirectory $resolvedArtifactDirectory "Artifact evidence must include the resolved artifact directory."
  Assert-Contains $artifactEvidence.gates.artifactBuildInstall.releaseManifestContent "RELEASE-MANIFEST.txt" "Artifact evidence must include the release manifest file."
  Assert-Contains $artifactEvidence.gates.artifactBuildInstall.sha256SumsContent "SHA256SUMS.txt" "Artifact evidence must include the SHA256SUMS file."
  Assert-Contains $artifactEvidence.gates.artifactBuildInstall.backendJarChecksum "ez-one-backend-release-test.jar" "Artifact evidence must include the backend checksum line."
  Assert-Contains $artifactEvidence.gates.artifactBuildInstall.frontendZipChecksum "ez-one-frontend-release-test.zip" "Artifact evidence must include the frontend checksum line."
  Assert-Contains $artifactEvidence.gates.artifactBuildInstall.extensionZipChecksum "ez-one-extension-release-test.zip" "Artifact evidence must include the extension checksum line."

  $badArtifactDirectory = Join-Path $tempRoot "bad-release-artifacts\release-test"
  New-TestArtifactDirectory -Path $badArtifactDirectory
  (Get-Content -LiteralPath (Join-Path $badArtifactDirectory "SHA256SUMS.txt")) |
    Where-Object { $_ -notmatch "ez-one-extension-release-test\.zip" } |
    Set-Content -Encoding ASCII -LiteralPath (Join-Path $badArtifactDirectory "SHA256SUMS.txt")

  $badArtifactResult = Invoke-Updater -Arguments @(
    "-EvidenceFile", $evidencePath,
    "-ArtifactDirectory", $badArtifactDirectory
  )
  if ($badArtifactResult.ExitCode -eq 0) {
    throw "update-release-evidence.ps1 accepted artifact evidence without an extension checksum line."
  }
  Assert-Contains $badArtifactResult.Output "SHA256SUMS.txt is missing required artifact checksum" "Bad artifact evidence must explain the missing checksum line."

  $dirtyArtifactDirectory = Join-Path $tempRoot "dirty-release-artifacts\release-test"
  New-TestArtifactDirectory -Path $dirtyArtifactDirectory -GitWorktree "dirty"

  $dirtyArtifactResult = Invoke-Updater -Arguments @(
    "-EvidenceFile", $evidencePath,
    "-ArtifactDirectory", $dirtyArtifactDirectory
  )
  if ($dirtyArtifactResult.ExitCode -eq 0) {
    throw "update-release-evidence.ps1 accepted artifact evidence from a dirty git worktree manifest."
  }
  Assert-Contains $dirtyArtifactResult.Output "RELEASE-MANIFEST.txt git_worktree must be clean for final release evidence." "Dirty artifact evidence must explain that final release evidence requires a clean worktree."

  $deployDryRunLogPath = Join-Path $tempRoot "deploy-dry-run.log"
  Get-CompleteDeployDryRunLogLines | Set-Content -Encoding ASCII -LiteralPath $deployDryRunLogPath

  $deployDryRunResult = Invoke-Updater -Arguments @(
    "-EvidenceFile", $evidencePath,
    "-DeployDryRunLog", $deployDryRunLogPath
  )
  if ($deployDryRunResult.ExitCode -ne 0) {
    throw "update-release-evidence.ps1 rejected a complete deploy dry-run log: $($deployDryRunResult.Output)"
  }
  Assert-Contains $deployDryRunResult.Output "[PASS] Deploy dry-run evidence imported" "Successful deploy dry-run import must be visible in command output."

  $deployDryRunEvidence = Get-Content -Raw -LiteralPath $evidencePath | ConvertFrom-Json
  $resolvedDeployDryRunLogPath = (Resolve-Path -LiteralPath $deployDryRunLogPath).Path
  Assert-Contains $deployDryRunEvidence.gates.artifactBuildInstall.ec2DeployDryRunOutput $resolvedDeployDryRunLogPath "Deploy dry-run evidence must include the resolved log path."
  Assert-Contains $deployDryRunEvidence.gates.artifactBuildInstall.ec2DeployDryRunOutput "deploy dry-run passed" "Deploy dry-run evidence must state what the log proves."

  $deployApplyLogPath = Join-Path $tempRoot "deploy-apply.log"
  Get-CompleteDeployApplyLogLines | Set-Content -Encoding ASCII -LiteralPath $deployApplyLogPath

  $deployApplyResult = Invoke-Updater -Arguments @(
    "-EvidenceFile", $evidencePath,
    "-DeployApplyLog", $deployApplyLogPath
  )
  if ($deployApplyResult.ExitCode -ne 0) {
    throw "update-release-evidence.ps1 rejected a complete deploy apply log: $($deployApplyResult.Output)"
  }
  Assert-Contains $deployApplyResult.Output "[PASS] Deploy apply evidence imported" "Successful deploy apply import must be visible in command output."

  $deployApplyEvidence = Get-Content -Raw -LiteralPath $evidencePath | ConvertFrom-Json
  $resolvedDeployApplyLogPath = (Resolve-Path -LiteralPath $deployApplyLogPath).Path
  Assert-Contains $deployApplyEvidence.gates.artifactBuildInstall.ec2DeployApplyOutput $resolvedDeployApplyLogPath "Deploy apply evidence must include the resolved log path."
  Assert-Contains $deployApplyEvidence.gates.artifactBuildInstall.ec2DeployApplyOutput "post-deploy health and runtime checks passed" "Deploy apply evidence must state that post-deploy checks passed."

  $failedDeployLogPath = Join-Path $tempRoot "failed-deploy.log"
  (Get-CompleteDeployApplyLogLines) + @("[FAIL] post-deploy health check failed") | Set-Content -Encoding ASCII -LiteralPath $failedDeployLogPath

  $failedDeployResult = Invoke-Updater -Arguments @(
    "-EvidenceFile", $evidencePath,
    "-DeployApplyLog", $failedDeployLogPath
  )
  if ($failedDeployResult.ExitCode -eq 0) {
    throw "update-release-evidence.ps1 accepted a deploy apply log that contains failure evidence."
  }
  Assert-Contains $failedDeployResult.Output "DeployApplyLog contains failure marker" "Failed deploy log rejection must tell the operator that failure evidence was found."

  $rollbackDryRunLogPath = Join-Path $tempRoot "rollback-dry-run.log"
  Get-CompleteRollbackDryRunLogLines | Set-Content -Encoding ASCII -LiteralPath $rollbackDryRunLogPath

  $rollbackDryRunResult = Invoke-Updater -Arguments @(
    "-EvidenceFile", $evidencePath,
    "-RollbackDryRunLog", $rollbackDryRunLogPath
  )
  if ($rollbackDryRunResult.ExitCode -ne 0) {
    throw "update-release-evidence.ps1 rejected a complete rollback dry-run log: $($rollbackDryRunResult.Output)"
  }
  Assert-Contains $rollbackDryRunResult.Output "[PASS] Rollback dry-run evidence imported" "Successful rollback dry-run import must be visible in command output."

  $rollbackDryRunEvidence = Get-Content -Raw -LiteralPath $evidencePath | ConvertFrom-Json
  $resolvedRollbackDryRunLogPath = (Resolve-Path -LiteralPath $rollbackDryRunLogPath).Path
  Assert-Contains $rollbackDryRunEvidence.gates.rollback.rollbackDryRunOutput $resolvedRollbackDryRunLogPath "Rollback dry-run evidence must include the resolved log path."
  Assert-Contains $rollbackDryRunEvidence.gates.rollback.rollbackDryRunOutput "rollback dry-run passed" "Rollback dry-run evidence must state what the log proves."

  $rollbackApplyLogPath = Join-Path $tempRoot "rollback-apply.log"
  Get-CompleteRollbackApplyLogLines | Set-Content -Encoding ASCII -LiteralPath $rollbackApplyLogPath

  $rollbackApplyResult = Invoke-Updater -Arguments @(
    "-EvidenceFile", $evidencePath,
    "-RollbackApplyLog", $rollbackApplyLogPath
  )
  if ($rollbackApplyResult.ExitCode -ne 0) {
    throw "update-release-evidence.ps1 rejected a complete rollback apply log: $($rollbackApplyResult.Output)"
  }
  Assert-Contains $rollbackApplyResult.Output "[PASS] Rollback apply evidence imported" "Successful rollback apply import must be visible in command output."

  $rollbackApplyEvidence = Get-Content -Raw -LiteralPath $evidencePath | ConvertFrom-Json
  $resolvedRollbackApplyLogPath = (Resolve-Path -LiteralPath $rollbackApplyLogPath).Path
  Assert-Contains $rollbackApplyEvidence.gates.rollback.rollbackCommandOutput $resolvedRollbackApplyLogPath "Rollback apply evidence must include the resolved log path."
  Assert-Contains $rollbackApplyEvidence.gates.rollback.postRollbackHealthCanaryOutput $resolvedRollbackApplyLogPath "Post-rollback health evidence must include the resolved log path."
  Assert-Contains $rollbackApplyEvidence.gates.rollback.postRollbackHealthCanaryOutput "post-rollback health and runtime checks passed" "Rollback apply evidence must state that post-rollback checks passed."

  $failedRollbackLogPath = Join-Path $tempRoot "failed-rollback.log"
  (Get-CompleteRollbackApplyLogLines) + @("[FAIL] post-rollback health check failed") | Set-Content -Encoding ASCII -LiteralPath $failedRollbackLogPath

  $failedRollbackResult = Invoke-Updater -Arguments @(
    "-EvidenceFile", $evidencePath,
    "-RollbackApplyLog", $failedRollbackLogPath
  )
  if ($failedRollbackResult.ExitCode -eq 0) {
    throw "update-release-evidence.ps1 accepted a rollback apply log that contains failure evidence."
  }
  Assert-Contains $failedRollbackResult.Output "RollbackApplyLog contains failure marker" "Failed rollback log rejection must tell the operator that failure evidence was found."

  $incompleteLogPath = Join-Path $tempRoot "incomplete-canary.log"
  @(
    "[CANARY] Iteration 1 / 1",
    "[PASS] frontend shell",
    "[DONE] Release canary completed."
  ) | Set-Content -Encoding ASCII -LiteralPath $incompleteLogPath

  $incompleteResult = Invoke-Updater -Arguments @(
    "-EvidenceFile", $evidencePath,
    "-CanaryLog", $incompleteLogPath
  )
  if ($incompleteResult.ExitCode -eq 0) {
    throw "update-release-evidence.ps1 accepted an incomplete canary log."
  }
  Assert-Contains $incompleteResult.Output "CanaryLog is missing required marker" "Incomplete canary log failure must tell the operator which marker is missing."

  $shortScheduleLogPath = Join-Path $tempRoot "short-schedule-canary.log"
  @(
    "[INFO] Canary schedule: iterations=7 intervalSeconds=1 expectedDurationSeconds=7",
    "[CANARY] Iteration 1 / 7",
    "[PASS] frontend shell",
    "[PASS] frontend login route",
    "[PASS] backend health",
    "[PASS] current user",
    "[PASS] onboarding profile",
    "[PASS] document profile",
    "[PASS] extension document profile",
    "[PASS] basket list",
    "[PASS] notion connection",
    "[PASS] workspace read",
    "[PASS] workspace defaults",
    "[PASS] workspace versions",
    "[PASS] workspace references",
    "[CANARY] Iteration 7 / 7",
    "[DONE] Release canary completed."
  ) | Set-Content -Encoding ASCII -LiteralPath $shortScheduleLogPath

  $shortScheduleResult = Invoke-Updater -Arguments @(
    "-EvidenceFile", $evidencePath,
    "-CanaryLog", $shortScheduleLogPath
  )
  if ($shortScheduleResult.ExitCode -eq 0) {
    throw "update-release-evidence.ps1 accepted a canary log that did not prove the 30-minute schedule."
  }
  Assert-Contains $shortScheduleResult.Output "CanaryLog is missing required marker" "Short canary schedule failure must tell the operator which marker is missing."

  $failedLogPath = Join-Path $tempRoot "failed-canary.log"
  (Get-CompleteCanaryLogLines) + @("[FAIL] backend health failed: HTTP 502") | Set-Content -Encoding ASCII -LiteralPath $failedLogPath

  $failedResult = Invoke-Updater -Arguments @(
    "-EvidenceFile", $evidencePath,
    "-CanaryLog", $failedLogPath
  )
  if ($failedResult.ExitCode -eq 0) {
    throw "update-release-evidence.ps1 accepted a canary log that contains failure evidence."
  }
  Assert-Contains $failedResult.Output "CanaryLog contains failure marker" "Failed canary log rejection must tell the operator that failure evidence was found."

  $missingMiddleIterationLogPath = Join-Path $tempRoot "missing-middle-iteration-canary.log"
  @(
    "[INFO] Canary schedule: iterations=7 intervalSeconds=300 expectedDurationSeconds=1800",
    "[CANARY] Iteration 1 / 7",
    "[PASS] frontend shell",
    "[PASS] frontend login route",
    "[PASS] backend health",
    "[PASS] current user",
    "[PASS] onboarding profile",
    "[PASS] document profile",
    "[PASS] extension document profile",
    "[PASS] basket list",
    "[PASS] notion connection",
    "[PASS] workspace read",
    "[PASS] workspace defaults",
    "[PASS] workspace versions",
    "[PASS] workspace references",
    "[CANARY] Iteration 7 / 7",
    "[DONE] Release canary completed."
  ) | Set-Content -Encoding ASCII -LiteralPath $missingMiddleIterationLogPath

  $missingMiddleIterationResult = Invoke-Updater -Arguments @(
    "-EvidenceFile", $evidencePath,
    "-CanaryLog", $missingMiddleIterationLogPath
  )
  if ($missingMiddleIterationResult.ExitCode -eq 0) {
    throw "update-release-evidence.ps1 accepted a canary log that skipped middle iterations."
  }
  Assert-Contains $missingMiddleIterationResult.Output "CanaryLog is missing required marker" "Missing middle iteration failure must tell the operator which iteration marker is missing."

  $singlePassSetLogPath = Join-Path $tempRoot "single-pass-set-canary.log"
  @(
    "[INFO] Canary schedule: iterations=7 intervalSeconds=300 expectedDurationSeconds=1800",
    "[CANARY] Iteration 1 / 7",
    "[CANARY] Iteration 2 / 7",
    "[CANARY] Iteration 3 / 7",
    "[CANARY] Iteration 4 / 7",
    "[CANARY] Iteration 5 / 7",
    "[CANARY] Iteration 6 / 7",
    "[CANARY] Iteration 7 / 7"
  ) + (Get-CanaryPassMarkers) + @("[DONE] Release canary completed.") | Set-Content -Encoding ASCII -LiteralPath $singlePassSetLogPath

  $singlePassSetResult = Invoke-Updater -Arguments @(
    "-EvidenceFile", $evidencePath,
    "-CanaryLog", $singlePassSetLogPath
  )
  if ($singlePassSetResult.ExitCode -eq 0) {
    throw "update-release-evidence.ps1 accepted a canary log that only proved one pass set across seven iterations."
  }
  Assert-Contains $singlePassSetResult.Output "CanaryLog marker count is too low" "Single pass-set failure must tell the operator which repeated PASS marker is missing."

  $frontLoadedPassLogPath = Join-Path $tempRoot "front-loaded-pass-canary.log"
  $frontLoadedPassLines = @("[INFO] Canary schedule: iterations=7 intervalSeconds=300 expectedDurationSeconds=1800")
  $frontLoadedPassLines += "[CANARY] Iteration 1 / 7"
  for ($repeat = 1; $repeat -le 7; $repeat += 1) {
    $frontLoadedPassLines += Get-CanaryPassMarkers
  }
  for ($iteration = 2; $iteration -le 7; $iteration += 1) {
    $frontLoadedPassLines += "[CANARY] Iteration $iteration / 7"
  }
  $frontLoadedPassLines += "[DONE] Release canary completed."
  $frontLoadedPassLines | Set-Content -Encoding ASCII -LiteralPath $frontLoadedPassLogPath

  $frontLoadedPassResult = Invoke-Updater -Arguments @(
    "-EvidenceFile", $evidencePath,
    "-CanaryLog", $frontLoadedPassLogPath
  )
  if ($frontLoadedPassResult.ExitCode -eq 0) {
    throw "update-release-evidence.ps1 accepted a canary log whose PASS markers were not present in every iteration block."
  }
  Assert-Contains $frontLoadedPassResult.Output "CanaryLog iteration 2 is missing required marker" "Front-loaded PASS failure must tell the operator which iteration is missing a required marker."

  $missingElapsedLogPath = Join-Path $tempRoot "missing-elapsed-canary.log"
  $missingElapsedLines = Get-CompleteCanaryLogLines | Where-Object { -not $_.StartsWith("[INFO] Canary elapsedSeconds=") }
  $missingElapsedLines | Set-Content -Encoding ASCII -LiteralPath $missingElapsedLogPath

  $missingElapsedResult = Invoke-Updater -Arguments @(
    "-EvidenceFile", $evidencePath,
    "-CanaryLog", $missingElapsedLogPath
  )
  if ($missingElapsedResult.ExitCode -eq 0) {
    throw "update-release-evidence.ps1 accepted a canary log without actual elapsed time evidence."
  }
  Assert-Contains $missingElapsedResult.Output "CanaryLog is missing elapsedSeconds evidence" "Missing elapsed time failure must tell the operator elapsed evidence is missing."

  $shortElapsedLogPath = Join-Path $tempRoot "short-elapsed-canary.log"
  $shortElapsedLines = Get-CompleteCanaryLogLines | ForEach-Object {
    if ($_.StartsWith("[INFO] Canary elapsedSeconds=")) {
      "[INFO] Canary elapsedSeconds=1799 startedAtUtc=2026-06-30T00:00:00.0000000Z endedAtUtc=2026-06-30T00:29:59.0000000Z"
    } else {
      $_
    }
  }
  $shortElapsedLines | Set-Content -Encoding ASCII -LiteralPath $shortElapsedLogPath

  $shortElapsedResult = Invoke-Updater -Arguments @(
    "-EvidenceFile", $evidencePath,
    "-CanaryLog", $shortElapsedLogPath
  )
  if ($shortElapsedResult.ExitCode -eq 0) {
    throw "update-release-evidence.ps1 accepted a canary log with less than 30 minutes of elapsed time."
  }
  Assert-Contains $shortElapsedResult.Output "CanaryLog elapsedSeconds is too low" "Short elapsed time failure must tell the operator elapsed evidence is below 30 minutes."

  $inconsistentElapsedLogPath = Join-Path $tempRoot "inconsistent-elapsed-canary.log"
  $inconsistentElapsedLines = Get-CompleteCanaryLogLines | ForEach-Object {
    if ($_.StartsWith("[INFO] Canary elapsedSeconds=")) {
      "[INFO] Canary elapsedSeconds=1801 startedAtUtc=2026-06-30T00:00:00.0000000Z endedAtUtc=2026-06-30T00:00:01.0000000Z"
    } else {
      $_
    }
  }
  $inconsistentElapsedLines | Set-Content -Encoding ASCII -LiteralPath $inconsistentElapsedLogPath

  $inconsistentElapsedResult = Invoke-Updater -Arguments @(
    "-EvidenceFile", $evidencePath,
    "-CanaryLog", $inconsistentElapsedLogPath
  )
  if ($inconsistentElapsedResult.ExitCode -eq 0) {
    throw "update-release-evidence.ps1 accepted a canary log whose elapsedSeconds disagreed with startedAtUtc/endedAtUtc."
  }
  Assert-Contains $inconsistentElapsedResult.Output "CanaryLog timestamp delta is too low" "Inconsistent elapsed time failure must tell the operator that timestamp evidence is below 30 minutes."

  $completeLogPath = Join-Path $tempRoot "complete-canary.log"
  Get-CompleteCanaryLogLines | Set-Content -Encoding ASCII -LiteralPath $completeLogPath

  $completeResult = Invoke-Updater -Arguments @(
    "-EvidenceFile", $evidencePath,
    "-CanaryLog", $completeLogPath
  )
  if ($completeResult.ExitCode -ne 0) {
    throw "update-release-evidence.ps1 rejected a complete canary log: $($completeResult.Output)"
  }
  Assert-Contains $completeResult.Output "[PASS] Canary evidence imported" "Successful canary import must be visible in command output."

  $updated = Get-Content -Raw -LiteralPath $evidencePath | ConvertFrom-Json
  $resolvedLogPath = (Resolve-Path -LiteralPath $completeLogPath).Path
  Assert-Contains $updated.gates.canary.thirtyMinuteCanaryOutput $resolvedLogPath "Canary evidence must include the resolved canary log path."
  Assert-Contains $updated.gates.canary.thirtyMinuteCanaryOutput "30-minute production canary passed" "Canary evidence must state what the log proves."
  if (-not [string]::IsNullOrWhiteSpace($updated.gates.canary.backendProxyLogReview)) {
    throw "update-release-evidence.ps1 must not silently fill backendProxyLogReview; that requires an operator log review."
  }

  $missingNotionSyncLogPath = Join-Path $tempRoot "missing-notion-sync-canary.log"
  Get-CompleteCanaryLogLines | Set-Content -Encoding ASCII -LiteralPath $missingNotionSyncLogPath

  $missingNotionSyncResult = Invoke-Updater -Arguments @(
    "-EvidenceFile", $evidencePath,
    "-CanaryLog", $missingNotionSyncLogPath,
    "-RequireNotionSync"
  )
  if ($missingNotionSyncResult.ExitCode -eq 0) {
    throw "update-release-evidence.ps1 accepted a Notion canary log without notion sync-now evidence."
  }
  Assert-Contains $missingNotionSyncResult.Output "CanaryLog marker count is too low: [PASS] notion sync-now expected at least 7" "Missing Notion sync failure must tell the operator notion sync-now evidence is missing."

  $completeNotionLogPath = Join-Path $tempRoot "complete-notion-canary.log"
  Get-CompleteNotionCanaryLogLines | Set-Content -Encoding ASCII -LiteralPath $completeNotionLogPath

  $completeNotionResult = Invoke-Updater -Arguments @(
    "-EvidenceFile", $evidencePath,
    "-CanaryLog", $completeNotionLogPath,
    "-RequireNotionSync"
  )
  if ($completeNotionResult.ExitCode -ne 0) {
    throw "update-release-evidence.ps1 rejected a complete Notion canary log: $($completeNotionResult.Output)"
  }
  Assert-Contains $completeNotionResult.Output "[PASS] Canary evidence imported" "Successful Notion canary import must be visible in command output."

  foreach ($docPath in @($runbookPath, $beginnerGuidePath, $koreanGuidePath)) {
    $docText = [System.IO.File]::ReadAllText($docPath, [System.Text.Encoding]::UTF8)
    Assert-Contains $docText '.\scripts\update-release-evidence.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json -ArtifactDirectory .\release-artifacts\<release-id>' "$docPath must show the command that imports artifact output into release evidence."
    Assert-Contains $docText '.\scripts\update-release-evidence.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json -DeployDryRunLog $deployDryRunLog' "$docPath must show the command that imports deploy dry-run output into release evidence."
    Assert-Contains $docText '.\scripts\update-release-evidence.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json -DeployApplyLog $deployApplyLog' "$docPath must show the command that imports deploy apply output into release evidence."
    Assert-Contains $docText '.\scripts\update-release-evidence.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json -RollbackDryRunLog $rollbackDryRunLog' "$docPath must show the command that imports rollback dry-run output into release evidence."
    Assert-Contains $docText '.\scripts\update-release-evidence.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json -RollbackApplyLog $rollbackApplyLog' "$docPath must show the command that imports rollback apply output into release evidence."
    Assert-Contains $docText '.\scripts\update-release-evidence.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json -CanaryLog $canaryLog' "$docPath must show the command that imports the canary log into release evidence."
    Assert-Contains $docText '.\scripts\update-release-evidence.ps1 -EvidenceFile .\release-artifacts\<release-id>\release-evidence.json -CanaryLog $canaryLog -RequireNotionSync' "$docPath must require notion sync-now evidence when importing the Notion canary log."
    Assert-Contains $docText 'update-release-evidence.ps1 rejects artifact evidence with `git_worktree=dirty`' "$docPath must explain that final artifact evidence import rejects dirty worktree manifests."
  }

  Write-Host "[PASS] update release evidence contract test passed."
} finally {
  Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
}
