[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$EnvFile,

  [ValidateSet("prod", "staging")]
  [string]$ExpectedAppEnv = "prod"
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

  return [pscustomobject]@{
    Path = $resolvedPath
    Values = $values
    Duplicates = $duplicates
  }
}

function Assert-EnvEquals {
  param(
    [System.Collections.IDictionary]$Values,
    [string]$Key,
  [string]$Expected
)
  if (-not $Values.Contains($Key) -or $Values[$Key] -ne $Expected) {
    throw "$Key must be '$Expected' for release env policy."
  }
}

function Assert-EnvPresent {
  param(
    [System.Collections.IDictionary]$Values,
    [string]$Key
  )
  if (-not $Values.Contains($Key) -or [string]::IsNullOrWhiteSpace($Values[$Key])) {
    throw "$Key must be present and non-empty."
  }
}

function Assert-MinSecretLength {
  param(
    [System.Collections.IDictionary]$Values,
    [string]$Key,
    [int]$MinLength
  )
  Assert-EnvPresent $Values $Key
  if ($Values[$Key].Length -lt $MinLength) {
    throw "$Key must be at least $MinLength characters."
  }
}

function Assert-NotPlaceholder {
  param(
    [System.Collections.IDictionary]$Values,
    [string]$Key
  )

  Assert-EnvPresent $Values $Key
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

function Assert-EnvValuesDifferent {
  param(
    [System.Collections.IDictionary]$Values,
    [string]$LeftKey,
    [string]$RightKey
  )

  Assert-EnvPresent $Values $LeftKey
  Assert-EnvPresent $Values $RightKey
  if ($Values[$LeftKey] -eq $Values[$RightKey]) {
    throw "$LeftKey and $RightKey must be different."
  }
}

function Assert-EnvNotEquals {
  param(
    [System.Collections.IDictionary]$Values,
    [string]$Key,
    [string]$DisallowedValue,
    [string]$Message
  )

  Assert-EnvPresent $Values $Key
  if ($Values[$Key].Trim().ToLowerInvariant() -eq $DisallowedValue.ToLowerInvariant()) {
    throw $Message
  }
}

function Assert-Base64KeyBytes {
  param(
    [System.Collections.IDictionary]$Values,
    [string]$Key,
    [int]$ExpectedBytes
  )

  Assert-EnvPresent $Values $Key
  try {
    $decoded = [System.Convert]::FromBase64String($Values[$Key])
  } catch {
    throw "$Key must be a Base64-encoded $ExpectedBytes-byte key."
  }
  if ($decoded.Length -ne $ExpectedBytes) {
    throw "$Key must be a Base64-encoded $ExpectedBytes-byte key."
  }
}

function Assert-HttpsNonLocalUrl {
  param(
    [System.Collections.IDictionary]$Values,
    [string]$Key
  )

  if (-not $Values.Contains($Key) -or [string]::IsNullOrWhiteSpace($Values[$Key])) {
    return
  }

  $uri = $null
  if (-not [System.Uri]::TryCreate($Values[$Key], [System.UriKind]::Absolute, [ref]$uri)) {
    throw "$Key must be an absolute HTTPS URL."
  }
  if ($uri.Scheme -ne "https" -or (Test-LocalHost $uri.Host)) {
    throw "$Key must use HTTPS and must not point to a local host."
  }
}

function Assert-HttpsNonLocalOrigin {
  param(
    [System.Collections.IDictionary]$Values,
    [string]$Key
  )

  Assert-HttpsNonLocalUrl $Values $Key
  Assert-EnvPresent $Values $Key
  $uri = [System.Uri]$Values[$Key]
  if ($uri.AbsolutePath -ne "/" -or -not [string]::IsNullOrEmpty($uri.Query) -or -not [string]::IsNullOrEmpty($uri.Fragment) -or $Values[$Key].EndsWith("/")) {
    throw "$Key must be an HTTPS origin only, without path, query string, fragment, or trailing slash."
  }
}

function Assert-OfficialProductionEndpoint {
  param(
    [System.Collections.IDictionary]$Values,
    [string]$Key,
    [string]$ExpectedUrl
  )

  Assert-HttpsNonLocalUrl $Values $Key
  if (-not $Values.Contains($Key) -or [string]::IsNullOrWhiteSpace($Values[$Key])) {
    return
  }
  if ($Values[$Key].Trim() -ne $ExpectedUrl) {
    throw "$Key must be the official production endpoint: $ExpectedUrl"
  }
}

function Assert-EnvOneOf {
  param(
    [System.Collections.IDictionary]$Values,
    [string]$Key,
    [string[]]$AllowedValues
  )
  Assert-EnvPresent $Values $Key
  if ($AllowedValues -notcontains $Values[$Key]) {
    throw "$Key must be one of: $($AllowedValues -join ', ')."
  }
}

function Assert-PositiveInteger {
  param(
    [System.Collections.IDictionary]$Values,
    [string]$Key
  )
  Assert-EnvPresent $Values $Key
  $parsed = 0
  if (-not [int]::TryParse($Values[$Key], [ref]$parsed) -or $parsed -lt 1) {
    throw "$Key must be a positive integer."
  }
}

function Assert-OptionalPositiveInteger {
  param(
    [System.Collections.IDictionary]$Values,
    [string]$Key
  )

  if (-not $Values.Contains($Key) -or [string]::IsNullOrWhiteSpace($Values[$Key])) {
    return
  }
  Assert-PositiveInteger $Values $Key
}

function Test-IsPlaceholderValue {
  param([string]$Value)

  $normalized = $Value.Trim().ToLowerInvariant()
  foreach ($token in @("change-me", "change_me", "changeme", "placeholder", "example", "dummy", "local-only", "dev-only", "client-id")) {
    if ($normalized.Contains($token)) {
      return $true
    }
  }
  return $Value -match "^(.)\1{15,}$"
}

function Fail-Policy {
  param([string]$Message)

  Write-Host $Message
  throw $Message
}

function Assert-RequiredBoolean {
  param(
    [System.Collections.IDictionary]$Values,
    [string]$Key
  )

  Assert-EnvPresent $Values $Key
  if ($Values[$Key] -notin @("true", "false")) {
    Fail-Policy "$Key must be a boolean value: true or false."
  }
}

function Assert-OptionalSecretPolicy {
  param(
    [System.Collections.IDictionary]$Values,
    [string]$Key,
    [int]$MinLength
  )

  if (-not $Values.Contains($Key) -or [string]::IsNullOrWhiteSpace($Values[$Key])) {
    return
  }
  if ($Values[$Key].Length -lt $MinLength -or (Test-IsPlaceholderValue $Values[$Key])) {
    Fail-Policy "$Key must be blank or at least $MinLength characters and not a placeholder."
  }
}

function Assert-OptionalCommaSeparatedSecretPolicy {
  param(
    [System.Collections.IDictionary]$Values,
    [string]$Key,
    [int]$MinLength
  )

  if (-not $Values.Contains($Key) -or [string]::IsNullOrWhiteSpace($Values[$Key])) {
    return
  }

  $entries = @($Values[$Key].Split(",") | ForEach-Object { $_.Trim() } | Where-Object { $_ })
  foreach ($entry in $entries) {
    if ($entry.Length -lt $MinLength -or (Test-IsPlaceholderValue $entry)) {
      Fail-Policy "$Key entries must be blank or at least $MinLength characters and not placeholders."
    }
  }
}

function Test-LocalHost {
  param([string]$Value)

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return $false
  }

  $normalized = $Value.Trim().TrimStart("[").TrimEnd("]").TrimEnd(".").ToLowerInvariant()
  if ($normalized -eq "localhost") {
    return $true
  }

  $ipAddress = $null
  if ([System.Net.IPAddress]::TryParse($normalized, [ref]$ipAddress)) {
    return [System.Net.IPAddress]::IsLoopback($ipAddress) -or $ipAddress.Equals([System.Net.IPAddress]::Any) -or $ipAddress.Equals([System.Net.IPAddress]::IPv6Any)
  }

  return $false
}

