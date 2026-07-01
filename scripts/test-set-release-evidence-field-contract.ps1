[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$scriptPath = Join-Path $repoRoot "scripts/set-release-evidence-field.ps1"
$templatePath = Join-Path $repoRoot "docs/40_release-evidence.template.json"
$runbookPath = Join-Path $repoRoot "docs/39_production-deployment-runbook.md"
$beginnerGuidePath = Join-Path $repoRoot "docs/41_beginner-deployment-guide.md"
$koreanGuidePath = Join-Path $repoRoot "docs/42_first-deployment-ko.md"
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("ez-one-set-evidence-field-" + [Guid]::NewGuid().ToString("N"))

function Invoke-SetEvidenceField {
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

New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null

try {
  if (-not (Test-Path -LiteralPath $scriptPath -PathType Leaf)) {
    throw "scripts/set-release-evidence-field.ps1 must exist so operators do not manually edit release-evidence.json."
  }

  $evidencePath = Join-Path $tempRoot "release-evidence.json"
  $evidence = Get-Content -Raw -LiteralPath $templatePath | ConvertFrom-Json
  $evidence.releaseId = "release-test"
  $evidence.owner = "qa-owner"
  $evidence.decision = "No-go"
  $evidence.decisionTimestamp = "2026-06-30T21:30:00+09:00"
  $evidence | ConvertTo-Json -Depth 20 | Set-Content -Encoding UTF8 -LiteralPath $evidencePath

  $validResult = Invoke-SetEvidenceField -Arguments @(
    "-EvidenceFile", $evidencePath,
    "-Path", "gates.productionEnvPolicy.envPolicyCheckOutput",
    "-Value", "check-prod-env.ps1 passed on 2026-06-30 with real production env file"
  )
  if ($validResult.ExitCode -ne 0) {
    throw "set-release-evidence-field.ps1 rejected a valid field update: $($validResult.Output)"
  }
  Assert-Contains $validResult.Output "[PASS] Release evidence field updated" "Successful field update must be visible in output."

  $updated = Get-Content -Raw -LiteralPath $evidencePath | ConvertFrom-Json
  if ($updated.gates.productionEnvPolicy.envPolicyCheckOutput -ne "check-prod-env.ps1 passed on 2026-06-30 with real production env file") {
    throw "set-release-evidence-field.ps1 did not write the requested gate field."
  }

  $rootResult = Invoke-SetEvidenceField -Arguments @(
    "-EvidenceFile", $evidencePath,
    "-Path", "root.owner",
    "-Value", "release-owner"
  )
  if ($rootResult.ExitCode -ne 0) {
    throw "set-release-evidence-field.ps1 rejected a valid root field update: $($rootResult.Output)"
  }
  $rootUpdated = Get-Content -Raw -LiteralPath $evidencePath | ConvertFrom-Json
  if ($rootUpdated.owner -ne "release-owner") {
    throw "set-release-evidence-field.ps1 did not write the requested root field."
  }

  $unknownResult = Invoke-SetEvidenceField -Arguments @(
    "-EvidenceFile", $evidencePath,
    "-Path", "gates.productionEnvPolicy.unknownField",
    "-Value", "real evidence"
  )
  if ($unknownResult.ExitCode -eq 0) {
    throw "set-release-evidence-field.ps1 accepted an unknown evidence field."
  }
  Assert-Contains $unknownResult.Output "Unknown release evidence field path" "Unknown field failure must explain the path is not part of the schema."

  $placeholderResult = Invoke-SetEvidenceField -Arguments @(
    "-EvidenceFile", $evidencePath,
    "-Path", "gates.productionEnvPolicy.clientEnvPolicyCheckOutput",
    "-Value", "pending"
  )
  if ($placeholderResult.ExitCode -eq 0) {
    throw "set-release-evidence-field.ps1 accepted a placeholder value."
  }
  Assert-Contains $placeholderResult.Output "Value must be concrete release evidence" "Placeholder value failure must tell operators to use concrete evidence."

  $emptyResult = Invoke-SetEvidenceField -Arguments @(
    "-EvidenceFile", $evidencePath,
    "-Path", "gates.productionEnvPolicy.clientEnvPolicyCheckOutput",
    "-Value", "   "
  )
  if ($emptyResult.ExitCode -eq 0) {
    throw "set-release-evidence-field.ps1 accepted an empty value."
  }
  Assert-Contains $emptyResult.Output "Value must not be empty" "Empty value failure must be explicit."

  foreach ($docPath in @($runbookPath, $beginnerGuidePath, $koreanGuidePath)) {
    $docText = [System.IO.File]::ReadAllText($docPath, [System.Text.Encoding]::UTF8)
    Assert-Contains $docText ".\scripts\set-release-evidence-field.ps1" "$docPath must document the field update helper."
  }

  Write-Host "[PASS] set release evidence field contract test passed."
} finally {
  Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
}
