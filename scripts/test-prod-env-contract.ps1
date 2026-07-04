[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$checkScript = Join-Path $repoRoot "scripts/check-prod-env.ps1"
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("ez-one-prod-env-contract-" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null

$ContractDbValue = "releasecheck-db-credential-value-2026"
$ContractAccessValue = "releasecheck-access-value-for-contracts-2026"
$ContractRefreshValue = "releasecheck-refresh-value-for-contracts-2026"
$ContractGoogleIdValue = "google-oauth-app-releasecheck-2026.apps.googleusercontent.com"
$ContractGoogleOAuthValue = "google-oauth-credential-releasecheck-value"
$ContractNotionIdValue = "notion-oauth-app-releasecheck-2026"
$ContractNotionOAuthValue = "notion-oauth-credential-releasecheck-value"
$ContractPublicDataValue = "public-data-releasecheck-value"

function Write-EnvFile {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,

    [Parameter(Mandatory = $true)]
    [string[]]$Lines
  )

  $path = Join-Path $tempRoot $Name
  Set-Content -LiteralPath $path -Encoding UTF8 -Value $Lines
  return $path
}

function Set-EnvLine {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Lines,

    [Parameter(Mandatory = $true)]
    [string]$Key,

    [AllowEmptyString()]
    [string]$Value
  )

  return @($Lines | ForEach-Object {
    if ($_ -like "$Key=*") { "$Key=$Value" } else { $_ }
  })
}

function Remove-EnvLine {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Lines,

    [Parameter(Mandatory = $true)]
    [string]$Key
  )

  return @($Lines | Where-Object { $_ -notlike "$Key=*" })
}

function New-GoodEnvLines {
  $contractEncryptionKey = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("not-a-real-contract-fixture-key!"))
  return @(
    "APP_ENV=prod",
    "SPRING_PROFILES_ACTIVE=mysql",
    "AUTH_LOCAL_DEV_TOKEN_ENABLED=false",
    "APP_DOCS_ENABLED=false",
    "AUTH_REFRESH_COOKIE_SECURE=true",
    "AUTH_REFRESH_COOKIE_SAME_SITE=Lax",
    "AUTH_REFRESH_COOKIE_MAX_AGE_SECONDS=2592000",
    "FLYWAY_ENABLED=true",
    "SQL_INIT_MODE=never",
    "SERVER_ADDRESS=127.0.0.1",
    "CORS_ALLOWED_ORIGINS=https://app.example.com",
    "APP_PUBLIC_BASE_URL=https://app.example.com",
    "DB_HOST=db.internal.ezone",
    "DB_PORT=3306",
    "DB_NAME=ez_one",
    "DB_USERNAME=ez_one_app",
    "DB_PASSWORD=$ContractDbValue",
    "JWT_ACCESS_SECRET=$ContractAccessValue",
    "JWT_REFRESH_SECRET=$ContractRefreshValue",
    "GOOGLE_CLIENT_ID=$ContractGoogleIdValue",
    "GOOGLE_CLIENT_SECRET=$ContractGoogleOAuthValue",
    "GOOGLE_TOKEN_URI=https://oauth2.googleapis.com/token",
    "GOOGLE_USER_INFO_URI=https://www.googleapis.com/oauth2/v3/userinfo",
    "NOTION_CLIENT_ID=$ContractNotionIdValue",
    "NOTION_CLIENT_SECRET=$ContractNotionOAuthValue",
    "NOTION_AUTHORIZATION_URI=https://api.notion.com/v1/oauth/authorize",
    "NOTION_TOKEN_URI=https://api.notion.com/v1/oauth/token",
    "NOTION_PAGES_URI=https://api.notion.com/v1/pages",
    "NOTION_DATABASES_URI=https://api.notion.com/v1/databases",
    "NOTION_VERSION=2022-06-28",
    "NOTION_TOKEN_ENCRYPTION_KEY=$contractEncryptionKey",
    "COMPANY_ENRICHMENT_REALTIME_ENABLED=false",
    "COMPANY_DATA_STARTUP_SYNC_ENABLED=false",
    "COMPANY_DATA_BATCH_SYNC_ENABLED=false",
    "PUBLIC_DATA_API_KEY=$ContractPublicDataValue",
    "OPENDART_API_KEY=",
    "GMS_API_KEY=",
    "MATTERMOST_WEBHOOK_SECRET=",
    "MATTERMOST_WEBHOOK_SECRETS=",
    "GMS_AI_BASE_URL=https://gms.ssafy.io",
    "GMS_KEY_INFO_URL=https://gms.ssafy.io/gmsapi/key-info",
    "OPENDART_API_BASE_URL=https://opendart.fss.or.kr/api",
    "OPENDART_VIEWER_BASE_URL=https://dart.fss.or.kr/dsaf001/main.do",
    "OPENDART_COMPANY_OVERVIEW_SOURCE_URL=https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS001&apiId=2019002",
    "VENTURE_COMPANY_API_URL=http://apis.data.go.kr/1423000/VentureCompanyService/getVentureCompanyList",
    "NATIONAL_PENSION_API_URL=http://apis.data.go.kr/B552015/NpsBplcInfoInqireServiceV2/getBassInfoSearchV2",
    "PUBLIC_INSTITUTION_API_URL=http://apis.data.go.kr/1051000/public_inst/list",
    "FTC_AFFILIATE_API_URL=http://apis.data.go.kr/1130000/appnGroupAffiList/appnGroupAffiListApi",
    "FINANCIAL_COMPANY_BASIC_INFO_URL=",
    "MIDDLE_MARKET_API_URL="
  )
}