function Get-OptionalAbsoluteUri {
  param(
    [System.Collections.IDictionary]$Values,
    [string]$Key,
    [string]$Message
  )

  if (-not $Values.Contains($Key) -or [string]::IsNullOrWhiteSpace($Values[$Key])) {
    return $null
  }
  $uri = $null
  if (-not [System.Uri]::TryCreate($Values[$Key], [System.UriKind]::Absolute, [ref]$uri)) {
    Fail-Policy $Message
  }
  return $uri
}

function Assert-OptionalHttpsHostPath {
  param(
    [System.Collections.IDictionary]$Values,
    [string]$Key,
    [string]$ExpectedHost,
    [string]$Path,
    [bool]$PathPrefix,
    [string]$Message
  )

  $uri = Get-OptionalAbsoluteUri $Values $Key $Message
  if ($null -eq $uri) {
    return
  }
  $actualHost = $uri.Host.ToLowerInvariant()
  $actualPath = $uri.AbsolutePath
  $pathMatches = if ($PathPrefix) {
    $actualPath.StartsWith($Path, [System.StringComparison]::OrdinalIgnoreCase)
  } else {
    $actualPath.Equals($Path, [System.StringComparison]::OrdinalIgnoreCase)
  }
  if ($uri.Scheme -ne "https" -or (Test-LocalHost $uri.Host) -or $actualHost -ne $ExpectedHost -or -not $pathMatches) {
    Fail-Policy $Message
  }
}

