[CmdletBinding()]
param(
  [string]$EvidencePath = ".omo\evidence\f4-production-extension-service-polish\scope.md",
  [string]$BaseRef = "main"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$outputPath = Join-Path $repoRoot $EvidencePath
$outputDir = Split-Path -Parent $outputPath

New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$baseCommit = (& git -C $repoRoot merge-base HEAD $BaseRef 2>$null)
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($baseCommit)) {
  $baseCommit = (& git -C $repoRoot merge-base HEAD "origin/$BaseRef" 2>$null)
}
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($baseCommit)) {
  throw "Unable to resolve base ref '$BaseRef'."
}
$baseCommit = $baseCommit.Trim()

$changedPaths = @(& git -C $repoRoot diff --name-only "$baseCommit..HEAD" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
$workingTreePaths = @(& git -C $repoRoot status --porcelain --untracked-files=all | ForEach-Object {
  if ($_.Length -ge 4) {
    $path = $_.Substring(3).Trim()
    if ($path -match " -> ") { ($path -split " -> ")[-1] } else { $path }
  }
} | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
$allPaths = @($changedPaths + $workingTreePaths | Sort-Object -Unique)

$blockers = New-Object System.Collections.Generic.List[string]
$forbiddenPatterns = @(
  "^secrets/",
  "^release-artifacts/",
  "(^|/).*prod.*\.env($|[./-])",
  "(^|/).*\.(pem|p12|pfx|key)$"
)
foreach ($path in $allPaths) {
  $normalized = ($path -replace "\\", "/")
  foreach ($pattern in $forbiddenPatterns) {
    if ($normalized -match $pattern) {
      $blockers.Add("Forbidden scoped path changed: $normalized")
    }
  }
}

$reviewablePaths = @($allPaths | Where-Object {
  $normalized = ($_ -replace "\\", "/")
  $normalized -notmatch "^(docs|scripts|infra|\.omo|release-artifacts)/" -and
    $normalized -notmatch "(^|/)(README|CONTRIBUTING|AGENTS)\.md$"
})
$diffAddedLines = @()
if ($reviewablePaths.Count -gt 0) {
  $diffAddedLines += @(& git -C $repoRoot diff --unified=0 "$baseCommit..HEAD" -- @($reviewablePaths))
  $diffAddedLines += @(& git -C $repoRoot diff --unified=0 -- @($reviewablePaths))
}
foreach ($line in $diffAddedLines) {
  if ($line -match "^\+\s*[^+]" -and $line -match "(?i)\b(deploy-ec2-release|rollback-ec2-release|run-release-canary|web store upload|chromewebstore upload|route53|systemctl\s+(restart|stop|start|reload))\b") {
    $blockers.Add("Potential production mutation command in diff: $line")
  }
}

$scopeNotes = @(
  "Public /extension, /privacy, /support pages are static trust/help surfaces.",
  "Document auto-fill remains limited to saved document profile fields and excludes essay auto-fill.",
  "applicationAutoFill.js SIZE_OK is documented for this release; extraction refactor is deferred outside this blocker fix.",
  "No EC2 deploy, DNS mutation, Chrome Web Store upload, or secret file mutation is allowed by this assertion."
)

$report = @(
  "# F4 production extension scope fidelity",
  "",
  "Timestamp: $((Get-Date).ToString('o'))",
  "BaseRef: $BaseRef",
  "BaseCommit: $baseCommit",
  "ChangedPathCount: $($allPaths.Count)",
  "",
  "## Scope Notes",
  ($scopeNotes | ForEach-Object { "- $_" }),
  "",
  "## Changed Paths",
  ($allPaths | ForEach-Object { "- $_" }),
  "",
  "Blockers: $($blockers.Count)",
  ($blockers | ForEach-Object { "- $_" }),
  "Verdict: $(if ($blockers.Count -eq 0) { "PASS" } else { "FAIL" })"
)

$report | Set-Content -Encoding UTF8 -LiteralPath $outputPath

if ($blockers.Count -gt 0) {
  Write-Error "Scope fidelity failed. Evidence: $EvidencePath"
  exit 1
}

Write-Host "[PASS] Scope fidelity evidence written to $EvidencePath"