function Invoke-Check {
  param([string]$Path)

  $previousErrorActionPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = "Continue"
    $output = & powershell -NoProfile -ExecutionPolicy Bypass -File $checkScript -EnvFile $Path 2>&1
    return [pscustomobject]@{
      ExitCode = $LASTEXITCODE
      Output = ($output | ForEach-Object { $_.ToString() }) -join "`n"
    }
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
}

function Assert-Passes {
  param([string]$Name, [string[]]$Lines)

  Write-Host "CASE $Name"
  $result = Invoke-Check (Write-EnvFile "$Name.env" $Lines)
  if ($result.ExitCode -ne 0) {
    throw "$Name should pass but failed with exit code $($result.ExitCode): $($result.Output)"
  }
  Write-Host "CASE_PASS $Name"
}

function Assert-Fails {
  param([string]$Name, [string[]]$Lines, [string]$ExpectedMessage)

  Write-Host "CASE $Name"
  $result = Invoke-Check (Write-EnvFile "$Name.env" $Lines)
  if ($result.ExitCode -eq 0) {
    throw "$Name should fail but passed."
  }
  if ($result.Output -notmatch [regex]::Escape($ExpectedMessage)) {
    throw "$Name failed with an unexpected message. Expected '$ExpectedMessage' in: $($result.Output)"
  }
  Write-Host "CASE_PASS $Name"
}

$script:policyFailures = New-Object System.Collections.Generic.List[string]

function Invoke-NewPolicyFailureCase {
  param(
    [string]$Name,
    [string[]]$Lines,
    [string]$ExpectedMessage,
    [string]$EvidenceSignal = ""
  )

  try {
    Assert-Fails $Name $Lines $ExpectedMessage
    if (-not [string]::IsNullOrWhiteSpace($EvidenceSignal)) {
      Write-Host "CASE_SIGNAL $Name $EvidenceSignal"
    }
  } catch {
    Write-Host "CASE_FAIL $Name $($_.Exception.Message)"
    $script:policyFailures.Add("$Name`: $($_.Exception.Message)")
  }
}

