[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$checkScript = Join-Path $repoRoot "scripts/check-deployment-prereqs.ps1"
$checkSource = Get-Content -Raw -LiteralPath $checkScript
$powerShellExe = (Get-Command powershell -ErrorAction Stop).Source
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("ez-one-prereqs-contract-" + [System.Guid]::NewGuid().ToString("N"))
$shimDir = Join-Path $tempRoot "bin"
New-Item -ItemType Directory -Force -Path $shimDir | Out-Null

function Write-Shim {
  param(
    [string]$Name,
    [int]$ExitCode = 0
  )

  $path = Join-Path $shimDir "$Name.cmd"
  Set-Content -LiteralPath $path -Encoding ASCII -Value @(
    "@echo off",
    "exit /b $ExitCode"
  )
  return $path
}

function Invoke-Check {
  param(
    [string[]]$Arguments = @(),
    [string]$BashCandidates = ""
  )

  $previousPath = $env:PATH
  $previousBashCandidates = $env:EZONE_BASH_CANDIDATES
  try {
    $env:PATH = $shimDir
    if (-not [string]::IsNullOrWhiteSpace($BashCandidates)) {
      $env:EZONE_BASH_CANDIDATES = $BashCandidates
    } else {
      Remove-Item Env:EZONE_BASH_CANDIDATES -ErrorAction SilentlyContinue
    }
    $output = & $powerShellExe -NoProfile -ExecutionPolicy Bypass -File $checkScript @Arguments 2>&1
    return [pscustomobject]@{
      ExitCode = $LASTEXITCODE
      Output = ($output | ForEach-Object { $_.ToString() }) -join "`n"
    }
  } finally {
    $env:PATH = $previousPath
    if ($null -eq $previousBashCandidates) {
      Remove-Item Env:EZONE_BASH_CANDIDATES -ErrorAction SilentlyContinue
    } else {
      $env:EZONE_BASH_CANDIDATES = $previousBashCandidates
    }
  }
}

function Assert-Passes {
  param(
    [string]$Name,
    [string[]]$Arguments = @(),
    [string]$BashCandidates = ""
  )

  $result = Invoke-Check -Arguments $Arguments -BashCandidates $BashCandidates
  if ($result.ExitCode -ne 0) {
    throw "$Name should pass but failed with exit code $($result.ExitCode): $($result.Output)"
  }
}

function Assert-Fails {
  param(
    [string]$Name,
    [string[]]$Arguments,
    [string]$ExpectedMessage,
    [string]$BashCandidates = ""
  )

  $result = Invoke-Check -Arguments $Arguments -BashCandidates $BashCandidates
  if ($result.ExitCode -eq 0) {
    throw "$Name should fail but passed."
  }
  if ($result.Output -notmatch [regex]::Escape($ExpectedMessage)) {
    throw "$Name failed with an unexpected message. Expected '$ExpectedMessage' in: $($result.Output)"
  }
}

try {
  if ($checkSource -notmatch [regex]::Escape("docs/42_first-deployment-ko.md")) {
    throw "check-deployment-prereqs.ps1 must require the Korean first-deployment guide."
  }
  if ($checkSource -notmatch [regex]::Escape("scripts/bootstrap-ec2-host.sh")) {
    throw "check-deployment-prereqs.ps1 must require the EC2 bootstrap helper."
  }
  if ($checkSource -notmatch [regex]::Escape("scripts/new-production-env-files.ps1")) {
    throw "check-deployment-prereqs.ps1 must require the production env scaffold helper."
  }
  if ($checkSource -notmatch [regex]::Escape("scripts/show-release-evidence-gaps.ps1")) {
    throw "check-deployment-prereqs.ps1 must require the release evidence gap helper."
  }
  if ($checkSource -notmatch [regex]::Escape("scripts/update-release-evidence.ps1")) {
    throw "check-deployment-prereqs.ps1 must require the release evidence update helper."
  }
  if ($checkSource -notmatch [regex]::Escape("scripts/check-release-evidence.ps1")) {
    throw "check-deployment-prereqs.ps1 must require the strict release evidence checker."
  }
  foreach ($requiredPath in @(
      "backend/mvnw.cmd",
      "backend/pom.xml",
      "frontend/package.json",
      "frontend/package-lock.json",
      "extension/package.json",
      "extension/package-lock.json"
    )) {
    if ($checkSource -notmatch [regex]::Escape($requiredPath)) {
      throw "check-deployment-prereqs.ps1 must require $requiredPath."
    }
  }

  foreach ($name in @("git", "ssh", "scp", "node", "npm", "java", "rg", "powershell")) {
    $null = Write-Shim $name
  }

  Assert-Passes "required-tools-only"

  $null = Write-Shim "mysql"
  Assert-Fails `
    -Name "require-database-tools-without-mysqldump" `
    -Arguments @("-RequireDatabaseTools") `
    -ExpectedMessage "Missing required command: mysqldump"
  Assert-Fails `
    -Name "require-database-tools-install-hint" `
    -Arguments @("-RequireDatabaseTools") `
    -ExpectedMessage "Install MySQL client tools on Windows with: winget install Oracle.MySQL"

  $null = Write-Shim "mysqldump"
  Assert-Passes "require-database-tools" @("-RequireDatabaseTools")

  $brokenBash = Write-Shim "broken-bash" -ExitCode 1
  Assert-Fails `
    -Name "require-bash-without-runnable-bash" `
    -Arguments @("-RequireBash") `
    -ExpectedMessage "Missing required runnable command: bash" `
    -BashCandidates $brokenBash

  $workingBash = Write-Shim "bash"
  Assert-Passes "require-bash" @("-RequireBash") -BashCandidates $workingBash

  Write-Host "[PASS] Deployment prerequisite contract tests passed."
} finally {
  Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
}
