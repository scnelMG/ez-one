[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$BaseUrl,

  [string]$AccessToken = "",

  [long]$WorkspaceId = 0,

  [switch]$RequireWorkspace,

  [switch]$RunNotionSync,

  [switch]$AllowAnonymousOnly,

  [int]$Iterations = 7,

  [int]$IntervalSeconds = 300,

  [string]$LogFile = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$transcriptStarted = $false
$resolvedLogFile = ""

function Join-Url {
  param([string]$Root, [string]$Path)
  return "$($Root.TrimEnd('/'))/$($Path.TrimStart('/'))"
}

function Invoke-CanaryRequest {
  param(
    [string]$Name,
    [string]$Method,
    [string]$Url,
    [bool]$Authenticated = $false,
    [bool]$ExpectApiResponse = $true
  )

  $headers = @{}
  if ($Authenticated) {
    if ([string]::IsNullOrWhiteSpace($AccessToken)) {
      if ($AllowAnonymousOnly) {
        Write-Host "[SKIP] $Name requires AccessToken"
        return
      }
      throw "$Name requires AccessToken. Use -AllowAnonymousOnly only for health-only smoke checks."
    }
    $headers["Authorization"] = "Bearer $AccessToken"
  }

  Write-Host "[RUN]  $Name"
  try {
    $response = Invoke-WebRequest -Method $Method -Uri $Url -Headers $headers -TimeoutSec 20 -UseBasicParsing
    if ($response.StatusCode -lt 200 -or $response.StatusCode -gt 299) {
      throw "$Name returned HTTP $($response.StatusCode)"
    }
    $content = ""
    if ($response.PSObject.Properties.Name -contains "Content" -and $null -ne $response.Content) {
      $content = [string]$response.Content
    }
    if ($content -match "(?i)password|secret|token|jdbc|stacktrace|exception|trace") {
      throw "$Name response appears to expose sensitive implementation details"
    }
    if ($ExpectApiResponse) {
      try {
        $json = $content | ConvertFrom-Json
      } catch {
        throw "$Name did not return valid JSON ApiResponse"
      }
      $propertyNames = @($json.PSObject.Properties.Name)
      if ($propertyNames -notcontains "success") {
        throw "$Name response is missing ApiResponse.success"
      }
      if ($json.success -ne $true) {
        $message = ""
        if ($propertyNames -contains "error" -and $json.error -and $json.error.PSObject.Properties.Name -contains "message") {
          $message = $json.error.message
        }
        throw "$Name returned ApiResponse.success=false $message"
      }
    }
  } catch {
    $errorMessage = $_.ToString()
    if ($_.Exception -and $_.Exception.Message) {
      $errorMessage = $_.Exception.Message
    }
    throw "$Name failed: $errorMessage"
  }
  Write-Host "[PASS] $Name"
}

function Invoke-FrontendShellRequest {
  param(
    [string]$Name,
    [string]$Url
  )

  Write-Host "[RUN]  $Name"
  try {
    $response = Invoke-WebRequest -Method "GET" -Uri $Url -TimeoutSec 20 -UseBasicParsing
    if ($response.StatusCode -lt 200 -or $response.StatusCode -gt 299) {
      throw "$Name returned HTTP $($response.StatusCode)"
    }
    $content = ""
    if ($response.PSObject.Properties.Name -contains "Content" -and $null -ne $response.Content) {
      $content = [string]$response.Content
    }
    if ($content -notmatch '<div[^>]+id=["'']app["'']') {
      throw "$Name did not return the Vue application shell"
    }
    if ($content -match "(?i)local-dev-access-token|localhost:8080|127\.0\.0\.1:8080|VITE_|password|secret|token") {
      throw "$Name response appears to expose development or sensitive configuration"
    }
  } catch {
    $errorMessage = $_.ToString()
    if ($_.Exception -and $_.Exception.Message) {
      $errorMessage = $_.Exception.Message
    }
    throw "$Name failed: $errorMessage"
  }
  Write-Host "[PASS] $Name"
}

if (-not [string]::IsNullOrWhiteSpace($LogFile)) {
  $resolvedLogFile = $LogFile
  if (-not [System.IO.Path]::IsPathRooted($resolvedLogFile)) {
    $resolvedLogFile = Join-Path (Get-Location) $resolvedLogFile
  }
  $logDirectory = Split-Path -Parent $resolvedLogFile
  New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null
  Start-Transcript -Path $resolvedLogFile -Force | Out-Null
  $transcriptStarted = $true
}

try {
if ($Iterations -lt 1) {
  throw "Iterations must be at least 1."
}

if ($BaseUrl -notmatch "^https://") {
  throw "BaseUrl must use https:// for release canary checks."
}

$baseUri = $null
if (-not [System.Uri]::TryCreate($BaseUrl, [System.UriKind]::Absolute, [ref]$baseUri)) {
  throw "BaseUrl must be an absolute HTTPS origin."
}
if ($baseUri.Scheme -ne "https") {
  throw "BaseUrl must use https:// for release canary checks."
}
if ($baseUri.AbsolutePath -ne "/" -or -not [string]::IsNullOrEmpty($baseUri.Query) -or -not [string]::IsNullOrEmpty($baseUri.Fragment)) {
  throw "BaseUrl must be an origin only, without path, query string, or fragment."
}
$baseHost = $baseUri.Host.ToLowerInvariant()
if ($baseHost -eq "localhost" -or $baseHost -eq "0.0.0.0" -or $baseHost -eq "::1" -or $baseHost.StartsWith("127.")) {
  throw "BaseUrl must not use a local host; use the deployed HTTPS domain."
}

if ($IntervalSeconds -lt 1) {
  throw "IntervalSeconds must be at least 1."
}

$expectedDurationSeconds = ($Iterations - 1) * $IntervalSeconds

if ($RequireWorkspace -and $WorkspaceId -le 0) {
  throw "RequireWorkspace needs a positive WorkspaceId."
}

if ($AllowAnonymousOnly -and ($RequireWorkspace -or $RunNotionSync -or $WorkspaceId -gt 0 -or -not [string]::IsNullOrWhiteSpace($AccessToken))) {
  throw "AllowAnonymousOnly cannot be combined with AccessToken, WorkspaceId, RequireWorkspace, or RunNotionSync. Production canaries must run authenticated checks."
}

Write-Host "[INFO] Canary schedule: iterations=$Iterations intervalSeconds=$IntervalSeconds expectedDurationSeconds=$expectedDurationSeconds"

$canaryStartedAt = [DateTimeOffset]::UtcNow
$canaryStartedAtUtc = $canaryStartedAt.ToString("o")

for ($index = 1; $index -le $Iterations; $index += 1) {
  Write-Host "[CANARY] Iteration $index / $Iterations"
  Invoke-FrontendShellRequest "frontend shell" (Join-Url $BaseUrl "/")
  Invoke-FrontendShellRequest "frontend login route" (Join-Url $BaseUrl "/login")
  Invoke-CanaryRequest "backend health" "GET" (Join-Url $BaseUrl "/api/health") $false $false
  Invoke-CanaryRequest "current user" "GET" (Join-Url $BaseUrl "/api/me") $true
  Invoke-CanaryRequest "onboarding profile" "GET" (Join-Url $BaseUrl "/api/me/profile") $true
  Invoke-CanaryRequest "document profile" "GET" (Join-Url $BaseUrl "/api/document-profile") $true
  Invoke-CanaryRequest "extension document profile" "GET" (Join-Url $BaseUrl "/api/extension/document-profile") $true
  Invoke-CanaryRequest "basket list" "GET" (Join-Url $BaseUrl "/api/basket/jobs") $true
  Invoke-CanaryRequest "notion connection" "GET" (Join-Url $BaseUrl "/api/integrations/notion") $true

  if ($WorkspaceId -gt 0) {
    Invoke-CanaryRequest "workspace read" "GET" (Join-Url $BaseUrl "/api/workspaces/$WorkspaceId") $true
    Invoke-CanaryRequest "workspace defaults" "GET" (Join-Url $BaseUrl "/api/workspaces/$WorkspaceId/defaults") $true
    Invoke-CanaryRequest "workspace versions" "GET" (Join-Url $BaseUrl "/api/workspaces/$WorkspaceId/versions") $true
    Invoke-CanaryRequest "workspace references" "GET" (Join-Url $BaseUrl "/api/workspaces/$WorkspaceId/references") $true
  }

  if ($RunNotionSync) {
    Invoke-CanaryRequest "notion sync-now" "POST" (Join-Url $BaseUrl "/api/integrations/notion/sync-now") $true
  }

  if ($index -lt $Iterations) {
    Start-Sleep -Seconds $IntervalSeconds
  }
}

$canaryEndedAt = [DateTimeOffset]::UtcNow
$canaryEndedAtUtc = $canaryEndedAt.ToString("o")
$actualElapsedSeconds = [int][Math]::Floor(($canaryEndedAt - $canaryStartedAt).TotalSeconds)
Write-Host "[INFO] Canary elapsedSeconds=$actualElapsedSeconds startedAtUtc=$canaryStartedAtUtc endedAtUtc=$canaryEndedAtUtc"
Write-Host "[DONE] Release canary completed."
} finally {
  if ($transcriptStarted) {
    Stop-Transcript | Out-Null
    Write-Host "[INFO] Release canary log written: $resolvedLogFile"
  }
}
