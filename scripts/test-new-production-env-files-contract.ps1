[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$scriptPath = Join-Path $repoRoot "scripts/new-production-env-files.ps1"
$backendEnvCheckPath = Join-Path $repoRoot "scripts/check-prod-env.ps1"
$clientEnvCheckPath = Join-Path $repoRoot "scripts/check-client-prod-env.ps1"
$beginnerGuidePath = Join-Path $repoRoot "docs/41_beginner-deployment-guide.md"
$koreanBeginnerGuidePath = Join-Path $repoRoot "docs/42_first-deployment-ko.md"
$runbookPath = Join-Path $repoRoot "docs/39_production-deployment-runbook.md"

function Read-EnvFile {
  param([string]$Path)

  $values = @{}
  foreach ($line in Get-Content -LiteralPath $Path) {
    $trimmed = $line.Trim()
    if ($trimmed -eq "" -or $trimmed.StartsWith("#")) {
      continue
    }
    $separator = $trimmed.IndexOf("=")
    if ($separator -lt 1) {
      throw "Invalid env line without KEY=value: $trimmed"
    }
    $values[$trimmed.Substring(0, $separator)] = $trimmed.Substring($separator + 1)
  }
  return $values
}

function Assert-Equals {
  param(
    [object]$Actual,
    [object]$Expected,
    [string]$Message
  )

  if ($Actual -ne $Expected) {
    throw "$Message Expected '$Expected' but got '$Actual'."
  }
}

function Assert-True {
  param(
    [bool]$Condition,
    [string]$Message
  )

  if (-not $Condition) {
    throw $Message
  }
}

function Assert-NoUtf8Bom {
  param([string]$Path)

  $bytes = [System.IO.File]::ReadAllBytes($Path)
  if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
    throw "Generated env file must not include a UTF-8 BOM because systemd EnvironmentFile can treat it as part of the first key: $Path"
  }
}

function Assert-CommandFails {
  param(
    [string[]]$Arguments,
    [string]$ExpectedMessage
  )

  Assert-ScriptFails -ScriptPath $scriptPath -Arguments $Arguments -ExpectedMessage $ExpectedMessage
}

function Assert-ScriptFails {
  param(
    [string]$ScriptPath,
    [string[]]$Arguments,
    [string]$ExpectedMessage
  )

  $previousErrorActionPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = "Continue"
    $global:LASTEXITCODE = 0
    $output = & powershell -NoProfile -ExecutionPolicy Bypass -File $ScriptPath @Arguments 2>&1
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }

  if ($exitCode -eq 0) {
    throw "Command should fail but passed."
  }
  $text = ($output | ForEach-Object { $_.ToString() }) -join "`n"
  if ($text -notmatch [regex]::Escape($ExpectedMessage)) {
    throw "Command failed with an unexpected message. Expected '$ExpectedMessage' in: $text"
  }
}

