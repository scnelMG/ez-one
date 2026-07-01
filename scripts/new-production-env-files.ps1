[CmdletBinding()]
param(
  [string]$OutputDirectory = ".\secrets",

  [Parameter(Mandatory = $true)]
  [string]$Origin,

  [string]$ExtensionId = "ikpeibohnopmikegoogggmdipmhmiadi",

  [switch]$Force
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$outputDir = New-Item -ItemType Directory -Force -Path $OutputDirectory

function Assert-HttpsOrigin {
  param([string]$Value)

  if ($Value.EndsWith("/")) {
    throw "Origin must not include a trailing slash."
  }
  $uri = $null
  if (-not [System.Uri]::TryCreate($Value, [System.UriKind]::Absolute, [ref]$uri)) {
    throw "Origin must be an absolute HTTPS origin."
  }
  if ($uri.Scheme -ne "https") {
    throw "Origin must use https://."
  }
  if ($uri.AbsolutePath -ne "/" -or -not [string]::IsNullOrEmpty($uri.Query) -or -not [string]::IsNullOrEmpty($uri.Fragment)) {
    throw "Origin must not include a path, query string, or fragment."
  }
  $uriHost = $uri.Host.ToLowerInvariant()
  if ($uriHost -eq "localhost" -or $uriHost -eq "0.0.0.0" -or $uriHost -eq "::1" -or $uriHost.StartsWith("127.")) {
    throw "Origin must not be a local host for production env files."
  }
}

function Assert-ChromeExtensionId {
  param([string]$Value)

  if ($Value -notmatch "^[a-p]{32}$") {
    throw "ExtensionId must be a 32-character Chrome extension ID."
  }
}

function New-Base64Secret {
  param([int]$Bytes)

  $buffer = New-Object byte[] $Bytes
  $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $generator.GetBytes($buffer)
    return [Convert]::ToBase64String($buffer)
  } finally {
    $generator.Dispose()
  }
}

function Read-EnvValues {
  param([string]$RelativePath)

  $path = Join-Path $repoRoot $RelativePath
  $values = [ordered]@{}
  foreach ($line in Get-Content -LiteralPath $path) {
    $trimmed = $line.Trim()
    if ($trimmed -eq "" -or $trimmed.StartsWith("#")) {
      continue
    }
    $separator = $trimmed.IndexOf("=")
    if ($separator -lt 1) {
      throw "$RelativePath contains an invalid env line without KEY=value: $trimmed"
    }
    $key = $trimmed.Substring(0, $separator).Trim()
    $values[$key] = $trimmed.Substring($separator + 1).Trim()
  }
  return $values
}

function Set-EnvValue {
  param(
    [System.Collections.Specialized.OrderedDictionary]$Values,
    [string]$Key,
    [string]$Value
  )

  if (-not $Values.Contains($Key)) {
    $Values.Add($Key, $Value)
    return
  }
  $Values[$Key] = $Value
}

function Write-EnvFile {
  param(
    [System.Collections.Specialized.OrderedDictionary]$Values,
    [string]$Path
  )

  if ((Test-Path -LiteralPath $Path) -and -not $Force) {
    throw "$Path already exists. Re-run with -Force only when you intentionally want to replace it."
  }

  $lines = New-Object System.Collections.Generic.List[string]
  foreach ($key in $Values.Keys) {
    $lines.Add("$key=$($Values[$key])")
  }
  Set-Content -Encoding ASCII -LiteralPath $Path -Value $lines
  Write-Host "[PASS] Wrote $Path"
}

Assert-HttpsOrigin $Origin
Assert-ChromeExtensionId $ExtensionId

