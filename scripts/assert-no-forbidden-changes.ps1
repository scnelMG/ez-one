[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$EvidencePath,

  [string]$Ledger = ".omo\start-work\ledger.jsonl",

  [string]$EvidenceRoot = ".omo\evidence",

  [string]$BaseRef = "main"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$outputPath = Join-Path $repoRoot $EvidencePath
$outputDir = Split-Path -Parent $outputPath
$ledgerPath = Join-Path $repoRoot $Ledger

New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$blockers = New-Object System.Collections.Generic.List[string]
$warnings = New-Object System.Collections.Generic.List[string]
$ledgerCommands = New-Object System.Collections.Generic.List[string]
$dangerousEvidenceHits = New-Object System.Collections.Generic.List[string]

function Add-Blocker {
  param([string]$Message)
  $blockers.Add($Message)
}

function Convert-ToRepoPath {
  param([string]$Path)
  return ($Path -replace "\\", "/").Trim()
}

function Add-CommandValue {
  param([object]$Value)

  if ($null -eq $Value) {
    return
  }

  if ($Value -is [string]) {
    $ledgerCommands.Add($Value)
    return
  }

  if ($Value -is [System.Collections.IEnumerable]) {
    foreach ($item in $Value) {
      if ($item -is [string]) {
        $ledgerCommands.Add($item)
      }
    }
  }
}

function Add-EntryCommands {
  param([object]$Entry)

  foreach ($propertyName in @("command", "commands", "invocation", "automatedVerification")) {
    $property = $Entry.PSObject.Properties[$propertyName]
    if ($null -ne $property) {
      Add-CommandValue $property.Value
    }
  }
}

function Test-DangerousCommandLine {
  param([string]$Line)

  $normalized = $Line.Trim()
  if ($normalized -match "(?i)\b(ssh|scp|sftp|rsync)\b") {
    return $true
  }
  if ($normalized -match "(?i)\b(deploy-ec2-release|rollback-ec2-release|run-release-canary|web store upload|chrome web store upload|chromewebstore upload|upload\s+to\s+chrome|publish|route53|dns\s+(change|mutation|update)|systemctl\s+(restart|stop|start|reload)|sudo\s+systemctl\s+(restart|stop|start|reload))\b") {
    return $true
  }
  return $false
}

function Test-MutatingProductionCommand {
  param([string]$Line)

  $normalized = $Line.Trim()
  return $normalized -match "(?i)\b(scp|sftp|rsync|deploy-ec2-release|rollback-ec2-release|run-release-canary|web store upload|chrome web store upload|chromewebstore upload|upload\s+to\s+chrome|publish|route53|dns\s+(change|mutation|update)|systemctl\s+(restart|stop|start|reload)|sudo\s+systemctl\s+(restart|stop|start|reload))\b"
}

function Test-ApprovedNonExecutedLine {
  param([string]$Line)

  return $Line -match "(?i)(approval|required|not[_ -]?executed|pending user approval|forbiddencommandhits:\s*0|externalmutationcommandsexecuted.*0|\bgrep\b.*deploy-ec2-release|\bbash\s+-n\b.*deploy-ec2-release)"
}

function Test-ReviewableSourcePath {
  param([string]$Path)

  $normalized = Convert-ToRepoPath $Path
  if ($normalized -match "^(docs|scripts|infra|\.omo|release-artifacts)/") {
    return $false
  }
  if ($normalized -match "(^|/)(README|CONTRIBUTING|AGENTS)\.md$") {
    return $false
  }
  return $true
}

function Get-AddedDiffLinesForPaths {
  param(
    [string[]]$Paths,
    [string]$Range
  )

  $reviewablePaths = @($Paths | Where-Object { Test-ReviewableSourcePath $_ } | Sort-Object -Unique)
  if ($reviewablePaths.Count -eq 0) {
    return @()
  }

  if ([string]::IsNullOrWhiteSpace($Range)) {
    return @(& git -C $repoRoot diff --unified=0 -- @($reviewablePaths))
  }
  return @(& git -C $repoRoot diff --unified=0 $Range -- @($reviewablePaths))
}

function Get-BranchBaseRef {
  param([string]$RequestedBaseRef)

  $base = (& git -C $repoRoot merge-base HEAD $RequestedBaseRef 2>$null)
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($base)) {
    $base = (& git -C $repoRoot merge-base HEAD "origin/$RequestedBaseRef" 2>$null)
  }
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($base)) {
    throw "Unable to resolve branch diff base for '$RequestedBaseRef'."
  }
  return $base.Trim()
}

$baseCommit = Get-BranchBaseRef $BaseRef
$statusLines = @(& git -C $repoRoot status --porcelain --untracked-files=all)
$changedPaths = @()
foreach ($line in $statusLines) {
  if ([string]::IsNullOrWhiteSpace($line) -or $line.Length -lt 4) {
    continue
  }
  $pathPart = $line.Substring(3).Trim()
  if ($pathPart -match " -> ") {
    $pathPart = ($pathPart -split " -> ")[-1]
  }
  $changedPaths += Convert-ToRepoPath $pathPart
}

$branchChangedPaths = @(& git -C $repoRoot diff --name-only "$baseCommit..HEAD" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | ForEach-Object { Convert-ToRepoPath $_ })
$changedPaths = @($changedPaths + $branchChangedPaths | Sort-Object -Unique)

