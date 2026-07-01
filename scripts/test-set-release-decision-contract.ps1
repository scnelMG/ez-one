[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$scriptPath = Join-Path $repoRoot "scripts/set-release-decision.ps1"
$templatePath = Join-Path $repoRoot "docs/40_release-evidence.template.json"
$runbookPath = Join-Path $repoRoot "docs/39_production-deployment-runbook.md"
$beginnerGuidePath = Join-Path $repoRoot "docs/41_beginner-deployment-guide.md"
$koreanGuidePath = Join-Path $repoRoot "docs/42_first-deployment-ko.md"
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("ez-one-set-decision-" + [Guid]::NewGuid().ToString("N"))

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

function Invoke-SetDecision {
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

function New-IncompleteEvidenceFile {
  param([string]$Path)

  $evidence = Get-Content -Raw -LiteralPath $templatePath | ConvertFrom-Json
  $evidence.releaseId = "release-test"
  $evidence.owner = "initial-owner"
  $evidence.decision = "No-go"
  $evidence.decisionTimestamp = "2026-06-30T21:30:00+09:00"
  $evidence | ConvertTo-Json -Depth 20 | Set-Content -Encoding ASCII -LiteralPath $Path
}

function New-CompleteEvidenceFile {
  param([string]$Path)

  $evidenceNote = "release evidence recorded with command output path"
  $evidence = Get-Content -Raw -LiteralPath $templatePath | ConvertFrom-Json
  $evidence.releaseId = "release-test"
  $evidence.owner = "initial-owner"
  $evidence.decision = "No-go"
  $evidence.decisionTimestamp = "2026-06-30T21:30:00+09:00"

  foreach ($gateProperty in $evidence.gates.PSObject.Properties) {
    foreach ($field in $gateProperty.Value.PSObject.Properties.Name) {
      $gateProperty.Value.PSObject.Properties[$field].Value = $evidenceNote
    }
  }
  $evidence.gates.canary.errorRateOrObservedFailures = "0 observed failures and 0 observed errors during the canary window"

  $evidence | ConvertTo-Json -Depth 20 | Set-Content -Encoding ASCII -LiteralPath $Path
}

New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null

try {
  if (-not (Test-Path -LiteralPath $scriptPath -PathType Leaf)) {
    throw "scripts/set-release-decision.ps1 must exist so operators do not manually edit decision fields."
  }

  $incompletePath = Join-Path $tempRoot "incomplete-release-evidence.json"
  New-IncompleteEvidenceFile -Path $incompletePath

  $invalidDecisionResult = Invoke-SetDecision -Arguments @(
    "-EvidenceFile", $incompletePath,
    "-Decision", "Maybe",
    "-Owner", "release-owner",
    "-Reason", "manual check found an issue"
  )
  if ($invalidDecisionResult.ExitCode -eq 0) {
    throw "set-release-decision.ps1 accepted an invalid decision."
  }
  Assert-Contains $invalidDecisionResult.Output "Decision must be exactly 'Go' or 'No-go'." "Invalid decision failure must explain the allowed values."

  $placeholderReasonResult = Invoke-SetDecision -Arguments @(
    "-EvidenceFile", $incompletePath,
    "-Decision", "No-go",
    "-Owner", "release-owner",
    "-Reason", "pending"
  )
  if ($placeholderReasonResult.ExitCode -eq 0) {
    throw "set-release-decision.ps1 accepted a placeholder reason."
  }
  Assert-Contains $placeholderReasonResult.Output "Reason must be concrete release evidence" "Placeholder reason failure must tell the operator to use concrete evidence."

  $noGoResult = Invoke-SetDecision -Arguments @(
    "-EvidenceFile", $incompletePath,
    "-Decision", "No-go",
    "-Owner", "release-owner",
    "-DecisionTimestamp", "2026-06-30T22:10:00+09:00",
    "-Reason", "production env evidence is still incomplete"
  )
  if ($noGoResult.ExitCode -ne 0) {
    throw "set-release-decision.ps1 rejected a valid No-go decision: $($noGoResult.Output)"
  }

  $noGoEvidence = Get-Content -Raw -LiteralPath $incompletePath | ConvertFrom-Json
  if ($noGoEvidence.decision -ne "No-go") {
    throw "No-go decision was not written."
  }
  if ($noGoEvidence.owner -ne "release-owner") {
    throw "Owner was not updated."
  }
  if ($noGoEvidence.decisionTimestamp -ne "2026-06-30T22:10:00+09:00") {
    throw "Decision timestamp was not written exactly."
  }
  Assert-Contains $noGoEvidence.gates.canary.goNoGoDecisionTimeOwner "No-go by release-owner at 2026-06-30T22:10:00+09:00" "No-go evidence must include owner and timestamp."
  Assert-Contains $noGoEvidence.gates.canary.goNoGoDecisionTimeOwner "production env evidence is still incomplete" "No-go evidence must include the reason."

  $goIncompleteResult = Invoke-SetDecision -Arguments @(
    "-EvidenceFile", $incompletePath,
    "-Decision", "Go",
    "-Owner", "release-owner",
    "-Reason", "all checks look ready"
  )
  if ($goIncompleteResult.ExitCode -eq 0) {
    throw "set-release-decision.ps1 accepted Go with incomplete evidence."
  }
  Assert-Contains $goIncompleteResult.Output "Cannot set Go until release evidence is complete" "Go rejection must point operators back to evidence completeness."
  $afterRejectedGo = Get-Content -Raw -LiteralPath $incompletePath | ConvertFrom-Json
  if ($afterRejectedGo.decision -ne "No-go") {
    throw "Rejected Go must not partially write the evidence file."
  }

  $completePath = Join-Path $tempRoot "complete-release-evidence.json"
  New-CompleteEvidenceFile -Path $completePath

  $goResult = Invoke-SetDecision -Arguments @(
    "-EvidenceFile", $completePath,
    "-Decision", "Go",
    "-Owner", "release-owner",
    "-DecisionTimestamp", "2026-06-30T22:30:00+09:00",
    "-Reason", "all release gates have real production evidence"
  )
  if ($goResult.ExitCode -ne 0) {
    throw "set-release-decision.ps1 rejected complete Go evidence: $($goResult.Output)"
  }
  Assert-Contains $goResult.Output "[PASS] Release decision updated" "Successful decision update must be visible in output."

  $goEvidence = Get-Content -Raw -LiteralPath $completePath | ConvertFrom-Json
  if ($goEvidence.decision -ne "Go") {
    throw "Go decision was not written."
  }
  Assert-Contains $goEvidence.gates.canary.goNoGoDecisionTimeOwner "Go by release-owner at 2026-06-30T22:30:00+09:00" "Go evidence must include owner and timestamp."
  Assert-Contains $goEvidence.gates.canary.goNoGoDecisionTimeOwner "all release gates have real production evidence" "Go evidence must include the reason."

  foreach ($docPath in @($runbookPath, $beginnerGuidePath, $koreanGuidePath)) {
    $docText = [System.IO.File]::ReadAllText($docPath, [System.Text.Encoding]::UTF8)
    Assert-Contains $docText ".\scripts\set-release-decision.ps1" "$docPath must document the release decision helper."
  }

  Write-Host "[PASS] set release decision contract test passed."
} finally {
  Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
}
