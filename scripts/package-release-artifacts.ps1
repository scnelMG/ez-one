[CmdletBinding()]
param(
  [string]$ReleaseId = "",

  [string]$OutputDirectory = ".\release-artifacts",

  [string]$BackendEnvFile = "",

  [string]$FrontendEnvFile = "",

  [string]$ExtensionEnvFile = "",

  [switch]$SkipBuild,

  [switch]$AllowDirty
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

# SIZE_OK: Single-purpose release packaging orchestrator; split after release workflow stabilizes. Todo 6 delta is backend env validation/redacted logging only.
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$backendDir = Join-Path $repoRoot "backend"
$frontendDir = Join-Path $repoRoot "frontend"
$extensionDir = Join-Path $repoRoot "extension"
$clientEnvCheckScript = Join-Path $PSScriptRoot "check-client-prod-env.ps1"
$backendEnvCheckScript = Join-Path $PSScriptRoot "check-prod-env.ps1"

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

if ([string]::IsNullOrWhiteSpace($ReleaseId)) {
  $ReleaseId = Get-Date -Format "yyyyMMdd_HHmmss"
}

if ($ReleaseId -notmatch "^[A-Za-z0-9_.-]+$") {
  throw "ReleaseId may contain only letters, numbers, dot, underscore, and dash."
}

function Invoke-CheckedCommand {
  param(
    [string]$WorkingDirectory,
    [string]$Command,
    [string[]]$Arguments
  )

  Push-Location $WorkingDirectory
  try {
    Write-Host "[RUN] $Command $($Arguments -join ' ')"
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
      throw "$Command failed with exit code $LASTEXITCODE"
    }
  } finally {
    Pop-Location
  }
}

function Read-ClientEnvFile {
  param([string]$Path)

  $resolvedPath = Resolve-Path $Path
  $values = [ordered]@{}
  $duplicates = New-Object System.Collections.Generic.List[string]

  foreach ($line in Get-Content -LiteralPath $resolvedPath) {
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
    if ($values.Contains($key)) {
      $duplicates.Add($key)
    }
    $values[$key] = $value
  }

  if ($duplicates.Count -gt 0) {
    throw "Duplicate env keys are not allowed in ${resolvedPath}: $($duplicates -join ', ')"
  }

  return $values
}

function Invoke-ClientEnvPolicyCheck {
  param(
    [string]$FrontendPath,
    [string]$ExtensionPath
  )

  $arguments = @()
  if (-not [string]::IsNullOrWhiteSpace($FrontendPath)) {
    $arguments += @("-FrontendEnvFile", $FrontendPath)
  }
  if (-not [string]::IsNullOrWhiteSpace($ExtensionPath)) {
    $arguments += @("-ExtensionEnvFile", $ExtensionPath)
  }
  if ($arguments.Count -eq 0) {
    return
  }

  Write-Host "[RUN] powershell -NoProfile -ExecutionPolicy Bypass -File $clientEnvCheckScript $($arguments -join ' ')"
  & powershell -NoProfile -ExecutionPolicy Bypass -File $clientEnvCheckScript @arguments
  if ($LASTEXITCODE -ne 0) {
    throw "check-client-prod-env.ps1 failed with exit code $LASTEXITCODE"
  }
}

function Invoke-BackendEnvPolicyCheck {
  param([string]$BackendPath)

  if ([string]::IsNullOrWhiteSpace($BackendPath)) {
    return
  }

  Write-Host "[RUN] powershell -NoProfile -ExecutionPolicy Bypass -File $backendEnvCheckScript -EnvFile <redacted-backend-env>"
  & powershell -NoProfile -ExecutionPolicy Bypass -File $backendEnvCheckScript -EnvFile $BackendPath
  if ($LASTEXITCODE -ne 0) {
    throw "check-prod-env.ps1 failed with exit code $LASTEXITCODE"
  }
}

