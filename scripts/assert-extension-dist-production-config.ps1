[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$DistDir,

  [Parameter(Mandatory = $true)]
  [string]$ExpectedWebOrigin,

  [Parameter(Mandatory = $true)]
  [string]$ExpectedApiBaseUrl,

  [string]$EvidencePath = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$publishedWebStoreVersion = [version]"0.0.2"
$forbiddenPatterns = @(
  "localhost",
  "127.0.0.1",
  "127.0.0.2",
  "[::1]",
  "::1",
  "0.0.0.0",
  "http://",
  "<all_urls>",
  "chrome-extension://*"
)
$evidence = New-Object System.Collections.Generic.List[string]

function Add-EvidenceLine {
  param([string]$Line)

  $evidence.Add($Line) | Out-Null
}

function Write-Evidence {
  if ([string]::IsNullOrWhiteSpace($EvidencePath)) {
    return
  }

  $parent = Split-Path -Parent $EvidencePath
  if (-not [string]::IsNullOrWhiteSpace($parent)) {
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
  }
  $evidence | Set-Content -Encoding ASCII -LiteralPath $EvidencePath
}

function Assert-HttpsOrigin {
  param(
    [string]$Name,
    [string]$Value
  )

  $uri = $null
  if (-not [System.Uri]::TryCreate($Value, [System.UriKind]::Absolute, [ref]$uri)) {
    throw "$Name must be an absolute HTTPS origin."
  }
  if ($uri.Scheme -ne "https") {
    throw "$Name must use HTTPS."
  }
  if ($uri.AbsolutePath -ne "/" -or $uri.Query -or $uri.Fragment) {
    throw "$Name must be an origin without path, query, or fragment."
  }
  if ($Value.EndsWith("/")) {
    throw "$Name must not include a trailing slash."
  }
}

function Assert-HttpsApiBaseUrl {
  param([string]$Value)

  $uri = $null
  if (-not [System.Uri]::TryCreate($Value, [System.UriKind]::Absolute, [ref]$uri)) {
    throw "ExpectedApiBaseUrl must be an absolute HTTPS URL."
  }
  if ($uri.Scheme -ne "https") {
    throw "ExpectedApiBaseUrl must use HTTPS."
  }
  if (-not $uri.AbsolutePath.StartsWith("/api")) {
    throw "ExpectedApiBaseUrl must use an /api path."
  }
}

function Get-RelativePath {
  param(
    [string]$Root,
    [string]$Path
  )

  $rootPath = [System.IO.Path]::GetFullPath($Root).TrimEnd(
    [System.IO.Path]::DirectorySeparatorChar,
    [System.IO.Path]::AltDirectorySeparatorChar
  ) + [System.IO.Path]::DirectorySeparatorChar
  $pathValue = [System.IO.Path]::GetFullPath($Path)
  $rootUri = [System.Uri]$rootPath
  $pathUri = [System.Uri]$pathValue
  return [System.Uri]::UnescapeDataString($rootUri.MakeRelativeUri($pathUri).ToString())
}

try {
  Assert-HttpsOrigin -Name "ExpectedWebOrigin" -Value $ExpectedWebOrigin
  Assert-HttpsApiBaseUrl -Value $ExpectedApiBaseUrl

  $resolvedDist = Resolve-Path -LiteralPath $DistDir
  $manifestPath = Join-Path $resolvedDist "manifest.json"
  if (-not (Test-Path -LiteralPath $manifestPath)) {
    throw "Extension dist manifest was not found at $manifestPath."
  }

  $manifest = Get-Content -Raw -Encoding UTF8 -LiteralPath $manifestPath | ConvertFrom-Json
  if ($manifest.PSObject.Properties.Name -contains "key") {
    throw "Production extension manifest must not include a manifest key."
  }
  $manifestVersion = [version]$manifest.version
  if ($manifestVersion -le $publishedWebStoreVersion) {
    throw "Extension manifest version must be greater than published Chrome Web Store version $publishedWebStoreVersion."
  }

  $expectedExternalMatch = "$ExpectedWebOrigin/*"
  $externalMatches = @()
  if ($manifest.externally_connectable -and $manifest.externally_connectable.matches) {
    $externalMatches = @($manifest.externally_connectable.matches)
  }
  if ($externalMatches.Count -ne 1 -or $externalMatches[0] -ne $expectedExternalMatch) {
    throw "Production extension externally_connectable.matches must be exactly $expectedExternalMatch."
  }

  $scanFiles = @(Get-ChildItem -LiteralPath $resolvedDist -Recurse -File |
    Where-Object { $_.Extension -in @(".html", ".js", ".css", ".json") })
  if ($scanFiles.Count -eq 0) {
    throw "Extension dist scan found no HTML, JS, CSS, or JSON files."
  }

  $webOriginHits = New-Object System.Collections.Generic.List[string]
  $apiBaseHits = New-Object System.Collections.Generic.List[string]
  $forbiddenHits = New-Object System.Collections.Generic.List[string]

  foreach ($file in $scanFiles) {
    $relativePath = Get-RelativePath -Root $resolvedDist -Path $file.FullName
    $text = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
    if ($text.Contains($ExpectedWebOrigin)) {
      $webOriginHits.Add($relativePath) | Out-Null
    }
    if ($text.Contains($ExpectedApiBaseUrl)) {
      $apiBaseHits.Add($relativePath) | Out-Null
    }
    foreach ($pattern in $forbiddenPatterns) {
      if ($text.Contains($pattern)) {
        $forbiddenHits.Add("$relativePath contains $pattern") | Out-Null
      }
    }
  }

  if ($webOriginHits.Count -eq 0) {
    throw "Extension dist does not contain the expected production web origin."
  }
  if ($apiBaseHits.Count -eq 0) {
    throw "Extension dist does not contain the expected production API base URL."
  }
  if ($forbiddenHits.Count -gt 0) {
    throw "Extension dist contains forbidden production runtime values: $($forbiddenHits -join '; ')"
  }

  Add-EvidenceLine "scenario=extension-dist-production-config"
  Add-EvidenceLine "invocation=powershell -ExecutionPolicy Bypass -File .\scripts\assert-extension-dist-production-config.ps1 -DistDir $DistDir -ExpectedWebOrigin $ExpectedWebOrigin -ExpectedApiBaseUrl $ExpectedApiBaseUrl -EvidencePath $EvidencePath"
  Add-EvidenceLine "dist_dir=$($resolvedDist.Path)"
  Add-EvidenceLine "expected_web_origin=$ExpectedWebOrigin"
  Add-EvidenceLine "expected_api_base_url=$ExpectedApiBaseUrl"
  Add-EvidenceLine "manifest_version=$manifestVersion"
  Add-EvidenceLine "published_web_store_version=$publishedWebStoreVersion"
  Add-EvidenceLine "manifest_version_above_published=True"
  Add-EvidenceLine "externally_connectable=$($externalMatches -join ',')"
  Add-EvidenceLine "scanned_file_count=$($scanFiles.Count)"
  Add-EvidenceLine "web_origin_hit_files=$($webOriginHits -join ',')"
  Add-EvidenceLine "api_base_hit_files=$($apiBaseHits -join ',')"
  Add-EvidenceLine "forbidden_hits_count=0"
  Add-EvidenceLine "verdict=PASS"
  Write-Evidence
  Write-Host "[PASS] Extension dist production config scan passed."
} catch {
  Add-EvidenceLine "scenario=extension-dist-production-config"
  Add-EvidenceLine "verdict=FAIL"
  Add-EvidenceLine "error=$($_.Exception.Message)"
  Write-Evidence
  throw
}