if (-not (Test-Path -LiteralPath $scriptPath)) {
  throw "scripts/new-production-env-files.ps1 must exist."
}

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("ez-one-prod-env-contract-" + [System.Guid]::NewGuid().ToString("N"))
try {
  $origin = "https://ez-one.kr"
  & powershell -NoProfile -ExecutionPolicy Bypass -File $scriptPath -OutputDirectory $tempRoot -Origin $origin -ExtensionId "ikpeibohnopmikegoogggmdipmhmiadi"
  if ($LASTEXITCODE -ne 0) {
    throw "new-production-env-files.ps1 failed with exit code $LASTEXITCODE"
  }

  $backendPath = Join-Path $tempRoot "ez-one.prod.env"
  $frontendPath = Join-Path $tempRoot "frontend.prod.env"
  $extensionPath = Join-Path $tempRoot "extension.prod.env"
  foreach ($path in @($backendPath, $frontendPath, $extensionPath)) {
    Assert-True (Test-Path -LiteralPath $path) "Expected generated env file: $path"
    Assert-NoUtf8Bom $path
  }

  $backend = Read-EnvFile $backendPath
  $frontend = Read-EnvFile $frontendPath
  $extension = Read-EnvFile $extensionPath

  Assert-Equals $backend["APP_ENV"] "prod" "Backend env must be production scoped."
  Assert-Equals $backend["SPRING_PROFILES_ACTIVE"] "mysql" "Backend env must use the MySQL Spring profile in production."
  Assert-Equals $backend["SERVER_ADDRESS"] "127.0.0.1" "Backend must bind to loopback behind nginx."
  Assert-Equals $backend["AUTH_LOCAL_DEV_TOKEN_ENABLED"] "false" "Local dev token must be disabled."
  Assert-Equals $backend["APP_DOCS_ENABLED"] "false" "Swagger/docs must be disabled by default."
  Assert-Equals $backend["AUTH_REFRESH_COOKIE_SECURE"] "true" "Refresh cookie must be Secure."
  Assert-Equals $backend["FLYWAY_ENABLED"] "true" "Flyway must be enabled."
  Assert-Equals $backend["SQL_INIT_MODE"] "never" "Production env must not enable SQL schema initialization."
  Assert-Equals $backend["CORS_ALLOWED_ORIGINS"] $origin "CORS must use the production origin."
  Assert-Equals $backend["APP_PUBLIC_BASE_URL"] $origin "Backend public links must use the production origin."
  Assert-True ($backend["JWT_ACCESS_SECRET"].Length -ge 64) "JWT_ACCESS_SECRET must be generated with strong entropy."
  Assert-True ($backend["JWT_REFRESH_SECRET"].Length -ge 64) "JWT_REFRESH_SECRET must be generated with strong entropy."
  Assert-True ($backend["JWT_ACCESS_SECRET"] -ne $backend["JWT_REFRESH_SECRET"]) "JWT secrets must be different."
  Assert-True ([Convert]::FromBase64String($backend["NOTION_TOKEN_ENCRYPTION_KEY"]).Length -eq 32) "NOTION_TOKEN_ENCRYPTION_KEY must be a Base64-encoded 32-byte key."
  Assert-Equals $backend["DB_HOST"] "CHANGE_ME_DB_HOST" "Generated backend env must mark DB host as a required human value."
  Assert-Equals $backend["GOOGLE_CLIENT_SECRET"] "CHANGE_ME_GOOGLE_CLIENT_SECRET" "Generated backend env must mark Google secret as a required human value."
  Assert-Equals $backend["NOTION_CLIENT_SECRET"] "CHANGE_ME_NOTION_CLIENT_SECRET" "Generated backend env must mark Notion secret as a required human value."
  Assert-Equals $backend["COMPANY_ENRICHMENT_REALTIME_ENABLED"] "false" "Generated backend env must disable realtime company enrichment until an operator enables it with keys."
  Assert-Equals $backend["COMPANY_DATA_STARTUP_SYNC_ENABLED"] "false" "Generated backend env must disable startup company sync in production."
  Assert-Equals $backend["COMPANY_DATA_BATCH_SYNC_ENABLED"] "false" "Generated backend env must disable batch company sync in production."
  Assert-Equals $backend["PUBLIC_DATA_API_KEY"] "" "Generated backend env may omit PUBLIC_DATA_API_KEY while company enrichment is disabled."
  Assert-Equals $backend["GMS_AI_BASE_URL"] "https://gms.ssafy.io/gmsapi/api.openai.com/v1" "Generated backend env must include the reviewed GMS AI base URL."
  Assert-Equals $backend["GMS_KEY_INFO_URL"] "https://gms.ssafy.io/gmsapi/key-info" "Generated backend env must include the reviewed GMS key-info URL."
  Assert-Equals $backend["OPENDART_API_BASE_URL"] "https://opendart.fss.or.kr/api" "Generated backend env must include the reviewed OpenDART API base URL."
  Assert-Equals $backend["OPENDART_VIEWER_BASE_URL"] "https://dart.fss.or.kr/dsaf001/main.do" "Generated backend env must include the reviewed OpenDART viewer URL."
  Assert-Equals $backend["OPENDART_COMPANY_OVERVIEW_SOURCE_URL"] "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS001&apiId=2019002" "Generated backend env must include the reviewed OpenDART company overview source URL."
  Assert-Equals $backend["VENTURE_COMPANY_API_URL"] "http://apis.data.go.kr/1423000/VentureCompanyService/getVentureCompanyList" "Generated backend env must include the reviewed Venture public-data URL."
  Assert-Equals $backend["NATIONAL_PENSION_API_URL"] "http://apis.data.go.kr/B552015/NpsBplcInfoInqireServiceV2/getBassInfoSearchV2" "Generated backend env must include the reviewed National Pension public-data URL."
  Assert-Equals $backend["PUBLIC_INSTITUTION_API_URL"] "http://apis.data.go.kr/1051000/public_inst/list" "Generated backend env must include the reviewed public institution URL."
  Assert-Equals $backend["FTC_AFFILIATE_API_URL"] "http://apis.data.go.kr/1130000/appnGroupAffiList/appnGroupAffiListApi" "Generated backend env must include the reviewed FTC affiliate URL."
  Assert-Equals $backend["FINANCIAL_COMPANY_BASIC_INFO_URL"] "" "Generated backend env must include the optional financial company URL key as blank until reviewed."
  Assert-Equals $backend["MIDDLE_MARKET_API_URL"] "" "Generated backend env must include the optional middle market URL key as blank until reviewed."

  Assert-Equals $frontend["VITE_API_BASE_URL"] "$origin/api" "Frontend API URL must target the production origin."
  Assert-Equals $frontend["VITE_API_FALLBACK_BASE_URLS"] "" "Frontend production fallback URL must start empty."
  Assert-Equals $frontend["VITE_GOOGLE_REDIRECT_URI"] "$origin/login/callback" "Frontend Google redirect must target production."
  Assert-Equals $frontend["VITE_NOTION_REDIRECT_URI"] "$origin/mypage/notion" "Frontend Notion redirect must target production."
  Assert-Equals $frontend["VITE_EXTENSION_INSTALL_URL"] "CHANGE_ME_EXTENSION_INSTALL_URL" "Generated frontend env must mark extension install URL as a required human value."
  Assert-Equals $frontend["VITE_EXTENSION_ID"] "ikpeibohnopmikegoogggmdipmhmiadi" "Frontend extension ID must be copied from input."
  Assert-Equals $extension["VITE_EXTENSION_API_BASE_URL"] "$origin/api" "Extension API URL must target production."
  Assert-Equals $extension["VITE_EXTENSION_API_FALLBACK_BASE_URLS"] "" "Extension production fallback URL must start empty."
  Assert-Equals $extension["VITE_EXTENSION_WEB_APP_URL"] $origin "Extension web app URL must target production."

  Assert-ScriptFails `
    -ScriptPath $backendEnvCheckPath `
    -Arguments @("-EnvFile", $backendPath) `
    -ExpectedMessage "must not look like a placeholder"

  Assert-ScriptFails `
    -ScriptPath $clientEnvCheckPath `
    -Arguments @("-FrontendEnvFile", $frontendPath, "-ExtensionEnvFile", $extensionPath) `
    -ExpectedMessage "must not look like a placeholder"

  Assert-CommandFails `
    -Arguments @("-OutputDirectory", (Join-Path $tempRoot "loopback-origin"), "-Origin", "https://127.0.0.2") `
    -ExpectedMessage "Origin must not be a local host for production env files."

  Assert-CommandFails `
    -Arguments @("-OutputDirectory", (Join-Path $tempRoot "zero-origin"), "-Origin", "https://0.0.0.0") `
    -ExpectedMessage "Origin must not be a local host for production env files."

  Assert-CommandFails -Arguments @("-OutputDirectory", $tempRoot, "-Origin", $origin) -ExpectedMessage "already exists"

  & powershell -NoProfile -ExecutionPolicy Bypass -File $scriptPath -OutputDirectory $tempRoot -Origin $origin -Force
  if ($LASTEXITCODE -ne 0) {
    throw "new-production-env-files.ps1 -Force failed with exit code $LASTEXITCODE"
  }

  $beginnerGuide = Get-Content -Raw -LiteralPath $beginnerGuidePath
  $koreanBeginnerGuide = Get-Content -Raw -LiteralPath $koreanBeginnerGuidePath
  $runbook = Get-Content -Raw -LiteralPath $runbookPath
  foreach ($text in @($beginnerGuide, $koreanBeginnerGuide, $runbook)) {
    if ($text -notmatch [regex]::Escape("scripts\new-production-env-files.ps1")) {
      throw "Deployment docs must reference scripts\new-production-env-files.ps1."
    }
    if ($text -notmatch [regex]::Escape(".\scripts\new-production-env-files.ps1 -Origin https://ez-one.kr -OutputDirectory .\secrets")) {
      throw "Deployment docs must show new-production-env-files.ps1 with the required -Origin and -OutputDirectory arguments."
    }
  }

  Write-Host "[PASS] new production env files contract test passed."
} finally {
  Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
}
