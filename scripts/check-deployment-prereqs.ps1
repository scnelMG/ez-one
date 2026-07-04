[CmdletBinding()]
param(
  [switch]$RequireDatabaseTools,

  [switch]$RequireBash
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$failures = New-Object System.Collections.Generic.List[string]
$warnings = New-Object System.Collections.Generic.List[string]

function Test-CommandAvailable {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name
  )

  return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Get-RunnableBash {
  $candidates = New-Object System.Collections.Generic.List[string]

  if (-not [string]::IsNullOrWhiteSpace($env:EZONE_BASH_CANDIDATES)) {
    foreach ($candidate in $env:EZONE_BASH_CANDIDATES.Split([System.IO.Path]::PathSeparator)) {
      if (-not [string]::IsNullOrWhiteSpace($candidate)) {
        $candidates.Add($candidate)
      }
    }
  } else {
    $bash = Get-Command bash -ErrorAction SilentlyContinue
    if ($bash) {
      $candidates.Add($bash.Source)
    }
    foreach ($candidate in @(
        "C:\Program Files\Git\bin\bash.exe",
        "C:\Program Files\Git\usr\bin\bash.exe",
        "C:\msys64\usr\bin\bash.exe"
      )) {
      if (Test-Path -LiteralPath $candidate) {
        $candidates.Add($candidate)
      }
    }
  }

  foreach ($candidate in ($candidates | Select-Object -Unique)) {
    if (-not (Test-Path -LiteralPath $candidate)) {
      continue
    }
    try {
      & $candidate -c "true" *> $null
      if ($LASTEXITCODE -eq 0) {
        return $candidate
      }
    } catch {
      continue
    }
  }

  return ""
}

function Assert-Command {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,

    [string]$Hint = ""
  )

  if (Test-CommandAvailable $Name) {
    Write-Host "[PASS] command available: $Name"
    return
  }

  $message = "Missing required command: $Name"
  if (-not [string]::IsNullOrWhiteSpace($Hint)) {
    $message = "$message. $Hint"
  }
  $failures.Add($message)
  Write-Host "[FAIL] $message"
}

function Assert-Bash {
  param(
    [switch]$Required
  )

  $bash = Get-RunnableBash
  if (-not [string]::IsNullOrWhiteSpace($bash)) {
    Write-Host "[PASS] runnable bash: $bash"
    return
  }

  $message = "Missing optional runnable command: bash. Needed for local shell-script syntax checks; Git Bash or WSL is enough."
  if ($Required) {
    $failures.Add($message.Replace("optional", "required"))
    Write-Host "[FAIL] $($message.Replace("optional", "required"))"
  } else {
    $warnings.Add($message)
    Write-Host "[WARN] $message"
  }
}

function Assert-OptionalCommand {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,

    [string]$Hint = "",

    [switch]$Required
  )

  if (Test-CommandAvailable $Name) {
    Write-Host "[PASS] command available: $Name"
    return
  }

  $message = "Missing optional command: $Name"
  if (-not [string]::IsNullOrWhiteSpace($Hint)) {
    $message = "$message. $Hint"
  }

  if ($Required) {
    $failures.Add($message.Replace("optional", "required"))
    Write-Host "[FAIL] $($message.Replace("optional", "required"))"
  } else {
    $warnings.Add($message)
    Write-Host "[WARN] $message"
  }
}

function Assert-Path {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RelativePath
  )

  $path = Join-Path $repoRoot $RelativePath
  if (Test-Path -LiteralPath $path) {
    Write-Host "[PASS] path exists: $RelativePath"
    return
  }

  $message = "Missing required repo path: $RelativePath"
  $failures.Add($message)
  Write-Host "[FAIL] $message"
}

Write-Host "[INFO] Checking local deployment prerequisites from $repoRoot"

Assert-Command -Name "git" -Hint "Install Git for Windows and make sure it is on PATH."
Assert-Command -Name "ssh" -Hint "Install OpenSSH client or enable Windows OpenSSH Client."
Assert-Command -Name "scp" -Hint "Install OpenSSH client or enable Windows OpenSSH Client."
Assert-Command -Name "node" -Hint "Install the Node.js version used by the frontend and extension."
Assert-Command -Name "npm" -Hint "Install npm with Node.js."
Assert-Command -Name "java" -Hint "Install Java 17."
Assert-Command -Name "rg" -Hint "Install ripgrep or add it to PATH."
Assert-Command -Name "powershell" -Hint "Use Windows PowerShell or PowerShell Core."

Assert-Bash -Required:$RequireBash
$mysqlClientHint = "Needed for DB backup/restore rehearsal. Install MySQL client tools on Windows with: winget install Oracle.MySQL. On Ubuntu/EC2 use: sudo apt install -y mysql-client."
Assert-OptionalCommand -Name "mysql" -Hint $mysqlClientHint -Required:$RequireDatabaseTools
Assert-OptionalCommand -Name "mysqldump" -Hint $mysqlClientHint -Required:$RequireDatabaseTools

foreach ($relativePath in @(
    "backend/.env.example",
    "backend/mvnw.cmd",
    "backend/pom.xml",
    "frontend/.env.example",
    "frontend/package.json",
    "frontend/package-lock.json",
    "extension/.env.example",
    "extension/package.json",
    "extension/package-lock.json",
    "scripts/release-local-gate.ps1",
    "scripts/check-prod-env.ps1",
    "scripts/check-client-prod-env.ps1",
    "scripts/new-production-env-files.ps1",
    "scripts/package-release-artifacts.ps1",
    "scripts/bootstrap-ec2-host.sh",
    "scripts/deploy-ec2-release.sh",
    "scripts/rollback-ec2-release.sh",
    "scripts/run-release-canary.ps1",
  "scripts/new-release-evidence.ps1",
  "scripts/show-release-evidence-gaps.ps1",
  "scripts/update-release-evidence.ps1",
  "scripts/set-release-decision.ps1",
  "scripts/check-release-evidence.ps1",
    "infra/systemd/ez-one-backend.service",
    "infra/nginx/ez-one.conf",
    "docs/39_production-deployment-runbook.md",
    "docs/40_release-evidence.template.json",
    "docs/41_beginner-deployment-guide.md",
    "docs/42_first-deployment-ko.md"
  )) {
  Assert-Path $relativePath
}

if ($warnings.Count -gt 0) {
  Write-Host "[WARN] Optional prerequisites need attention:"
  $warnings | ForEach-Object { Write-Host " - $_" }
}

if ($failures.Count -gt 0) {
  Write-Host "[FAIL] Deployment prerequisite check failed:"
  $failures | ForEach-Object { Write-Host " - $_" }
  exit 1
}

Write-Host "[PASS] Deployment prerequisite check passed."
