[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$EvidenceFile,

  [Parameter(Mandatory = $true)]
  [string]$Path,

  [Parameter(Mandatory = $true)]
  [string]$Value
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$schemaPath = Join-Path $PSScriptRoot "release-evidence-schema.ps1"
. $schemaPath

function Assert-ConcreteEvidenceValue {
  param([string]$EvidenceValue)

  if ([string]::IsNullOrWhiteSpace($EvidenceValue)) {
    throw "Value must not be empty."
  }

  if (Test-ReleaseEvidencePlaceholder -Value $EvidenceValue) {
    throw "Value must be concrete release evidence, such as command output, log path, screenshot path, timestamped smoke result, or owner note."
  }
}

function Set-EvidenceValue {
  param(
    [object]$Evidence,
    [string]$EvidencePath,
    [string]$EvidenceValue
  )

  if ($EvidencePath -match '^root\.([A-Za-z0-9_]+)$') {
    $field = $Matches[1]
    $Evidence.PSObject.Properties[$field].Value = $EvidenceValue
    return
  }

  if ($EvidencePath -match '^gates\.([A-Za-z0-9_]+)\.([A-Za-z0-9_]+)$') {
    $gateName = $Matches[1]
    $field = $Matches[2]
    $Evidence.gates.PSObject.Properties[$gateName].Value.PSObject.Properties[$field].Value = $EvidenceValue
    return
  }

  throw "Unsupported release evidence field path format: $EvidencePath"
}

$evidencePath = Resolve-Path -LiteralPath $EvidenceFile

try {
  $evidence = Get-Content -Raw -LiteralPath $evidencePath | ConvertFrom-Json
} catch {
  throw "Release evidence file must be valid JSON: $($_.Exception.Message)"
}

Assert-ReleaseEvidenceMatchesSchema -Evidence $evidence

$allowedPaths = Get-ReleaseEvidenceRequiredFieldPaths
if ($allowedPaths -notcontains $Path) {
  throw "Unknown release evidence field path: $Path"
}

Assert-ConcreteEvidenceValue -EvidenceValue $Value
Set-EvidenceValue -Evidence $evidence -EvidencePath $Path -EvidenceValue $Value

$json = $evidence | ConvertTo-Json -Depth 20
Set-Content -LiteralPath $evidencePath -Encoding UTF8 -Value $json

Write-Host "[PASS] Release evidence field updated: $Path"
Write-Host "[INFO] Next checks:"
Write-Host "       .\scripts\show-release-evidence-gaps.ps1 -EvidenceFile $evidencePath"
Write-Host "       .\scripts\check-release-evidence.ps1 -EvidenceFile $evidencePath"
