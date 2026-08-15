[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$rollbackScript = Join-Path $repoRoot "scripts\rollback-ec2-release.sh"

function Get-UsableBash {
  $candidates = @(
    "C:\Program Files\Git\bin\bash.exe",
    "C:\Program Files\Git\usr\bin\bash.exe",
    "C:\msys64\usr\bin\bash.exe"
  )
  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate) {
      $candidateDir = Split-Path $candidate -Parent
      if ($candidateDir -like "*\usr\bin") {
        $gitRoot = Split-Path (Split-Path $candidateDir -Parent) -Parent
      } else {
        $gitRoot = Split-Path $candidateDir -Parent
      }
      $supportPaths = @(
        (Join-Path $gitRoot "usr\bin"),
        (Join-Path $gitRoot "bin")
      ) | Where-Object { Test-Path -LiteralPath $_ }
      $previousPath = $env:PATH
      $env:PATH = (($supportPaths + $previousPath) -join [System.IO.Path]::PathSeparator)
      try {
        & $candidate -c "true" *> $null
        if ($LASTEXITCODE -eq 0) {
          $script:BashSupportPath = ($supportPaths -join [System.IO.Path]::PathSeparator)
          return $candidate
        }
      } catch {
        $env:PATH = $previousPath
      }
      $env:PATH = $previousPath
    }
  }
  throw "No usable Git/MSYS bash found for rollback checksum contract test."
}

