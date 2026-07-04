[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$EvidenceFile,

  [Parameter(Mandatory = $true)]
  [string]$Decision,

  [Parameter(Mandatory = $true)]
  [string]$Owner,

  [string]$DecisionTimestamp = "",

  [Parameter(Mandatory = $true)]
  [string]$Reason
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$schemaPath = Join-Path $PSScriptRoot "release-evidence-schema.ps1"
. $schemaPath

function Assert-DecisionValue {
  param([string]$Value)

  if (@("Go", "No-go") -notcontains $Value) {
    throw "Decision must be exactly 'Go' or 'No-go'."
  }
}

function Assert-ConcreteText {
  param(
    [string]$Value,
    [string]$Name
  )

  if ([string]::IsNullOrWhiteSpace($Value) -or (Test-ReleaseEvidencePlaceholder -Value $Value)) {
    throw "$Name must be concrete release evidence, not empty, vague, or placeholder text."
  }
}

function Get-NormalizedDecisionTimestamp {
  param([string]$Value)

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return (Get-Date).ToString("yyyy-MM-ddTHH:mm:sszzz")
  }

  if ($Value -notmatch "^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$") {
    throw "DecisionTimestamp must use ISO-8601 format with timezone, for example 2026-06-30T21:30:00+09:00."
  }

  $parsedTimestamp = [DateTimeOffset]::MinValue
  $styles = [System.Globalization.DateTimeStyles]::None
  if (-not [DateTimeOffset]::TryParse($Value, [System.Globalization.CultureInfo]::InvariantCulture, $styles, [ref]$parsedTimestamp)) {
    throw "DecisionTimestamp must be a valid date/time."
  }

  return $Value
}

function Copy-EvidenceObject {
  param([object]$Evidence)

  return ($Evidence | ConvertTo-Json -Depth 20 | ConvertFrom-Json)
}

function Assert-GoEvidenceComplete {
  param([object]$Evidence)

  $tempPath = Join-Path ([System.IO.Path]::GetTempPath()) ("ez-one-go-evidence-" + [Guid]::NewGuid().ToString("N") + ".json")
  try {
    $Evidence | ConvertTo-Json -Depth 20 | Set-Content -Encoding UTF8 -LiteralPath $tempPath
    $checkScript = Join-Path $PSScriptRoot "check-release-evidence.ps1"
    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
      $output = & powershell -NoProfile -ExecutionPolicy Bypass -File $checkScript -EvidenceFile $tempPath 2>&1
      if ($LASTEXITCODE -ne 0) {
        $outputText = ($output | ForEach-Object { $_.ToString() }) -join "`n"
        throw "Cannot set Go until release evidence is complete. Run .\scripts\show-release-evidence-gaps.ps1 first. $outputText"
      }
    } finally {
      $ErrorActionPreference = $previousErrorActionPreference
    }
  } finally {
    Remove-Item -LiteralPath $tempPath -Force -ErrorAction SilentlyContinue
  }
}

if (-not (Test-Path -LiteralPath $EvidenceFile -PathType Leaf)) {
  throw "EvidenceFile does not exist: $EvidenceFile"
}

Assert-DecisionValue -Value $Decision
Assert-ConcreteText -Value $Owner -Name "Owner"
Assert-ConcreteText -Value $Reason -Name "Reason"
$normalizedDecisionTimestamp = Get-NormalizedDecisionTimestamp -Value $DecisionTimestamp

$resolvedEvidenceFile = Resolve-Path -LiteralPath $EvidenceFile
try {
  $evidence = Get-Content -Raw -LiteralPath $resolvedEvidenceFile | ConvertFrom-Json
} catch {
  throw "Release evidence file must be valid JSON: $($_.Exception.Message)"
}

Assert-ReleaseEvidenceMatchesSchema -Evidence $evidence

$updatedEvidence = Copy-EvidenceObject -Evidence $evidence
$updatedEvidence.owner = $Owner
$updatedEvidence.decision = $Decision
$updatedEvidence.decisionTimestamp = $normalizedDecisionTimestamp
$updatedEvidence.gates.canary.goNoGoDecisionTimeOwner = "$Decision by $Owner at ${normalizedDecisionTimestamp}: $Reason"

if ($Decision -eq "Go") {
  Assert-GoEvidenceComplete -Evidence $updatedEvidence
}

$updatedEvidence | ConvertTo-Json -Depth 20 | Set-Content -Encoding UTF8 -LiteralPath $resolvedEvidenceFile

Write-Host "[PASS] Release decision updated: $resolvedEvidenceFile"
Write-Host "[INFO] Decision: $Decision"
Write-Host "[INFO] Decision evidence: $($updatedEvidence.gates.canary.goNoGoDecisionTimeOwner)"