try {
  $good = New-GoodEnvLines
  Assert-Passes "good-prod-env" $good

  Assert-Fails `
    "local-spring-profile" `
    ($good | ForEach-Object {
      if ($_ -like "SPRING_PROFILES_ACTIVE=*") { "SPRING_PROFILES_ACTIVE=local" } else { $_ }
    }) `
    "SPRING_PROFILES_ACTIVE must be 'mysql' for release env policy."

  Assert-Fails `
    "sql-init-always" `
    ($good | ForEach-Object {
      if ($_ -like "SQL_INIT_MODE=*") { "SQL_INIT_MODE=always" } else { $_ }
    }) `
    "SQL_INIT_MODE must be 'never' for release env policy."

  Assert-Fails `
    "same-jwt-secrets" `
    ($good | ForEach-Object {
      if ($_ -like "JWT_REFRESH_SECRET=*") { "JWT_REFRESH_SECRET=$ContractAccessValue" } else { $_ }
    }) `
    "JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different."

  Assert-Fails `
    "placeholder-jwt-secret" `
    ($good | ForEach-Object {
      if ($_ -like "JWT_ACCESS_SECRET=*") { "JWT_ACCESS_SECRET=change-me-change-me-change-me-change-me-change-me" } else { $_ }
    }) `
    "JWT_ACCESS_SECRET must not look like a placeholder."

  Assert-Fails `
    "placeholder-db-password" `
    ($good | ForEach-Object {
      if ($_ -like "DB_PASSWORD=*") { "DB_PASSWORD=change-me-db-password" } else { $_ }
    }) `
    "DB_PASSWORD must not look like a placeholder."

  Assert-Fails `
    "short-db-password" `
    ($good | ForEach-Object {
      if ($_ -like "DB_PASSWORD=*") { "DB_PASSWORD=short-db-pass" } else { $_ }
    }) `
    "DB_PASSWORD must be at least 16 characters."

  Assert-Fails `
    "placeholder-db-host" `
    ($good | ForEach-Object {
      if ($_ -like "DB_HOST=*") { "DB_HOST=db.internal.example.com" } else { $_ }
    }) `
    "DB_HOST must not look like a placeholder."

  Assert-Fails `
    "change-me-db-host" `
    ($good | ForEach-Object {
      if ($_ -like "DB_HOST=*") { "DB_HOST=CHANGE_ME_DB_HOST" } else { $_ }
    }) `
    "DB_HOST must not look like a placeholder."

  Assert-Fails `
    "change-me-db-name" `
    ($good | ForEach-Object {
      if ($_ -like "DB_NAME=*") { "DB_NAME=CHANGE_ME_DB_NAME" } else { $_ }
    }) `
    "DB_NAME must not look like a placeholder."

  Assert-Fails `
    "root-db-username" `
    ($good | ForEach-Object {
      if ($_ -like "DB_USERNAME=*") { "DB_USERNAME=root" } else { $_ }
    }) `
    "DB_USERNAME must not be root in production."

  Assert-Fails `
    "placeholder-google-client-secret" `
    ($good | ForEach-Object {
      if ($_ -like "GOOGLE_CLIENT_SECRET=*") { "GOOGLE_CLIENT_SECRET=google-client-secret-placeholder" } else { $_ }
    }) `
    "GOOGLE_CLIENT_SECRET must not look like a placeholder."

  Assert-Fails `
    "short-google-client-secret" `
    ($good | ForEach-Object {
      if ($_ -like "GOOGLE_CLIENT_SECRET=*") { "GOOGLE_CLIENT_SECRET=gsec_short" } else { $_ }
    }) `
    "GOOGLE_CLIENT_SECRET must be at least 16 characters."

  Assert-Fails `
    "placeholder-google-client-id" `
    ($good | ForEach-Object {
      if ($_ -like "GOOGLE_CLIENT_ID=*") { "GOOGLE_CLIENT_ID=google-client-id" } else { $_ }
    }) `
    "GOOGLE_CLIENT_ID must not look like a placeholder."

  Assert-Fails `
    "change-me-google-client-id" `
    ($good | ForEach-Object {
      if ($_ -like "GOOGLE_CLIENT_ID=*") { "GOOGLE_CLIENT_ID=CHANGE_ME_GOOGLE_CLIENT_ID" } else { $_ }
    }) `
    "GOOGLE_CLIENT_ID must not look like a placeholder."

  Assert-Fails `
    "placeholder-notion-client-secret" `
    ($good | ForEach-Object {
      if ($_ -like "NOTION_CLIENT_SECRET=*") { "NOTION_CLIENT_SECRET=notion-client-secret-placeholder" } else { $_ }
    }) `
    "NOTION_CLIENT_SECRET must not look like a placeholder."

  Assert-Fails `
    "short-notion-client-secret" `
    ($good | ForEach-Object {
      if ($_ -like "NOTION_CLIENT_SECRET=*") { "NOTION_CLIENT_SECRET=nsec_short" } else { $_ }
    }) `
    "NOTION_CLIENT_SECRET must be at least 16 characters."

  Assert-Fails `
    "placeholder-notion-client-id" `
    ($good | ForEach-Object {
      if ($_ -like "NOTION_CLIENT_ID=*") { "NOTION_CLIENT_ID=notion-client-id" } else { $_ }
    }) `
    "NOTION_CLIENT_ID must not look like a placeholder."

  Assert-Fails `
    "change-me-notion-client-id" `
    ($good | ForEach-Object {
      if ($_ -like "NOTION_CLIENT_ID=*") { "NOTION_CLIENT_ID=CHANGE_ME_NOTION_CLIENT_ID" } else { $_ }
    }) `
    "NOTION_CLIENT_ID must not look like a placeholder."

  Assert-Fails `
    "plain-notion-encryption-key" `
    ($good | ForEach-Object {
      if ($_ -like "NOTION_TOKEN_ENCRYPTION_KEY=*") { "NOTION_TOKEN_ENCRYPTION_KEY=plain-text-secret-that-is-32-chars" } else { $_ }
    }) `
    "NOTION_TOKEN_ENCRYPTION_KEY must be a Base64-encoded 32-byte key."

  Assert-Fails `
    "local-google-token-uri" `
    ($good | ForEach-Object {
      if ($_ -like "GOOGLE_TOKEN_URI=*") { "GOOGLE_TOKEN_URI=http://localhost:8081/oauth/token" } else { $_ }
    }) `
    "GOOGLE_TOKEN_URI must use HTTPS and must not point to a local host."

  Assert-Fails `
    "wrong-google-token-uri" `
    ($good | ForEach-Object {
      if ($_ -like "GOOGLE_TOKEN_URI=*") { "GOOGLE_TOKEN_URI=https://oauth.ez-one.kr/token" } else { $_ }
    }) `
    "GOOGLE_TOKEN_URI must be the official production endpoint: https://oauth2.googleapis.com/token"

  Assert-Fails `
    "local-notion-api-uri" `
    ($good | ForEach-Object {
      if ($_ -like "NOTION_PAGES_URI=*") { "NOTION_PAGES_URI=https://127.0.0.1/v1/pages" } else { $_ }
    }) `
    "NOTION_PAGES_URI must use HTTPS and must not point to a local host."

  Assert-Fails `
    "wrong-notion-pages-uri" `
    ($good | ForEach-Object {
      if ($_ -like "NOTION_PAGES_URI=*") { "NOTION_PAGES_URI=https://api.ez-one.kr/v1/pages" } else { $_ }
    }) `
    "NOTION_PAGES_URI must be the official production endpoint: https://api.notion.com/v1/pages"

  Assert-Fails `
    "loopback-google-token-uri" `
    ($good | ForEach-Object {
      if ($_ -like "GOOGLE_TOKEN_URI=*") { "GOOGLE_TOKEN_URI=https://127.0.0.2/oauth/token" } else { $_ }
    }) `
    "GOOGLE_TOKEN_URI must use HTTPS and must not point to a local host."

  Assert-Fails `
    "zero-cors-origin" `
    ($good | ForEach-Object {
      if ($_ -like "CORS_ALLOWED_ORIGINS=*") { "CORS_ALLOWED_ORIGINS=https://0.0.0.0" } else { $_ }
    }) `
    "CORS_ALLOWED_ORIGINS must not contain local origins in production."

  Assert-Fails `
    "public-base-url-with-path" `
    ($good | ForEach-Object {
      if ($_ -like "APP_PUBLIC_BASE_URL=*") { "APP_PUBLIC_BASE_URL=https://app.example.com/app" } else { $_ }
    }) `
    "APP_PUBLIC_BASE_URL must be an HTTPS origin only, without path, query string, fragment, or trailing slash."

  Assert-Fails `
    "missing-public-base-url" `
    (Remove-EnvLine -Lines $good -Key "APP_PUBLIC_BASE_URL") `
    "APP_PUBLIC_BASE_URL must be present and non-empty."

  Assert-Fails `
    "local-public-base-url" `
    ($good | ForEach-Object {
      if ($_ -like "APP_PUBLIC_BASE_URL=*") { "APP_PUBLIC_BASE_URL=http://localhost:5173" } else { $_ }
    }) `
    "APP_PUBLIC_BASE_URL must use HTTPS and must not point to a local host."

  Assert-Fails `
    "ipv6-loopback-public-base-url" `
    (Set-EnvLine -Lines $good -Key "APP_PUBLIC_BASE_URL" -Value "https://[::1]") `
    "APP_PUBLIC_BASE_URL must use HTTPS and must not point to a local host."

  Assert-Fails `
    "normalized-ipv6-loopback-public-base-url" `
    (Set-EnvLine -Lines $good -Key "APP_PUBLIC_BASE_URL" -Value "https://[0000:0000:0000:0000:0000:0000:0000:0001]") `
    "APP_PUBLIC_BASE_URL must use HTTPS and must not point to a local host."

  Assert-Fails `
    "zero-jwt-access-ttl" `
    ($good + "JWT_ACCESS_TTL_MINUTES=0") `
    "JWT_ACCESS_TTL_MINUTES must be a positive integer."

  Assert-Fails `
    "zero-jwt-refresh-ttl" `
    ($good + "JWT_REFRESH_TTL_DAYS=0") `
    "JWT_REFRESH_TTL_DAYS must be a positive integer."

  Assert-Fails `
    "malformed-prod-env-line" `
    ($good + "MALFORMED_ENV_LINE_WITHOUT_EQUALS") `
    "Invalid env line without KEY=value: MALFORMED_ENV_LINE_WITHOUT_EQUALS"

  Invoke-NewPolicyFailureCase `
    "enabled-realtime-without-public-data-key" `
    (Remove-EnvLine -Lines (Set-EnvLine -Lines $good -Key "COMPANY_ENRICHMENT_REALTIME_ENABLED" -Value "true") -Key "PUBLIC_DATA_API_KEY") `
    "PUBLIC_DATA_API_KEY must be present, non-placeholder, and at least 16 characters when COMPANY_ENRICHMENT_REALTIME_ENABLED is true." `
    "required-key PUBLIC_DATA_API_KEY raw-value-redacted"

  Invoke-NewPolicyFailureCase `
    "optional-provider-key-too-short" `
    (Set-EnvLine -Lines $good -Key "OPENDART_API_KEY" -Value "short_key") `
    "OPENDART_API_KEY must be blank or at least 16 characters and not a placeholder."

  Invoke-NewPolicyFailureCase `
    "optional-provider-key-placeholder" `
    (Set-EnvLine -Lines $good -Key "GMS_API_KEY" -Value "change-me-gms-api-key") `
    "GMS_API_KEY must be blank or at least 16 characters and not a placeholder."

  Invoke-NewPolicyFailureCase `
    "mattermost-webhook-secrets-short-item" `
    (Set-EnvLine -Lines $good -Key "MATTERMOST_WEBHOOK_SECRETS" -Value "webhook_channel_token_alpha,short") `
    "MATTERMOST_WEBHOOK_SECRETS entries must be blank or at least 16 characters and not placeholders."

  Invoke-NewPolicyFailureCase `
    "mattermost-webhook-secrets-placeholder-item" `
    (Set-EnvLine -Lines $good -Key "MATTERMOST_WEBHOOK_SECRETS" -Value "webhook_channel_token_alpha,change-me-webhook-token") `
    "MATTERMOST_WEBHOOK_SECRETS entries must be blank or at least 16 characters and not placeholders."

  Assert-Passes `
    "mattermost-webhook-secrets-blank-items" `
    (Set-EnvLine -Lines $good -Key "MATTERMOST_WEBHOOK_SECRETS" -Value "webhook_channel_token_alpha, ,webhook_channel_token_beta")

  Invoke-NewPolicyFailureCase `
    "startup-sync-enabled-in-prod" `
    (Set-EnvLine -Lines $good -Key "COMPANY_DATA_STARTUP_SYNC_ENABLED" -Value "true") `
    "COMPANY_DATA_STARTUP_SYNC_ENABLED must be false in production."

  Invoke-NewPolicyFailureCase `
    "batch-sync-enabled-in-prod" `
    (Set-EnvLine -Lines $good -Key "COMPANY_DATA_BATCH_SYNC_ENABLED" -Value "true") `
    "COMPANY_DATA_BATCH_SYNC_ENABLED must be false in production."

  Invoke-NewPolicyFailureCase `
    "unsafe-gms-ai-base-url" `
    (Set-EnvLine -Lines $good -Key "GMS_AI_BASE_URL" -Value "http://localhost:8080") `
    "GMS_AI_BASE_URL must use HTTPS, must not point to a local host, and must use host gms.ssafy.io."

  Invoke-NewPolicyFailureCase `
    "unsafe-gms-key-info-url" `
    (Set-EnvLine -Lines $good -Key "GMS_KEY_INFO_URL" -Value "https://gms.ssafy.io/gmsapi/wrong") `
    "GMS_KEY_INFO_URL must use HTTPS, must not point to a local host, must use host gms.ssafy.io, and must use path /gmsapi/key-info."

  Invoke-NewPolicyFailureCase `
    "unsafe-opendart-api-base-url" `
    (Set-EnvLine -Lines $good -Key "OPENDART_API_BASE_URL" -Value "http://opendart.fss.or.kr/api") `
    "OPENDART_API_BASE_URL must use HTTPS, must not point to a local host, must use host opendart.fss.or.kr, and must use path prefix /api."

  Invoke-NewPolicyFailureCase `
    "unsafe-opendart-viewer-base-url" `
    (Set-EnvLine -Lines $good -Key "OPENDART_VIEWER_BASE_URL" -Value "https://opendart.fss.or.kr/dsaf001/main.do") `
    "OPENDART_VIEWER_BASE_URL must use HTTPS, must not point to a local host, must use host dart.fss.or.kr, and must use path /dsaf001/main.do."

  Invoke-NewPolicyFailureCase `
    "unsafe-opendart-company-overview-source-url" `
    (Set-EnvLine -Lines $good -Key "OPENDART_COMPANY_OVERVIEW_SOURCE_URL" -Value "https://opendart.fss.or.kr/guide/wrong.do") `
    "OPENDART_COMPANY_OVERVIEW_SOURCE_URL must use HTTPS, must not point to a local host, must use host opendart.fss.or.kr, path /guide/detail.do, and query parameters apiGrpCd=DS001 and apiId=2019002."

  Invoke-NewPolicyFailureCase `
    "opendart-company-overview-query-policy" `
    (Set-EnvLine -Lines $good -Key "OPENDART_COMPANY_OVERVIEW_SOURCE_URL" -Value "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS003&apiId=2019018") `
    "OPENDART_COMPANY_OVERVIEW_SOURCE_URL must use HTTPS, must not point to a local host, must use host opendart.fss.or.kr, path /guide/detail.do, and query parameters apiGrpCd=DS001 and apiId=2019002."

  Invoke-NewPolicyFailureCase `
    "opendart-company-overview-missing-query" `
    (Set-EnvLine -Lines $good -Key "OPENDART_COMPANY_OVERVIEW_SOURCE_URL" -Value "https://opendart.fss.or.kr/guide/detail.do") `
    "OPENDART_COMPANY_OVERVIEW_SOURCE_URL must use HTTPS, must not point to a local host, must use host opendart.fss.or.kr, path /guide/detail.do, and query parameters apiGrpCd=DS001 and apiId=2019002."

  Invoke-NewPolicyFailureCase `
    "unexpected-public-data-url" `
    (Set-EnvLine -Lines $good -Key "PUBLIC_INSTITUTION_API_URL" -Value "https://evil.example.test/1051000/public_inst/list") `
    "PUBLIC_INSTITUTION_API_URL must use http or https on host apis.data.go.kr with path /1051000/public_inst/list."

  Invoke-NewPolicyFailureCase `
    "unexpected-venture-company-url" `
    (Set-EnvLine -Lines $good -Key "VENTURE_COMPANY_API_URL" -Value "http://api.bad.invalid/1423000/VentureCompanyService/getVentureCompanyList") `
    "VENTURE_COMPANY_API_URL must use http or https on host apis.data.go.kr with path /1423000/VentureCompanyService/getVentureCompanyList."

  Invoke-NewPolicyFailureCase `
    "unexpected-national-pension-url" `
    (Set-EnvLine -Lines $good -Key "NATIONAL_PENSION_API_URL" -Value "http://apis.data.go.kr/B552015/NpsBplcInfoInqireServiceV2/wrongPath") `
    "NATIONAL_PENSION_API_URL must use http or https on host apis.data.go.kr with path /B552015/NpsBplcInfoInqireServiceV2/getBassInfoSearchV2."

  Invoke-NewPolicyFailureCase `
    "unexpected-ftc-affiliate-url" `
    (Set-EnvLine -Lines $good -Key "FTC_AFFILIATE_API_URL" -Value "https://apis.data.go.kr/1130000/appnGroupAffiList/wrongPath") `
    "FTC_AFFILIATE_API_URL must use http or https on host apis.data.go.kr with path /1130000/appnGroupAffiList/appnGroupAffiListApi."

  Invoke-NewPolicyFailureCase `
    "http-financial-company-basic-info-url" `
    (Set-EnvLine -Lines $good -Key "FINANCIAL_COMPANY_BASIC_INFO_URL" -Value "http://finlife.fss.or.kr/finlifeapi/companySearch.json") `
    "FINANCIAL_COMPANY_BASIC_INFO_URL must use HTTPS and must not point to a local host."

  Invoke-NewPolicyFailureCase `
    "local-middle-market-api-url" `
    (Set-EnvLine -Lines $good -Key "MIDDLE_MARKET_API_URL" -Value "https://127.0.0.1/middle-market") `
    "MIDDLE_MARKET_API_URL must use HTTPS and must not point to a local host."

  Invoke-NewPolicyFailureCase `
    "ipv6-loopback-provider-url" `
    (Set-EnvLine -Lines $good -Key "MIDDLE_MARKET_API_URL" -Value "https://[::1]/middle-market") `
    "MIDDLE_MARKET_API_URL must use HTTPS and must not point to a local host."

  if ($script:policyFailures.Count -gt 0) {
    Write-Host "CONTRACT_RED New production env policy contract cases failed intentionally before validator implementation: $($script:policyFailures -join ' | ')"
    exit 1
  }

  Write-Host "[PASS] Production env contract tests passed."
} finally {
  Remove-Item -LiteralPath $tempRoot -Recurse -Force
}
