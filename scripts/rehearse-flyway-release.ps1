[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$EnvFile,

  [ValidateSet("prod", "staging")]
  [string]$ExpectedAppEnv = "staging",

  [switch]$Apply,

  [switch]$AllowProductionMigration,

  [string]$ProductionApprovalNote = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$backendDir = Join-Path $repoRoot "backend"
$envPath = Resolve-Path $EnvFile

function Assert-ConcreteProductionApprovalNote {
  param([string]$Value)

  $normalized = $Value.Trim().ToLowerInvariant()
  if ([string]::IsNullOrWhiteSpace($Value) -or $normalized -match '^(todo|tbd|pending|n/a|na|-|none|ok|pass|done|approved)$') {
    throw "ProductionApprovalNote must be concrete: include incident/release owner, reason, and approval record path or ticket."
  }
}

if ($ExpectedAppEnv -eq "prod" -and $Apply -and -not $AllowProductionMigration) {
  throw "Production Flyway migrate requires -AllowProductionMigration and -ProductionApprovalNote with an incident-owner approval record."
}
if ($ExpectedAppEnv -eq "prod" -and $Apply) {
  Assert-ConcreteProductionApprovalNote -Value $ProductionApprovalNote
}

& (Join-Path $PSScriptRoot "check-prod-env.ps1") -EnvFile $envPath -ExpectedAppEnv $ExpectedAppEnv

foreach ($line in Get-Content -LiteralPath $envPath) {
  $trimmed = $line.Trim()
  if ($trimmed -eq "" -or $trimmed.StartsWith("#")) {
    continue
  }
  $separator = $trimmed.IndexOf("=")
  if ($separator -lt 1) {
    throw "Invalid env line without KEY=value: $trimmed"
  }
  $key = $trimmed.Substring(0, $separator).Trim()
  $value = $trimmed.Substring($separator + 1).Trim()
  Set-Item -Path "Env:$key" -Value $value
}

function Invoke-Flyway {
  param([string]$Goal)
  Write-Host "[RUN] Flyway $Goal"
  Push-Location $backendDir
  try {
    .\mvnw.cmd "org.flywaydb:flyway-maven-plugin:11.7.2:$Goal"
    if ($LASTEXITCODE -ne 0) {
      throw "Flyway $Goal failed with exit code $LASTEXITCODE"
    }
  } finally {
    Pop-Location
  }
  Write-Host "[PASS] Flyway $Goal"
}

Invoke-Flyway "info"
Invoke-Flyway "validate"

if ($Apply) {
  Invoke-Flyway "migrate"
  Write-Host "[DONE] Flyway migration rehearsal applied to the configured database."
} else {
  Write-Host "[DONE] Flyway rehearsal completed without migrate. Re-run with -Apply only against staging or a restored production backup."
}
