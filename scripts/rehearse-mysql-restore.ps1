[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$EnvFile,

  [Parameter(Mandatory = $true)]
  [string]$BackupFile,

  [string]$ChecksumFile = "",

  [ValidateSet("prod", "staging")]
  [string]$ExpectedAppEnv = "staging",

  [switch]$Apply,

  [switch]$AllowProductionRestore,

  [string]$ProductionApprovalNote = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$envPath = Resolve-Path $EnvFile
$backupPath = Resolve-Path $BackupFile

if ([string]::IsNullOrWhiteSpace($ChecksumFile)) {
  $ChecksumFile = "$backupPath.sha256"
}
$checksumPath = Resolve-Path $ChecksumFile

function Assert-ConcreteProductionApprovalNote {
  param([string]$Value)

  $normalized = $Value.Trim().ToLowerInvariant()
  if ([string]::IsNullOrWhiteSpace($Value) -or $normalized -match '^(todo|tbd|pending|n/a|na|-|none|ok|pass|done|approved)$') {
    throw "ProductionApprovalNote must be concrete: include incident/release owner, reason, and approval record path or ticket."
  }
}

if ($ExpectedAppEnv -eq "prod" -and -not $AllowProductionRestore) {
  throw "Production restore requires -AllowProductionRestore and -ProductionApprovalNote with an incident-owner approval record."
}
if ($ExpectedAppEnv -eq "prod") {
  Assert-ConcreteProductionApprovalNote -Value $ProductionApprovalNote
}

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

function Quote-ProcessArgument {
  param([string]$Argument)

  if ($Argument -notmatch '[\s"]') {
    return $Argument
  }
  $escaped = $Argument.Replace("\", "\\").Replace('"', '\"')
  return '"' + $escaped + '"'
}

function Invoke-MysqlRestore {
  param(
    [string]$MysqlPath,
    [string[]]$Arguments,
    [string]$InputFile
  )

  $process = New-Object System.Diagnostics.Process
  $process.StartInfo.FileName = $MysqlPath
  $process.StartInfo.Arguments = ($Arguments | ForEach-Object { Quote-ProcessArgument $_ }) -join " "
  $process.StartInfo.UseShellExecute = $false
  $process.StartInfo.RedirectStandardInput = $true
  $process.StartInfo.RedirectStandardOutput = $true
  $process.StartInfo.RedirectStandardError = $true

  $null = $process.Start()
  $inputStream = [System.IO.File]::OpenRead($InputFile)
  try {
    $inputStream.CopyTo($process.StandardInput.BaseStream)
    $process.StandardInput.Close()
  } finally {
    $inputStream.Dispose()
  }

  $stdout = $process.StandardOutput.ReadToEnd()
  $stderr = $process.StandardError.ReadToEnd()
  $process.WaitForExit()

  if (-not [string]::IsNullOrWhiteSpace($stdout)) {
    Write-Host $stdout.TrimEnd()
  }
  if (-not [string]::IsNullOrWhiteSpace($stderr)) {
    Write-Host $stderr.TrimEnd()
  }
  if ($process.ExitCode -ne 0) {
    throw "mysql restore failed with exit code $($process.ExitCode)"
  }
}

$expectedHash = ((Get-Content -LiteralPath $checksumPath | Select-Object -First 1) -split "\s+")[0]
if ($expectedHash -notmatch "^[A-Fa-f0-9]{64}$") {
  throw "Checksum file must start with a SHA256 hash: $checksumPath"
}
$stream = [System.IO.File]::OpenRead($backupPath)
$sha256 = [System.Security.Cryptography.SHA256]::Create()
try {
  $hash = $sha256.ComputeHash($stream)
} finally {
  $sha256.Dispose()
  $stream.Dispose()
}

$actualHash = -join ($hash | ForEach-Object { $_.ToString("x2") })
if ($actualHash.ToUpperInvariant() -ne $expectedHash.ToUpperInvariant()) {
  throw "Backup checksum mismatch. Expected $expectedHash but got $actualHash."
}
Write-Host "[PASS] Backup checksum verified for $backupPath"

$values = Read-EnvValues $envPath
$dbHost = Get-RequiredEnv $values "DB_HOST"
$dbName = Get-RequiredEnv $values "DB_NAME"
$dbUser = Get-RequiredEnv $values "DB_USERNAME"
$dbPassword = Get-RequiredEnv $values "DB_PASSWORD"
$dbPort = "3306"
if ($values.ContainsKey("DB_PORT") -and -not [string]::IsNullOrWhiteSpace($values["DB_PORT"])) {
  $dbPort = $values["DB_PORT"]
}

$mysqlArgs = @(
  "--binary-mode=1",
  "--host=$dbHost",
  "--port=$dbPort",
  "--user=$dbUser",
  $dbName
)

if (-not $Apply) {
  Write-Host "[DRY-RUN] MySQL restore target: $dbName on ${dbHost}:$dbPort as $dbUser"
  Write-Host "[DRY-RUN] Backup file: $backupPath"
  Write-Host "[DRY-RUN] Re-run with -Apply only against staging or an approved production restore target."
  exit 0
}

$previousMysqlPwd = [Environment]::GetEnvironmentVariable("MYSQL_PWD", "Process")
try {
  $mysql = Get-Command mysql -ErrorAction Stop
  [Environment]::SetEnvironmentVariable("MYSQL_PWD", $dbPassword, "Process")
  Write-Host "[RUN] Restoring MySQL backup to $dbName on ${dbHost}:$dbPort"
  Invoke-MysqlRestore -MysqlPath $mysql.Source -Arguments $mysqlArgs -InputFile $backupPath
} finally {
  [Environment]::SetEnvironmentVariable("MYSQL_PWD", $previousMysqlPwd, "Process")
}

Write-Host "[PASS] MySQL restore rehearsal completed."
