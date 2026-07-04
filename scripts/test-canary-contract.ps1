[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$canaryScript = Join-Path $PSScriptRoot "run-release-canary.ps1"
$runbookPath = Join-Path $PSScriptRoot "..\docs\39_production-deployment-runbook.md"
$qaPath = Join-Path $PSScriptRoot "..\docs\38_release-readiness-qa.md"
$infraReadmePath = Join-Path $PSScriptRoot "..\infra\README.md"

function Assert-Contains {
  param(
    [string]$Text,
    [string]$Pattern,
    [string]$Message
  )

  if ($Text -notmatch $Pattern) {
    throw $Message
  }
}

$canarySource = Get-Content -Raw -LiteralPath $canaryScript
$runbook = Get-Content -Raw -LiteralPath $runbookPath
$qa = Get-Content -Raw -LiteralPath $qaPath
$infraReadme = Get-Content -Raw -LiteralPath $infraReadmePath
$powerShellExe = (Get-Command powershell -ErrorAction Stop).Source

function Assert-CommandFails {
  param(
    [string]$Name,
    [string[]]$Arguments,
    [string]$ExpectedMessage
  )

  $previousErrorActionPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = "Continue"
    $global:LASTEXITCODE = 0
    $output = & $powerShellExe -NoProfile -ExecutionPolicy Bypass -File $canaryScript @Arguments 2>&1
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
  if ($exitCode -eq 0) {
    throw "$Name should fail but passed."
  }
  $text = ($output | ForEach-Object { $_.ToString() }) -join "`n"
  if ($text -notmatch [regex]::Escape($ExpectedMessage)) {
    throw "$Name failed with an unexpected message. Expected '$ExpectedMessage' in: $text"
  }
}

Assert-Contains $canarySource '\[int\]\$Iterations = 7' "run-release-canary.ps1 default must cover 30 minutes with 5-minute intervals."
Assert-Contains $canarySource '\[int\]\$IntervalSeconds = 300' "run-release-canary.ps1 default interval must be 5 minutes."
Assert-Contains $canarySource 'Canary schedule: iterations=\$Iterations intervalSeconds=\$IntervalSeconds expectedDurationSeconds=\$expectedDurationSeconds' "run-release-canary.ps1 must write the schedule into the log so evidence proves the 30-minute window."
Assert-Contains $canarySource 'Canary elapsedSeconds=\$actualElapsedSeconds startedAtUtc=\$canaryStartedAtUtc endedAtUtc=\$canaryEndedAtUtc' "run-release-canary.ps1 must write actual elapsed time into the log so evidence proves the 30-minute run completed."
Assert-Contains $canarySource '\[string\]\$LogFile = ""' "run-release-canary.ps1 must accept -LogFile so canary evidence can be saved."
Assert-Contains $canarySource 'Start-Transcript' "run-release-canary.ps1 must start a transcript when -LogFile is provided."
Assert-Contains $canarySource 'Stop-Transcript' "run-release-canary.ps1 must stop the transcript in cleanup."
Assert-Contains $canarySource '\[INFO\] Release canary log written' "run-release-canary.ps1 must print the saved canary log path as informational output."
Assert-Contains $canarySource 'BaseUrl must use https://' "run-release-canary.ps1 must reject non-HTTPS release canary URLs."
Assert-Contains $canarySource 'BaseUrl must be an origin only' "run-release-canary.ps1 must reject BaseUrl values that include path, query string, or fragment."
Assert-Contains $canarySource 'BaseUrl must not use a local host' "run-release-canary.ps1 must reject localhost or loopback origins for release canaries."
Assert-Contains $canarySource 'AccessToken' "run-release-canary.ps1 must require authenticated checks unless explicitly AllowAnonymousOnly."
Assert-Contains $canarySource 'Invoke-FrontendShellRequest "frontend shell"' "run-release-canary.ps1 must check that the frontend application shell is served."
Assert-Contains $canarySource 'Invoke-FrontendShellRequest "frontend login route"' "run-release-canary.ps1 must check that the SPA login route is served."
Assert-Contains $canarySource 'did not return the Vue application shell' "run-release-canary.ps1 must reject non-SPA frontend responses."
Assert-Contains $canarySource 'local-dev-access-token\|localhost:8080\|127\\\.0\\\.0\\\.1:8080\|VITE_' "run-release-canary.ps1 must reject development configuration leaks in frontend responses."
Assert-Contains $canarySource '\[switch\]\$RequireWorkspace' "run-release-canary.ps1 must support requiring workspace checks for production release canaries."
Assert-Contains $canarySource 'RequireWorkspace needs a positive WorkspaceId' "run-release-canary.ps1 must fail production canaries that require workspace checks without a WorkspaceId."
Assert-Contains $canarySource 'AllowAnonymousOnly cannot be combined with AccessToken, WorkspaceId, RequireWorkspace, or RunNotionSync' "run-release-canary.ps1 must prevent anonymous-only smoke checks from being treated as production canaries."
Assert-Contains $canarySource '"/api/me/profile"' "run-release-canary.ps1 must check onboarding/profile read."
Assert-Contains $canarySource '"/api/document-profile"' "run-release-canary.ps1 must check document profile read."
Assert-Contains $canarySource '"/api/extension/document-profile"' "run-release-canary.ps1 must check extension document profile read."
Assert-Contains $canarySource '"/api/workspaces/\$WorkspaceId/defaults"' "run-release-canary.ps1 must check workspace defaults when WorkspaceId is provided."
Assert-Contains $canarySource '"/api/workspaces/\$WorkspaceId/versions"' "run-release-canary.ps1 must check workspace versions when WorkspaceId is provided."
Assert-Contains $canarySource '"/api/workspaces/\$WorkspaceId/references"' "run-release-canary.ps1 must check workspace references when WorkspaceId is provided."
Assert-Contains $runbook 'Run for 30 minutes after deploy' "Runbook must keep the 30-minute canary requirement visible."
Assert-Contains $runbook '\$canaryLog = "\.\\\.codex-run-logs\\release-canary-\$\(Get-Date -Format yyyyMMdd-HHmmss\)\.log"' "Runbook must create a canary evidence log path."
Assert-Contains $runbook 'run-release-canary\.ps1 -BaseUrl https://ez-one\.kr -AccessToken <canary-access-token> -WorkspaceId <workspace-id> -RequireWorkspace -LogFile \$canaryLog' "Runbook production canary command must save canary output with -LogFile."
Assert-Contains $runbook 'run-release-canary\.ps1 -BaseUrl https://ez-one\.kr -AccessToken <canary-access-token> -WorkspaceId <workspace-id> -RequireWorkspace' "Runbook production canary command must require workspace checks."
Assert-Contains $runbook 'frontend shell, `/login` SPA fallback' "Runbook must document frontend shell and SPA route canary coverage."
Assert-Contains $infraReadme 'run-release-canary\.ps1 -BaseUrl https://ez-one\.kr -AccessToken <canary-access-token> -WorkspaceId <workspace-id> -RequireWorkspace' "Infra README production canary quick reference must require workspace checks."
Assert-Contains $qa 'Run every 5 minutes for 30 minutes after deploy' "QA document must keep the 30-minute canary cadence visible."
Assert-Contains $qa 'frontend shell and `/login` SPA fallback' "QA document must keep frontend canary coverage visible."

Assert-CommandFails `
  -Name "anonymous-only-with-workspace-id" `
  -Arguments @("-BaseUrl", "https://example.invalid", "-AllowAnonymousOnly", "-WorkspaceId", "1", "-Iterations", "1", "-IntervalSeconds", "1") `
  -ExpectedMessage "AllowAnonymousOnly cannot be combined with AccessToken, WorkspaceId, RequireWorkspace, or RunNotionSync"

Assert-CommandFails `
  -Name "anonymous-only-with-notion-sync" `
  -Arguments @("-BaseUrl", "https://example.invalid", "-AllowAnonymousOnly", "-RunNotionSync", "-Iterations", "1", "-IntervalSeconds", "1") `
  -ExpectedMessage "AllowAnonymousOnly cannot be combined with AccessToken, WorkspaceId, RequireWorkspace, or RunNotionSync"

Assert-CommandFails `
  -Name "local-base-url" `
  -Arguments @("-BaseUrl", "https://localhost", "-AllowAnonymousOnly", "-Iterations", "1", "-IntervalSeconds", "1") `
  -ExpectedMessage "BaseUrl must not use a local host"

Write-Host "[PASS] canary contract test passed."