function Assert-OptionalOpenDartCompanyOverviewSourceUrl {
  param([System.Collections.IDictionary]$Values)

  $key = "OPENDART_COMPANY_OVERVIEW_SOURCE_URL"
  $message = "$key must use HTTPS, must not point to a local host, must use host opendart.fss.or.kr, path /guide/detail.do, and query parameters apiGrpCd=DS001 and apiId=2019002."
  $uri = Get-OptionalAbsoluteUri $Values $key $message
  if ($null -eq $uri) {
    return
  }

  $actualHost = $uri.Host.ToLowerInvariant()
  if ($uri.Scheme -ne "https" -or (Test-LocalHost $uri.Host) -or $actualHost -ne "opendart.fss.or.kr" -or -not $uri.AbsolutePath.Equals("/guide/detail.do", [System.StringComparison]::OrdinalIgnoreCase)) {
    Fail-Policy $message
  }

  $queryValues = @{}
  foreach ($pair in $uri.Query.TrimStart("?").Split("&", [System.StringSplitOptions]::RemoveEmptyEntries)) {
    $separator = $pair.IndexOf("=")
    if ($separator -lt 1) {
      continue
    }
    $name = [System.Uri]::UnescapeDataString($pair.Substring(0, $separator))
    $value = [System.Uri]::UnescapeDataString($pair.Substring($separator + 1))
    $queryValues[$name] = $value
  }

  if (-not $queryValues.ContainsKey("apiGrpCd") -or $queryValues["apiGrpCd"] -ne "DS001" -or
      -not $queryValues.ContainsKey("apiId") -or $queryValues["apiId"] -ne "2019002") {
    Fail-Policy $message
  }
}

function Assert-OptionalHttpOrHttpsHostPath {
  param(
    [System.Collections.IDictionary]$Values,
    [string]$Key,
    [string]$ExpectedHost,
    [string]$Path,
    [string]$Message
  )

  $uri = Get-OptionalAbsoluteUri $Values $Key $Message
  if ($null -eq $uri) {
    return
  }
  $actualHost = $uri.Host.ToLowerInvariant()
  if ($uri.Scheme -notin @("http", "https") -or $actualHost -ne $ExpectedHost -or -not $uri.AbsolutePath.Equals($Path, [System.StringComparison]::OrdinalIgnoreCase)) {
    Fail-Policy $Message
  }
}

