[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$scriptPath = Join-Path $PSScriptRoot "package-release-artifacts.ps1"
$source = Get-Content -Raw -Encoding UTF8 -LiteralPath $scriptPath
$readableActionLabel = "EZ-ONE " + [string][char]0xC5F4 + [string][char]0xAE30

function Assert-Contains {
  param(
    [string]$Text,
    [string]$Pattern,
    [string]$Message
  )

  if (-not $Text.Contains($Pattern)) {
    throw $Message
  }
}

Assert-Contains $source '$FrontendEnvFile' "package-release-artifacts.ps1 must accept -FrontendEnvFile."
Assert-Contains $source '$ExtensionEnvFile' "package-release-artifacts.ps1 must accept -ExtensionEnvFile."
Assert-Contains $source 'check-client-prod-env.ps1' "package-release-artifacts.ps1 must validate client production env files before packaging."
Assert-Contains $source 'Invoke-WithClientEnv' "package-release-artifacts.ps1 must run client builds with scoped env injection."
Assert-Contains $source 'A single space reliably overrides local' "package-release-artifacts.ps1 must ensure empty production client env values override local .env files during Vite builds."
Assert-Contains $source 'Assert-ExtensionDistProductionManifest' "package-release-artifacts.ps1 must validate extension dist manifest before packaging."
Assert-Contains $source 'Extension production artifact manifest must not contain local, plain HTTP, wildcard, or broad extension permissions' "package-release-artifacts.ps1 must reject local or broad extension production manifest permissions."
Assert-Contains $source 'Assert-DistHasNoLocalRuntimeUrls' "package-release-artifacts.ps1 must scan frontend and extension dist files before packaging."
Assert-Contains $source 'production artifact contains local runtime URL' "package-release-artifacts.ps1 must reject dist bundles that contain local runtime URLs."
Assert-Contains $source 'Compress-DirectoryPortableZip' "package-release-artifacts.ps1 must create Linux-portable zip entries instead of Windows backslash entries."
Assert-Contains $source 'Assert-FrontendDistEntryPoint' "package-release-artifacts.ps1 must verify the frontend dist SPA entrypoint before packaging."
Assert-Contains $source 'Assert-BackendJarArtifact' "package-release-artifacts.ps1 must verify the backend JAR before packaging."
Assert-Contains $source 'Backend JAR must be a valid executable jar' "package-release-artifacts.ps1 must reject invalid backend JAR files before packaging."
Assert-Contains $source 'Backend JAR must contain BOOT-INF' "package-release-artifacts.ps1 must reject non-executable backend JAR files before packaging."
Assert-Contains $source $readableActionLabel "package-release-artifacts.ps1 must preserve the readable Korean extension action label."

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("ez-one-package-test-" + [Guid]::NewGuid().ToString("N"))
$frontendEnv = Join-Path $tempRoot "frontend.prod.env"
$extensionEnv = Join-Path $tempRoot "extension.prod.env"
$outputDir = Join-Path $tempRoot "release-artifacts"
$releaseId = "client-env-smoke"
$extensionDist = Join-Path $repoRoot "extension\dist"
$extensionDistBackup = Join-Path $tempRoot "extension-dist-original"
$extensionDistManifest = Join-Path $extensionDist "manifest.json"
$extensionProductionManifest = Join-Path $repoRoot "extension\public\manifest.json"
$extensionLocalManifest = Join-Path $repoRoot "extension\manifests\local.json"
$extensionTestBundle = Join-Path $extensionDist "assets\package-contract-clean.js"
$frontendDist = Join-Path $repoRoot "frontend\dist"
$frontendDistBackup = Join-Path $tempRoot "frontend-dist-original"
$frontendTestBundle = Join-Path $frontendDist "assets\package-contract-clean.js"
$backendTarget = Join-Path $repoRoot "backend\target"
$invalidBackendJar = Join-Path $backendTarget "zz-package-contract-invalid.jar"
$hadExtensionDist = Test-Path -LiteralPath $extensionDist
$hadFrontendDist = Test-Path -LiteralPath $frontendDist

New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null

try {
  if ($hadExtensionDist) {
    Move-Item -LiteralPath $extensionDist -Destination $extensionDistBackup
  }
  if ($hadFrontendDist) {
    Move-Item -LiteralPath $frontendDist -Destination $frontendDistBackup
  }

  New-Item -ItemType Directory -Force -Path $extensionDist | Out-Null
  New-Item -ItemType Directory -Force -Path (Join-Path $extensionDist "assets") | Out-Null
  New-Item -ItemType Directory -Force -Path (Join-Path $frontendDist "assets") | Out-Null
  Set-Content -Encoding ASCII -LiteralPath (Join-Path $frontendDist "index.html") -Value '<div id="app"></div>'

  @(
    "VITE_API_BASE_URL=https://app.example.com/api",
    "VITE_API_FALLBACK_BASE_URLS=https://fallback.example.com/api",
    "VITE_EXTENSION_INSTALL_URL=https://chromewebstore.google.com/detail/ez-one-job-saver/oamnhdoaefndncadifgaidefcjaomgdo",
    "VITE_EXTENSION_ID=oamnhdoaefndncadifgaidefcjaomgdo",
    "VITE_GOOGLE_CLIENT_ID=1234567890-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com",
    "VITE_GOOGLE_REDIRECT_URI=https://app.example.com/login/callback",
    "VITE_NOTION_CLIENT_ID=notionprod_7d2f3a4b5c6d7e8f90123456789abcdef",
    "VITE_NOTION_REDIRECT_URI=https://app.example.com/mypage/notion"
  ) | Set-Content -Encoding ASCII -LiteralPath $frontendEnv

  @(
    "VITE_EXTENSION_API_BASE_URL=https://app.example.com/api",
    "VITE_EXTENSION_API_FALLBACK_BASE_URLS=https://fallback.example.com/api",
    "VITE_EXTENSION_WEB_APP_URL=https://app.example.com"
  ) | Set-Content -Encoding ASCII -LiteralPath $extensionEnv

  Copy-Item -LiteralPath $extensionLocalManifest -Destination $extensionDistManifest -Force
  Set-Content -Encoding ASCII -LiteralPath $extensionTestBundle -Value "const api = 'https://app.example.com/api';"
  Set-Content -Encoding ASCII -LiteralPath $frontendTestBundle -Value "const api = 'https://app.example.com/api';"
  try {
    & $scriptPath `
      -ReleaseId "$releaseId-localdev-rejected" `
      -OutputDirectory (Join-Path $tempRoot "localdev-release-artifacts") `
      -SkipBuild `
      -AllowDirty `
      -FrontendEnvFile $frontendEnv `
      -ExtensionEnvFile $extensionEnv

    throw "package-release-artifacts.ps1 accepted a local-dev extension manifest for a production artifact."
  } catch {
    if ($_.Exception.Message -notmatch "Extension production artifact manifest must not contain local, plain HTTP, wildcard, or broad extension permissions") {
      throw
    }
  }

  Copy-Item -LiteralPath $extensionProductionManifest -Destination $extensionDistManifest -Force
  Set-Content -Encoding ASCII -LiteralPath $extensionTestBundle -Value "const api = 'http://localhost:8080/api';"
  try {
    & $scriptPath `
      -ReleaseId "$releaseId-local-url-rejected" `
      -OutputDirectory (Join-Path $tempRoot "local-url-release-artifacts") `
      -SkipBuild `
      -AllowDirty `
      -FrontendEnvFile $frontendEnv `
      -ExtensionEnvFile $extensionEnv

    throw "package-release-artifacts.ps1 accepted an extension bundle with a local runtime URL."
  } catch {
    if ($_.Exception.Message -notmatch "production artifact contains local runtime URL") {
      throw
    }
  }

  $manifestWithBrokenLabel = Get-Content -Raw -Encoding UTF8 -LiteralPath $extensionProductionManifest | ConvertFrom-Json
  $manifestWithBrokenLabel.action.default_title = "EZ-ONE BROKEN"
  $manifestWithBrokenLabel | ConvertTo-Json -Depth 20 | Set-Content -Encoding UTF8 -LiteralPath $extensionDistManifest
  Set-Content -Encoding ASCII -LiteralPath $extensionTestBundle -Value "const api = 'https://app.example.com/api';"
  try {
    & $scriptPath `
      -ReleaseId "$releaseId-broken-label-rejected" `
      -OutputDirectory (Join-Path $tempRoot "broken-label-release-artifacts") `
      -SkipBuild `
      -AllowDirty `
      -FrontendEnvFile $frontendEnv `
      -ExtensionEnvFile $extensionEnv

    throw "package-release-artifacts.ps1 accepted an extension manifest with an unreadable action label."
  } catch {
    if ($_.Exception.Message -notmatch "Extension production browser action label must remain readable") {
      throw
    }
  }

  Copy-Item -LiteralPath $extensionProductionManifest -Destination $extensionDistManifest -Force
  Set-Content -Encoding ASCII -LiteralPath $extensionTestBundle -Value "const api = 'https://app.example.com/api';"
  Remove-Item -LiteralPath (Join-Path $frontendDist "index.html") -Force
  try {
    & $scriptPath `
      -ReleaseId "$releaseId-missing-frontend-index-rejected" `
      -OutputDirectory (Join-Path $tempRoot "missing-frontend-index-release-artifacts") `
      -SkipBuild `
      -AllowDirty `
      -FrontendEnvFile $frontendEnv `
      -ExtensionEnvFile $extensionEnv

    throw "package-release-artifacts.ps1 accepted a frontend dist without index.html."
  } catch {
    if ($_.Exception.Message -notmatch "Frontend dist must contain index.html") {
      throw
    }
  }
  Set-Content -Encoding ASCII -LiteralPath (Join-Path $frontendDist "index.html") -Value '<div id="app"></div>'

  New-Item -ItemType Directory -Force -Path $backendTarget | Out-Null
  Set-Content -Encoding ASCII -LiteralPath $invalidBackendJar -Value "not a jar"
  try {
    & $scriptPath `
      -ReleaseId "$releaseId-invalid-backend-jar-rejected" `
      -OutputDirectory (Join-Path $tempRoot "invalid-backend-jar-release-artifacts") `
      -SkipBuild `
      -AllowDirty `
      -FrontendEnvFile $frontendEnv `
      -ExtensionEnvFile $extensionEnv

    throw "package-release-artifacts.ps1 accepted an invalid backend JAR."
  } catch {
    if ($_.Exception.Message -notmatch "Backend JAR must be a valid executable jar") {
      throw
    }
  } finally {
    Remove-Item -LiteralPath $invalidBackendJar -Force -ErrorAction SilentlyContinue
  }

  Copy-Item -LiteralPath $extensionProductionManifest -Destination $extensionDistManifest -Force
  Set-Content -Encoding ASCII -LiteralPath $extensionTestBundle -Value "const api = 'https://app.example.com/api';"
  try {
    & $scriptPath `
      -ReleaseId "$releaseId-skipbuild-env-required" `
      -OutputDirectory (Join-Path $tempRoot "missing-env-release-artifacts") `
      -SkipBuild `
      -AllowDirty

    throw "package-release-artifacts.ps1 accepted SkipBuild packaging without production client env files."
  } catch {
    if ($_.Exception.Message -notmatch "Production artifact packaging requires -FrontendEnvFile and -ExtensionEnvFile") {
      throw
    }
  }

  $packageOutput = & $scriptPath `
    -ReleaseId $releaseId `
    -OutputDirectory $outputDir `
    -SkipBuild `
    -AllowDirty `
    -FrontendEnvFile $frontendEnv `
    -ExtensionEnvFile $extensionEnv 2>&1

  if ($LASTEXITCODE -ne 0) {
    throw "package-release-artifacts.ps1 failed with exit code $LASTEXITCODE. Output: $($packageOutput -join "`n")"
  }

  $hashPath = Join-Path $outputDir "$releaseId\SHA256SUMS.txt"
  if (-not (Test-Path -LiteralPath $hashPath)) {
    throw "Package script did not write SHA256SUMS.txt."
  }
  foreach ($zipName in @("ez-one-frontend-$releaseId.zip", "ez-one-extension-$releaseId.zip")) {
    $zipPath = Join-Path $outputDir "$releaseId\$zipName"
    $archive = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
    try {
      $backslashEntry = $archive.Entries | Where-Object { $_.FullName.Contains("\") } | Select-Object -First 1
      if ($backslashEntry) {
        throw "$zipName contains a Windows backslash zip entry: $($backslashEntry.FullName)"
      }
    } finally {
      $archive.Dispose()
    }
  }
  $releaseRoot = Join-Path $outputDir $releaseId
  $packageOutputText = ($packageOutput | ForEach-Object { $_.ToString() }) -join "`n"
  Assert-Contains $packageOutputText ".\scripts\update-release-evidence.ps1 -EvidenceFile" "package-release-artifacts.ps1 must print the next evidence import command."
  Assert-Contains $packageOutputText "-ArtifactDirectory `"$releaseRoot`"" "package-release-artifacts.ps1 must point the next evidence import command at the generated artifact directory."

  Write-Host "[PASS] package-release-artifacts.ps1 client env contract test passed."
} finally {
  Remove-Item -LiteralPath $invalidBackendJar -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $extensionDist -Recurse -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $frontendDist -Recurse -Force -ErrorAction SilentlyContinue
  if ($hadExtensionDist -and (Test-Path -LiteralPath $extensionDistBackup)) {
    Move-Item -LiteralPath $extensionDistBackup -Destination $extensionDist
  }
  if ($hadFrontendDist -and (Test-Path -LiteralPath $frontendDistBackup)) {
    Move-Item -LiteralPath $frontendDistBackup -Destination $frontendDist
  }
  Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
}
