[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$runtimeScript = Join-Path $PSScriptRoot "check-ec2-runtime.sh"

function Get-BashPath {
  $candidates = @(
    $env:OMO_CODEX_GIT_BASH_PATH,
    (Join-Path ${env:ProgramFiles} "Git\bin\bash.exe"),
    (Join-Path ${env:ProgramFiles} "Git\usr\bin\bash.exe"),
    (Join-Path ${env:ProgramFiles(x86)} "Git\bin\bash.exe"),
    (Join-Path ${env:ProgramFiles(x86)} "Git\usr\bin\bash.exe")
  ) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }

  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate) {
      return $candidate
    }
  }

  throw "Git Bash is required for this contract test. Set OMO_CODEX_GIT_BASH_PATH or install Git for Windows."
}

$bashPath = Get-BashPath

function Convert-ToBashPath {
  param([string]$Path)

  $fullPath = [System.IO.Path]::GetFullPath($Path)
  if ($fullPath -match "^([A-Za-z]):\\(.*)$") {
    $drive = $matches[1].ToLowerInvariant()
    $rest = $matches[2] -replace "\\", "/"
    return "/$drive/$rest"
  }
  return $fullPath -replace "\\", "/"
}

function Quote-Bash {
  param([string]$Value)

  return "'" + ($Value -replace "'", "'\''") + "'"
}

function Write-MockCommand {
  param(
    [string]$Directory,
    [string]$Name,
    [string]$Body
  )

  $path = Join-Path $Directory $Name
  Set-Content -Encoding ASCII -NoNewline -LiteralPath $path -Value $Body
  $bashFile = Convert-ToBashPath $path
  & $bashPath -c "chmod +x $(Quote-Bash $bashFile)"
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to mark mock command executable: $Name"
  }
}

function New-MockEc2RuntimeBin {
  param([string]$Directory)

  New-Item -ItemType Directory -Force -Path $Directory | Out-Null

  Write-MockCommand -Directory $Directory -Name "systemctl" -Body @'
#!/usr/bin/env bash
set -euo pipefail

command_name="${1:-}"
target="${2:-}"

case "$command_name" in
  is-active)
    printf 'active\n'
    ;;
  is-enabled)
    printf 'enabled\n'
    ;;
  show)
    property=""
    for arg in "$@"; do
      [[ "$arg" == --property=* ]] && property="${arg#--property=}"
    done
    case "$property" in
      Restart) output='on-failure' ;;
      User) output='ezone' ;;
      NoNewPrivileges|PrivateTmp|ProtectHome|PrivateDevices|RestrictSUIDSGID|LockPersonality) output='yes' ;;
      ProtectSystem) output='full' ;;
      CapabilityBoundingSet) output='' ;;
      FragmentPath) output="/etc/systemd/system/$target.service" ;;
      WorkingDirectory) output='/opt/ez-one/backend' ;;
      EnvironmentFiles) output="$CONTRACT_ENV_FILE" ;;
      *) output="unsupported-property:$property" ;;
    esac
    printf '%s\n' "$output"
    ;;
  *)
    printf 'unsupported systemctl call: %s\n' "$*" >&2
    exit 1
    ;;
esac
'@

  Write-MockCommand -Directory $Directory -Name "sudo" -Body @'
#!/usr/bin/env bash
set -euo pipefail

command_name="$1"
shift
if [[ "$command_name" == "test" ]]; then
  test "$@"
  exit $?
fi
"$command_name" "$@"
'@

  Write-MockCommand -Directory $Directory -Name "stat" -Body @'
#!/usr/bin/env bash
set -euo pipefail

case "${2:-}" in
  %a) printf '640\n' ;;
  %U) printf 'root\n' ;;
  %G) printf 'ezone\n' ;;
  *)
    printf 'unsupported stat call: %s\n' "$*" >&2
    exit 1
    ;;
esac
'@

  Write-MockCommand -Directory $Directory -Name "nginx" -Body @'
#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" == "-t" ]]; then
  printf 'nginx: configuration file /etc/nginx/nginx.conf test is successful\n'
  exit 0
fi
printf 'unsupported nginx call: %s\n' "$*" >&2
exit 1
'@

  Write-MockCommand -Directory $Directory -Name "curl" -Body @'
#!/usr/bin/env bash
set -euo pipefail

headers_path=""
output_path=""
write_out=""
url=""

while (($# > 0)); do
  case "$1" in
    --dump-header)
      shift
      headers_path="$1"
      ;;
    --output)
      shift
      output_path="$1"
      ;;
    --write-out)
      shift
      write_out="$1"
      ;;
    --*)
      ;;
    *)
      url="$1"
      ;;
  esac
  shift
done

if [[ -n "$write_out" ]]; then
  printf '301 https://ez-one.o-r.kr/'
  exit 0
fi

if [[ -n "$headers_path" ]]; then
  printf 'HTTP/2 200\r\nStrict-Transport-Security: max-age=31536000\r\nX-Content-Type-Options: nosniff\r\nReferrer-Policy: strict-origin-when-cross-origin\r\nPermissions-Policy: geolocation=()\r\nCross-Origin-Opener-Policy: same-origin\r\nX-Frame-Options: DENY\r\n\r\n' > "$headers_path"