function Assert-OptionalHttpsNonLocalUrlWithMessage {
  param(
    [System.Collections.IDictionary]$Values,
    [string]$Key,
    [string]$Message
  )

  $uri = Get-OptionalAbsoluteUri $Values $Key $Message
  if ($null -eq $uri) {
    return
  }
  if ($uri.Scheme -ne "https" -or (Test-LocalHost $uri.Host)) {
    Fail-Policy $Message
  }
}

function Assert-ExactHttpsOrigins {
  param([System.Collections.IDictionary]$Values)

  Assert-EnvPresent $Values "CORS_ALLOWED_ORIGINS"
  $origins = @($Values["CORS_ALLOWED_ORIGINS"].Split(",") | ForEach-Object { $_.Trim() } | Where-Object { $_ })
  if ($origins.Count -eq 0) {
    throw "CORS_ALLOWED_ORIGINS must contain at least one exact origin."
  }
  foreach ($origin in $origins) {
    if ($origin.Contains("*")) {
      throw "CORS_ALLOWED_ORIGINS must not contain wildcards."
    }
    if (-not $origin.StartsWith("https://")) {
      throw "CORS_ALLOWED_ORIGINS must use HTTPS origins in production."
    }
    if ($origin.EndsWith("/")) {
      throw "CORS_ALLOWED_ORIGINS must not contain trailing slashes: $origin"
    }
    $uri = $null
    if (-not [System.Uri]::TryCreate($origin, [System.UriKind]::Absolute, [ref]$uri)) {
      throw "CORS_ALLOWED_ORIGINS contains an invalid origin: $origin"
    }
    if (Test-LocalHost $uri.Host) {
      throw "CORS_ALLOWED_ORIGINS must not contain local origins in production."
    }
    if ($uri.AbsolutePath -ne "/" -or -not [string]::IsNullOrEmpty($uri.Query) -or -not [string]::IsNullOrEmpty($uri.Fragment)) {
      throw "CORS_ALLOWED_ORIGINS must contain origins only, without paths, query strings, fragments, or trailing slashes: $origin"
    }
  }
}

$envFileData = Read-EnvFile $EnvFile
$values = $envFileData.Values

if ($envFileData.Duplicates.Count -gt 0) {
  throw "Duplicate env keys are not allowed: $($envFileData.Duplicates -join ', ')"
}

Assert-EnvEquals $values "APP_ENV" $ExpectedAppEnv
Assert-EnvEquals $values "SPRING_PROFILES_ACTIVE" "mysql"
Assert-EnvEquals $values "AUTH_LOCAL_DEV_TOKEN_ENABLED" "false"
Assert-EnvEquals $values "APP_DOCS_ENABLED" "false"
Assert-EnvEquals $values "AUTH_REFRESH_COOKIE_SECURE" "true"
Assert-EnvOneOf $values "AUTH_REFRESH_COOKIE_SAME_SITE" @("Strict", "Lax", "None")
Assert-PositiveInteger $values "AUTH_REFRESH_COOKIE_MAX_AGE_SECONDS"
Assert-EnvEquals $values "FLYWAY_ENABLED" "true"
Assert-EnvEquals $values "SQL_INIT_MODE" "never"
Assert-EnvEquals $values "SERVER_ADDRESS" "127.0.0.1"
Assert-ExactHttpsOrigins $values
Assert-HttpsNonLocalOrigin $values "APP_PUBLIC_BASE_URL"

