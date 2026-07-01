[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$EvidenceFile,

  [string]$OutputFile = "",

  [string]$BaseUrl = "https://ez-one.kr"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$schemaPath = Join-Path $PSScriptRoot "release-evidence-schema.ps1"
. $schemaPath

function Escape-MarkdownCell {
  param([string]$Value)

  return $Value.Replace("|", "\|")
}

function Assert-HttpsProductionOrigin {
  param(
    [string]$Name,
    [string]$Value
  )

  if ([string]::IsNullOrWhiteSpace($Value)) {
    throw "$Name must be present and non-empty."
  }
  if ($Value -match "localhost|127\.|(\[)?::1(\])?|0\.0\.0\.0") {
    throw "$Name must not use a local URL for production smoke evidence."
  }

  $uri = $null
  if (-not [System.Uri]::TryCreate($Value, [System.UriKind]::Absolute, [ref]$uri)) {
    throw "$Name contains an invalid URL: $Value"
  }
  if ($uri.Scheme -ne "https") {
    throw "$Name must use HTTPS: $Value"
  }
  if ($Value.Contains("*")) {
    throw "$Name must not contain wildcards: $Value"
  }
  if ($uri.AbsolutePath -ne "/" -or -not [string]::IsNullOrEmpty($uri.Query) -or -not [string]::IsNullOrEmpty($uri.Fragment)) {
    throw "$Name must be an origin only, without path, query string, or fragment."
  }
  if ($Value.EndsWith("/")) {
    throw "$Name must not include a trailing slash."
  }
}

Assert-HttpsProductionOrigin -Name "BaseUrl" -Value $BaseUrl

if (-not (Test-Path -LiteralPath $EvidenceFile -PathType Leaf)) {
  throw @"
Release evidence file was not found: $EvidenceFile
Run the full local Gate 0 first, then create release evidence with:
.\scripts\new-release-evidence.ps1 -ReleaseId <release-id> -Owner <owner-name> -LocalGateLog `$gateLog
"@
}

$evidencePath = Resolve-Path -LiteralPath $EvidenceFile
try {
  $evidence = Get-Content -Raw -LiteralPath $evidencePath | ConvertFrom-Json
} catch {
  throw "Release evidence file must be valid JSON: $($_.Exception.Message)"
}

Assert-ReleaseEvidenceMatchesSchema -Evidence $evidence

if ([string]::IsNullOrWhiteSpace($OutputFile)) {
  $OutputFile = Join-Path (Split-Path -Parent $evidencePath) "real-integration-smoke-checklist.md"
}

if (-not [System.IO.Path]::IsPathRooted($OutputFile)) {
  $OutputFile = Join-Path (Resolve-Path ".") $OutputFile
}

$outputDirectory = Split-Path -Parent $OutputFile
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null

$smokeSteps = [ordered]@{
  googleLoginCookieRotation = "Google login and HttpOnly refresh cookie rotation"
  onboardingProfileSaveRead = "Onboarding profile save and reload"
  jobSaveBasketWorkspaceRead = "Job save, basket list, and workspace read"
  essayDraftVersionFlow = "Essay draft save and version history"
  referenceCrud = "Reference material create/read/update/delete"
  documentProfileSaveRead = "Document profile save and reload"
  notionJobOnlySyncIsolation = "Notion JOB_ONLY sync success/failure isolation"
  loadedExtensionJobSave = "Loaded Chrome extension: posting preview/save"
  loadedExtensionAutofill = "Loaded Chrome extension: supported document autofill"
}

$requiredFields = (Get-ReleaseEvidenceRequiredGates).realIntegrationSmoke
foreach ($field in $requiredFields) {
  if (-not $smokeSteps.Contains($field)) {
    throw "Smoke checklist script is missing a step for gates.realIntegrationSmoke.$field"
  }
}
foreach ($field in $smokeSteps.Keys) {
  if ($requiredFields -notcontains $field) {
    throw "Smoke checklist script has a step for unknown evidence field: gates.realIntegrationSmoke.$field"
  }
}

$lines = New-Object System.Collections.Generic.List[string]
$lines.Add("# Real Integration Smoke Checklist")
$lines.Add("")
$lines.Add("- Release ID: $($evidence.releaseId)")
$lines.Add("- Target base URL: $BaseUrl")
$lines.Add("- Evidence file: $evidencePath")
$lines.Add("- P1 loop: login -> onboarding -> main -> job save -> basket -> workspace -> essay/reference/document profile -> Notion JOB_ONLY sync")
$lines.Add("- Use test Google/Notion accounts only.")
$lines.Add("- Do not use production user data.")
$lines.Add("- Browser console evidence required. Console errors: 0")
$lines.Add("")
$lines.Add("## Evidence Table")
$lines.Add("")
$lines.Add("| Done | Smoke item | Evidence path | Screenshot or log path |")
$lines.Add("| --- | --- | --- | --- |")

foreach ($field in $requiredFields) {
  $path = "gates.realIntegrationSmoke.$field"
  $lines.Add(("| [ ] | {0} | `{1}` | Screenshot or log path: |" -f (Escape-MarkdownCell $smokeSteps[$field]), $path))
}

$lines.Add("")
$lines.Add("## Evidence Update Commands")
$lines.Add("")
$lines.Add("Replace `<evidence>` with a concrete timestamped result, screenshot path, console-log path, or API/browser smoke log path.")
$lines.Add("")

foreach ($field in $requiredFields) {
  $path = "gates.realIntegrationSmoke.$field"
  $lines.Add('```powershell')
  $lines.Add(('.\scripts\set-release-evidence-field.ps1 -EvidenceFile "{0}" -Path "{1}" -Value "<evidence>"' -f $evidencePath, $path))
  $lines.Add('```')
  $lines.Add("")
}

$lines.Add("## Minimum Pass Conditions")
$lines.Add("")
$lines.Add("- Every row above is checked.")
$lines.Add("- Every row has a screenshot or log path.")
$lines.Add("- Browser console errors are 0.")
$lines.Add("- Network/API failures are 0 except explicitly tested Notion failure isolation.")
$lines.Add("- Notion failure isolation proves core job save still succeeds.")
$lines.Add("- Loaded Chrome extension save and autofill are tested on supported pages.")
$lines.Add("")

Set-Content -LiteralPath $OutputFile -Encoding UTF8 -Value $lines

Write-Host "[PASS] Real integration smoke checklist written: $OutputFile"
