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
Assert-Contains $runtimeSource 'EXPECTED_WEB_ORIGIN="\$\{EXPECTED_WEB_ORIGIN:-https://ez-one\.o-r\.kr\}"' "check-ec2-runtime.sh must default to the production web origin contract."
Assert-Contains $runtimeSource 'EXPECTED_EXTENSION_ORIGIN="\$\{EXPECTED_EXTENSION_ORIGIN:-chrome-extension://oamnhdoaefndncadifgaidefcjaomgdo\}"' "check-ec2-runtime.sh must default to the exact Chrome Web Store extension origin."
Assert-Contains $runtimeSource 'assert_runtime_cors_allowed_origins' "check-ec2-runtime.sh must validate runtime CORS origins from the EnvironmentFile."
Assert-Contains $runtimeSource 'CORS_ALLOWED_ORIGINS includes required web and extension origins' "check-ec2-runtime.sh must report CORS success without printing secret environment values."
Assert-Contains $runtimeSource 'sudo nginx -t' "check-ec2-runtime.sh must validate nginx with sudo so protected certificate files are readable."

Write-Host "[PASS] EC2 runtime contract test passed."