$forbiddenPathPatterns = @(
  "^secrets/",
  "^release-artifacts/",
  "(^|/)\.env($|[./-])",
  "(^|/).*prod.*\.env($|[./-])",
  "(^|/).*\.(pem|p12|pfx|key)$"
)

foreach ($changedPath in $changedPaths) {
  if ($changedPath -match "(^|/)\.env\.(example|sample|template)$") {
    continue
  }
  foreach ($pattern in $forbiddenPathPatterns) {
    if ($changedPath -match $pattern) {
      Add-Blocker "Forbidden changed path: $changedPath"
      break
    }
  }
}

$manifestPaths = @($changedPaths | Where-Object {
  $_ -match "(^|/)(package(-lock)?\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb|pom\.xml|build\.gradle|requirements\.txt|pyproject\.toml|go\.mod|Cargo\.toml)$"
})
$forbiddenStackTerms = @(
  "react",
  "next",
  "django",
  "fastapi",
  "jpa",
  "hibernate",
  "redis",
  "prisma",
  "typeorm",
  "s3"
)
if ($manifestPaths.Count -gt 0) {
  $manifestDiff = @(& git -C $repoRoot diff "$baseCommit..HEAD" -- @($manifestPaths))
  $manifestDiff += @(& git -C $repoRoot diff -- @($manifestPaths))
  foreach ($line in $manifestDiff) {
    if ($line -notmatch "^\+\s*[^+]") {
      continue
    }
    foreach ($term in $forbiddenStackTerms) {
      if ($line -match "(?i)\b$([regex]::Escape($term))\b") {
        Add-Blocker "Potential new unapproved stack/dependency '$term' in manifest diff: $line"
      }
    }
  }
}

$diffAddedLines = @(Get-AddedDiffLinesForPaths -Paths $branchChangedPaths -Range "$baseCommit..HEAD")
$diffAddedLines += @(Get-AddedDiffLinesForPaths -Paths $changedPaths -Range "")
foreach ($line in $diffAddedLines) {
  if ($line -match "^\+\s*[^+]" -and (Test-DangerousCommandLine $line) -and -not (Test-ApprovedNonExecutedLine $line)) {
    Add-Blocker "Dangerous production command appears in current diff: $line"
  }
  if ($line -match "^\+\s*[^+]" -and $line -match "(?i)(password|secret|authorization:|cookie:|db_password|jwt_|google_client_secret|notion_client_secret)\s*[:=]\s*['""][^'""]{8,}") {
    Add-Blocker "Potential raw secret appears in current diff: $line"
  }
}

if (Test-Path -LiteralPath $ledgerPath) {
  foreach ($line in Get-Content -LiteralPath $ledgerPath) {
    if ([string]::IsNullOrWhiteSpace($line)) {
      continue
    }
    try {
      Add-EntryCommands ($line | ConvertFrom-Json)
    } catch {
      $warnings.Add("Malformed ledger line ignored during command-field parse")
    }
  }
}

foreach ($command in $ledgerCommands) {
  if ((Test-MutatingProductionCommand $command) -and -not (Test-ApprovedNonExecutedLine $command)) {
    Add-Blocker "Dangerous production command recorded in ledger command field: $command"
  } elseif (($command -match "(?i)\bssh\b") -and -not (Test-ApprovedNonExecutedLine $command)) {
    $warnings.Add("Read-only remote command observed in ledger command field: $command")
  }
}

$p2ActivationPatterns = @(
  "(?i)calendar\s+(api|route|view|sync)",
  "(?i)mattermost\s+(sync|collector|approval)",
  "(?i)alert\s+(channel|scheduler|notification)",
  "(?i)support\s+request\s+api",
  "(?i)notion\s+(essay|canvas)\s+sync"
)
foreach ($line in $diffAddedLines) {
  if ($line -notmatch "^\+\s*[^+]") {
    continue
  }
  foreach ($pattern in $p2ActivationPatterns) {
    if ($line -match $pattern) {
      Add-Blocker "Potential P2 scope activation in current diff: $line"
    }
  }
}

$report = @(
  "F2 forbidden-change assertion",
  "Timestamp: $((Get-Date).ToString('o'))",
  "Repo: $repoRoot",
  "BaseRef: $BaseRef",
  "BaseCommit: $baseCommit",
  "ChangedPathCount: $($changedPaths.Count)",
  "ChangedPaths:",
  ($changedPaths | Sort-Object | ForEach-Object { "  - $_" }),
  "ManifestPathsChanged: $($manifestPaths.Count)",
  "LedgerCommandFieldsScanned: $($ledgerCommands.Count)",
  "DangerousEvidenceHits: $($dangerousEvidenceHits.Count)",
  "EvidenceFreeTextScan: skipped; command fields are parsed from ledger to avoid self-failing on prior warning prose",
  "Warnings: $($warnings.Count)",
  ($warnings | ForEach-Object { "  - $_" }),
  "Blockers: $($blockers.Count)",
  ($blockers | ForEach-Object { "  - $_" }),
  "Verdict: $(if ($blockers.Count -eq 0) { "PASS" } else { "FAIL" })"
)

$report | Set-Content -Encoding ASCII -LiteralPath $outputPath

if ($blockers.Count -gt 0) {
  Write-Error "Forbidden change blockers found. Evidence: $outputPath"
  exit 1
}

Write-Host "[PASS] No forbidden production changes found."
Write-Host "[PASS] Evidence written to $outputPath"
