[CmdletBinding()]
param(
  [switch]$SkipSlow,

  [string]$LogFile = ""
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$backendDir = Join-Path $repoRoot "backend"
$frontendDir = Join-Path $repoRoot "frontend"
$extensionDir = Join-Path $repoRoot "extension"
$transcriptStarted = $false
$resolvedLogFile = ""

function Invoke-Gate {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,

    [Parameter(Mandatory = $true)]
    [string]$WorkingDirectory,

    [Parameter(Mandatory = $true)]
    [scriptblock]$Script,

    [switch]$Slow
  )

  if ($SkipSlow -and $Slow) {
    Write-Host "[SKIP] $Name"
    return
  }

  Write-Host "[RUN]  $Name"
  Push-Location $WorkingDirectory
  try {
    $global:LASTEXITCODE = 0
    & $Script
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
      throw "$Name failed with exit code $exitCode"
    }
  } finally {
    Pop-Location
  }
  Write-Host "[PASS] $Name"
}

function Assert-RipgrepNoMatches {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,

    [Parameter(Mandatory = $true)]
    [string]$Pattern,

    [Parameter(Mandatory = $true)]
    [string[]]$Paths,

    [string[]]$Globs = @()
  )

  Write-Host "[RUN]  $Name"
  Push-Location $repoRoot
  try {
    $global:LASTEXITCODE = 0
    $arguments = @("-n")
    foreach ($glob in $Globs) {
      $arguments += @("--glob", $glob)
    }
    $arguments += @($Pattern)
    $arguments += $Paths

    $output = & rg @arguments 2>&1
    $exitCode = $LASTEXITCODE

    if ($exitCode -eq 0) {
      $output | ForEach-Object { Write-Host $_ }
      throw "$Name found blocked matches"
    }

    if ($exitCode -ne 1) {
      $output | ForEach-Object { Write-Host $_ }
      throw "$Name failed because rg exited with $exitCode"
    }
  } finally {
    Pop-Location
  }
  Write-Host "[PASS] $Name"
}

function Assert-WebRefreshTokenStorageGuard {
  Write-Host "[RUN]  frontend web refresh token storage guard"
  Push-Location $repoRoot
  try {
    $global:LASTEXITCODE = 0
    $pattern = "localStorage\.setItem\((['""]ezone\.refreshToken['""]|REFRESH_TOKEN_KEY)"
    $output = & rg -n --glob "!*.test.js" $pattern "frontend/src" 2>&1
    $exitCode = $LASTEXITCODE

    if ($exitCode -eq 0) {
      $output | ForEach-Object { Write-Host $_ }
      throw "frontend stores web refresh tokens in localStorage"
    }

    if ($exitCode -ne 1) {
      $output | ForEach-Object { Write-Host $_ }
      throw "refresh token storage guard failed because rg exited with $exitCode"
    }
  } finally {
    Pop-Location
  }
  Write-Host "[PASS] frontend web refresh token storage guard"
}

function Assert-NoDuplicateEnvKeys {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Paths
  )

  Write-Host "[RUN]  env example duplicate key guard"
  Push-Location $repoRoot
  try {
    foreach ($path in $Paths) {
      if (-not (Test-Path -LiteralPath $path)) {
        continue
      }
      $seen = @{}
      $duplicates = New-Object System.Collections.Generic.List[string]
      foreach ($line in Get-Content -LiteralPath $path) {
        $trimmed = $line.Trim()
        if ($trimmed -eq "" -or $trimmed.StartsWith("#")) {
          continue
        }
        $separator = $trimmed.IndexOf("=")
        if ($separator -lt 1) {
          throw "$path contains an invalid env line without KEY=value: $trimmed"
        }
        $key = $trimmed.Substring(0, $separator).Trim()
        if ($seen.ContainsKey($key)) {
          $duplicates.Add($key)
        }
        $seen[$key] = $true
      }
      if ($duplicates.Count -gt 0) {
        throw "$path contains duplicate env keys: $($duplicates -join ', ')"
      }
    }
  } finally {
    Pop-Location
  }
  Write-Host "[PASS] env example duplicate key guard"
}