function Invoke-WithClientEnv {
  param(
    [string]$EnvFile,
    [string]$WorkingDirectory,
    [string]$Command,
    [string[]]$Arguments
  )

  $values = Read-ClientEnvFile $EnvFile
  $previousValues = @{}
  foreach ($key in $values.Keys) {
    $previousValues[$key] = [pscustomobject]@{
      Exists = Test-Path -LiteralPath "Env:$key"
      Value = [System.Environment]::GetEnvironmentVariable($key, "Process")
    }
    $processValue = $values[$key]
    if ([string]::IsNullOrEmpty($processValue)) {
      # Vite also reads local .env files. A single space reliably overrides local
      # development values while existing client normalizers trim it back to empty.
      $processValue = " "
    }
    [System.Environment]::SetEnvironmentVariable($key, $processValue, "Process")
  }

  try {
    Invoke-CheckedCommand -WorkingDirectory $WorkingDirectory -Command $Command -Arguments $Arguments
  } finally {
    foreach ($key in $previousValues.Keys) {
      if ($previousValues[$key].Exists) {
        [System.Environment]::SetEnvironmentVariable($key, $previousValues[$key].Value, "Process")
      } else {
        [System.Environment]::SetEnvironmentVariable($key, $null, "Process")
      }
    }
  }
}

function Assert-CleanWorktree {
  Push-Location $repoRoot
  try {
    $status = git status --porcelain
    if ($LASTEXITCODE -ne 0) {
      throw "git status failed with exit code $LASTEXITCODE"
    }
    if ($status -and -not $AllowDirty) {
      throw "Worktree has uncommitted changes. Commit first or use -AllowDirty only for rehearsal artifacts."
    }
  } finally {
    Pop-Location
  }
}

function Get-GitValue {
  param([string[]]$Arguments)

  Push-Location $repoRoot
  try {
    $value = git @Arguments
    if ($LASTEXITCODE -ne 0) {
      return ""
    }
    return ($value | Select-Object -First 1)
  } finally {
    Pop-Location
  }
}

function Assert-ExtensionDistProductionManifest {
  param([string]$ManifestPath)

  if (-not (Test-Path -LiteralPath $ManifestPath)) {
    throw "Extension dist manifest was not found. Run extension production build first."
  }

  try {
    $manifest = Get-Content -Raw -LiteralPath $ManifestPath | ConvertFrom-Json
  } catch {
    throw "Extension dist manifest must be valid JSON: $($_.Exception.Message)"
  }

  $hostPermissions = @($manifest.host_permissions)
  $externalMatches = @()
  if ($manifest.externally_connectable -and $manifest.externally_connectable.matches) {
    $externalMatches = @($manifest.externally_connectable.matches)
  }
  $webAccessibleMatches = @()
  if ($manifest.web_accessible_resources) {
    $webAccessibleMatches = @($manifest.web_accessible_resources | ForEach-Object { @($_.matches) })
  }
  $contentScriptMatches = @()
  if ($manifest.content_scripts) {
    $contentScriptMatches = @($manifest.content_scripts | ForEach-Object { @($_.matches) })
  }

  $allMatches = @($hostPermissions + $externalMatches + $webAccessibleMatches + $contentScriptMatches)
  foreach ($value in $allMatches) {
    if ($value -match "^http://|localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0|<all_urls>|chrome-extension://\*") {
      throw "Extension production artifact manifest must not contain local, plain HTTP, wildcard, or broad extension permissions: $value"
    }
  }

  foreach ($value in $externalMatches) {
    if ($value -notmatch "^https://") {
      throw "Extension production externally_connectable matches must use HTTPS: $value"
    }
  }

  foreach ($value in $webAccessibleMatches) {
    if ($value -in @("http://*/*", "https://*/*")) {
      throw "Extension production web_accessible_resources matches must not be broad: $value"
    }
  }

  if ($manifest.action.default_title -ne "EZ-ONE 열기") {
    throw "Extension production browser action label must remain readable."
  }
}