Assert-EnvPresent $values "DB_HOST"
Assert-EnvPresent $values "DB_NAME"
Assert-EnvPresent $values "DB_USERNAME"
Assert-EnvPresent $values "DB_PASSWORD"
Assert-NotPlaceholder $values "DB_HOST"
Assert-NotPlaceholder $values "DB_NAME"
Assert-NotPlaceholder $values "DB_USERNAME"
Assert-EnvNotEquals $values "DB_USERNAME" "root" "DB_USERNAME must not be root in production."
Assert-NotPlaceholder $values "DB_PASSWORD"
Assert-MinSecretLength $values "DB_PASSWORD" 16
if ($values.Contains("DB_PORT") -and -not [string]::IsNullOrWhiteSpace($values["DB_PORT"])) {
  Assert-PositiveInteger $values "DB_PORT"
}
Assert-MinSecretLength $values "JWT_ACCESS_SECRET" 32
Assert-MinSecretLength $values "JWT_REFRESH_SECRET" 32
Assert-NotPlaceholder $values "JWT_ACCESS_SECRET"
Assert-NotPlaceholder $values "JWT_REFRESH_SECRET"
Assert-EnvValuesDifferent $values "JWT_ACCESS_SECRET" "JWT_REFRESH_SECRET"
Assert-OptionalPositiveInteger $values "JWT_ACCESS_TTL_MINUTES"
Assert-OptionalPositiveInteger $values "JWT_REFRESH_TTL_DAYS"
Assert-EnvPresent $values "GOOGLE_CLIENT_ID"
Assert-NotPlaceholder $values "GOOGLE_CLIENT_ID"
Assert-EnvPresent $values "GOOGLE_CLIENT_SECRET"
Assert-NotPlaceholder $values "GOOGLE_CLIENT_SECRET"
Assert-MinSecretLength $values "GOOGLE_CLIENT_SECRET" 16
Assert-OfficialProductionEndpoint $values "GOOGLE_TOKEN_URI" "https://oauth2.googleapis.com/token"
Assert-OfficialProductionEndpoint $values "GOOGLE_USER_INFO_URI" "https://www.googleapis.com/oauth2/v3/userinfo"
Assert-EnvPresent $values "NOTION_CLIENT_ID"
Assert-NotPlaceholder $values "NOTION_CLIENT_ID"
Assert-EnvPresent $values "NOTION_CLIENT_SECRET"
Assert-NotPlaceholder $values "NOTION_CLIENT_SECRET"
Assert-MinSecretLength $values "NOTION_CLIENT_SECRET" 16
Assert-OfficialProductionEndpoint $values "NOTION_AUTHORIZATION_URI" "https://api.notion.com/v1/oauth/authorize"
Assert-OfficialProductionEndpoint $values "NOTION_TOKEN_URI" "https://api.notion.com/v1/oauth/token"
Assert-OfficialProductionEndpoint $values "NOTION_PAGES_URI" "https://api.notion.com/v1/pages"
Assert-OfficialProductionEndpoint $values "NOTION_DATABASES_URI" "https://api.notion.com/v1/databases"
Assert-Base64KeyBytes $values "NOTION_TOKEN_ENCRYPTION_KEY" 32

Assert-RequiredBoolean $values "COMPANY_ENRICHMENT_REALTIME_ENABLED"
if ($values["COMPANY_ENRICHMENT_REALTIME_ENABLED"] -eq "true") {
  if (-not $values.Contains("PUBLIC_DATA_API_KEY") -or
      [string]::IsNullOrWhiteSpace($values["PUBLIC_DATA_API_KEY"]) -or
      $values["PUBLIC_DATA_API_KEY"].Length -lt 16 -or
      (Test-IsPlaceholderValue $values["PUBLIC_DATA_API_KEY"])) {
    Fail-Policy "PUBLIC_DATA_API_KEY must be present, non-placeholder, and at least 16 characters when COMPANY_ENRICHMENT_REALTIME_ENABLED is true."
  }
}
Assert-RequiredBoolean $values "COMPANY_DATA_STARTUP_SYNC_ENABLED"
if ($values["COMPANY_DATA_STARTUP_SYNC_ENABLED"] -ne "false") {
  Fail-Policy "COMPANY_DATA_STARTUP_SYNC_ENABLED must be false in production."
}
Assert-RequiredBoolean $values "COMPANY_DATA_BATCH_SYNC_ENABLED"
if ($values["COMPANY_DATA_BATCH_SYNC_ENABLED"] -ne "false") {
  Fail-Policy "COMPANY_DATA_BATCH_SYNC_ENABLED must be false in production."
}

