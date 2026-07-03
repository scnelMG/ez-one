[CmdletBinding()]
param(
  [string]$PlanPath = ".omo\plans\production-extension-service-polish.md",
  [string]$EvidenceRoot = ".omo\evidence",
  [string]$EvidencePath = ".omo\evidence\f1-production-extension-service-polish\audit.md"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$planFullPath = Join-Path $repoRoot $PlanPath
$evidenceRootFullPath = Join-Path $repoRoot $EvidenceRoot
$outputPath = Join-Path $repoRoot $EvidencePath
$outputDir = Split-Path -Parent $outputPath

New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$blockers = New-Object System.Collections.Generic.List[string]
if (-not (Test-Path -LiteralPath $planFullPath)) {
  $blockers.Add("Plan file missing: $PlanPath")
} else {
  $plan = Get-Content -Raw -Encoding UTF8 -LiteralPath $planFullPath
  foreach ($item in @("1.", "2.", "3.", "4.", "5.", "6.", "7.", "F1.", "F2.", "F3.", "F4.")) {
    if ($plan -notmatch [regex]::Escape("- [x] $item")) {
      $blockers.Add("Plan item is not checked: $item")
    }
  }
}

foreach ($dir in @(
  "task-1-production-extension-service-polish",
  "task-2-production-extension-service-polish",
  "task-3-production-extension-service-polish",
  "task-4-production-extension-service-polish",
  "task-5-production-extension-service-polish",
  "task-6-production-extension-service-polish",
  "task-7-production-extension-service-polish",
  "f2-production-extension-service-polish",
  "f3-production-extension-service-polish"
)) {
  $dirPath = Join-Path $evidenceRootFullPath $dir
  if (-not (Test-Path -LiteralPath $dirPath)) {
    $blockers.Add("Evidence directory missing: $dir")
    continue
  }
  $file = Get-ChildItem -LiteralPath $dirPath -Recurse -File -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($null -eq $file) {
    $blockers.Add("Evidence directory has no files: $dir")
  }
}

$report = @(
  "# F1 plan compliance audit",
  "",
  "Timestamp: $((Get-Date).ToString('o'))",
  "Plan: $PlanPath",
  "EvidenceRoot: $EvidenceRoot",
  "Blockers: $($blockers.Count)",
  ($blockers | ForEach-Object { "- $_" }),
  "Verdict: $(if ($blockers.Count -eq 0) { "PASS" } else { "FAIL" })"
)

$report | Set-Content -Encoding UTF8 -LiteralPath $outputPath

if ($blockers.Count -gt 0) {
  Write-Error "OMO plan compliance failed. Evidence: $EvidencePath"
  exit 1
}

Write-Host "[PASS] OMO plan compliance evidence written to $EvidencePath"
