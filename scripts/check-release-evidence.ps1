[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$EvidenceFile
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$schemaPath = Join-Path $PSScriptRoot "release-evidence-schema.ps1"
. $schemaPath

$evidencePath = Resolve-Path $EvidenceFile

try {
  $evidence = Get-Content -Raw -LiteralPath $evidencePath | ConvertFrom-Json
} catch {
  throw "Release evidence file must be valid JSON: $($_.Exception.Message)"
}

Assert-ReleaseEvidenceMatchesSchema -Evidence $evidence

$requiredTopLevel = Get-ReleaseEvidenceRequiredTopLevel
$requiredGates = Get-ReleaseEvidenceRequiredGates

function Get-PropertyValue {
  param(
    [object]$Object,
    [string]$Name,
    [string]$Path
  )

  if ($null -eq $Object -or $Object.PSObject.Properties.Name -notcontains $Name) {
    throw "Missing required release evidence field: $Path.$Name"
  }
  return $Object.PSObject.Properties[$Name].Value
}

function Assert-NonEmpty {
  param(
    [object]$Value,
    [string]$Path
  )

  if ($null -eq $Value) {
    throw "Release evidence field is empty: $Path"
  }
  if ($Value -is [string] -and [string]::IsNullOrWhiteSpace($Value)) {
    throw "Release evidence field is empty: $Path"
  }
}

function Assert-StringEvidence {
  param(
    [object]$Value,
    [string]$Path
  )

  if ($Value -isnot [string]) {
    throw "Release evidence field must be a string: $Path"
  }
}

function Assert-NotPlaceholderEvidence {
  param(
    [object]$Value,
    [string]$Path
  )

  if ($Value -isnot [string]) {
    return
  }

  if (Test-ReleaseEvidencePlaceholder -Value $Value) {
    throw "Release evidence field looks like a placeholder: $Path"
  }
}

function Assert-ReleaseId {
  param([string]$Value)

  if ($Value -notmatch "^[A-Za-z0-9_.-]+$") {
    throw "releaseId may contain only letters, numbers, dot, underscore, and dash."
  }
}

function Assert-DecisionTimestamp {
  param([string]$Value)

  if ($Value -notmatch "^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$") {
    throw "decisionTimestamp must use ISO-8601 format with timezone, for example 2026-06-29T21:30:00+09:00."
  }

  $parsedTimestamp = [DateTimeOffset]::MinValue
  $styles = [System.Globalization.DateTimeStyles]::None
  if (-not [DateTimeOffset]::TryParse($Value, [System.Globalization.CultureInfo]::InvariantCulture, $styles, [ref]$parsedTimestamp)) {
    throw "decisionTimestamp must be a valid date/time."
  }
}

function Assert-GoCanaryFailureEvidence {
  param([string]$Value)

  $normalized = $Value.Trim().ToLowerInvariant()
  $hasExplicitZeroFailures = $normalized -match '\b0\s+(observed\s+)?failures?\b' -or $normalized -match '\bno\s+(observed\s+)?failures?\b'
  $hasExplicitZeroErrors = $normalized -match '\b0\s+(observed\s+)?errors?\b' -or $normalized -match '\bno\s+(observed\s+)?errors?\b'

  if (-not ($hasExplicitZeroFailures -and $hasExplicitZeroErrors)) {
    throw "Go decision requires gates.canary.errorRateOrObservedFailures to explicitly state 0/no observed failures and 0/no observed errors."
  }
}

foreach ($field in $requiredTopLevel) {
  $value = Get-PropertyValue -Object $evidence -Name $field -Path "root"
  Assert-NonEmpty -Value $value -Path $field
  if ($field -ne "gates") {
    Assert-StringEvidence -Value $value -Path $field
    Assert-NotPlaceholderEvidence -Value $value -Path $field
  }
}

if (@("Go", "No-go") -notcontains $evidence.decision) {
  throw "decision must be exactly 'Go' or 'No-go'."
}

Assert-ReleaseId -Value $evidence.releaseId
Assert-DecisionTimestamp -Value $evidence.decisionTimestamp

foreach ($gateName in $requiredGates.Keys) {
  $gate = Get-PropertyValue -Object $evidence.gates -Name $gateName -Path "gates"
  foreach ($field in $requiredGates[$gateName]) {
    $value = Get-PropertyValue -Object $gate -Name $field -Path "gates.$gateName"
    Assert-NonEmpty -Value $value -Path "gates.$gateName.$field"
    Assert-StringEvidence -Value $value -Path "gates.$gateName.$field"
    Assert-NotPlaceholderEvidence -Value $value -Path "gates.$gateName.$field"
  }
}

if ($evidence.decision -eq "Go") {
  Assert-GoCanaryFailureEvidence -Value $evidence.gates.canary.errorRateOrObservedFailures
}

Write-Host "[PASS] Release evidence file is complete: $evidencePath"