function Assert-NoTrackedSecretFiles {
  Write-Host "[RUN]  tracked secret file guard"
  Push-Location $repoRoot
  try {
    $trackedFiles = @(git ls-files)
    if ($LASTEXITCODE -ne 0) {
      throw "git ls-files failed with exit code $LASTEXITCODE"
    }
    $blockedFiles = $trackedFiles | Where-Object {
      $_ -match '(^|/)\.env($|\.)' -and $_ -notmatch '\.env\.example$'
    }
    if ($blockedFiles.Count -gt 0) {
      $blockedFiles | ForEach-Object { Write-Host $_ }
      throw "tracked real env files are not allowed"
    }
  } finally {
    Pop-Location
  }
  Write-Host "[PASS] tracked secret file guard"
}

function Assert-NoHighRiskSecretPatterns {
  Write-Host "[RUN]  high-risk secret pattern guard"
  Push-Location $repoRoot
  try {
    $patterns = @(
      "-----BEGIN (RSA |DSA |EC |OPENSSH )?PRIVATE KEY-----",
      "AKIA[0-9A-Z]{16}",
      "AIza[0-9A-Za-z_-]{35}",
      "gh[pousr]_[0-9A-Za-z_]{30,}",
      "sk-[0-9A-Za-z]{32,}",
      "xox[baprs]-[0-9A-Za-z-]{20,}",
      "ntn_[0-9A-Za-z]{20,}"
    )
    foreach ($pattern in $patterns) {
      $global:LASTEXITCODE = 0
      $output = & rg -n --hidden --glob "!.git/**" --glob "!**/package-lock.json" --glob "!**/*.png" --glob "!**/*.jpg" --glob "!**/*.jpeg" --glob "!**/*.pdf" -- $pattern 2>&1
      $exitCode = $LASTEXITCODE
      if ($exitCode -eq 0) {
        $output | ForEach-Object { Write-Host $_ }
        throw "high-risk secret pattern found: $pattern"
      }
      if ($exitCode -ne 1) {
        $output | ForEach-Object { Write-Host $_ }
        throw "secret pattern guard failed because rg exited with $exitCode"
      }
    }
  } finally {
    Pop-Location
  }
  Write-Host "[PASS] high-risk secret pattern guard"
}

function Assert-NoMojibakeInFiles {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,

    [Parameter(Mandatory = $true)]
    [string[]]$Paths
  )

  Write-Host "[RUN]  $Name"
  $blockedTokens = New-MojibakeTokenList

  foreach ($path in $Paths) {
    $resolvedPath = Resolve-Path (Join-Path $repoRoot $path)
    $text = [System.IO.File]::ReadAllText($resolvedPath, [System.Text.Encoding]::UTF8)
    $lineNumber = 0
    foreach ($line in $text -split "`r?`n") {
      $lineNumber += 1
      foreach ($token in $blockedTokens) {
        if ($line.Contains($token)) {
          throw "$Name found suspicious text at ${path}:${lineNumber}"
        }
      }
    }
  }
  Write-Host "[PASS] $Name"
}

function New-MojibakeTokenList {
  $blockedTokens = New-Object System.Collections.Generic.List[string]
  foreach ($codePoint in @(
      0x6fd1,
      0x5a9b,
      0x5bc3,
      0x6028,
      0x8adb,
      0x6e72,
      0x6fe1,
      0x73e5,
      0x7570,
      0x75cd,
      0x8e42,
      0x936e,
      0xf9e3,
      0xf9de,
      0xf9dd,
      0xf9cd,
      0xf9cf,
      0x63f6,
      0x00c3,
      0xfffd
    )) {
    $blockedTokens.Add([string][char]$codePoint)
  }
  foreach ($token in @(
      ("?" + [string][char]0xc392),
      ("?" + [string][char]0xbea4),
      ("?" + [string][char]0xbdff),
      ("?" + [string][char]0xbabd),
      ("?" + [string][char]0xafb8)
    )) {
    $blockedTokens.Add($token)
  }
  return $blockedTokens
}