function Assert-DistHasNoLocalRuntimeUrls {
  param(
    [string]$DistPath,
    [string]$Name
  )

  if (-not (Test-Path -LiteralPath $DistPath)) {
    throw "$Name dist directory was not found."
  }

  $patterns = @(
    "localhost:8080",
    "localhost:8081",
    "localhost:5173",
    "127.0.0.1:8080",
    "127.0.0.1:8081",
    "127.0.0.1:5173",
    "[::1]:8080",
    "[::1]:8081",
    "[::1]:5173",
    "0.0.0.0:8080",
    "0.0.0.0:8081",
    "0.0.0.0:5173"
  )

  $files = Get-ChildItem -LiteralPath $DistPath -Recurse -File |
    Where-Object { $_.Extension -in @(".html", ".js", ".css", ".json") }

  foreach ($file in $files) {
    $text = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
    foreach ($pattern in $patterns) {
      if ($text.Contains($pattern)) {
        $relativePath = Resolve-Path -LiteralPath $file.FullName -Relative
        throw "$Name production artifact contains local runtime URL '$pattern' in $relativePath. Rebuild with the production env file before packaging."
      }
    }
  }
}

function Assert-FrontendDistEntryPoint {
  param([string]$DistPath)

  $indexPath = Join-Path $DistPath "index.html"
  if (-not (Test-Path -LiteralPath $indexPath)) {
    throw "Frontend dist must contain index.html. Run frontend production build before packaging."
  }
}

function Assert-BackendJarArtifact {
  param([string]$JarPath)

  try {
    $archive = [System.IO.Compression.ZipFile]::OpenRead($JarPath)
  } catch {
    throw "Backend JAR must be a valid executable jar. Run backend Maven package before packaging."
  }

  try {
    $hasBootInf = $false
    foreach ($entry in $archive.Entries) {
      if ($entry.FullName -match '^BOOT-INF[\\/]') {
        $hasBootInf = $true
        break
      }
    }
    if (-not $hasBootInf) {
      throw "Backend JAR must contain BOOT-INF. Run backend Maven package before packaging."
    }
  } finally {
    $archive.Dispose()
  }
}