fi

if [[ -n "$output_path" && "$output_path" != "/dev/null" ]]; then
  printf '{"status":"UP"}\n' > "$output_path"
fi

exit 0
'@
}

function Invoke-RuntimeCheck {
  param(
    [string]$Name,
    [string]$CorsAllowedOrigins,
    [bool]$ShouldPass,
    [string]$ExpectedMessage,
    [string]$TempRoot,
    [string]$MockBin
  )

  $envFile = Join-Path $TempRoot "$Name.env"
  $secretValues = @(
    "contract-db-password-secret-value-12345",
    "contract-jwt-access-secret-value-67890",
    "contract-refresh-token-secret-value-abcde"
  )

  @(
    "CORS_ALLOWED_ORIGINS=$CorsAllowedOrigins",
    "DB_PASSWORD=$($secretValues[0])",
    "JWT_ACCESS_SECRET=$($secretValues[1])",
    "JWT_REFRESH_SECRET=$($secretValues[2])"
  ) | Set-Content -Encoding ASCII -LiteralPath $envFile

  $scriptPath = Convert-ToBashPath $runtimeScript
  $mockPath = Convert-ToBashPath $MockBin
  $bashEnvFile = Convert-ToBashPath $envFile
  $bash = @(
    "PATH=$(Quote-Bash $mockPath):`$PATH",
    "CONTRACT_ENV_FILE=$(Quote-Bash $bashEnvFile)",
    "BASE_URL=https://ez-one.o-r.kr",
    "SERVICE_NAME=ez-one-backend",
    "REQUIRE_NGINX=true",
    "HEALTH_TIMEOUT_SECONDS=1",
    "HEALTH_INTERVAL_SECONDS=0",
    "bash $(Quote-Bash $scriptPath)"
  ) -join " "

  $previousErrorActionPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = "Continue"
    $output = & $bashPath -c $bash 2>&1
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
  $text = ($output | ForEach-Object { $_.ToString() }) -join "`n"

  foreach ($secretValue in $secretValues) {
    if ($text.Contains($secretValue)) {
      throw "Runtime check printed a raw secret value for case '$Name'. Output: $text"
    }
  }

  if ($ShouldPass) {
    if ($exitCode -ne 0) {
      throw "Runtime check case '$Name' should pass but exited $exitCode. Output: $text"
    }
  } elseif ($exitCode -eq 0) {
    throw "Runtime check case '$Name' should fail but passed. Output: $text"
  }

  if (-not [string]::IsNullOrWhiteSpace($ExpectedMessage) -and $text -notmatch [regex]::Escape($ExpectedMessage)) {
    throw "Runtime check case '$Name' did not include expected message '$ExpectedMessage'. Output: $text"
  }

  return [pscustomobject]@{
    Name = $Name
    ExitCode = $exitCode
    Output = $text
  }
}

if (-not (Test-Path -LiteralPath $runtimeScript)) {
  throw "scripts/check-ec2-runtime.sh must exist."
}

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("ez-one-ec2-runtime-contract-" + [System.Guid]::NewGuid().ToString("N"))
$mockBin = Join-Path $tempRoot "mock-bin"

try {
  New-MockEc2RuntimeBin -Directory $mockBin

  $webOrigin = "https://ez-one.o-r.kr"
  $extensionOrigin = "chrome-extension://oamnhdoaefndncadifgaidefcjaomgdo"
  $cases = @(
    [pscustomobject]@{ Name = "valid-exact-extension-origin"; Cors = "$webOrigin,$extensionOrigin"; ShouldPass = $true; Expected = "CORS_ALLOWED_ORIGINS includes required web and extension origins" },
    [pscustomobject]@{ Name = "bogus-extension-origin"; Cors = "$webOrigin,chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"; ShouldPass = $false; Expected = "CORS_ALLOWED_ORIGINS must use the exact production Chrome extension origin" },
    [pscustomobject]@{ Name = "wildcard-extension-origin"; Cors = "$webOrigin,chrome-extension://*"; ShouldPass = $false; Expected = "CORS_ALLOWED_ORIGINS must not contain wildcards or <all_urls>" },
    [pscustomobject]@{ Name = "local-web-origin"; Cors = "https://localhost:5173,$extensionOrigin"; ShouldPass = $false; Expected = "CORS_ALLOWED_ORIGINS must not contain local web origins" }
  )
  $results = @{}
  foreach ($case in $cases) {
    $results[$case.Name] = Invoke-RuntimeCheck -Name $case.Name -CorsAllowedOrigins $case.Cors -ShouldPass $case.ShouldPass -ExpectedMessage $case.Expected -TempRoot $tempRoot -MockBin $mockBin
  }

  $valid = $results["valid-exact-extension-origin"]
  if ($valid.Output -notmatch "\[PASS\] EC2 runtime preflight completed") {
    throw "Valid runtime contract did not exercise the complete EC2 preflight. Output: $($valid.Output)"
  }

  Write-Host "[PASS] EC2 runtime behavioral contract test passed."
} finally {
  Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
}
