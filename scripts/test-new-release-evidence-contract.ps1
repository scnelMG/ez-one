[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$scriptPath = Join-Path $repoRoot "scripts/new-release-evidence.ps1"
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("ez-one-new-evidence-" + [Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null

function Invoke-NewEvidence {
  param([string[]]$Arguments)

  $previousErrorActionPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = "Continue"
    $output = & powershell -NoProfile -ExecutionPolicy Bypass -File $scriptPath @Arguments 2>&1
    return [pscustomobject]@{
      ExitCode = $LASTEXITCODE
      Output = ($output | ForEach-Object { $_.ToString() }) -join "`n"
    }
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
}

function Assert-Passes {
  param(
    [string]$Name,
    [string[]]$Arguments,
    [switch]$PassThru
  )

  $result = Invoke-NewEvidence -Arguments $Arguments
  if ($result.ExitCode -ne 0) {
    throw "$Name should pass but failed with exit code $($result.ExitCode): $($result.Output)"
  }
  if ($PassThru) {
    return $result
  }
}

function Assert-Fails {
  param([string]$Name, [string[]]$Arguments, [string]$ExpectedMessage)

  $result = Invoke-NewEvidence -Arguments $Arguments
  if ($result.ExitCode -eq 0) {
    throw "$Name should fail but passed."
  }
  if ($result.Output -notmatch [regex]::Escape($ExpectedMessage)) {
    throw "$Name failed with an unexpected message. Expected '$ExpectedMessage' in: $($result.Output)"
  }
}

try {
  $releaseDir = Join-Path $tempRoot "release"
  $initResult = Assert-Passes "initialize-release-evidence" @(
    "-ReleaseId", "release_20260629.sha",
    "-Owner", "qa-owner",
    "-OutputDirectory", $releaseDir
  ) -PassThru
  if ($initResult.Output -notmatch [regex]::Escape("show-release-evidence-gaps.ps1 -EvidenceFile")) {
    throw "new-release-evidence.ps1 must tell the operator to run the evidence gap report before the strict final check."
  }
  if ($initResult.Output -notmatch [regex]::Escape("check-release-evidence.ps1 -EvidenceFile")) {
    throw "new-release-evidence.ps1 must still tell the operator to run the strict final evidence check."
  }

  $evidencePath = Join-Path $releaseDir "release-evidence.json"
  if (-not (Test-Path -LiteralPath $evidencePath)) {
    throw "new-release-evidence.ps1 did not create release-evidence.json."
  }

  $evidence = Get-Content -Raw -LiteralPath $evidencePath | ConvertFrom-Json
  if ($evidence.releaseId -ne "release_20260629.sha") {
    throw "releaseId was not written to release-evidence.json."
  }
  if ($evidence.owner -ne "qa-owner") {
    throw "owner was not written to release-evidence.json."
  }
  if ($evidence.decision -ne "No-go") {
    throw "new evidence must default to No-go."
  }
  if ([string]::IsNullOrWhiteSpace($evidence.decisionTimestamp)) {
    throw "decisionTimestamp must be initialized."
  }

  Assert-Fails `
    -Name "reject-invalid-release-id" `
    -Arguments @("-ReleaseId", "bad release id", "-OutputDirectory", (Join-Path $tempRoot "bad")) `
    -ExpectedMessage "ReleaseId may contain only letters, numbers, dot, underscore, and dash."

  Assert-Fails `
    -Name "reject-overwrite-without-force" `
    -Arguments @("-ReleaseId", "release_20260629.sha", "-OutputDirectory", $releaseDir) `
    -ExpectedMessage "Release evidence already exists"

  Assert-Passes "overwrite-with-force" @(
    "-ReleaseId", "release_20260629.sha",
    "-Owner", "qa-owner",
    "-OutputDirectory", $releaseDir,
    "-Force"
  )

  $localGateLog = Join-Path $tempRoot "local-gate.log"
  @(
    "[PASS] backend tests",
    "[PASS] backend release package",
    "[PASS] backend source mojibake guard",
    "[PASS] frontend dependency audit",
    "[PASS] frontend tests",
    "[PASS] frontend production build",
    "[PASS] extension dependency audit",
    "[PASS] extension tests",
    "[PASS] extension production build",
    "[PASS] extension local-dev build",
    "[DONE] Local release gate completed."
  ) | Set-Content -Encoding ASCII -LiteralPath $localGateLog

  $importedDir = Join-Path $tempRoot "imported"
  Assert-Passes "initialize-with-local-gate-log" @(
    "-ReleaseId", "release_20260630.sha",
    "-Owner", "qa-owner",
    "-OutputDirectory", $importedDir,
    "-LocalGateLog", $localGateLog
  )

  $importedEvidencePath = Join-Path $importedDir "release-evidence.json"
  $importedEvidence = Get-Content -Raw -LiteralPath $importedEvidencePath | ConvertFrom-Json
  if ($importedEvidence.gates.localReleaseGate.backendTestsPackage -notmatch [regex]::Escape($localGateLog)) {
    throw "Local gate backend evidence did not include the imported log path."
  }
  if ($importedEvidence.gates.localReleaseGate.extensionAuditTestBuild -notmatch [regex]::Escape($localGateLog)) {
    throw "Local gate extension evidence did not include the imported log path."
  }

  $localGateLogWithoutBackendMojibake = Join-Path $tempRoot "local-gate-without-backend-mojibake.log"
  @(
    "[PASS] backend tests",
    "[PASS] backend release package",
    "[PASS] frontend dependency audit",
    "[PASS] frontend tests",
    "[PASS] frontend production build",
    "[PASS] extension dependency audit",
    "[PASS] extension tests",
    "[PASS] extension production build",
    "[PASS] extension local-dev build",
    "[DONE] Local release gate completed."
  ) | Set-Content -Encoding ASCII -LiteralPath $localGateLogWithoutBackendMojibake

  Assert-Fails `
    -Name "reject-local-gate-log-without-backend-mojibake-guard" `
    -Arguments @(
      "-ReleaseId", "release_20260630_missing_mojibake.sha",
      "-Owner", "qa-owner",
      "-OutputDirectory", (Join-Path $tempRoot "missing-backend-mojibake"),
      "-LocalGateLog", $localGateLogWithoutBackendMojibake
    ) `
    -ExpectedMessage "LocalGateLog is missing required marker: [PASS] backend source mojibake guard"

  $incompleteLocalGateLog = Join-Path $tempRoot "incomplete-local-gate.log"
  @(
    "[PASS] backend tests",
    "[DONE] Local release gate completed."
  ) | Set-Content -Encoding ASCII -LiteralPath $incompleteLocalGateLog

  Assert-Fails `
    -Name "reject-incomplete-local-gate-log" `
    -Arguments @(
      "-ReleaseId", "release_20260630_bad.sha",
      "-Owner", "qa-owner",
      "-OutputDirectory", (Join-Path $tempRoot "bad-import"),
      "-LocalGateLog", $incompleteLocalGateLog
    ) `
    -ExpectedMessage "LocalGateLog is missing required marker"

  $localGateLogWithSkippedSlowGate = Join-Path $tempRoot "local-gate-with-skipped-slow-gate.log"
  @(
    "[PASS] backend tests",
    "[PASS] backend release package",
    "[PASS] backend source mojibake guard",
    "[PASS] frontend dependency audit",
    "[PASS] frontend tests",
    "[SKIP] frontend tests",
    "[PASS] frontend production build",
    "[PASS] extension dependency audit",
    "[PASS] extension tests",
    "[PASS] extension production build",
    "[PASS] extension local-dev build",
    "[DONE] Local release gate completed."
  ) | Set-Content -Encoding ASCII -LiteralPath $localGateLogWithSkippedSlowGate

  Assert-Fails `
    -Name "reject-local-gate-log-with-skipped-slow-gate" `
    -Arguments @(
      "-ReleaseId", "release_20260630_skip_slow.sha",
      "-Owner", "qa-owner",
      "-OutputDirectory", (Join-Path $tempRoot "skip-slow-import"),
      "-LocalGateLog", $localGateLogWithSkippedSlowGate
    ) `
    -ExpectedMessage "LocalGateLog contains a skipped gate marker"

  $localGateLogWithFailureMarker = Join-Path $tempRoot "local-gate-with-failure-marker.log"
  @(
    "[PASS] backend tests",
    "[PASS] backend release package",
    "[PASS] backend source mojibake guard",
    "[PASS] frontend dependency audit",
    "[PASS] frontend tests",
    "[PASS] frontend production build",
    "[PASS] extension dependency audit",
    "[PASS] extension tests",
    "[FAIL] extension tests",
    "[PASS] extension production build",
    "[PASS] extension local-dev build",
    "[DONE] Local release gate completed."
  ) | Set-Content -Encoding ASCII -LiteralPath $localGateLogWithFailureMarker

  Assert-Fails `
    -Name "reject-local-gate-log-with-failure-marker" `
    -Arguments @(
      "-ReleaseId", "release_20260630_failed_gate.sha",
      "-Owner", "qa-owner",
      "-OutputDirectory", (Join-Path $tempRoot "failed-gate-import"),
      "-LocalGateLog", $localGateLogWithFailureMarker
    ) `
    -ExpectedMessage "LocalGateLog contains a failure marker"

  Write-Host "[PASS] new release evidence contract test passed."
} finally {
  Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
}