function Compress-DirectoryPortableZip {
  param(
    [string]$SourceDirectory,
    [string]$DestinationPath
  )

  if (Test-Path -LiteralPath $DestinationPath) {
    Remove-Item -LiteralPath $DestinationPath -Force
  }

  $sourceRoot = (Resolve-Path -LiteralPath $SourceDirectory).Path.TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)
  $sourcePrefix = $sourceRoot + [System.IO.Path]::DirectorySeparatorChar
  $archive = [System.IO.Compression.ZipFile]::Open($DestinationPath, [System.IO.Compression.ZipArchiveMode]::Create)
  try {
    $files = Get-ChildItem -LiteralPath $SourceDirectory -Recurse -File
    foreach ($file in $files) {
      $relativePath = $file.FullName.Substring($sourcePrefix.Length)
      $entryName = $relativePath.Replace([System.IO.Path]::DirectorySeparatorChar, "/").Replace([System.IO.Path]::AltDirectorySeparatorChar, "/")
      [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $file.FullName, $entryName, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
  } finally {
    $archive.Dispose()
  }
}

Assert-CleanWorktree

if ([string]::IsNullOrWhiteSpace($FrontendEnvFile) -or [string]::IsNullOrWhiteSpace($ExtensionEnvFile)) {
  throw "Production artifact packaging requires -FrontendEnvFile and -ExtensionEnvFile so local .env values cannot leak into release bundles."
}

Invoke-BackendEnvPolicyCheck -BackendPath $BackendEnvFile
Invoke-ClientEnvPolicyCheck -FrontendPath $FrontendEnvFile -ExtensionPath $ExtensionEnvFile

if (-not $SkipBuild) {
  Invoke-CheckedCommand -WorkingDirectory $backendDir -Command ".\mvnw.cmd" -Arguments @("-DskipTests", "package")
  Invoke-WithClientEnv -EnvFile $FrontendEnvFile -WorkingDirectory $frontendDir -Command "npm" -Arguments @("run", "build")
  Invoke-WithClientEnv -EnvFile $ExtensionEnvFile -WorkingDirectory $extensionDir -Command "npm" -Arguments @("run", "build")
}

$backendJar = Get-ChildItem -LiteralPath (Join-Path $backendDir "target") -Filter "*.jar" |
  Where-Object { $_.Name -notlike "*.original" } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1
if (-not $backendJar) {
  throw "Backend JAR was not found under backend/target."
}
Assert-BackendJarArtifact -JarPath $backendJar.FullName

$frontendDist = Join-Path $frontendDir "dist"
$extensionDist = Join-Path $extensionDir "dist"
if (-not (Test-Path -LiteralPath $frontendDist)) {
  throw "Frontend dist directory was not found. Run frontend build first."
}
if (-not (Test-Path -LiteralPath $extensionDist)) {
  throw "Extension dist directory was not found. Run extension build first."
}
Assert-FrontendDistEntryPoint -DistPath $frontendDist
Assert-ExtensionDistProductionManifest -ManifestPath (Join-Path $extensionDist "manifest.json")
Assert-DistHasNoLocalRuntimeUrls -DistPath $frontendDist -Name "Frontend"
Assert-DistHasNoLocalRuntimeUrls -DistPath $extensionDist -Name "Extension"

$releaseRoot = New-Item -ItemType Directory -Force -Path (Join-Path $OutputDirectory $ReleaseId)
$backendArtifact = Join-Path $releaseRoot.FullName "ez-one-backend-$ReleaseId.jar"
$frontendArtifact = Join-Path $releaseRoot.FullName "ez-one-frontend-$ReleaseId.zip"
$extensionArtifact = Join-Path $releaseRoot.FullName "ez-one-extension-$ReleaseId.zip"
$manifestPath = Join-Path $releaseRoot.FullName "RELEASE-MANIFEST.txt"
$hashPath = Join-Path $releaseRoot.FullName "SHA256SUMS.txt"

Copy-Item -LiteralPath $backendJar.FullName -Destination $backendArtifact -Force
Compress-DirectoryPortableZip -SourceDirectory $frontendDist -DestinationPath $frontendArtifact
Compress-DirectoryPortableZip -SourceDirectory $extensionDist -DestinationPath $extensionArtifact

$branch = Get-GitValue @("rev-parse", "--abbrev-ref", "HEAD")
$commit = Get-GitValue @("rev-parse", "HEAD")
$status = Get-GitValue @("status", "--porcelain")
$dirtyState = "clean"
if ($status) {
  $dirtyState = "dirty"
}

@(
  "release_id=$ReleaseId",
  "generated_at=$(Get-Date -Format o)",
  "git_branch=$branch",
  "git_commit=$commit",
  "git_worktree=$dirtyState",
  "backend_jar=$([System.IO.Path]::GetFileName($backendArtifact))",
  "frontend_zip=$([System.IO.Path]::GetFileName($frontendArtifact))",
  "extension_zip=$([System.IO.Path]::GetFileName($extensionArtifact))"
) | Set-Content -Encoding ASCII -LiteralPath $manifestPath

$artifacts = @($backendArtifact, $frontendArtifact, $extensionArtifact, $manifestPath)
$hashLines = foreach ($artifact in $artifacts) {
  $hash = Get-FileHash -Algorithm SHA256 -LiteralPath $artifact
  "$($hash.Hash)  $([System.IO.Path]::GetFileName($artifact))"
}
$hashLines | Set-Content -Encoding ASCII -LiteralPath $hashPath

Write-Host "[PASS] Release artifacts written to $($releaseRoot.FullName)"
Write-Host "[PASS] SHA256 manifest written to $hashPath"
Write-Output "[INFO] Import artifact evidence after release-evidence.json exists:"
Write-Output "       .\scripts\update-release-evidence.ps1 -EvidenceFile `"$($releaseRoot.FullName)\release-evidence.json`" -ArtifactDirectory `"$($releaseRoot.FullName)`""
