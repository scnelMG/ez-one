[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$runtimeScript = Join-Path $PSScriptRoot "check-ec2-runtime.sh"
$runtimeSource = Get-Content -Raw -LiteralPath $runtimeScript

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

Assert-Contains $runtimeSource 'HEALTH_TIMEOUT_SECONDS' "check-ec2-runtime.sh must allow health retry timeout configuration."
Assert-Contains $runtimeSource 'wait_for_http_success' "check-ec2-runtime.sh must retry transient health check failures."
Assert-Contains $runtimeSource 'HTTP check not ready yet, retrying' "check-ec2-runtime.sh must make transient retry behavior visible."
Assert-Contains $runtimeSource 'sudo test -f "\$env_file"' "check-ec2-runtime.sh must verify locked EnvironmentFile paths with sudo."
Assert-Contains $runtimeSource 'sudo stat -c ''%a'' "\$env_file"' "check-ec2-runtime.sh must read locked EnvironmentFile mode with sudo."
Assert-Contains $runtimeSource 'sudo stat -c ''%U'' "\$env_file"' "check-ec2-runtime.sh must read locked EnvironmentFile owner with sudo."
Assert-Contains $runtimeSource 'sudo stat -c ''%G'' "\$env_file"' "check-ec2-runtime.sh must read locked EnvironmentFile group with sudo."
Assert-Contains $runtimeSource 'sudo nginx -t' "check-ec2-runtime.sh must validate nginx with sudo so protected certificate files are readable."

Write-Host "[PASS] EC2 runtime contract test passed."
