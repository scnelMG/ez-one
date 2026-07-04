[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$deployScript = Join-Path $repoRoot "scripts\deploy-ec2-release.sh"

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
  throw "No usable Git/MSYS bash found for deploy checksum contract test."
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

  $hash = Get-FileHash -Algorithm SHA256 -LiteralPath $File
  "$($hash.Hash)  $([System.IO.Path]::GetFileName($File))" | Add-Content -Encoding ASCII -LiteralPath $OutputFile
}

function Invoke-Deploy {
  param(
    [string]$Bash,
    [string]$BackendArtifact,
    [string]$FrontendArtifact,
    [string]$ExtensionArtifact,
    [string]$ReleaseManifest,
    [string]$ChecksumFile,
    [string]$BackendTarget,
    [string]$FrontendTarget,
    [string]$ReleaseRoot,
    [string]$BaseUrl = "",
    [string]$ReleaseId = "checksum-smoke"
  )

  $env:RELEASE_ID = $ReleaseId
  $env:RELEASE_ROOT = Convert-ToBashPath $ReleaseRoot
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
    $output = & $Bash (Convert-ToBashPath $deployScript) 2>&1
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
    Remove-Item Env:RELEASE_ID -ErrorAction SilentlyContinue
    Remove-Item Env:RELEASE_ROOT -ErrorAction SilentlyContinue
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
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("ez-one-deploy-checksum-" + [Guid]::NewGuid().ToString("N"))
$incomingDir = Join-Path $tempRoot "incoming"
$alternateDir = Join-Path $tempRoot "alternate"
$backendDir = Join-Path $tempRoot "backend"
$frontendTarget = Join-Path $tempRoot "www"
$backendJarSource = Join-Path $tempRoot "backend-jar-source"
$zipSource = Join-Path $tempRoot "zip-source"
$noIndexZipSource = Join-Path $tempRoot "no-index-zip-source"
$extensionZipSource = Join-Path $tempRoot "extension-zip-source"
$noManifestExtensionZipSource = Join-Path $tempRoot "no-manifest-extension-zip-source"

New-Item -ItemType Directory -Force -Path $incomingDir, $alternateDir, $backendDir, $frontendTarget, $backendJarSource, $zipSource, $noIndexZipSource, $extensionZipSource, $noManifestExtensionZipSource | Out-Null

try {
  $backendName = "ez-one-backend-checksum-smoke.jar"
  $frontendName = "ez-one-frontend-checksum-smoke.zip"
  $extensionName = "ez-one-extension-checksum-smoke.zip"
  $manifestName = "RELEASE-MANIFEST.txt"

  $goodBackend = Join-Path $incomingDir $backendName
  $badBackend = Join-Path $alternateDir $backendName
  $frontendArtifact = Join-Path $incomingDir $frontendName
  $extensionArtifact = Join-Path $incomingDir $extensionName
  $releaseManifest = Join-Path $incomingDir $manifestName
  $checksumFile = Join-Path $incomingDir "SHA256SUMS.txt"
  $extraChecksumDir = Join-Path $tempRoot "extra-checksum"
  $extraChecksumFile = Join-Path $extraChecksumDir "SHA256SUMS.txt"
  $extraFile = Join-Path $incomingDir "unexpected.txt"

  New-Item -ItemType Directory -Force -Path (Join-Path $backendJarSource "BOOT-INF\classes") | Out-Null
  Set-Content -Encoding ASCII -LiteralPath (Join-Path $backendJarSource "BOOT-INF\classes\application.properties") -Value "spring.application.name=ez-one"
  $goodBackendZip = Join-Path $incomingDir "ez-one-backend-checksum-smoke.zip"
  Compress-Archive -Path (Join-Path $backendJarSource "*") -DestinationPath $goodBackendZip -Force
  Move-Item -LiteralPath $goodBackendZip -Destination $goodBackend -Force
  Set-Content -Encoding ASCII -LiteralPath $badBackend -Value "tampered backend"
  Set-Content -Encoding ASCII -LiteralPath (Join-Path $zipSource "index.html") -Value "<!doctype html><title>release</title>"
  Compress-Archive -Path (Join-Path $zipSource "*") -DestinationPath $frontendArtifact -Force
  Set-Content -Encoding ASCII -LiteralPath (Join-Path $extensionZipSource "manifest.json") -Value '{"manifest_version":3,"name":"EZ-ONE","version":"1.0.0"}'
  Compress-Archive -Path (Join-Path $extensionZipSource "*") -DestinationPath $extensionArtifact -Force
  @(
    "release_id=checksum-smoke",
    "generated_at=2026-06-30T00:00:00.0000000+09:00",
    "git_branch=codex/release-readiness-hardening",
    "git_commit=0123456789abcdef0123456789abcdef01234567",
    "git_worktree=clean",
    "backend_jar=$backendName",
    "frontend_zip=$frontendName",
    "extension_zip=$extensionName"
  ) | Set-Content -Encoding ASCII -LiteralPath $releaseManifest
  Set-Content -Encoding ASCII -LiteralPath $extraFile -Value "unexpected"
  New-Item -ItemType Directory -Force -Path $extraChecksumDir | Out-Null

  Write-ChecksumLine -File $goodBackend -OutputFile $checksumFile
  Write-ChecksumLine -File $frontendArtifact -OutputFile $checksumFile
  Write-ChecksumLine -File $extensionArtifact -OutputFile $checksumFile
  Write-ChecksumLine -File $releaseManifest -OutputFile $checksumFile
  Copy-Item -LiteralPath $checksumFile -Destination $extraChecksumFile -Force
  Write-ChecksumLine -File $extraFile -OutputFile $extraChecksumFile

  $badExit = Invoke-Deploy `
    -Bash $bash `
    -BackendArtifact $badBackend `
    -FrontendArtifact $frontendArtifact `
    -ExtensionArtifact $extensionArtifact `
    -ReleaseManifest $releaseManifest `
    -ChecksumFile $checksumFile `
    -BackendTarget (Join-Path $backendDir "app.jar") `
    -FrontendTarget $frontendTarget `
    -ReleaseRoot (Join-Path $tempRoot "releases")

  if ($badExit.ExitCode -eq 0) {
    throw "deploy-ec2-release.sh accepted an artifact path whose content did not match SHA256SUMS.txt."
  }

  $extraExit = Invoke-Deploy `
    -Bash $bash `
    -BackendArtifact $goodBackend `
    -FrontendArtifact $frontendArtifact `
    -ExtensionArtifact $extensionArtifact `
    -ReleaseManifest $releaseManifest `
    -ChecksumFile $extraChecksumFile `
    -BackendTarget (Join-Path $backendDir "app.jar") `
    -FrontendTarget $frontendTarget `
    -ReleaseRoot (Join-Path $tempRoot "releases")

  if ($extraExit.ExitCode -eq 0) {
    throw "deploy-ec2-release.sh accepted SHA256SUMS.txt with an unexpected extra entry."
  }

  $badBaseUrlExit = Invoke-Deploy `
    -Bash $bash `
    -BackendArtifact $goodBackend `
    -FrontendArtifact $frontendArtifact `
    -ExtensionArtifact $extensionArtifact `
    -ReleaseManifest $releaseManifest `
    -ChecksumFile $checksumFile `
    -BackendTarget (Join-Path $backendDir "app.jar") `
    -FrontendTarget $frontendTarget `
    -ReleaseRoot (Join-Path $tempRoot "releases") `
    -BaseUrl "https://ez-one.kr/api"

  if ($badBaseUrlExit.ExitCode -eq 0 -or $badBaseUrlExit.Output -notmatch "BASE_URL must be an HTTPS origin only") {
    throw "deploy-ec2-release.sh accepted BASE_URL with a path: $($badBaseUrlExit.Output)"
  }

  $localBaseUrlExit = Invoke-Deploy `
    -Bash $bash `
    -BackendArtifact $goodBackend `
    -FrontendArtifact $frontendArtifact `
    -ExtensionArtifact $extensionArtifact `
    -ReleaseManifest $releaseManifest `
    -ChecksumFile $checksumFile `
    -BackendTarget (Join-Path $backendDir "app.jar") `
    -FrontendTarget $frontendTarget `
    -ReleaseRoot (Join-Path $tempRoot "releases") `
    -BaseUrl "https://localhost"

  if ($localBaseUrlExit.ExitCode -eq 0 -or $localBaseUrlExit.Output -notmatch "BASE_URL must not use a local host") {
    throw "deploy-ec2-release.sh accepted a local BASE_URL origin: $($localBaseUrlExit.Output)"
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
    "release_id=checksum-smoke",
    "generated_at=2026-06-30T00:00:00.0000000+09:00",
    "git_branch=codex/release-readiness-hardening",
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

  $badBackendJarExit = Invoke-Deploy `
    -Bash $bash `
    -BackendArtifact $badBackendJar `
    -FrontendArtifact $badBackendJarFrontend `
    -ExtensionArtifact $badBackendJarExtension `
    -ReleaseManifest $badBackendJarManifest `
    -ChecksumFile $badBackendJarChecksumFile `
    -BackendTarget (Join-Path $backendDir "app.jar") `
    -FrontendTarget $frontendTarget `
    -ReleaseRoot (Join-Path $tempRoot "releases")

  if ($badBackendJarExit.ExitCode -eq 0 -or $badBackendJarExit.Output -notmatch "Backend artifact must be a valid executable jar") {
    throw "deploy-ec2-release.sh accepted an invalid backend jar artifact: $($badBackendJarExit.Output)"
  }

  $dirtyManifestDir = Join-Path $tempRoot "dirty-manifest"
  New-Item -ItemType Directory -Force -Path $dirtyManifestDir | Out-Null
  $dirtyManifest = Join-Path $dirtyManifestDir "RELEASE-MANIFEST.txt"
  @(
    "release_id=checksum-smoke",
    "generated_at=2026-06-30T00:00:00.0000000+09:00",
    "git_branch=codex/release-readiness-hardening",
    "git_commit=0123456789abcdef0123456789abcdef01234567",
    "git_worktree=dirty",
    "backend_jar=$backendName",
    "frontend_zip=$frontendName",
    "extension_zip=$extensionName"
  ) | Set-Content -Encoding ASCII -LiteralPath $dirtyManifest
  $dirtyChecksumFile = Join-Path $dirtyManifestDir "SHA256SUMS.txt"
  Write-ChecksumLine -File $goodBackend -OutputFile $dirtyChecksumFile
  Write-ChecksumLine -File $frontendArtifact -OutputFile $dirtyChecksumFile
  Write-ChecksumLine -File $extensionArtifact -OutputFile $dirtyChecksumFile
  Write-ChecksumLine -File $dirtyManifest -OutputFile $dirtyChecksumFile

  $dirtyManifestExit = Invoke-Deploy `
    -Bash $bash `
    -BackendArtifact $goodBackend `
    -FrontendArtifact $frontendArtifact `
    -ExtensionArtifact $extensionArtifact `
    -ReleaseManifest $dirtyManifest `
    -ChecksumFile $dirtyChecksumFile `
    -BackendTarget (Join-Path $backendDir "app.jar") `
    -FrontendTarget $frontendTarget `
    -ReleaseRoot (Join-Path $tempRoot "releases")

  if ($dirtyManifestExit.ExitCode -eq 0 -or $dirtyManifestExit.Output -notmatch "git_worktree=dirty") {
    throw "deploy-ec2-release.sh accepted a dirty release manifest: $($dirtyManifestExit.Output)"
  }

  $wrongReleaseDir = Join-Path $tempRoot "wrong-release-id"
  New-Item -ItemType Directory -Force -Path $wrongReleaseDir | Out-Null
  $wrongReleaseBackend = Join-Path $wrongReleaseDir "ez-one-backend-other-release.jar"
  $wrongReleaseFrontend = Join-Path $wrongReleaseDir "ez-one-frontend-other-release.zip"
  $wrongReleaseExtension = Join-Path $wrongReleaseDir "ez-one-extension-other-release.zip"
  $wrongReleaseManifest = Join-Path $wrongReleaseDir "RELEASE-MANIFEST.txt"
  $wrongReleaseChecksum = Join-Path $wrongReleaseDir "SHA256SUMS.txt"
  Copy-Item -LiteralPath $goodBackend -Destination $wrongReleaseBackend -Force
  Copy-Item -LiteralPath $frontendArtifact -Destination $wrongReleaseFrontend -Force
  Copy-Item -LiteralPath $extensionArtifact -Destination $wrongReleaseExtension -Force
  @(
    "release_id=checksum-smoke",
    "generated_at=2026-06-30T00:00:00.0000000+09:00",
    "git_branch=codex/release-readiness-hardening",
    "git_commit=0123456789abcdef0123456789abcdef01234567",
    "git_worktree=clean",
    "backend_jar=$([System.IO.Path]::GetFileName($wrongReleaseBackend))",
    "frontend_zip=$([System.IO.Path]::GetFileName($wrongReleaseFrontend))",
    "extension_zip=$([System.IO.Path]::GetFileName($wrongReleaseExtension))"
  ) | Set-Content -Encoding ASCII -LiteralPath $wrongReleaseManifest
  Write-ChecksumLine -File $wrongReleaseBackend -OutputFile $wrongReleaseChecksum
  Write-ChecksumLine -File $wrongReleaseFrontend -OutputFile $wrongReleaseChecksum
  Write-ChecksumLine -File $wrongReleaseExtension -OutputFile $wrongReleaseChecksum
  Write-ChecksumLine -File $wrongReleaseManifest -OutputFile $wrongReleaseChecksum

  $wrongReleaseIdExit = Invoke-Deploy `
    -Bash $bash `
    -BackendArtifact $wrongReleaseBackend `
    -FrontendArtifact $wrongReleaseFrontend `
    -ExtensionArtifact $wrongReleaseExtension `
    -ReleaseManifest $wrongReleaseManifest `
    -ChecksumFile $wrongReleaseChecksum `
    -BackendTarget (Join-Path $backendDir "app.jar") `
    -FrontendTarget $frontendTarget `
    -ReleaseRoot (Join-Path $tempRoot "releases") `
    -ReleaseId "other-release"

  if ($wrongReleaseIdExit.ExitCode -eq 0 -or $wrongReleaseIdExit.Output -notmatch "release_id") {
    throw "deploy-ec2-release.sh accepted a manifest whose release_id did not match RELEASE_ID: $($wrongReleaseIdExit.Output)"
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
    "release_id=checksum-smoke",
    "generated_at=2026-06-30T00:00:00.0000000+09:00",
    "git_branch=codex/release-readiness-hardening",
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

  $wrongNameExit = Invoke-Deploy `
    -Bash $bash `
    -BackendArtifact $wrongNameBackend `
    -FrontendArtifact $wrongNameFrontend `
    -ExtensionArtifact $wrongNameExtension `
    -ReleaseManifest $wrongNameManifest `
    -ChecksumFile $wrongNameChecksumFile `
    -BackendTarget (Join-Path $backendDir "app.jar") `
    -FrontendTarget $frontendTarget `
    -ReleaseRoot (Join-Path $tempRoot "releases")

  if ($wrongNameExit.ExitCode -eq 0 -or $wrongNameExit.Output -notmatch "backend artifact filename") {
    throw "deploy-ec2-release.sh accepted artifact filenames that do not include RELEASE_ID: $($wrongNameExit.Output)"
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
    "release_id=checksum-smoke",
    "generated_at=2026-06-30T00:00:00.0000000+09:00",
    "git_branch=codex/release-readiness-hardening",
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

  $badFrontendExit = Invoke-Deploy `
    -Bash $bash `
    -BackendArtifact $badFrontendBackend `
    -FrontendArtifact $badFrontendArtifact `
    -ExtensionArtifact $badFrontendExtension `
    -ReleaseManifest $badFrontendManifest `
    -ChecksumFile $badFrontendChecksumFile `
    -BackendTarget (Join-Path $backendDir "app.jar") `
    -FrontendTarget $frontendTarget `
    -ReleaseRoot (Join-Path $tempRoot "releases")

  if ($badFrontendExit.ExitCode -eq 0 -or $badFrontendExit.Output -notmatch "Frontend artifact must be a valid zip") {
    throw "deploy-ec2-release.sh accepted an invalid frontend zip artifact: $($badFrontendExit.Output)"
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
    "release_id=checksum-smoke",
    "generated_at=2026-06-30T00:00:00.0000000+09:00",
    "git_branch=codex/release-readiness-hardening",
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

  $noIndexFrontendExit = Invoke-Deploy `
    -Bash $bash `
    -BackendArtifact $noIndexFrontendBackend `
    -FrontendArtifact $noIndexFrontendArtifact `
    -ExtensionArtifact $noIndexFrontendExtension `
    -ReleaseManifest $noIndexFrontendManifest `
    -ChecksumFile $noIndexFrontendChecksumFile `
    -BackendTarget (Join-Path $backendDir "app.jar") `
    -FrontendTarget $frontendTarget `
    -ReleaseRoot (Join-Path $tempRoot "releases")

  if ($noIndexFrontendExit.ExitCode -eq 0 -or $noIndexFrontendExit.Output -notmatch "Frontend artifact must contain index.html") {
    throw "deploy-ec2-release.sh accepted a frontend zip without index.html: $($noIndexFrontendExit.Output)"
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
    "release_id=checksum-smoke",
    "generated_at=2026-06-30T00:00:00.0000000+09:00",
    "git_branch=codex/release-readiness-hardening",
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

  $badExtensionExit = Invoke-Deploy `
    -Bash $bash `
    -BackendArtifact $badExtensionBackend `
    -FrontendArtifact $badExtensionFrontend `
    -ExtensionArtifact $badExtensionArtifact `
    -ReleaseManifest $badExtensionManifest `
    -ChecksumFile $badExtensionChecksumFile `
    -BackendTarget (Join-Path $backendDir "app.jar") `
    -FrontendTarget $frontendTarget `
    -ReleaseRoot (Join-Path $tempRoot "releases")

  if ($badExtensionExit.ExitCode -eq 0 -or $badExtensionExit.Output -notmatch "Extension artifact must be a valid zip") {
    throw "deploy-ec2-release.sh accepted an invalid extension zip artifact: $($badExtensionExit.Output)"
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
    "release_id=checksum-smoke",
    "generated_at=2026-06-30T00:00:00.0000000+09:00",
    "git_branch=codex/release-readiness-hardening",
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

  $noManifestExtensionExit = Invoke-Deploy `
    -Bash $bash `
    -BackendArtifact $noManifestExtensionBackend `
    -FrontendArtifact $noManifestExtensionFrontend `
    -ExtensionArtifact $noManifestExtensionArtifact `
    -ReleaseManifest $noManifestExtensionManifest `
    -ChecksumFile $noManifestExtensionChecksumFile `
    -BackendTarget (Join-Path $backendDir "app.jar") `
    -FrontendTarget $frontendTarget `
    -ReleaseRoot (Join-Path $tempRoot "releases")

  if ($noManifestExtensionExit.ExitCode -eq 0 -or $noManifestExtensionExit.Output -notmatch "Extension artifact must contain manifest.json") {
    throw "deploy-ec2-release.sh accepted an extension zip without manifest.json: $($noManifestExtensionExit.Output)"
  }

  $goodExit = Invoke-Deploy `
    -Bash $bash `
    -BackendArtifact $goodBackend `
    -FrontendArtifact $frontendArtifact `
    -ExtensionArtifact $extensionArtifact `
    -ReleaseManifest $releaseManifest `
    -ChecksumFile $checksumFile `
    -BackendTarget (Join-Path $backendDir "app.jar") `
    -FrontendTarget $frontendTarget `
    -ReleaseRoot (Join-Path $tempRoot "releases")

  if ($goodExit.ExitCode -ne 0) {
    throw "deploy-ec2-release.sh rejected artifacts that match SHA256SUMS.txt: $($goodExit.Output)"
  }
  if ($goodExit.Output -notmatch 'sudo cp .+SHA256SUMS\.txt .+/SHA256SUMS\.txt') {
    throw "deploy-ec2-release.sh did not archive SHA256SUMS.txt during dry-run."
  }

  Write-Host "[PASS] deploy checksum contract test passed."
} finally {
  Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
}
