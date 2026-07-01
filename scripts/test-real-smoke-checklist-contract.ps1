[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$scriptPath = Join-Path $repoRoot "scripts/new-real-smoke-checklist.ps1"
$schemaPath = Join-Path $repoRoot "scripts/release-evidence-schema.ps1"
. $schemaPath

function Assert-Contains {
  param(
    [string]$Text,
    [string]$Pattern,
    [string]$Message
  )

  if (-not $Text.Contains($Pattern)) {
    throw $Message
  }
}

function Invoke-SmokeChecklist {
  param(
    [string]$EvidenceFile,
    [string]$BaseUrl
  )

  $previousErrorActionPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = "Continue"
    $output = & powershell -NoProfile -ExecutionPolicy Bypass -File $scriptPath -EvidenceFile $EvidenceFile -BaseUrl $BaseUrl 2>&1
    return [pscustomobject]@{
      ExitCode = $LASTEXITCODE
      Output = ($output | ForEach-Object { $_.ToString() }) -join "`n"
    }
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
}

function New-TestEvidence {
  $gates = [ordered]@{}
  foreach ($gateName in (Get-ReleaseEvidenceRequiredGates).Keys) {
    $gate = [ordered]@{}
    foreach ($field in (Get-ReleaseEvidenceRequiredGates)[$gateName]) {
      $gate[$field] = ""
    }
    $gates[$gateName] = $gate
  }

  return [ordered]@{
    releaseId = "release-smoke-test"
    owner = "release-owner"
    decision = "No-go"
    decisionTimestamp = "2026-06-30T21:00:00+09:00"
    gates = $gates
  }
}

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("ez-one-real-smoke-checklist-" + [Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null

try {
  $missingEvidenceFile = Join-Path $tempRoot "missing-release-evidence.json"
  $missingResult = Invoke-SmokeChecklist -EvidenceFile $missingEvidenceFile -BaseUrl "https://ez-one.kr"
  if ($missingResult.ExitCode -eq 0) {
    throw "new-real-smoke-checklist.ps1 should fail when release-evidence.json does not exist."
  }
  Assert-Contains $missingResult.Output "Release evidence file was not found" "Missing evidence failure must explain that release-evidence.json is missing."
  Assert-Contains $missingResult.Output ".\scripts\new-release-evidence.ps1 -ReleaseId <release-id> -Owner <owner-name> -LocalGateLog `$gateLog" "Missing evidence failure must show the command that creates release evidence after Gate 0."

  $evidenceFile = Join-Path $tempRoot "release-evidence.json"
  New-TestEvidence | ConvertTo-Json -Depth 20 | Set-Content -Encoding UTF8 -LiteralPath $evidenceFile

  $result = Invoke-SmokeChecklist -EvidenceFile $evidenceFile -BaseUrl "https://ez-one.kr"
  if ($result.ExitCode -ne 0) {
    throw "new-real-smoke-checklist.ps1 should generate a checklist. Output: $($result.Output)"
  }

  $checklistFile = Join-Path $tempRoot "real-integration-smoke-checklist.md"
  if (-not (Test-Path -LiteralPath $checklistFile -PathType Leaf)) {
    throw "Expected smoke checklist file to be created beside release evidence."
  }

  $text = [System.IO.File]::ReadAllText($checklistFile, [System.Text.Encoding]::UTF8)
  Assert-Contains $text "# Real Integration Smoke Checklist" "Checklist must have a clear title."
  Assert-Contains $text "release-smoke-test" "Checklist must include the release id."
  Assert-Contains $text "https://ez-one.kr" "Checklist must include the target base URL."
  Assert-Contains $text "login -> onboarding -> main -> job save -> basket -> workspace -> essay/reference/document profile -> Notion JOB_ONLY sync" "Checklist must include the P1 loop."
  Assert-Contains $text "Use test Google/Notion accounts only." "Checklist must warn operators to avoid production user data."
  Assert-Contains $text "Console errors: 0" "Checklist must require console error evidence."
  Assert-Contains $text "Screenshot or log path:" "Checklist must leave a place for evidence paths."

  foreach ($field in (Get-ReleaseEvidenceRequiredGates).realIntegrationSmoke) {
    $path = "gates.realIntegrationSmoke.$field"
    Assert-Contains $text $path "Checklist must include evidence path $path."
    Assert-Contains $text ".\scripts\set-release-evidence-field.ps1 -EvidenceFile `"$evidenceFile`" -Path `"$path`" -Value" "Checklist must show the evidence update command for $path."
  }

  Assert-Contains $text "Loaded Chrome extension: posting preview/save" "Checklist must include the loaded extension job save smoke."
  Assert-Contains $text "Loaded Chrome extension: supported document autofill" "Checklist must include the loaded extension autofill smoke."

  foreach ($invalidBaseUrl in @(
      "https://ez-one.kr/api",
      "http://ez-one.kr",
      "https://localhost:5173"
    )) {
    $invalidResult = Invoke-SmokeChecklist -EvidenceFile $evidenceFile -BaseUrl $invalidBaseUrl
    if ($invalidResult.ExitCode -eq 0) {
      throw "Expected invalid BaseUrl '$invalidBaseUrl' to fail smoke checklist generation."
    }
  }

  Write-Host "[PASS] real integration smoke checklist contract test passed."
} finally {
  Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
}
