[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$ReleaseId,

  [string]$Owner = "",

  [string]$OutputDirectory = "",

  [string]$LocalGateLog = "",

  [switch]$Force
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

if ($ReleaseId -match "[^A-Za-z0-9_.-]") {
  throw "ReleaseId may contain only letters, numbers, dot, underscore, and dash."
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$templatePath = Join-Path $repoRoot "docs/40_release-evidence.template.json"
$schemaPath = Join-Path $PSScriptRoot "release-evidence-schema.ps1"
. $schemaPath

Assert-ReleaseEvidenceTemplateMatchesSchema -TemplateFile $templatePath

if ([string]::IsNullOrWhiteSpace($OutputDirectory)) {
  $OutputDirectory = Join-Path $repoRoot "release-artifacts/$ReleaseId"
}

$resolvedOutputDirectory = $OutputDirectory
if (-not [System.IO.Path]::IsPathRooted($resolvedOutputDirectory)) {
  $resolvedOutputDirectory = Join-Path $repoRoot $resolvedOutputDirectory
}

New-Item -ItemType Directory -Force -Path $resolvedOutputDirectory | Out-Null

$outputPath = Join-Path $resolvedOutputDirectory "release-evidence.json"
if ((Test-Path -LiteralPath $outputPath) -and -not $Force) {
  throw "Release evidence already exists: $outputPath. Use -Force to overwrite."
}

$evidence = Get-Content -Raw -LiteralPath $templatePath | ConvertFrom-Json
$evidence.releaseId = $ReleaseId
$evidence.owner = $Owner
$evidence.decision = "No-go"
$evidence.decisionTimestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:sszzz")

if (-not [string]::IsNullOrWhiteSpace($LocalGateLog)) {
  $resolvedLocalGateLog = Resolve-Path -LiteralPath $LocalGateLog
  $localGateText = Get-Content -Raw -LiteralPath $resolvedLocalGateLog
  $requiredLocalGateMarkers = @(
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
  )

  foreach ($marker in $requiredLocalGateMarkers) {
    if (-not $localGateText.Contains($marker)) {
      throw "LocalGateLog is missing required marker: $marker"
    }
  }

  if ($localGateText -match '(?m)^\[SKIP\]') {
    throw "LocalGateLog contains a skipped gate marker. Use a full release-local-gate.ps1 run without -SkipSlow for final release evidence."
  }

  if ($localGateText -match '(?m)^\[FAIL\]') {
    throw "LocalGateLog contains a failure marker. Fix the gate and rerun the full local release gate before importing evidence."
  }

  $localGatePath = $resolvedLocalGateLog.Path
  $evidence.gates.localReleaseGate.commandTimestamp = "Full local release gate log: $localGatePath"
  $evidence.gates.localReleaseGate.backendTestsPackage = "Passed in full local release gate log: $localGatePath"
  $evidence.gates.localReleaseGate.frontendAuditTestBuild = "Passed in full local release gate log: $localGatePath"
  $evidence.gates.localReleaseGate.extensionAuditTestBuild = "Passed in full local release gate log: $localGatePath"
  $evidence.gates.localReleaseGate.diffSecretMojibakeGuards = "Passed in full local release gate log: $localGatePath"
}

$json = $evidence | ConvertTo-Json -Depth 20
Set-Content -LiteralPath $outputPath -Encoding UTF8 -Value $json

Write-Host "[PASS] Release evidence initialized: $outputPath"
if (-not [string]::IsNullOrWhiteSpace($LocalGateLog)) {
  Write-Host "[PASS] Local release gate evidence imported from: $LocalGateLog"
}
Write-Host "[INFO] Fill every gate with real evidence, then run:"
Write-Host "       .\scripts\show-release-evidence-gaps.ps1 -EvidenceFile $outputPath"
Write-Host "       .\scripts\check-release-evidence.ps1 -EvidenceFile $outputPath"
