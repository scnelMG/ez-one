[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$EnvFile,

  [string]$OutputDirectory = ".\backups",

  [ValidateSet("prod", "staging")]
  [string]$ExpectedAppEnv = "prod"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$envPath = Resolve-Path $EnvFile
$backupDir = New-Item -ItemType Directory -Force -Path $OutputDirectory

& (Join-Path $PSScriptRoot "check-prod-env.ps1") -EnvFile $envPath -ExpectedAppEnv $ExpectedAppEnv

function Read-EnvValues {
  param([string]$Path)

  $values = @{}
  foreach ($line in Get-Content -LiteralPath $Path) {
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
    $values[$key] = $value
  }
  return $values
}

function Get-RequiredEnv {
  param(
    [hashtable]$Values,
    [string]$Key
  )

  if (-not $Values.ContainsKey($Key) -or [string]::IsNullOrWhiteSpace($Values[$Key])) {
    throw "$Key must be present and non-empty."
  }
  return $Values[$Key]
}

$values = Read-EnvValues $envPath
$dbHost = Get-RequiredEnv $values "DB_HOST"
$dbName = Get-RequiredEnv $values "DB_NAME"
$dbUser = Get-RequiredEnv $values "DB_USERNAME"
$dbPassword = Get-RequiredEnv $values "DB_PASSWORD"
$dbPort = "3306"
if ($values.ContainsKey("DB_PORT") -and -not [string]::IsNullOrWhiteSpace($values["DB_PORT"])) {
  $dbPort = $values["DB_PORT"]
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$safeDbName = $dbName -replace "[^A-Za-z0-9_.-]", "_"
$backupPath = Join-Path $backupDir.FullName "$($safeDbName)_$timestamp.sql"
$hashPath = "$backupPath.sha256"

if (Test-Path -LiteralPath $backupPath) {
  throw "Backup path already exists: $backupPath"
}

$mysqldump = Get-Command mysqldump -ErrorAction Stop
$previousMysqlPwd = [Environment]::GetEnvironmentVariable("MYSQL_PWD", "Process")

try {
  [Environment]::SetEnvironmentVariable("MYSQL_PWD", $dbPassword, "Process")
  $dumpArgs = @(
    "--single-transaction",
    "--routines",
    "--triggers",
    "--host=$dbHost",
    "--port=$dbPort",
    "--user=$dbUser",
    "--result-file=$backupPath",
    $dbName
  )

  Write-Host "[RUN] Creating MySQL backup for $dbName on ${dbHost}:$dbPort"
  & $mysqldump.Source @dumpArgs
  if ($LASTEXITCODE -ne 0) {
    throw "mysqldump failed with exit code $LASTEXITCODE"
  }
} finally {
  [Environment]::SetEnvironmentVariable("MYSQL_PWD", $previousMysqlPwd, "Process")
}

$stream = [System.IO.File]::OpenRead($backupPath)
$sha256 = [System.Security.Cryptography.SHA256]::Create()
try {
  $hash = $sha256.ComputeHash($stream)
} finally {
  $sha256.Dispose()
  $stream.Dispose()
}

$hexHash = -join ($hash | ForEach-Object { $_.ToString("x2") })
"$hexHash  $([System.IO.Path]::GetFileName($backupPath))" | Set-Content -Encoding ASCII -LiteralPath $hashPath

Write-Host "[PASS] Backup created: $backupPath"
Write-Host "[PASS] SHA256 written: $hashPath"
