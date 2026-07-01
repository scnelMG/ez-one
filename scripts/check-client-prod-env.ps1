[CmdletBinding()]
param(
  [string]$FrontendEnvFile = "",

  [string]$ExtensionEnvFile = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Read-EnvFile {
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

  return [pscustomobject]@{
    Path = $resolvedPath
    Values = $values
  }
}

function Assert-Present {
  param(
    [System.Collections.IDictionary]$Values,
    [string]$Key
  )

  if (-not $Values.Contains($Key) -or [string]::IsNullOrWhiteSpace($Values[$Key])) {
    throw "$Key must be present and non-empty."
  }
}

function Assert-NotPlaceholder {
  param(
    [System.Collections.IDictionary]$Values,
    [string]$Key
  )

  Assert-Present $Values $Key
  $value = $Values[$Key].Trim()
  $normalized = $value.ToLowerInvariant()
  foreach ($token in @("change-me", "change_me", "changeme", "placeholder", "example", "dummy", "local-only", "dev-only", "client-id")) {
    if ($normalized.Contains($token)) {
      throw "$Key must not look like a placeholder."
    }
  }
  if ($value -match "^(.)\1{15,}$") {
    throw "$Key must not be a repeated-character placeholder."
  }
}

function Assert-OptionalNotPlaceholder {
  param(
    [System.Collections.IDictionary]$Values,
    [string]$Key
  )

  if (-not $Values.Contains($Key) -or [string]::IsNullOrWhiteSpace($Values[$Key])) {
    return
  }
  Assert-NotPlaceholder $Values $Key
}

function Assert-NoLocalUrl {
  param(
    [string]$Key,
    [string]$Value
  )

  if ($Value -match "localhost|127\.|(\[)?::1(\])?|0\.0\.0\.0") {
    throw "$Key must not use a local URL in production."
  }
}

function Assert-HttpsUrl {
  param(
    [System.Collections.IDictionary]$Values,
    [string]$Key,
    [switch]$Required,
    [string]$RequiredPathPrefix = "",
    [string]$RequiredExactPath = ""
  )

  if (-not $Values.Contains($Key) -or [string]::IsNullOrWhiteSpace($Values[$Key])) {
    if ($Required) {
      throw "$Key must be present and non-empty."
    }
    return
  }

  $rawValues = @($Values[$Key].Split(",") | ForEach-Object { $_.Trim() } | Where-Object { $_ })
  foreach ($value in $rawValues) {
    Assert-NoLocalUrl -Key $Key -Value $value
    $uri = $null
    if (-not [System.Uri]::TryCreate($value, [System.UriKind]::Absolute, [ref]$uri)) {
      throw "$Key contains an invalid URL: $value"
    }
    if ($uri.Scheme -ne "https") {
      throw "$Key must use HTTPS in production: $value"
    }
    if ($value.Contains("*")) {
      throw "$Key must not contain wildcards: $value"
    }
    if ($RequiredPathPrefix -and -not $uri.AbsolutePath.StartsWith($RequiredPathPrefix)) {
      throw "$Key must use path prefix '$RequiredPathPrefix': $value"
    }
    if ($RequiredExactPath -and $uri.AbsolutePath -ne $RequiredExactPath) {
      throw "$Key must use path '$RequiredExactPath': $value"
    }
  }
}

function Assert-HttpsOrigin {
  param(
    [System.Collections.IDictionary]$Values,
    [string]$Key,
    [switch]$Required
  )

  Assert-HttpsUrl -Values $Values -Key $Key -Required:$Required
  if (-not $Values.Contains($Key) -or [string]::IsNullOrWhiteSpace($Values[$Key])) {
    return
  }
  $uri = [System.Uri]$Values[$Key]
  if ($uri.AbsolutePath -ne "/" -or -not [string]::IsNullOrEmpty($uri.Query) -or -not [string]::IsNullOrEmpty($uri.Fragment)) {
    throw "$Key must be an origin only, without path, query string, or fragment."
  }
  if ($Values[$Key].EndsWith("/")) {
    throw "$Key must not include a trailing slash."
  }
}

function Get-SingleUri {
  param(
    [System.Collections.IDictionary]$Values,
    [string]$Key
  )

  Assert-Present $Values $Key
  if ($Values[$Key].Contains(",")) {
    throw "$Key must contain exactly one URL."
  }
  $uri = $null
  if (-not [System.Uri]::TryCreate($Values[$Key], [System.UriKind]::Absolute, [ref]$uri)) {
    throw "$Key contains an invalid URL: $($Values[$Key])"
  }
  return $uri
}

function Get-Origin {
  param([System.Uri]$Uri)

  return "$($Uri.Scheme)://$($Uri.Authority)"
}

function Normalize-Url {
  param([string]$Value)

  $uri = $null
  if (-not [System.Uri]::TryCreate($Value, [System.UriKind]::Absolute, [ref]$uri)) {
    throw "Invalid URL: $Value"
  }
  return $uri.AbsoluteUri.TrimEnd("/")
}

function Assert-FallbackUrlsDoNotRepeatPrimary {
  param(
    [System.Collections.IDictionary]$Values,
    [string]$PrimaryKey,
    [string]$FallbackKey
  )

  if (-not $Values.Contains($FallbackKey) -or [string]::IsNullOrWhiteSpace($Values[$FallbackKey])) {
    return
  }

  $primary = Normalize-Url $Values[$PrimaryKey]
  $fallbacks = @($Values[$FallbackKey].Split(",") | ForEach-Object { $_.Trim() } | Where-Object { $_ })
  foreach ($fallback in $fallbacks) {
    if ((Normalize-Url $fallback) -eq $primary) {
      throw "$FallbackKey must not repeat $PrimaryKey."
    }
  }
}

function Assert-ChromeExtensionId {
  param(
    [System.Collections.IDictionary]$Values,
    [string]$Key
  )

  Assert-Present $Values $Key
  if ($Values[$Key] -notmatch "^[a-p]{32}$") {
    throw "$Key must be a 32-character Chrome extension ID."
  }
  if ($Values[$Key] -match "^(.)\1{31}$") {
    throw "$Key must not be a repeated-character placeholder."
  }
}

function Assert-ExtensionInstallUrlMatchesId {
  param([System.Collections.IDictionary]$Values)

  if (-not $Values.Contains("VITE_EXTENSION_INSTALL_URL") -or [string]::IsNullOrWhiteSpace($Values["VITE_EXTENSION_INSTALL_URL"])) {
    return
  }

  Assert-Present $Values "VITE_EXTENSION_ID"
  if (-not $Values["VITE_EXTENSION_INSTALL_URL"].Contains($Values["VITE_EXTENSION_ID"])) {
    throw "VITE_EXTENSION_INSTALL_URL must include VITE_EXTENSION_ID so production users install the expected Chrome extension."
  }
}

function Assert-ChromeWebStoreInstallUrl {
  param([System.Collections.IDictionary]$Values)

  Assert-Present $Values "VITE_EXTENSION_INSTALL_URL"
  $uri = Get-SingleUri -Values $Values -Key "VITE_EXTENSION_INSTALL_URL"
  $installHost = $uri.Host.ToLowerInvariant()
  $path = $uri.AbsolutePath.ToLowerInvariant()
  $usesCurrentStore = $installHost -eq "chromewebstore.google.com" -and $path.StartsWith("/detail/")
  $usesLegacyStore = $installHost -eq "chrome.google.com" -and $path.StartsWith("/webstore/detail/")
  if (-not ($usesCurrentStore -or $usesLegacyStore)) {
    throw "VITE_EXTENSION_INSTALL_URL must be a Chrome Web Store extension URL."
  }
}

function Assert-FrontendEnv {
  param([System.Collections.IDictionary]$Values)

  Assert-HttpsUrl -Values $Values -Key "VITE_API_BASE_URL" -Required -RequiredPathPrefix "/api"
  Assert-HttpsUrl -Values $Values -Key "VITE_API_FALLBACK_BASE_URLS" -RequiredPathPrefix "/api"
  Assert-FallbackUrlsDoNotRepeatPrimary -Values $Values -PrimaryKey "VITE_API_BASE_URL" -FallbackKey "VITE_API_FALLBACK_BASE_URLS"
  Assert-NotPlaceholder $Values "VITE_EXTENSION_INSTALL_URL"
  Assert-HttpsUrl -Values $Values -Key "VITE_EXTENSION_INSTALL_URL" -Required
  Assert-ChromeExtensionId $Values "VITE_EXTENSION_ID"
  Assert-ChromeWebStoreInstallUrl $Values
  Assert-ExtensionInstallUrlMatchesId $Values
  Assert-NotPlaceholder $Values "VITE_GOOGLE_CLIENT_ID"
  Assert-HttpsUrl -Values $Values -Key "VITE_GOOGLE_REDIRECT_URI" -Required -RequiredExactPath "/login/callback"
  Assert-NotPlaceholder $Values "VITE_NOTION_CLIENT_ID"
  Assert-HttpsUrl -Values $Values -Key "VITE_NOTION_REDIRECT_URI" -Required -RequiredExactPath "/mypage/notion"

  $apiOrigin = Get-Origin (Get-SingleUri -Values $Values -Key "VITE_API_BASE_URL")
  foreach ($redirectKey in @("VITE_GOOGLE_REDIRECT_URI", "VITE_NOTION_REDIRECT_URI")) {
    $redirectOrigin = Get-Origin (Get-SingleUri -Values $Values -Key $redirectKey)
    if ($redirectOrigin -ne $apiOrigin) {
      throw "$redirectKey must use the same origin as VITE_API_BASE_URL."
    }
  }
}

function Assert-ExtensionEnv {
  param([System.Collections.IDictionary]$Values)

  Assert-HttpsUrl -Values $Values -Key "VITE_EXTENSION_API_BASE_URL" -Required -RequiredPathPrefix "/api"
  Assert-HttpsUrl -Values $Values -Key "VITE_EXTENSION_API_FALLBACK_BASE_URLS" -RequiredPathPrefix "/api"
  Assert-FallbackUrlsDoNotRepeatPrimary -Values $Values -PrimaryKey "VITE_EXTENSION_API_BASE_URL" -FallbackKey "VITE_EXTENSION_API_FALLBACK_BASE_URLS"
  Assert-HttpsOrigin -Values $Values -Key "VITE_EXTENSION_WEB_APP_URL" -Required
  $null = Get-SingleUri -Values $Values -Key "VITE_EXTENSION_API_BASE_URL"
  $null = Get-SingleUri -Values $Values -Key "VITE_EXTENSION_WEB_APP_URL"
}

function Assert-ClientEnvConsistency {
  param(
    [System.Collections.IDictionary]$FrontendValues,
    [System.Collections.IDictionary]$ExtensionValues
  )

  $frontendApiOrigin = Get-Origin (Get-SingleUri -Values $FrontendValues -Key "VITE_API_BASE_URL")
  $extensionApiOrigin = Get-Origin (Get-SingleUri -Values $ExtensionValues -Key "VITE_EXTENSION_API_BASE_URL")
  $extensionWebOrigin = Get-Origin (Get-SingleUri -Values $ExtensionValues -Key "VITE_EXTENSION_WEB_APP_URL")

  if ($extensionApiOrigin -ne $frontendApiOrigin) {
    throw "VITE_EXTENSION_API_BASE_URL must use the same origin as VITE_API_BASE_URL."
  }
  if ($extensionWebOrigin -ne $frontendApiOrigin) {
    throw "VITE_EXTENSION_WEB_APP_URL must use the same origin as VITE_API_BASE_URL."
  }
}

if ([string]::IsNullOrWhiteSpace($FrontendEnvFile) -and [string]::IsNullOrWhiteSpace($ExtensionEnvFile)) {
  throw "Provide -FrontendEnvFile, -ExtensionEnvFile, or both."
}

$frontend = $null
$extension = $null

if (-not [string]::IsNullOrWhiteSpace($FrontendEnvFile)) {
  $frontend = Read-EnvFile $FrontendEnvFile
  Assert-FrontendEnv $frontend.Values
  Write-Host "[PASS] Frontend production env policy check passed for $($frontend.Path)."
}

if (-not [string]::IsNullOrWhiteSpace($ExtensionEnvFile)) {
  $extension = Read-EnvFile $ExtensionEnvFile
  Assert-ExtensionEnv $extension.Values
  Write-Host "[PASS] Extension production env policy check passed for $($extension.Path)."
}

if ($null -ne $frontend -and $null -ne $extension) {
  Assert-ClientEnvConsistency -FrontendValues $frontend.Values -ExtensionValues $extension.Values
  Write-Host "[PASS] Frontend and extension production env origins are consistent."
}
