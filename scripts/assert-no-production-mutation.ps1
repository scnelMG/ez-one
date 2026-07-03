[CmdletBinding()]
param(
  [string]$Ledger = ".omo\start-work\ledger.jsonl",

  [string]$Plan = ".omo/plans/production-extension-service-polish.md",

  [string]$EvidencePath = ".omo\evidence\task-6-production-extension-service-polish\no-production-mutation.txt"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$ledgerPath = Join-Path $repoRoot $Ledger
$outputPath = Join-Path $repoRoot $EvidencePath
$outputDir = Split-Path -Parent $outputPath

if (-not (Test-Path -LiteralPath $ledgerPath)) {
  throw "Ledger not found: $Ledger"
}

New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$forbiddenScriptNames = @(
  "deploy-ec2-release.sh",
  "rollback-ec2-release.sh",
  "run-release-canary.ps1"
)

$forbiddenCommandRegex = "^\s*(ssh|scp|sftp|rsync)\b"
$allCommandValues = New-Object System.Collections.Generic.List[string]
$parseFailures = New-Object System.Collections.Generic.List[string]
$scopedEntryCount = 0

function Add-CommandValue {
  param([object]$Value)

  if ($null -eq $Value) {
    return
  }

  if ($Value -is [string]) {
    $allCommandValues.Add($Value)
    return
  }

  if ($Value -is [System.Collections.IEnumerable]) {
    foreach ($entry in $Value) {
      if ($entry -is [string]) {
        $allCommandValues.Add($entry)
      }
    }
  }
}

function Add-EntryPropertyCommandValues {
  param(
    [object]$Entry,
    [string]$PropertyName
  )

  $property = $Entry.PSObject.Properties[$PropertyName]
  if ($null -eq $property) {
    return
  }

  Add-CommandValue $property.Value
}

$lineNumber = 0
foreach ($line in Get-Content -LiteralPath $ledgerPath) {
  $lineNumber += 1
  if ([string]::IsNullOrWhiteSpace($line)) {
    continue
  }

  try {
    $entry = $line | ConvertFrom-Json
  } catch {
    $parseFailures.Add("line=$lineNumber")
    if ($line -notmatch [regex]::Escape($Plan)) {
      continue
    }
    if ($line -match $forbiddenCommandRegex) {
      $hits.Add("raw-line-${lineNumber}:$line")
    } else {
      foreach ($scriptName in $forbiddenScriptNames) {
        if ($line -match [regex]::Escape($scriptName)) {
          $hits.Add("raw-line-${lineNumber}:$line")
          break
        }
      }
    }
    continue
  }

  $planProperty = $entry.PSObject.Properties["plan"]
  if ($null -eq $planProperty -or $planProperty.Value -ne $Plan) {
    continue
  }

  $scopedEntryCount += 1

  Add-EntryPropertyCommandValues -Entry $entry -PropertyName "command"
  Add-EntryPropertyCommandValues -Entry $entry -PropertyName "commands"
  Add-EntryPropertyCommandValues -Entry $entry -PropertyName "invocation"
  Add-EntryPropertyCommandValues -Entry $entry -PropertyName "automatedVerification"
}

$hits = New-Object System.Collections.Generic.List[string]
foreach ($commandValue in $allCommandValues) {
  $normalized = $commandValue.Trim()
  if ($normalized -match $forbiddenCommandRegex) {
    $hits.Add($normalized)
    continue
  }

  foreach ($scriptName in $forbiddenScriptNames) {
    if ($normalized -match [regex]::Escape($scriptName)) {
      $hits.Add($normalized)
      break
    }
  }
}

if ($hits.Count -gt 0) {
  throw "Potential production mutation commands found in ledger command fields: $($hits -join ' | ')"
}

@(
  "Task 6 no-production-mutation assertion",
  "Timestamp: $((Get-Date).ToString('o'))",
  "Ledger: $Ledger",
  "PlanScope: $Plan",
  "LedgerEntriesScanned: $lineNumber",
  "PlanEntriesScanned: $scopedEntryCount",
  "CommandFieldsScanned: $($allCommandValues.Count)",
  "MalformedHistoricalLines: $($parseFailures.Count)",
  "ForbiddenCommandHits: 0",
  "ForbiddenExternalMutations: ssh, scp, sftp, rsync, deploy-ec2-release.sh, rollback-ec2-release.sh, run-release-canary.ps1",
  "Verdict: PASS"
) | Set-Content -Encoding ASCII -LiteralPath $outputPath

Write-Host "[PASS] No production mutation commands found in ledger command fields."
Write-Host "[PASS] Evidence written to $outputPath"
