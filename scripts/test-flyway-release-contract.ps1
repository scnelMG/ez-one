[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$scriptPath = Join-Path $PSScriptRoot "rehearse-flyway-release.ps1"
$source = Get-Content -Raw -LiteralPath $scriptPath

function Assert-Contains {
  param(
    [string]$Text,
    [string]$Pattern,
    [string]$Message
  )

  if ($Text -notmatch $Pattern) {
    throw $Message
  }
}

Assert-Contains $source '\[switch\]\$AllowProductionMigration' "rehearse-flyway-release.ps1 must require an explicit production migration approval switch."
Assert-Contains $source '\[string\]\$ProductionApprovalNote' "rehearse-flyway-release.ps1 must require a production approval note for production migration apply."
Assert-Contains $source 'Assert-ConcreteProductionApprovalNote' "rehearse-flyway-release.ps1 must reject missing or placeholder production approval notes."
Assert-Contains $source 'Production Flyway migrate requires -AllowProductionMigration' "rehearse-flyway-release.ps1 must block production Flyway migrate without approval."
Assert-Contains $source 'Production Flyway migrate requires -AllowProductionMigration and -ProductionApprovalNote' "rehearse-flyway-release.ps1 must tell operators production migrate needs both an approval switch and a concrete approval note."
Assert-Contains $source 'ProductionApprovalNote must be concrete' "rehearse-flyway-release.ps1 must explain that vague approval notes are not enough."
Assert-Contains $source '\$ExpectedAppEnv -eq "prod" -and \$Apply -and -not \$AllowProductionMigration' "rehearse-flyway-release.ps1 must only block production when applying migrations."
Assert-Contains $source 'Flyway rehearsal completed without migrate' "rehearse-flyway-release.ps1 must still allow production info/validate dry-runs without migrate."

Write-Host "[PASS] Flyway release contract test passed."
