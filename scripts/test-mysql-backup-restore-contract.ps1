[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$backupScript = Join-Path $PSScriptRoot "create-mysql-backup.ps1"
$restoreScript = Join-Path $PSScriptRoot "rehearse-mysql-restore.ps1"

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

function Assert-NotContains {
  param(
    [string]$Text,
    [string]$Pattern,
    [string]$Message
  )

  if ($Text -match $Pattern) {
    throw $Message
  }
}

$backupSource = Get-Content -Raw -LiteralPath $backupScript
$restoreSource = Get-Content -Raw -LiteralPath $restoreScript

Assert-NotContains $backupSource '"--databases"' "create-mysql-backup.ps1 must not use mysqldump --databases because that embeds the source DB name in restore SQL."
Assert-Contains $backupSource '"--result-file=\$backupPath"\s*,\s*\$dbName' "create-mysql-backup.ps1 must dump the configured DB as a single database without embedding CREATE DATABASE/USE statements."
Assert-Contains $restoreSource '"--user=\$dbUser"\s*,\s*\$dbName' "rehearse-mysql-restore.ps1 must pass the target DB_NAME to mysql so restores apply to the staging/restored-backup database."
Assert-Contains $restoreSource 'Restoring MySQL backup to \$dbName' "rehearse-mysql-restore.ps1 must report the target DB_NAME before apply."
Assert-Contains $restoreSource '\[string\]\$ProductionApprovalNote' "rehearse-mysql-restore.ps1 must require a production approval note for production restore paths."
Assert-Contains $restoreSource 'Assert-ConcreteProductionApprovalNote' "rehearse-mysql-restore.ps1 must reject missing or placeholder production approval notes."
Assert-Contains $restoreSource 'Production restore requires -AllowProductionRestore and -ProductionApprovalNote' "rehearse-mysql-restore.ps1 must tell operators that production restore requires both an approval switch and a concrete approval note."
Assert-Contains $restoreSource 'ProductionApprovalNote must be concrete' "rehearse-mysql-restore.ps1 must explain that vague approval notes are not enough."

Write-Host "[PASS] MySQL backup/restore contract test passed."