Assert-OptionalSecretPolicy $values "OPENDART_API_KEY" 16
Assert-OptionalSecretPolicy $values "GMS_API_KEY" 16
Assert-OptionalSecretPolicy $values "MATTERMOST_WEBHOOK_SECRET" 16
Assert-OptionalCommaSeparatedSecretPolicy $values "MATTERMOST_WEBHOOK_SECRETS" 16

Assert-OptionalHttpsHostPath $values "GMS_AI_BASE_URL" "gms.ssafy.io" "/" $true "GMS_AI_BASE_URL must use HTTPS, must not point to a local host, and must use host gms.ssafy.io."
Assert-OptionalHttpsHostPath $values "GMS_KEY_INFO_URL" "gms.ssafy.io" "/gmsapi/key-info" $false "GMS_KEY_INFO_URL must use HTTPS, must not point to a local host, must use host gms.ssafy.io, and must use path /gmsapi/key-info."
Assert-OptionalHttpsHostPath $values "OPENDART_API_BASE_URL" "opendart.fss.or.kr" "/api" $true "OPENDART_API_BASE_URL must use HTTPS, must not point to a local host, must use host opendart.fss.or.kr, and must use path prefix /api."
Assert-OptionalHttpsHostPath $values "OPENDART_VIEWER_BASE_URL" "dart.fss.or.kr" "/dsaf001/main.do" $false "OPENDART_VIEWER_BASE_URL must use HTTPS, must not point to a local host, must use host dart.fss.or.kr, and must use path /dsaf001/main.do."
Assert-OptionalOpenDartCompanyOverviewSourceUrl $values
Assert-OptionalHttpOrHttpsHostPath $values "VENTURE_COMPANY_API_URL" "apis.data.go.kr" "/1423000/VentureCompanyService/getVentureCompanyList" "VENTURE_COMPANY_API_URL must use http or https on host apis.data.go.kr with path /1423000/VentureCompanyService/getVentureCompanyList."
Assert-OptionalHttpOrHttpsHostPath $values "NATIONAL_PENSION_API_URL" "apis.data.go.kr" "/B552015/NpsBplcInfoInqireServiceV2/getBassInfoSearchV2" "NATIONAL_PENSION_API_URL must use http or https on host apis.data.go.kr with path /B552015/NpsBplcInfoInqireServiceV2/getBassInfoSearchV2."
Assert-OptionalHttpOrHttpsHostPath $values "PUBLIC_INSTITUTION_API_URL" "apis.data.go.kr" "/1051000/public_inst/list" "PUBLIC_INSTITUTION_API_URL must use http or https on host apis.data.go.kr with path /1051000/public_inst/list."
Assert-OptionalHttpOrHttpsHostPath $values "FTC_AFFILIATE_API_URL" "apis.data.go.kr" "/1130000/appnGroupAffiList/appnGroupAffiListApi" "FTC_AFFILIATE_API_URL must use http or https on host apis.data.go.kr with path /1130000/appnGroupAffiList/appnGroupAffiListApi."
Assert-OptionalHttpsNonLocalUrlWithMessage $values "FINANCIAL_COMPANY_BASIC_INFO_URL" "FINANCIAL_COMPANY_BASIC_INFO_URL must use HTTPS and must not point to a local host."
Assert-OptionalHttpsNonLocalUrlWithMessage $values "MIDDLE_MARKET_API_URL" "MIDDLE_MARKET_API_URL must use HTTPS and must not point to a local host."

Write-Host "[PASS] Release env policy check passed for $($envFileData.Path) with APP_ENV=$ExpectedAppEnv."