function Assert-NoMojibakeInTree {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,

    [Parameter(Mandatory = $true)]
    [string[]]$Roots,

    [Parameter(Mandatory = $true)]
    [string[]]$Extensions
  )

  Write-Host "[RUN]  $Name"
  $blockedTokens = New-MojibakeTokenList
  foreach ($root in $Roots) {
    $rootPath = Join-Path $repoRoot $root
    if (-not (Test-Path -LiteralPath $rootPath)) {
      continue
    }
    $files = Get-ChildItem -LiteralPath $rootPath -Recurse -File |
      Where-Object { $Extensions -contains $_.Extension.ToLowerInvariant() }

    foreach ($file in $files) {
      $lineNumber = 0
      foreach ($line in [System.IO.File]::ReadLines($file.FullName, [System.Text.Encoding]::UTF8)) {
        $lineNumber += 1
        foreach ($token in $blockedTokens) {
          if ($line.Contains($token)) {
            $relativePath = [System.IO.Path]::GetRelativePath($repoRoot, $file.FullName)
            throw "$Name found suspicious text at ${relativePath}:${lineNumber}"
          }
        }
      }
    }
  }
  Write-Host "[PASS] $Name"
}

function Assert-NoReleaseTextHygieneIssues {
  Write-Host "[RUN]  release text hygiene guard"
  $roots = @("docs", "scripts", "infra")
  $extensions = @(".conf", ".example", ".json", ".md", ".ps1", ".service", ".sh", ".txt", ".yaml", ".yml")

  foreach ($root in $roots) {
    $rootPath = Join-Path $repoRoot $root
    if (-not (Test-Path -LiteralPath $rootPath)) {
      continue
    }

    $files = Get-ChildItem -LiteralPath $rootPath -Recurse -File |
      Where-Object { $extensions -contains $_.Extension.ToLowerInvariant() }

    foreach ($file in $files) {
      $lineNumber = 0
      foreach ($line in [System.IO.File]::ReadLines($file.FullName, [System.Text.Encoding]::UTF8)) {
        $lineNumber += 1
        if ($line -match '[ \t]+$') {
          throw "release text hygiene guard found trailing whitespace at $($file.FullName):$lineNumber"
        }
        if ($line -match '^(<{7}|={7}$|>{7})') {
          throw "release text hygiene guard found merge conflict marker at $($file.FullName):$lineNumber"
        }
      }
    }
  }

  Write-Host "[PASS] release text hygiene guard"
}

function Assert-SurefireReportsClean {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)]
    [string]$ReportsDirectory
  )

  Write-Host "[RUN]  backend surefire report guard"
  if (-not (Test-Path -LiteralPath $ReportsDirectory)) {
    throw "backend surefire reports directory was not found: $ReportsDirectory"
  }

  $failureReports = Get-ChildItem -LiteralPath $ReportsDirectory -Filter "*.txt" -File |
    Where-Object {
      $text = [System.IO.File]::ReadAllText($_.FullName, [System.Text.Encoding]::UTF8)
      $text -match "Failures:\s*[1-9]" -or
        $text -match "Errors:\s*[1-9]" -or
        $text -match "<<< FAILURE!" -or
        $text -match "<<< ERROR!"
    }

  if ($failureReports.Count -gt 0) {
    $failureReports | ForEach-Object { Write-Host $_.FullName }
    throw "backend surefire report guard found failing test reports"
  }

  Write-Host "[PASS] backend surefire report guard"
}

if (-not [string]::IsNullOrWhiteSpace($LogFile)) {
  $resolvedLogFile = $LogFile
  if (-not [System.IO.Path]::IsPathRooted($resolvedLogFile)) {
    $resolvedLogFile = Join-Path $repoRoot $resolvedLogFile
  }
  $logDirectory = Split-Path -Parent $resolvedLogFile
  New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null
  Start-Transcript -Path $resolvedLogFile -Force | Out-Null
  $transcriptStarted = $true
}