function Convert-ToBashPath {
  param([string]$Path)
  return $Path.Replace("\", "/")
}

function Write-ChecksumLine {
  param(
    [string]$File,
    [string]$OutputFile
  )

  $stream = [System.IO.File]::OpenRead($File)
  $sha256 = [System.Security.Cryptography.SHA256]::Create()
  try {
    $hash = $sha256.ComputeHash($stream)
  } finally {
    $sha256.Dispose()
    $stream.Dispose()
  }

  $hexHash = -join ($hash | ForEach-Object { $_.ToString("x2") })
  "$hexHash  $([System.IO.Path]::GetFileName($File))" | Add-Content -Encoding ASCII -LiteralPath $OutputFile
}

function Invoke-Rollback {
  param(
    [string]$Bash,
    [string]$BackendArtifact,
    [string]$FrontendArtifact,
    [string]$ExtensionArtifact,
    [string]$ReleaseManifest,
    [string]$ChecksumFile,
    [string]$BackendTarget,
    [string]$FrontendTarget,
    [string]$BaseUrl = ""
  )

  $env:BACKEND_ARTIFACT = Convert-ToBashPath $BackendArtifact
  $env:BACKEND_TARGET = Convert-ToBashPath $BackendTarget
  $env:FRONTEND_ARTIFACT = Convert-ToBashPath $FrontendArtifact
  $env:FRONTEND_TARGET = Convert-ToBashPath $FrontendTarget
  $env:EXTENSION_ARTIFACT = Convert-ToBashPath $ExtensionArtifact
  $env:RELEASE_MANIFEST = Convert-ToBashPath $ReleaseManifest
  $env:CHECKSUM_FILE = Convert-ToBashPath $ChecksumFile
  if (-not [string]::IsNullOrWhiteSpace($BaseUrl)) {
    $env:BASE_URL = $BaseUrl
  }
  $env:DRY_RUN = "true"
  $env:BASH_EXTRA_PATH = "/usr/bin:/bin"
  $previousPath = $env:PATH
  if (-not [string]::IsNullOrWhiteSpace($script:BashSupportPath)) {
    $env:PATH = "${script:BashSupportPath}$([System.IO.Path]::PathSeparator)$previousPath"
  }

  try {
    $output = & $Bash (Convert-ToBashPath $rollbackScript) 2>&1
    return [pscustomobject]@{
      ExitCode = $LASTEXITCODE
      Output = ($output -join "`n")
    }
  } catch {
    return [pscustomobject]@{
      ExitCode = 1
      Output = $_.Exception.Message
    }
  } finally {
    Remove-Item Env:BACKEND_ARTIFACT -ErrorAction SilentlyContinue
    Remove-Item Env:BACKEND_TARGET -ErrorAction SilentlyContinue
    Remove-Item Env:FRONTEND_ARTIFACT -ErrorAction SilentlyContinue
    Remove-Item Env:FRONTEND_TARGET -ErrorAction SilentlyContinue
    Remove-Item Env:EXTENSION_ARTIFACT -ErrorAction SilentlyContinue
    Remove-Item Env:RELEASE_MANIFEST -ErrorAction SilentlyContinue
    Remove-Item Env:CHECKSUM_FILE -ErrorAction SilentlyContinue
    Remove-Item Env:BASE_URL -ErrorAction SilentlyContinue
    Remove-Item Env:DRY_RUN -ErrorAction SilentlyContinue
    Remove-Item Env:BASH_EXTRA_PATH -ErrorAction SilentlyContinue
    $env:PATH = $previousPath
  }
}

$bash = Get-UsableBash
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("ez-one-rollback-checksum-" + [Guid]::NewGuid().ToString("N"))
$previousDir = Join-Path $tempRoot "previous"
$alternateDir = Join-Path $tempRoot "alternate"
$backendDir = Join-Path $tempRoot "backend"
$frontendTarget = Join-Path $tempRoot "www"
$backendJarSource = Join-Path $tempRoot "backend-jar-source"
$zipSource = Join-Path $tempRoot "zip-source"
$noIndexZipSource = Join-Path $tempRoot "no-index-zip-source"
$extensionZipSource = Join-Path $tempRoot "extension-zip-source"
$noManifestExtensionZipSource = Join-Path $tempRoot "no-manifest-extension-zip-source"

New-Item -ItemType Directory -Force -Path $previousDir, $alternateDir, $backendDir, $frontendTarget, $backendJarSource, $zipSource, $noIndexZipSource, $extensionZipSource, $noManifestExtensionZipSource | Out-Null

try {
  $backendName = "ez-one-backend-previous.jar"
  $frontendName = "ez-one-frontend-previous.zip"
  $extensionName = "ez-one-extension-previous.zip"
  $manifestName = "RELEASE-MANIFEST.txt"

  $goodBackend = Join-Path $previousDir $backendName
  $badBackend = Join-Path $alternateDir $backendName
  $frontendArtifact = Join-Path $previousDir $frontendName
  $extensionArtifact = Join-Path $previousDir $extensionName
  $releaseManifest = Join-Path $previousDir $manifestName
  $checksumFile = Join-Path $previousDir "SHA256SUMS.txt"

  New-Item -ItemType Directory -Force -Path (Join-Path $backendJarSource "BOOT-INF\classes") | Out-Null
  Set-Content -Encoding ASCII -LiteralPath (Join-Path $backendJarSource "BOOT-INF\classes\application.properties") -Value "spring.application.name=ez-one"
  $goodBackendZip = Join-Path $previousDir "ez-one-backend-previous.zip"
  Compress-Archive -Path (Join-Path $backendJarSource "*") -DestinationPath $goodBackendZip -Force
  Move-Item -LiteralPath $goodBackendZip -Destination $goodBackend -Force
  Set-Content -Encoding ASCII -LiteralPath $badBackend -Value "tampered previous backend"
  Set-Content -Encoding ASCII -LiteralPath (Join-Path $zipSource "index.html") -Value "<!doctype html><title>previous</title>"
  Compress-Archive -Path (Join-Path $zipSource "*") -DestinationPath $frontendArtifact -Force
  Set-Content -Encoding ASCII -LiteralPath (Join-Path $extensionZipSource "manifest.json") -Value '{"manifest_version":3,"name":"EZ-ONE","version":"1.0.0"}'
  Compress-Archive -Path (Join-Path $extensionZipSource "*") -DestinationPath $extensionArtifact -Force
  @(
    "release_id=previous",
    "generated_at=2026-06-30T00:00:00.0000000+09:00",
    "git_branch=main",
    "git_commit=0123456789abcdef0123456789abcdef01234567",
    "git_worktree=clean",
    "backend_jar=$backendName",
    "frontend_zip=$frontendName",
    "extension_zip=$extensionName"
  ) | Set-Content -Encoding ASCII -LiteralPath $releaseManifest

  Write-ChecksumLine -File $goodBackend -OutputFile $checksumFile
  Write-ChecksumLine -File $frontendArtifact -OutputFile $checksumFile
  Write-ChecksumLine -File $extensionArtifact -OutputFile $checksumFile
  Write-ChecksumLine -File $releaseManifest -OutputFile $checksumFile

  $badExit = Invoke-Rollback `
    -Bash $bash `
    -BackendArtifact $badBackend `
    -FrontendArtifact $frontendArtifact `
    -ExtensionArtifact $extensionArtifact `
    -ReleaseManifest $releaseManifest `
    -ChecksumFile $checksumFile `
    -BackendTarget (Join-Path $backendDir "app.jar") `
    -FrontendTarget $frontendTarget

  if ($badExit.ExitCode -eq 0) {
    throw "rollback-ec2-release.sh accepted an artifact path whose content did not match SHA256SUMS.txt."
  }

  $badBaseUrlExit = Invoke-Rollback `
    -Bash $bash `
    -BackendArtifact $goodBackend `
    -FrontendArtifact $frontendArtifact `
    -ExtensionArtifact $extensionArtifact `
    -ReleaseManifest $releaseManifest `
    -ChecksumFile $checksumFile `
    -BackendTarget (Join-Path $backendDir "app.jar") `
    -FrontendTarget $frontendTarget `
    -BaseUrl "https://ez-one.kr/api"

  if ($badBaseUrlExit.ExitCode -eq 0 -or $badBaseUrlExit.Output -notmatch "BASE_URL must be an HTTPS origin only") {
    throw "rollback-ec2-release.sh accepted BASE_URL with a path: $($badBaseUrlExit.Output)"
  }

  $localBaseUrlExit = Invoke-Rollback `
    -Bash $bash `
    -BackendArtifact $goodBackend `
    -FrontendArtifact $frontendArtifact `
    -ExtensionArtifact $extensionArtifact `
    -ReleaseManifest $releaseManifest `
    -ChecksumFile $checksumFile `
    -BackendTarget (Join-Path $backendDir "app.jar") `
    -FrontendTarget $frontendTarget `
    -BaseUrl "https://127.0.0.1"

  if ($localBaseUrlExit.ExitCode -eq 0 -or $localBaseUrlExit.Output -notmatch "BASE_URL must not use a local host") {
    throw "rollback-ec2-release.sh accepted a local BASE_URL origin: $($localBaseUrlExit.Output)"
  }

  $badBackendJarDir = Join-Path $tempRoot "bad-backend-jar"
  New-Item -ItemType Directory -Force -Path $badBackendJarDir | Out-Null
  $badBackendJar = Join-Path $badBackendJarDir $backendName
  $badBackendJarFrontend = Join-Path $badBackendJarDir $frontendName
  $badBackendJarExtension = Join-Path $badBackendJarDir $extensionName
  $badBackendJarManifest = Join-Path $badBackendJarDir "RELEASE-MANIFEST.txt"
  $badBackendJarChecksumFile = Join-Path $badBackendJarDir "SHA256SUMS.txt"
  Set-Content -Encoding ASCII -LiteralPath $badBackendJar -Value "not a jar"
  Copy-Item -LiteralPath $frontendArtifact -Destination $badBackendJarFrontend -Force
  Copy-Item -LiteralPath $extensionArtifact -Destination $badBackendJarExtension -Force
  @(
    "release_id=previous",
    "generated_at=2026-06-30T00:00:00.0000000+09:00",
    "git_branch=main",
    "git_commit=0123456789abcdef0123456789abcdef01234567",
    "git_worktree=clean",
    "backend_jar=$backendName",
    "frontend_zip=$frontendName",
    "extension_zip=$extensionName"
  ) | Set-Content -Encoding ASCII -LiteralPath $badBackendJarManifest
  Write-ChecksumLine -File $badBackendJar -OutputFile $badBackendJarChecksumFile
  Write-ChecksumLine -File $badBackendJarFrontend -OutputFile $badBackendJarChecksumFile
  Write-ChecksumLine -File $badBackendJarExtension -OutputFile $badBackendJarChecksumFile
  Write-ChecksumLine -File $badBackendJarManifest -OutputFile $badBackendJarChecksumFile

  $badBackendJarExit = Invoke-Rollback `
    -Bash $bash `
    -BackendArtifact $badBackendJar `
    -FrontendArtifact $badBackendJarFrontend `
    -ExtensionArtifact $badBackendJarExtension `
    -ReleaseManifest $badBackendJarManifest `
    -ChecksumFile $badBackendJarChecksumFile `
    -BackendTarget (Join-Path $backendDir "app.jar") `
    -FrontendTarget $frontendTarget

  if ($badBackendJarExit.ExitCode -eq 0 -or $badBackendJarExit.Output -notmatch "Backend artifact must be a valid executable jar") {
    throw "rollback-ec2-release.sh accepted an invalid backend jar artifact: $($badBackendJarExit.Output)"
  }

  $dirtyDir = Join-Path $tempRoot "dirty"
  New-Item -ItemType Directory -Force -Path $dirtyDir | Out-Null
  $dirtyBackend = Join-Path $dirtyDir $backendName
  $dirtyFrontend = Join-Path $dirtyDir $frontendName
  $dirtyExtension = Join-Path $dirtyDir $extensionName
  $dirtyManifest = Join-Path $dirtyDir "RELEASE-MANIFEST.txt"
  Copy-Item -LiteralPath $goodBackend -Destination $dirtyBackend -Force
  Copy-Item -LiteralPath $frontendArtifact -Destination $dirtyFrontend -Force
  Copy-Item -LiteralPath $extensionArtifact -Destination $dirtyExtension -Force
  @(
    "release_id=previous",
    "generated_at=2026-06-30T00:00:00.0000000+09:00",
    "git_branch=main",
    "git_commit=0123456789abcdef0123456789abcdef01234567",
    "git_worktree=dirty",
    "backend_jar=$backendName",
    "frontend_zip=$frontendName",
    "extension_zip=$extensionName"
  ) | Set-Content -Encoding ASCII -LiteralPath $dirtyManifest
  $dirtyChecksumFile = Join-Path $dirtyDir "SHA256SUMS.txt"
  Write-ChecksumLine -File $dirtyBackend -OutputFile $dirtyChecksumFile
  Write-ChecksumLine -File $dirtyFrontend -OutputFile $dirtyChecksumFile
  Write-ChecksumLine -File $dirtyExtension -OutputFile $dirtyChecksumFile
  Write-ChecksumLine -File $dirtyManifest -OutputFile $dirtyChecksumFile

  $dirtyManifestExit = Invoke-Rollback `
    -Bash $bash `
    -BackendArtifact $dirtyBackend `
    -FrontendArtifact $dirtyFrontend `
    -ExtensionArtifact $dirtyExtension `
    -ReleaseManifest $dirtyManifest `
    -ChecksumFile $dirtyChecksumFile `
    -BackendTarget (Join-Path $backendDir "app.jar") `
    -FrontendTarget $frontendTarget

  if ($dirtyManifestExit.ExitCode -eq 0 -or $dirtyManifestExit.Output -notmatch "git_worktree=dirty") {
    throw "rollback-ec2-release.sh accepted a dirty previous release manifest: $($dirtyManifestExit.Output)"
  }

  $wrongArtifactDir = Join-Path $tempRoot "wrong-artifact"
  New-Item -ItemType Directory -Force -Path $wrongArtifactDir | Out-Null
  $wrongArtifactBackend = Join-Path $wrongArtifactDir $backendName
  $wrongArtifactFrontend = Join-Path $wrongArtifactDir $frontendName
  $wrongArtifactExtension = Join-Path $wrongArtifactDir $extensionName
  $wrongArtifactManifest = Join-Path $wrongArtifactDir "RELEASE-MANIFEST.txt"
  Copy-Item -LiteralPath $goodBackend -Destination $wrongArtifactBackend -Force
  Copy-Item -LiteralPath $frontendArtifact -Destination $wrongArtifactFrontend -Force
  Copy-Item -LiteralPath $extensionArtifact -Destination $wrongArtifactExtension -Force
  @(
    "release_id=previous",
    "generated_at=2026-06-30T00:00:00.0000000+09:00",
    "git_branch=main",
    "git_commit=0123456789abcdef0123456789abcdef01234567",
    "git_worktree=clean",
    "backend_jar=other-backend.jar",
    "frontend_zip=$frontendName",
    "extension_zip=$extensionName"
  ) | Set-Content -Encoding ASCII -LiteralPath $wrongArtifactManifest
  $wrongArtifactChecksumFile = Join-Path $wrongArtifactDir "SHA256SUMS.txt"
  Write-ChecksumLine -File $wrongArtifactBackend -OutputFile $wrongArtifactChecksumFile
  Write-ChecksumLine -File $wrongArtifactFrontend -OutputFile $wrongArtifactChecksumFile
  Write-ChecksumLine -File $wrongArtifactExtension -OutputFile $wrongArtifactChecksumFile
  Write-ChecksumLine -File $wrongArtifactManifest -OutputFile $wrongArtifactChecksumFile

  $wrongArtifactExit = Invoke-Rollback `
    -Bash $bash `
    -BackendArtifact $wrongArtifactBackend `
    -FrontendArtifact $wrongArtifactFrontend `
    -ExtensionArtifact $wrongArtifactExtension `
    -ReleaseManifest $wrongArtifactManifest `
    -ChecksumFile $wrongArtifactChecksumFile `
    -BackendTarget (Join-Path $backendDir "app.jar") `
    -FrontendTarget $frontendTarget

  if ($wrongArtifactExit.ExitCode -eq 0 -or $wrongArtifactExit.Output -notmatch "backend_jar") {
    throw "rollback-ec2-release.sh accepted a manifest whose backend_jar did not match BACKEND_ARTIFACT: $($wrongArtifactExit.Output)"
  }

  $wrongNameDir = Join-Path $tempRoot "wrong-name"
  New-Item -ItemType Directory -Force -Path $wrongNameDir | Out-Null
  $wrongNameBackend = Join-Path $wrongNameDir "ez-one-backend-wrong-name.jar"
  $wrongNameFrontend = Join-Path $wrongNameDir "ez-one-frontend-wrong-name.zip"
  $wrongNameExtension = Join-Path $wrongNameDir "ez-one-extension-wrong-name.zip"
  $wrongNameManifest = Join-Path $wrongNameDir "RELEASE-MANIFEST.txt"
  $wrongNameChecksumFile = Join-Path $wrongNameDir "SHA256SUMS.txt"
  Copy-Item -LiteralPath $goodBackend -Destination $wrongNameBackend -Force
  Copy-Item -LiteralPath $frontendArtifact -Destination $wrongNameFrontend -Force
  Copy-Item -LiteralPath $extensionArtifact -Destination $wrongNameExtension -Force
  @(
    "release_id=previous",
    "generated_at=2026-06-30T00:00:00.0000000+09:00",
    "git_branch=main",
    "git_commit=0123456789abcdef0123456789abcdef01234567",
    "git_worktree=clean",
    "backend_jar=$([System.IO.Path]::GetFileName($wrongNameBackend))",
    "frontend_zip=$([System.IO.Path]::GetFileName($wrongNameFrontend))",
    "extension_zip=$([System.IO.Path]::GetFileName($wrongNameExtension))"
  ) | Set-Content -Encoding ASCII -LiteralPath $wrongNameManifest
  Write-ChecksumLine -File $wrongNameBackend -OutputFile $wrongNameChecksumFile
  Write-ChecksumLine -File $wrongNameFrontend -OutputFile $wrongNameChecksumFile
  Write-ChecksumLine -File $wrongNameExtension -OutputFile $wrongNameChecksumFile
  Write-ChecksumLine -File $wrongNameManifest -OutputFile $wrongNameChecksumFile

  $wrongNameExit = Invoke-Rollback `
    -Bash $bash `
    -BackendArtifact $wrongNameBackend `
    -FrontendArtifact $wrongNameFrontend `
    -ExtensionArtifact $wrongNameExtension `
    -ReleaseManifest $wrongNameManifest `
    -ChecksumFile $wrongNameChecksumFile `
    -BackendTarget (Join-Path $backendDir "app.jar") `
    -FrontendTarget $frontendTarget

  if ($wrongNameExit.ExitCode -eq 0 -or $wrongNameExit.Output -notmatch "backend artifact filename") {
    throw "rollback-ec2-release.sh accepted artifact filenames that do not match manifest release_id: $($wrongNameExit.Output)"
  }

  $badFrontendDir = Join-Path $tempRoot "bad-frontend"
  New-Item -ItemType Directory -Force -Path $badFrontendDir | Out-Null
  $badFrontendBackend = Join-Path $badFrontendDir $backendName
  $badFrontendArtifact = Join-Path $badFrontendDir $frontendName
  $badFrontendExtension = Join-Path $badFrontendDir $extensionName
  $badFrontendManifest = Join-Path $badFrontendDir "RELEASE-MANIFEST.txt"
  $badFrontendChecksumFile = Join-Path $badFrontendDir "SHA256SUMS.txt"
  Copy-Item -LiteralPath $goodBackend -Destination $badFrontendBackend -Force
  Set-Content -Encoding ASCII -LiteralPath $badFrontendArtifact -Value "not a zip"
  Copy-Item -LiteralPath $extensionArtifact -Destination $badFrontendExtension -Force
  @(
    "release_id=previous",
    "generated_at=2026-06-30T00:00:00.0000000+09:00",
    "git_branch=main",
    "git_commit=0123456789abcdef0123456789abcdef01234567",
    "git_worktree=clean",
    "backend_jar=$backendName",
    "frontend_zip=$frontendName",
    "extension_zip=$extensionName"
  ) | Set-Content -Encoding ASCII -LiteralPath $badFrontendManifest
  Write-ChecksumLine -File $badFrontendBackend -OutputFile $badFrontendChecksumFile
  Write-ChecksumLine -File $badFrontendArtifact -OutputFile $badFrontendChecksumFile
  Write-ChecksumLine -File $badFrontendExtension -OutputFile $badFrontendChecksumFile
  Write-ChecksumLine -File $badFrontendManifest -OutputFile $badFrontendChecksumFile

  $badFrontendExit = Invoke-Rollback `
    -Bash $bash `
    -BackendArtifact $badFrontendBackend `
    -FrontendArtifact $badFrontendArtifact `
    -ExtensionArtifact $badFrontendExtension `
    -ReleaseManifest $badFrontendManifest `
    -ChecksumFile $badFrontendChecksumFile `
    -BackendTarget (Join-Path $backendDir "app.jar") `
    -FrontendTarget $frontendTarget

  if ($badFrontendExit.ExitCode -eq 0 -or $badFrontendExit.Output -notmatch "Frontend artifact must be a valid zip") {
    throw "rollback-ec2-release.sh accepted an invalid frontend zip artifact: $($badFrontendExit.Output)"
  }

  $noIndexFrontendDir = Join-Path $tempRoot "no-index-frontend"
  New-Item -ItemType Directory -Force -Path $noIndexFrontendDir | Out-Null
  $noIndexFrontendBackend = Join-Path $noIndexFrontendDir $backendName
  $noIndexFrontendArtifact = Join-Path $noIndexFrontendDir $frontendName
  $noIndexFrontendExtension = Join-Path $noIndexFrontendDir $extensionName
  $noIndexFrontendManifest = Join-Path $noIndexFrontendDir "RELEASE-MANIFEST.txt"
  $noIndexFrontendChecksumFile = Join-Path $noIndexFrontendDir "SHA256SUMS.txt"
  Copy-Item -LiteralPath $goodBackend -Destination $noIndexFrontendBackend -Force
  Set-Content -Encoding ASCII -LiteralPath (Join-Path $noIndexZipSource "not-index.html") -Value "<!doctype html><title>wrong</title>"
  Compress-Archive -Path (Join-Path $noIndexZipSource "*") -DestinationPath $noIndexFrontendArtifact -Force
  Copy-Item -LiteralPath $extensionArtifact -Destination $noIndexFrontendExtension -Force
  @(
    "release_id=previous",
    "generated_at=2026-06-30T00:00:00.0000000+09:00",
    "git_branch=main",
    "git_commit=0123456789abcdef0123456789abcdef01234567",
    "git_worktree=clean",
    "backend_jar=$backendName",
    "frontend_zip=$frontendName",
    "extension_zip=$extensionName"
  ) | Set-Content -Encoding ASCII -LiteralPath $noIndexFrontendManifest
  Write-ChecksumLine -File $noIndexFrontendBackend -OutputFile $noIndexFrontendChecksumFile
  Write-ChecksumLine -File $noIndexFrontendArtifact -OutputFile $noIndexFrontendChecksumFile
  Write-ChecksumLine -File $noIndexFrontendExtension -OutputFile $noIndexFrontendChecksumFile
  Write-ChecksumLine -File $noIndexFrontendManifest -OutputFile $noIndexFrontendChecksumFile

  $noIndexFrontendExit = Invoke-Rollback `
    -Bash $bash `
    -BackendArtifact $noIndexFrontendBackend `
    -FrontendArtifact $noIndexFrontendArtifact `
    -ExtensionArtifact $noIndexFrontendExtension `
    -ReleaseManifest $noIndexFrontendManifest `
    -ChecksumFile $noIndexFrontendChecksumFile `
    -BackendTarget (Join-Path $backendDir "app.jar") `
    -FrontendTarget $frontendTarget

  if ($noIndexFrontendExit.ExitCode -eq 0 -or $noIndexFrontendExit.Output -notmatch "Frontend artifact must contain index.html") {
    throw "rollback-ec2-release.sh accepted a frontend zip without index.html: $($noIndexFrontendExit.Output)"
  }

  $badExtensionDir = Join-Path $tempRoot "bad-extension"
  New-Item -ItemType Directory -Force -Path $badExtensionDir | Out-Null
  $badExtensionBackend = Join-Path $badExtensionDir $backendName
  $badExtensionFrontend = Join-Path $badExtensionDir $frontendName
  $badExtensionArtifact = Join-Path $badExtensionDir $extensionName
  $badExtensionManifest = Join-Path $badExtensionDir "RELEASE-MANIFEST.txt"
  $badExtensionChecksumFile = Join-Path $badExtensionDir "SHA256SUMS.txt"
  Copy-Item -LiteralPath $goodBackend -Destination $badExtensionBackend -Force
  Copy-Item -LiteralPath $frontendArtifact -Destination $badExtensionFrontend -Force
  Set-Content -Encoding ASCII -LiteralPath $badExtensionArtifact -Value "not a zip"
  @(
    "release_id=previous",
    "generated_at=2026-06-30T00:00:00.0000000+09:00",
    "git_branch=main",
    "git_commit=0123456789abcdef0123456789abcdef01234567",
    "git_worktree=clean",
    "backend_jar=$backendName",
    "frontend_zip=$frontendName",
    "extension_zip=$extensionName"
  ) | Set-Content -Encoding ASCII -LiteralPath $badExtensionManifest
  Write-ChecksumLine -File $badExtensionBackend -OutputFile $badExtensionChecksumFile
  Write-ChecksumLine -File $badExtensionFrontend -OutputFile $badExtensionChecksumFile
  Write-ChecksumLine -File $badExtensionArtifact -OutputFile $badExtensionChecksumFile
  Write-ChecksumLine -File $badExtensionManifest -OutputFile $badExtensionChecksumFile

  $badExtensionExit = Invoke-Rollback `
    -Bash $bash `
    -BackendArtifact $badExtensionBackend `
    -FrontendArtifact $badExtensionFrontend `
    -ExtensionArtifact $badExtensionArtifact `
    -ReleaseManifest $badExtensionManifest `
    -ChecksumFile $badExtensionChecksumFile `
    -BackendTarget (Join-Path $backendDir "app.jar") `
    -FrontendTarget $frontendTarget

  if ($badExtensionExit.ExitCode -eq 0 -or $badExtensionExit.Output -notmatch "Extension artifact must be a valid zip") {
    throw "rollback-ec2-release.sh accepted an invalid extension zip artifact: $($badExtensionExit.Output)"
  }

  $noManifestExtensionDir = Join-Path $tempRoot "no-manifest-extension"
  New-Item -ItemType Directory -Force -Path $noManifestExtensionDir | Out-Null
  $noManifestExtensionBackend = Join-Path $noManifestExtensionDir $backendName
  $noManifestExtensionFrontend = Join-Path $noManifestExtensionDir $frontendName
  $noManifestExtensionArtifact = Join-Path $noManifestExtensionDir $extensionName
  $noManifestExtensionManifest = Join-Path $noManifestExtensionDir "RELEASE-MANIFEST.txt"
  $noManifestExtensionChecksumFile = Join-Path $noManifestExtensionDir "SHA256SUMS.txt"
  Copy-Item -LiteralPath $goodBackend -Destination $noManifestExtensionBackend -Force
  Copy-Item -LiteralPath $frontendArtifact -Destination $noManifestExtensionFrontend -Force
  Set-Content -Encoding ASCII -LiteralPath (Join-Path $noManifestExtensionZipSource "not-manifest.json") -Value '{"manifest_version":3}'
  Compress-Archive -Path (Join-Path $noManifestExtensionZipSource "*") -DestinationPath $noManifestExtensionArtifact -Force
  @(
    "release_id=previous",
    "generated_at=2026-06-30T00:00:00.0000000+09:00",
    "git_branch=main",
    "git_commit=0123456789abcdef0123456789abcdef01234567",
    "git_worktree=clean",
    "backend_jar=$backendName",
    "frontend_zip=$frontendName",
    "extension_zip=$extensionName"
  ) | Set-Content -Encoding ASCII -LiteralPath $noManifestExtensionManifest
  Write-ChecksumLine -File $noManifestExtensionBackend -OutputFile $noManifestExtensionChecksumFile
  Write-ChecksumLine -File $noManifestExtensionFrontend -OutputFile $noManifestExtensionChecksumFile
  Write-ChecksumLine -File $noManifestExtensionArtifact -OutputFile $noManifestExtensionChecksumFile
  Write-ChecksumLine -File $noManifestExtensionManifest -OutputFile $noManifestExtensionChecksumFile

  $noManifestExtensionExit = Invoke-Rollback `
    -Bash $bash `
    -BackendArtifact $noManifestExtensionBackend `
    -FrontendArtifact $noManifestExtensionFrontend `
    -ExtensionArtifact $noManifestExtensionArtifact `
    -ReleaseManifest $noManifestExtensionManifest `
    -ChecksumFile $noManifestExtensionChecksumFile `
    -BackendTarget (Join-Path $backendDir "app.jar") `
    -FrontendTarget $frontendTarget

  if ($noManifestExtensionExit.ExitCode -eq 0 -or $noManifestExtensionExit.Output -notmatch "Extension artifact must contain manifest.json") {
    throw "rollback-ec2-release.sh accepted an extension zip without manifest.json: $($noManifestExtensionExit.Output)"
  }

  $goodExit = Invoke-Rollback `
    -Bash $bash `
    -BackendArtifact $goodBackend `
    -FrontendArtifact $frontendArtifact `
    -ExtensionArtifact $extensionArtifact `
    -ReleaseManifest $releaseManifest `
    -ChecksumFile $checksumFile `
    -BackendTarget (Join-Path $backendDir "app.jar") `
    -FrontendTarget $frontendTarget

  if ($goodExit.ExitCode -ne 0) {
    throw "rollback-ec2-release.sh rejected artifacts that match SHA256SUMS.txt: $($goodExit.Output)"
  }
  if ($goodExit.Output -notmatch 'SHA256SUMS verified') {
    throw "rollback-ec2-release.sh did not report checksum verification."
  }

  Write-Host "[PASS] rollback checksum contract test passed."
} finally {
  Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
}
