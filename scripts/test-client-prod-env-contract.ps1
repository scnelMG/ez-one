[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$scriptPath = Join-Path $PSScriptRoot "check-client-prod-env.ps1"

function Write-EnvFile {
  param(
    [string]$Path,
    [string]$NotionRedirectUri,
    [string]$ApiBaseUrl = "https://app.example.com/api",
    [string]$GoogleRedirectUri = "https://app.example.com/login/callback",
    [string]$FallbackBaseUrls = "https://fallback.example.com/api",
    [string]$GoogleClientId = "1234567890-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com",
    [string]$NotionClientId = "notionprod_7d2f3a4b5c6d7e8f90123456789abcdef",
    [string]$ExtensionInstallUrl = "https://chromewebstore.google.com/detail/ez-one/ikpeibohnopmikegoogggmdipmhmiadi",
    [string]$ExtensionId = "ikpeibohnopmikegoogggmdipmhmiadi"
  )

  @(
    "VITE_API_BASE_URL=$ApiBaseUrl",
    "VITE_API_FALLBACK_BASE_URLS=$FallbackBaseUrls",
    "VITE_EXTENSION_INSTALL_URL=$ExtensionInstallUrl",
    "VITE_EXTENSION_ID=$ExtensionId",
    "VITE_GOOGLE_CLIENT_ID=$GoogleClientId",
    "VITE_GOOGLE_REDIRECT_URI=$GoogleRedirectUri",
    "VITE_NOTION_CLIENT_ID=$NotionClientId",
    "VITE_NOTION_REDIRECT_URI=$NotionRedirectUri"
  ) | Set-Content -Encoding ASCII -LiteralPath $Path
}

function Write-ExtensionEnvFile {
  param(
    [string]$Path,
    [string]$ApiBaseUrl = "https://app.example.com/api",
    [string]$WebAppUrl = "https://app.example.com",
    [string]$FallbackBaseUrls = "https://fallback.example.com/api"
  )

  @(
    "VITE_EXTENSION_API_BASE_URL=$ApiBaseUrl",
    "VITE_EXTENSION_API_FALLBACK_BASE_URLS=$FallbackBaseUrls",
    "VITE_EXTENSION_WEB_APP_URL=$WebAppUrl"
  ) | Set-Content -Encoding ASCII -LiteralPath $Path
}

function Invoke-ClientEnvCheck {
  param(
    [string]$FrontendEnvPath = "",
    [string]$ExtensionEnvPath = ""
  )

  if (-not [string]::IsNullOrWhiteSpace($FrontendEnvPath) -and -not [string]::IsNullOrWhiteSpace($ExtensionEnvPath)) {
    & $scriptPath -FrontendEnvFile $FrontendEnvPath -ExtensionEnvFile $ExtensionEnvPath *> $null
    return
  }
  if (-not [string]::IsNullOrWhiteSpace($FrontendEnvPath)) {
    & $scriptPath -FrontendEnvFile $FrontendEnvPath *> $null
    return
  }
  & $scriptPath -ExtensionEnvFile $ExtensionEnvPath *> $null
}

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("ez-one-client-env-contract-" + [Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null

try {
  $validEnv = Join-Path $tempRoot "frontend.valid.env"
  $validExtensionEnv = Join-Path $tempRoot "extension.valid.env"
  Write-EnvFile -Path $validEnv -NotionRedirectUri "https://app.example.com/mypage/notion"
  Write-ExtensionEnvFile -Path $validExtensionEnv
  try {
    Invoke-ClientEnvCheck -FrontendEnvPath $validEnv -ExtensionEnvPath $validExtensionEnv
  } catch {
    throw "Expected current Notion redirect route to pass production client env validation. $($_.Exception.Message)"
  }

  $invalidEnv = Join-Path $tempRoot "frontend.invalid.env"
  Write-EnvFile -Path $invalidEnv -NotionRedirectUri "https://app.example.com/mypage/notion/callback"

  $failedAsExpected = $false
  try {
    Invoke-ClientEnvCheck -FrontendEnvPath $invalidEnv
  } catch {
    $failedAsExpected = $true
  }

  if (-not $failedAsExpected) {
    throw "Expected stale Notion callback route to fail production client env validation."
  }

  $mismatchedExtensionWeb = Join-Path $tempRoot "extension.mismatched-web.env"
  Write-ExtensionEnvFile -Path $mismatchedExtensionWeb -WebAppUrl "https://other.example.com"

  $failedMismatchedWebAsExpected = $false
  try {
    Invoke-ClientEnvCheck -FrontendEnvPath $validEnv -ExtensionEnvPath $mismatchedExtensionWeb
  } catch {
    $failedMismatchedWebAsExpected = $true
  }

  if (-not $failedMismatchedWebAsExpected) {
    throw "Expected mismatched extension web app origin to fail production client env validation."
  }

  $mismatchedExtensionApi = Join-Path $tempRoot "extension.mismatched-api.env"
  Write-ExtensionEnvFile -Path $mismatchedExtensionApi -ApiBaseUrl "https://api.other.example.com/api"

  $failedMismatchedApiAsExpected = $false
  try {
    Invoke-ClientEnvCheck -FrontendEnvPath $validEnv -ExtensionEnvPath $mismatchedExtensionApi
  } catch {
    $failedMismatchedApiAsExpected = $true
  }

  if (-not $failedMismatchedApiAsExpected) {
    throw "Expected mismatched extension API origin to fail production client env validation."
  }

  $duplicateFrontendFallback = Join-Path $tempRoot "frontend.duplicate-fallback.env"
  Write-EnvFile `
    -Path $duplicateFrontendFallback `
    -NotionRedirectUri "https://app.example.com/mypage/notion" `
    -FallbackBaseUrls "https://app.example.com/api"

  $failedDuplicateFrontendFallbackAsExpected = $false
  try {
    Invoke-ClientEnvCheck -FrontendEnvPath $duplicateFrontendFallback
  } catch {
    $failedDuplicateFrontendFallbackAsExpected = $true
  }

  if (-not $failedDuplicateFrontendFallbackAsExpected) {
    throw "Expected duplicate frontend API fallback URL to fail production client env validation."
  }

  $duplicateExtensionFallback = Join-Path $tempRoot "extension.duplicate-fallback.env"
  Write-ExtensionEnvFile -Path $duplicateExtensionFallback -FallbackBaseUrls "https://app.example.com/api"

  $failedDuplicateExtensionFallbackAsExpected = $false
  try {
    Invoke-ClientEnvCheck -ExtensionEnvPath $duplicateExtensionFallback
  } catch {
    $failedDuplicateExtensionFallbackAsExpected = $true
  }

  if (-not $failedDuplicateExtensionFallbackAsExpected) {
    throw "Expected duplicate extension API fallback URL to fail production client env validation."
  }

  $loopbackFrontendApi = Join-Path $tempRoot "frontend.loopback-api.env"
  Write-EnvFile `
    -Path $loopbackFrontendApi `
    -NotionRedirectUri "https://app.example.com/mypage/notion" `
    -ApiBaseUrl "https://127.0.0.2/api"

  $failedLoopbackFrontendApiAsExpected = $false
  try {
    Invoke-ClientEnvCheck -FrontendEnvPath $loopbackFrontendApi
  } catch {
    $failedLoopbackFrontendApiAsExpected = $true
  }

  if (-not $failedLoopbackFrontendApiAsExpected) {
    throw "Expected loopback frontend API URL to fail production client env validation."
  }

  $zeroExtensionWeb = Join-Path $tempRoot "extension.zero-web.env"
  Write-ExtensionEnvFile -Path $zeroExtensionWeb -WebAppUrl "https://0.0.0.0"

  $failedZeroExtensionWebAsExpected = $false
  try {
    Invoke-ClientEnvCheck -ExtensionEnvPath $zeroExtensionWeb
  } catch {
    $failedZeroExtensionWebAsExpected = $true
  }

  if (-not $failedZeroExtensionWebAsExpected) {
    throw "Expected zero-address extension web URL to fail production client env validation."
  }

  $loopbackExtensionOnly = Join-Path $tempRoot "extension.loopback-only.env"
  Write-ExtensionEnvFile `
    -Path $loopbackExtensionOnly `
    -ApiBaseUrl "https://127.0.0.2/api" `
    -WebAppUrl "https://127.0.0.2"

  $failedLoopbackExtensionOnlyAsExpected = $false
  try {
    Invoke-ClientEnvCheck -ExtensionEnvPath $loopbackExtensionOnly
  } catch {
    $failedLoopbackExtensionOnlyAsExpected = $true
  }

  if (-not $failedLoopbackExtensionOnlyAsExpected) {
    throw "Expected loopback-only extension production env to fail validation."
  }

  $placeholderGoogleClientId = Join-Path $tempRoot "frontend.placeholder-google-client.env"
  Write-EnvFile `
    -Path $placeholderGoogleClientId `
    -NotionRedirectUri "https://app.example.com/mypage/notion" `
    -GoogleClientId "CHANGE_ME_GOOGLE_CLIENT_ID"

  $failedPlaceholderGoogleAsExpected = $false
  try {
    Invoke-ClientEnvCheck -FrontendEnvPath $placeholderGoogleClientId
  } catch {
    $failedPlaceholderGoogleAsExpected = $true
  }

  if (-not $failedPlaceholderGoogleAsExpected) {
    throw "Expected placeholder frontend Google client ID to fail production client env validation."
  }

  $placeholderNotionClientId = Join-Path $tempRoot "frontend.placeholder-notion-client.env"
  Write-EnvFile `
    -Path $placeholderNotionClientId `
    -NotionRedirectUri "https://app.example.com/mypage/notion" `
    -NotionClientId "CHANGE_ME_NOTION_CLIENT_ID"

  $failedPlaceholderNotionAsExpected = $false
  try {
    Invoke-ClientEnvCheck -FrontendEnvPath $placeholderNotionClientId
  } catch {
    $failedPlaceholderNotionAsExpected = $true
  }

  if (-not $failedPlaceholderNotionAsExpected) {
    throw "Expected placeholder frontend Notion client ID to fail production client env validation."
  }

  $emptyExtensionInstallUrl = Join-Path $tempRoot "frontend.empty-extension-install.env"
  Write-EnvFile `
    -Path $emptyExtensionInstallUrl `
    -NotionRedirectUri "https://app.example.com/mypage/notion" `
    -ExtensionInstallUrl ""

  $failedEmptyExtensionInstallAsExpected = $false
  try {
    Invoke-ClientEnvCheck -FrontendEnvPath $emptyExtensionInstallUrl
  } catch {
    $failedEmptyExtensionInstallAsExpected = $true
  }

  if (-not $failedEmptyExtensionInstallAsExpected) {
    throw "Expected empty extension install URL to fail production client env validation."
  }

  $nonChromeStoreExtensionInstallUrl = Join-Path $tempRoot "frontend.non-chrome-store-extension-install.env"
  Write-EnvFile `
    -Path $nonChromeStoreExtensionInstallUrl `
    -NotionRedirectUri "https://app.example.com/mypage/notion" `
    -ExtensionInstallUrl "https://downloads.ez-one.kr/extensions/ikpeibohnopmikegoogggmdipmhmiadi"

  $failedNonChromeStoreExtensionInstallAsExpected = $false
  try {
    Invoke-ClientEnvCheck -FrontendEnvPath $nonChromeStoreExtensionInstallUrl
  } catch {
    $failedNonChromeStoreExtensionInstallAsExpected = $true
  }

  if (-not $failedNonChromeStoreExtensionInstallAsExpected) {
    throw "Expected non-Chrome-Web-Store extension install URL to fail production client env validation."
  }

  $placeholderExtensionInstallUrl = Join-Path $tempRoot "frontend.placeholder-extension-install.env"
  Write-EnvFile `
    -Path $placeholderExtensionInstallUrl `
    -NotionRedirectUri "https://app.example.com/mypage/notion" `
    -ExtensionInstallUrl "https://chromewebstore.google.com/detail/example"

  $failedPlaceholderExtensionInstallAsExpected = $false
  try {
    Invoke-ClientEnvCheck -FrontendEnvPath $placeholderExtensionInstallUrl
  } catch {
    $failedPlaceholderExtensionInstallAsExpected = $true
  }

  if (-not $failedPlaceholderExtensionInstallAsExpected) {
    throw "Expected placeholder extension install URL to fail production client env validation."
  }

  $mismatchedExtensionInstallUrl = Join-Path $tempRoot "frontend.mismatched-extension-install.env"
  Write-EnvFile `
    -Path $mismatchedExtensionInstallUrl `
    -NotionRedirectUri "https://app.example.com/mypage/notion" `
    -ExtensionInstallUrl "https://chromewebstore.google.com/detail/ez-one/bcdefghijklmnopqrstuvwxyzaaaaaaa"

  $failedMismatchedExtensionInstallAsExpected = $false
  try {
    Invoke-ClientEnvCheck -FrontendEnvPath $mismatchedExtensionInstallUrl
  } catch {
    $failedMismatchedExtensionInstallAsExpected = $true
  }

  if (-not $failedMismatchedExtensionInstallAsExpected) {
    throw "Expected extension install URL without VITE_EXTENSION_ID to fail production client env validation."
  }

  $placeholderExtensionId = Join-Path $tempRoot "frontend.placeholder-extension-id.env"
  Write-EnvFile `
    -Path $placeholderExtensionId `
    -NotionRedirectUri "https://app.example.com/mypage/notion" `
    -ExtensionId "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"

  $failedPlaceholderExtensionIdAsExpected = $false
  try {
    Invoke-ClientEnvCheck -FrontendEnvPath $placeholderExtensionId
  } catch {
    $failedPlaceholderExtensionIdAsExpected = $true
  }

  if (-not $failedPlaceholderExtensionIdAsExpected) {
    throw "Expected repeated-character extension ID to fail production client env validation."
  }

  Write-Host "[PASS] client production env route contract test passed."
} finally {
  Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
}