try {
Invoke-Gate -Name "release script syntax" -WorkingDirectory $repoRoot -Script {
  $files = Get-ChildItem -LiteralPath (Join-Path $repoRoot "scripts") -Filter "*.ps1" -File |
    Sort-Object FullName
  foreach ($file in $files) {
    $null = [scriptblock]::Create((Get-Content -Raw -LiteralPath $file.FullName))
  }
  $bashCandidates = New-Object System.Collections.Generic.List[string]
  $bash = Get-Command bash -ErrorAction SilentlyContinue
  if ($bash) {
    $bashCandidates.Add($bash.Source)
  }
  foreach ($candidate in @(
    "C:\Program Files\Git\bin\bash.exe",
    "C:\Program Files\Git\usr\bin\bash.exe",
    "C:\msys64\usr\bin\bash.exe"
  )) {
    if (Test-Path -LiteralPath $candidate) {
      $bashCandidates.Add($candidate)
    }
  }

  $runnableBash = $null
  foreach ($candidate in $bashCandidates) {
    try {
      & $candidate -c "true" *> $null
      if ($LASTEXITCODE -eq 0) {
        $runnableBash = $candidate
        break
      }
    } catch {
      Write-Host "[SKIP] bash candidate is not runnable: $candidate"
    }
  }

  if ($runnableBash) {
    $bashFiles = Get-ChildItem -LiteralPath (Join-Path $repoRoot "scripts") -Filter "*.sh" -File |
      Sort-Object FullName
    foreach ($bashFile in $bashFiles) {
      & $runnableBash -n $bashFile.FullName
      if ($LASTEXITCODE -ne 0) {
        throw "$($bashFile.FullName) failed bash syntax validation"
      }
    }
  } else {
    Write-Host "[SKIP] bash syntax validation for release shell scripts because bash is not runnable"
    $global:LASTEXITCODE = 0
  }
}

Invoke-Gate -Name "git diff hygiene" -WorkingDirectory $repoRoot -Script { git diff --check }
Assert-NoReleaseTextHygieneIssues

Assert-NoTrackedSecretFiles
Assert-NoHighRiskSecretPatterns

Assert-NoDuplicateEnvKeys -Paths @(
  "backend/.env.example",
  "frontend/.env.example",
  "extension/.env.example"
)

Assert-WebRefreshTokenStorageGuard

Assert-NoMojibakeInFiles `
  -Name "extension user-facing mojibake guard" `
  -Paths @(
    "README.md",
    "backend/src/main/resources/application.yml",
    "docs/17_tech-stack-and-local-development.md",
    "docs/29_decisions.md",
    "docs/42_first-deployment-ko.md",
    "infra/README.md",
    "extension/README.md",
    "extension/public/manifest.json",
    "extension/manifests/local.json",
    "extension/src/popup/popup.js",
    "extension/src/shared/api/extensionJobApi.js",
    "extension/tests/extensionJobApi.test.js",
    "extension/tests/popupScript.test.js"
  )

Assert-NoMojibakeInTree `
  -Name "backend source mojibake guard" `
  -Roots @("backend/src") `
  -Extensions @(".java", ".xml", ".yml", ".yaml", ".sql")

Assert-RipgrepNoMatches `
  -Name "extension auto-fill debug residue guard" `
  -Pattern "TEMP_|console\.log|it\.only" `
  -Paths @("extension/src/content/applicationAutoFill.js", "extension/tests/applicationAutoFill.test.js")

Assert-RipgrepNoMatches `
  -Name "stale migration tooling docs guard" `
  -Pattern "PEND-001 \| DB migration tool|Flyway .*reconsider|migration tool .*deferred" `
  -Paths @("docs")

Invoke-Gate -Name "canary contract" -WorkingDirectory $repoRoot -Script {
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-canary-contract.ps1
}

Invoke-Gate -Name "deploy contract" -WorkingDirectory $repoRoot -Script {
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-deploy-contract.ps1
}

Invoke-Gate -Name "deploy checksum contract" -WorkingDirectory $repoRoot -Script {
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-deploy-checksum-contract.ps1
}

Invoke-Gate -Name "deployment prerequisite contract" -WorkingDirectory $repoRoot -Script {
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-deployment-prereqs-contract.ps1
}

Invoke-Gate -Name "ec2 bootstrap contract" -WorkingDirectory $repoRoot -Script {
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-ec2-bootstrap-contract.ps1
}

Invoke-Gate -Name "flyway release contract" -WorkingDirectory $repoRoot -Script {
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-flyway-release-contract.ps1
}

Invoke-Gate -Name "mysql backup restore contract" -WorkingDirectory $repoRoot -Script {
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-mysql-backup-restore-contract.ps1
}

Invoke-Gate -Name "ec2 template contract" -WorkingDirectory $repoRoot -Script {
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-ec2-template-contract.ps1
}

Invoke-Gate -Name "new release evidence contract" -WorkingDirectory $repoRoot -Script {
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-new-release-evidence-contract.ps1
}

Invoke-Gate -Name "update release evidence contract" -WorkingDirectory $repoRoot -Script {
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-update-release-evidence-contract.ps1
}

Invoke-Gate -Name "set release evidence field contract" -WorkingDirectory $repoRoot -Script {
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-set-release-evidence-field-contract.ps1
}

Invoke-Gate -Name "set release decision contract" -WorkingDirectory $repoRoot -Script {
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-set-release-decision-contract.ps1
}

Invoke-Gate -Name "new production env files contract" -WorkingDirectory $repoRoot -Script {
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-new-production-env-files-contract.ps1
}

Invoke-Gate -Name "client production env route contract" -WorkingDirectory $repoRoot -Script {
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-client-prod-env-contract.ps1
}

Invoke-Gate -Name "release artifact packaging env contract" -WorkingDirectory $repoRoot -Script {
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-package-release-artifacts.ps1
}

Invoke-Gate -Name "production env contract" -WorkingDirectory $repoRoot -Script {
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-prod-env-contract.ps1
}

Invoke-Gate -Name "release evidence contract" -WorkingDirectory $repoRoot -Script {
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-release-evidence-contract.ps1
}

Invoke-Gate -Name "release evidence gaps contract" -WorkingDirectory $repoRoot -Script {
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-release-evidence-gaps-contract.ps1
}

Invoke-Gate -Name "real integration smoke checklist contract" -WorkingDirectory $repoRoot -Script {
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-real-smoke-checklist-contract.ps1
}

Invoke-Gate -Name "production env evidence checklist contract" -WorkingDirectory $repoRoot -Script {
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-production-env-evidence-checklist-contract.ps1
}

Invoke-Gate -Name "release evidence schema contract" -WorkingDirectory $repoRoot -Script {
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-release-evidence-schema-contract.ps1
}

Invoke-Gate -Name "release docs contract" -WorkingDirectory $repoRoot -Script {
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-release-docs-contract.ps1
}

Invoke-Gate -Name "release local gate contract" -WorkingDirectory $repoRoot -Script {
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-release-local-gate-contract.ps1
}

Invoke-Gate -Name "rollback contract" -WorkingDirectory $repoRoot -Script {
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-rollback-contract.ps1
}

Invoke-Gate -Name "rollback checksum contract" -WorkingDirectory $repoRoot -Script {
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-rollback-checksum-contract.ps1
}

Invoke-Gate -Name "backend tests" -WorkingDirectory $backendDir -Slow -Script { .\mvnw.cmd test }
if (-not $SkipSlow) {
  Assert-SurefireReportsClean -ReportsDirectory (Join-Path $backendDir "target/surefire-reports")
}
Invoke-Gate -Name "backend release package" -WorkingDirectory $backendDir -Slow -Script { .\mvnw.cmd -DskipTests package }

Invoke-Gate -Name "frontend dependency audit" -WorkingDirectory $frontendDir -Slow -Script { npm audit --audit-level=moderate }
Invoke-Gate -Name "frontend tests" -WorkingDirectory $frontendDir -Slow -Script { npm run test }
Invoke-Gate -Name "frontend production build" -WorkingDirectory $frontendDir -Slow -Script { npm run build }

Invoke-Gate -Name "extension dependency audit" -WorkingDirectory $extensionDir -Slow -Script { npm audit --audit-level=moderate }
Invoke-Gate -Name "extension tests" -WorkingDirectory $extensionDir -Slow -Script { npm run test }
Invoke-Gate -Name "extension production build" -WorkingDirectory $extensionDir -Slow -Script { npm run build }
Invoke-Gate -Name "extension local-dev build" -WorkingDirectory $extensionDir -Slow -Script { npm run build:local }

Write-Host "[DONE] Local release gate completed."
} finally {
  if ($transcriptStarted) {
    Stop-Transcript | Out-Null
    Write-Host "[INFO] Local release gate log written: $resolvedLogFile"
  }
}