$backend = Read-EnvValues "backend/.env.example"
Set-EnvValue $backend "APP_ENV" "prod"
Set-EnvValue $backend "SPRING_PROFILES_ACTIVE" "mysql"
Set-EnvValue $backend "SERVER_PORT" "8080"
Set-EnvValue $backend "SERVER_ADDRESS" "127.0.0.1"
Set-EnvValue $backend "AUTH_LOCAL_DEV_TOKEN_ENABLED" "false"
Set-EnvValue $backend "APP_DOCS_ENABLED" "false"
Set-EnvValue $backend "AUTH_REFRESH_COOKIE_SECURE" "true"
Set-EnvValue $backend "AUTH_REFRESH_COOKIE_SAME_SITE" "Lax"
Set-EnvValue $backend "AUTH_REFRESH_COOKIE_MAX_AGE_SECONDS" "2592000"
Set-EnvValue $backend "CORS_ALLOWED_ORIGINS" $Origin
Set-EnvValue $backend "APP_PUBLIC_BASE_URL" $Origin
Set-EnvValue $backend "DB_HOST" "CHANGE_ME_DB_HOST"
Set-EnvValue $backend "DB_PORT" "3306"
Set-EnvValue $backend "DB_NAME" "ez_one"
Set-EnvValue $backend "DB_USER" "CHANGE_ME_DB_USERNAME"
Set-EnvValue $backend "DB_USERNAME" "CHANGE_ME_DB_USERNAME"
Set-EnvValue $backend "DB_PASSWORD" "CHANGE_ME_DB_PASSWORD"
Set-EnvValue $backend "JWT_ACCESS_SECRET" (New-Base64Secret 48)
Set-EnvValue $backend "JWT_REFRESH_SECRET" (New-Base64Secret 48)
Set-EnvValue $backend "JWT_ACCESS_TTL_MINUTES" "30"
Set-EnvValue $backend "JWT_REFRESH_TTL_DAYS" "14"
Set-EnvValue $backend "GOOGLE_CLIENT_ID" "CHANGE_ME_GOOGLE_CLIENT_ID"
Set-EnvValue $backend "GOOGLE_CLIENT_SECRET" "CHANGE_ME_GOOGLE_CLIENT_SECRET"
Set-EnvValue $backend "FLYWAY_ENABLED" "true"
Set-EnvValue $backend "SQL_INIT_MODE" "never"
Set-EnvValue $backend "NOTION_CLIENT_ID" "CHANGE_ME_NOTION_CLIENT_ID"
Set-EnvValue $backend "NOTION_CLIENT_SECRET" "CHANGE_ME_NOTION_CLIENT_SECRET"
Set-EnvValue $backend "NOTION_TOKEN_ENCRYPTION_KEY" (New-Base64Secret 32)
Set-EnvValue $backend "COMPANY_ENRICHMENT_REALTIME_ENABLED" "false"
Set-EnvValue $backend "COMPANY_DATA_STARTUP_SYNC_ENABLED" "false"
Set-EnvValue $backend "COMPANY_DATA_BATCH_SYNC_ENABLED" "false"
Set-EnvValue $backend "PUBLIC_DATA_API_KEY" ""
Set-EnvValue $backend "GMS_AI_BASE_URL" "https://gms.ssafy.io/gmsapi/api.openai.com/v1"
Set-EnvValue $backend "GMS_KEY_INFO_URL" "https://gms.ssafy.io/gmsapi/key-info"
Set-EnvValue $backend "OPENDART_API_BASE_URL" "https://opendart.fss.or.kr/api"
Set-EnvValue $backend "OPENDART_VIEWER_BASE_URL" "https://dart.fss.or.kr/dsaf001/main.do"
Set-EnvValue $backend "OPENDART_COMPANY_OVERVIEW_SOURCE_URL" "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS001&apiId=2019002"
Set-EnvValue $backend "VENTURE_COMPANY_API_URL" "http://apis.data.go.kr/1423000/VentureCompanyService/getVentureCompanyList"
Set-EnvValue $backend "NATIONAL_PENSION_API_URL" "http://apis.data.go.kr/B552015/NpsBplcInfoInqireServiceV2/getBassInfoSearchV2"
Set-EnvValue $backend "PUBLIC_INSTITUTION_API_URL" "http://apis.data.go.kr/1051000/public_inst/list"
Set-EnvValue $backend "FTC_AFFILIATE_API_URL" "http://apis.data.go.kr/1130000/appnGroupAffiList/appnGroupAffiListApi"
Set-EnvValue $backend "FINANCIAL_COMPANY_BASIC_INFO_URL" ""
Set-EnvValue $backend "MIDDLE_MARKET_API_URL" ""

$frontend = Read-EnvValues "frontend/.env.example"
Set-EnvValue $frontend "VITE_API_BASE_URL" "$Origin/api"
Set-EnvValue $frontend "VITE_API_FALLBACK_BASE_URLS" ""
Set-EnvValue $frontend "VITE_EXTENSION_INSTALL_URL" "CHANGE_ME_EXTENSION_INSTALL_URL"
Set-EnvValue $frontend "VITE_EXTENSION_ID" $ExtensionId
Set-EnvValue $frontend "VITE_GOOGLE_CLIENT_ID" "CHANGE_ME_GOOGLE_CLIENT_ID"
Set-EnvValue $frontend "VITE_GOOGLE_REDIRECT_URI" "$Origin/login/callback"
Set-EnvValue $frontend "VITE_NOTION_CLIENT_ID" "CHANGE_ME_NOTION_CLIENT_ID"
Set-EnvValue $frontend "VITE_NOTION_REDIRECT_URI" "$Origin/mypage/notion"

$extension = Read-EnvValues "extension/.env.example"
Set-EnvValue $extension "VITE_EXTENSION_API_BASE_URL" "$Origin/api"
Set-EnvValue $extension "VITE_EXTENSION_API_FALLBACK_BASE_URLS" ""
Set-EnvValue $extension "VITE_EXTENSION_WEB_APP_URL" $Origin

$backendPath = Join-Path $outputDir.FullName "ez-one.prod.env"
$frontendPath = Join-Path $outputDir.FullName "frontend.prod.env"
$extensionPath = Join-Path $outputDir.FullName "extension.prod.env"

Write-EnvFile $backend $backendPath
Write-EnvFile $frontend $frontendPath
Write-EnvFile $extension $extensionPath

Write-Host "[INFO] Generated strong JWT secrets and NOTION_TOKEN_ENCRYPTION_KEY."
Write-Host "[INFO] Replace CHANGE_ME_* values, then run:"
Write-Host "[INFO]   .\scripts\check-prod-env.ps1 -EnvFile $backendPath"
Write-Host "[INFO]   .\scripts\check-client-prod-env.ps1 -FrontendEnvFile $frontendPath -ExtensionEnvFile $extensionPath"
