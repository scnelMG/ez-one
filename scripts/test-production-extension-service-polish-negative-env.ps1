[CmdletBinding()]
param(
  [string]$EvidenceDir = ".omo\evidence\task-6-production-extension-service-polish\bad-client-env"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$scriptPath = Join-Path $PSScriptRoot "check-client-prod-env.ps1"
$resolvedEvidenceDir = New-Item -ItemType Directory -Force -Path (Join-Path $repoRoot $EvidenceDir)
$summaryPath = Join-Path $resolvedEvidenceDir.Parent.FullName "env-negative.txt"
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("ez-one-task6-negative-env-" + [Guid]::NewGuid().ToString("N"))

function Write-FrontendEnvFile {
  param(
    [string]$Path,
    [string]$ApiBaseUrl = "https://ez-one.o-r.kr/api",
    [string]$FallbackBaseUrls = "https://fallback.ez-one.o-r.kr/api",
    [string]$ExtensionInstallUrl = "https://chromewebstore.google.com/detail/ez-one-job-saver/oamnhdoaefndncadifgaidefcjaomgdo",
    [string]$ExtensionId = "oamnhdoaefndncadifgaidefcjaomgdo",
    [string]$GoogleRedirectUri = "https://ez-one.o-r.kr/login/callback",
    [string]$NotionRedirectUri = "https://ez-one.o-r.kr/mypage/notion"
  )

  @(
    "VITE_API_BASE_URL=$ApiBaseUrl",
    "VITE_API_FALLBACK_BASE_URLS=$FallbackBaseUrls",
    "VITE_EXTENSION_INSTALL_URL=$ExtensionInstallUrl",
    "VITE_EXTENSION_ID=$ExtensionId",
    "VITE_GOOGLE_CLIENT_ID=1234567890-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com",
    "VITE_GOOGLE_REDIRECT_URI=$GoogleRedirectUri",
    "VITE_NOTION_CLIENT_ID=notionprod_7d2f3a4b5c6d7e8f90123456789abcdef",
    "VITE_NOTION_REDIRECT_URI=$NotionRedirectUri"
  ) | Set-Content -Encoding ASCII -LiteralPath $Path
}

function Write-ExtensionEnvFile {
  param(
    [string]$Path,
    [string]$ApiBaseUrl = "https://ez-one.o-r.kr/api",
    [string]$FallbackBaseUrls = "https://fallback.ez-one.o-r.kr/api",
    [string]$WebAppUrl = "https://ez-one.o-r.kr"
  )

  @(
    "VITE_EXTENSION_API_BASE_URL=$ApiBaseUrl",
    "VITE_EXTENSION_API_FALLBACK_BASE_URLS=$FallbackBaseUrls",
    "VITE_EXTENSION_WEB_APP_URL=$WebAppUrl"
  ) | Set-Content -Encoding ASCII -LiteralPath $Path
}

function Invoke-ExpectFailure {
  param(
    [string]$Name,
    [string]$FrontendEnvPath = "",
    [string]$ExtensionEnvPath = "",
    [string]$ExpectedKey
  )

  $arguments = @()
  if (-not [string]::IsNullOrWhiteSpace($FrontendEnvPath)) {
    $arguments += @("-FrontendEnvFile", $FrontendEnvPath)
  }
  if (-not [string]::IsNullOrWhiteSpace($ExtensionEnvPath)) {
    $arguments += @("-ExtensionEnvFile", $ExtensionEnvPath)
  }

  $previousPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $output = & powershell -NoProfile -ExecutionPolicy Bypass -File $scriptPath @arguments 2>&1
  $exitCode = $LASTEXITCODE
  $ErrorActionPreference = $previousPreference
  $combined = ($output | Out-String)
  if ($exitCode -eq 0) {
    throw "Scenario '$Name' unexpectedly passed."
  }
  if ($combined -notmatch [regex]::Escape($ExpectedKey)) {
    throw "Scenario '$Name' failed for an unexpected reason; expected key '$ExpectedKey'."
  }

  return "PASS`t$Name`tRejectedKey=$ExpectedKey`tExitCode=$exitCode"
}

New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null

try {
  $validFrontend = Join-Path $tempRoot "frontend.valid.env"
  $validExtension = Join-Path $tempRoot "extension.valid.env"
  Write-FrontendEnvFile -Path $validFrontend
  Write-ExtensionEnvFile -Path $validExtension

  $missingInstall = Join-Path $tempRoot "frontend.missing-install.env"
  Write-FrontendEnvFile -Path $missingInstall -ExtensionInstallUrl ""

  $localhostFrontendApi = Join-Path $tempRoot "frontend.localhost-api.env"
  Write-FrontendEnvFile -Path $localhostFrontendApi -ApiBaseUrl "http://localhost:8080/api"

  $localExtensionId = Join-Path $tempRoot "frontend.local-extension-id.env"
  Write-FrontendEnvFile `
    -Path $localExtensionId `
    -ExtensionInstallUrl "https://chromewebstore.google.com/detail/ez-one-job-saver/ikpeibohnopmikegoogggmdipmhmiadi" `
    -ExtensionId "ikpeibohnopmikegoogggmdipmhmiadi"

  $localhostExtensionApi = Join-Path $tempRoot "extension.localhost-api.env"
  Write-ExtensionEnvFile -Path $localhostExtensionApi -ApiBaseUrl "http://localhost:8081/api"

  $mismatchedExtensionWeb = Join-Path $tempRoot "extension.mismatched-web.env"
  Write-ExtensionEnvFile -Path $mismatchedExtensionWeb -WebAppUrl "https://other.example.com"

  $results = @(
    "Task 6 client env negative validation",
    "Timestamp: $((Get-Date).ToString('o'))",
    "Validator: scripts/check-client-prod-env.ps1",
    "SensitiveValuesPrinted: false",
    "",
    (Invoke-ExpectFailure -Name "missing extension install URL" -FrontendEnvPath $missingInstall -ExpectedKey "VITE_EXTENSION_INSTALL_URL"),
    (Invoke-ExpectFailure -Name "frontend localhost API URL" -FrontendEnvPath $localhostFrontendApi -ExpectedKey "VITE_API_BASE_URL"),
    (Invoke-ExpectFailure -Name "local unpacked extension ID" -FrontendEnvPath $localExtensionId -ExpectedKey "VITE_EXTENSION_ID"),
    (Invoke-ExpectFailure -Name "extension localhost API URL" -ExtensionEnvPath $localhostExtensionApi -ExpectedKey "VITE_EXTENSION_API_BASE_URL"),
    (Invoke-ExpectFailure -Name "mismatched extension web origin" -FrontendEnvPath $validFrontend -ExtensionEnvPath $mismatchedExtensionWeb -ExpectedKey "VITE_EXTENSION_WEB_APP_URL")
  )

  $detailsPath = Join-Path $resolvedEvidenceDir.FullName "negative-scenarios.tsv"
  $results | Set-Content -Encoding ASCII -LiteralPath $summaryPath
  $results | Set-Content -Encoding ASCII -LiteralPath $detailsPath
  Write-Host "[PASS] Task 6 negative client env validation rejected all bad fixtures."
  Write-Host "[PASS] Evidence written to $summaryPath"
} finally {
  Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
}
