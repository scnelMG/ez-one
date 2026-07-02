#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="${SERVICE_NAME:-ez-one-backend}"
BASE_URL="${BASE_URL:-}"
HEALTH_PATH="${HEALTH_PATH:-/api/health}"
REQUIRE_NGINX="${REQUIRE_NGINX:-true}"
HEALTH_TIMEOUT_SECONDS="${HEALTH_TIMEOUT_SECONDS:-60}"
HEALTH_INTERVAL_SECONDS="${HEALTH_INTERVAL_SECONDS:-2}"
EXPECTED_WEB_ORIGIN="${EXPECTED_WEB_ORIGIN:-https://ez-one.o-r.kr}"
EXPECTED_EXTENSION_ORIGIN="${EXPECTED_EXTENSION_ORIGIN:-chrome-extension://oamnhdoaefndncadifgaidefcjaomgdo}"

fail() {
  printf '[FAIL] %s\n' "$*" >&2
  exit 1
}

pass() {
  printf '[PASS] %s\n' "$*"
}

info() {
  printf '[INFO] %s\n' "$*"
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "$1 is required but was not found"
}

validate_https_origin() {
  local value="$1"
  local rest
  local rest_lower
  [[ "$value" == https://* ]] || fail "BASE_URL must use https://"
  rest="${value#https://}"
  if [[ -z "$rest" || "$rest" == */* || "$rest" == *\?* || "$rest" == *\#* ]]; then
    fail "BASE_URL must be an HTTPS origin only, without path, query string, or fragment"
  fi
  rest_lower="$(printf '%s' "$rest" | tr '[:upper:]' '[:lower:]')"
  case "$rest_lower" in
    localhost|localhost:*|127.*|0.0.0.0|0.0.0.0:*|\[::1\]|\[::1\]:*)
      fail "BASE_URL must not use a local host; use the deployed HTTPS domain"
      ;;
  esac
}

join_url() {
  local root="${1%/}"
  local path="/${2#/}"
  printf '%s%s\n' "$root" "$path"
}

wait_for_http_success() {
  local url="$1"
  local headers_path="$2"
  local body_path="$3"
  local deadline=$((SECONDS + HEALTH_TIMEOUT_SECONDS))
  local attempt=1

  while (( SECONDS <= deadline )); do
    if curl --fail --silent --show-error --location --max-time 20 --dump-header "$headers_path" --output "$body_path" "$url"; then
      return 0
    fi

    info "HTTP check not ready yet, retrying ($attempt): $url"
    attempt=$((attempt + 1))
    sleep "$HEALTH_INTERVAL_SECONDS"
  done

  fail "HTTP check did not pass within ${HEALTH_TIMEOUT_SECONDS}s: $url"
}

if [[ -z "$BASE_URL" ]]; then
  fail "BASE_URL is required, for example: BASE_URL=https://ez-one.kr $0"
fi

validate_https_origin "$BASE_URL"

require_command systemctl
require_command curl
require_command stat
require_command sed
require_command awk

unit_state="$(systemctl is-active "$SERVICE_NAME" 2>/dev/null || true)"
[[ "$unit_state" == "active" ]] || fail "$SERVICE_NAME is not active: $unit_state"
pass "$SERVICE_NAME is active"

unit_enabled="$(systemctl is-enabled "$SERVICE_NAME" 2>/dev/null || true)"
case "$unit_enabled" in
  enabled|enabled-runtime)
    pass "$SERVICE_NAME is enabled for reboot startup"
    ;;
  *)
    fail "$SERVICE_NAME must be enabled so it starts after EC2 reboot, got '$unit_enabled'"
    ;;
esac

restart_policy="$(systemctl show "$SERVICE_NAME" --property=Restart --value)"
[[ "$restart_policy" == "on-failure" || "$restart_policy" == "always" ]] || fail "$SERVICE_NAME Restart must be on-failure or always, got '$restart_policy'"
pass "$SERVICE_NAME Restart=$restart_policy"

service_user="$(systemctl show "$SERVICE_NAME" --property=User --value)"
[[ -n "$service_user" ]] || fail "$SERVICE_NAME should run as an explicit non-root user"
[[ "$service_user" != "root" ]] || fail "$SERVICE_NAME must not run as root"
pass "$SERVICE_NAME runs as user $service_user"

assert_systemd_property() {
  local property="$1"
  local expected="$2"
  local actual
  actual="$(systemctl show "$SERVICE_NAME" --property="$property" --value)"
  [[ "$actual" == "$expected" ]] || fail "$SERVICE_NAME $property must be $expected, got '$actual'"
  pass "$SERVICE_NAME $property=$actual"
}

assert_systemd_property "NoNewPrivileges" "yes"
assert_systemd_property "PrivateTmp" "yes"
assert_systemd_property "ProtectSystem" "full"
assert_systemd_property "ProtectHome" "yes"
assert_systemd_property "PrivateDevices" "yes"
assert_systemd_property "CapabilityBoundingSet" ""
assert_systemd_property "RestrictSUIDSGID" "yes"
assert_systemd_property "LockPersonality" "yes"

fragment_path="$(systemctl show "$SERVICE_NAME" --property=FragmentPath --value)"
working_directory="$(systemctl show "$SERVICE_NAME" --property=WorkingDirectory --value)"
environment_files="$(systemctl show "$SERVICE_NAME" --property=EnvironmentFiles --value)"
info "unit=$fragment_path"
info "working_directory=$working_directory"
info "environment_files=$environment_files"

env_file="${environment_files%% *}"
[[ -n "$env_file" && "$env_file" != "-" ]] || fail "$SERVICE_NAME must declare an EnvironmentFile"
sudo test -f "$env_file" || fail "EnvironmentFile does not exist: $env_file"

read_env_value() {
  local key="$1"
  sudo awk -F= -v key="$key" '$1 == key { print substr($0, index($0, "=") + 1) }' "$env_file" | tail -n 1
}

assert_runtime_cors_allowed_origins() {
  local value="$1"
  local origin
  local has_web_origin=false
  local has_extension_origin=false

  [[ -n "$value" ]] || fail "CORS_ALLOWED_ORIGINS must be present in the EnvironmentFile"

  IFS=',' read -r -a origins <<< "$value"
  for raw_origin in "${origins[@]}"; do
    origin="$(printf '%s' "$raw_origin" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
    [[ -n "$origin" ]] || continue
    [[ "$origin" != *"*"* && "$origin" != "<all_urls>" ]] || fail "CORS_ALLOWED_ORIGINS must not contain wildcards or <all_urls>"

    case "$origin" in
      https://*)
        rest="${origin#https://}"
        rest_lower="$(printf '%s' "$rest" | tr '[:upper:]' '[:lower:]')"
        [[ "$origin" != */ ]] || fail "CORS_ALLOWED_ORIGINS HTTPS origins must not include trailing slashes"
        [[ "$rest" != */* && "$rest" != *\?* && "$rest" != *\#* ]] || fail "CORS_ALLOWED_ORIGINS HTTPS entries must be origins only"
        case "$rest_lower" in
          localhost|localhost:*|127.*|0.0.0.0|0.0.0.0:*|\[::1\]|\[::1\]:*)
            fail "CORS_ALLOWED_ORIGINS must not contain local web origins"
            ;;
        esac
        [[ "$origin" == "$EXPECTED_WEB_ORIGIN" ]] && has_web_origin=true
        ;;
      chrome-extension://*)
        [[ "$origin" == "$EXPECTED_EXTENSION_ORIGIN" ]] || fail "CORS_ALLOWED_ORIGINS must use the exact production Chrome extension origin"
        has_extension_origin=true
        ;;
      *)
        fail "CORS_ALLOWED_ORIGINS entries must be HTTPS web origins or the exact production Chrome extension origin"
        ;;
    esac
  done

  [[ "$has_web_origin" == "true" ]] || fail "CORS_ALLOWED_ORIGINS must include the production web origin"
  [[ "$has_extension_origin" == "true" ]] || fail "CORS_ALLOWED_ORIGINS must include the production Chrome extension origin"
  pass "CORS_ALLOWED_ORIGINS includes required web and extension origins"
}

assert_runtime_cors_allowed_origins "$(read_env_value "CORS_ALLOWED_ORIGINS")"

env_file_mode="$(sudo stat -c '%a' "$env_file")"
env_file_owner="$(sudo stat -c '%U' "$env_file")"
env_file_group="$(sudo stat -c '%G' "$env_file")"

[[ "$env_file_owner" == "root" || "$env_file_owner" == "$service_user" ]] || fail "EnvironmentFile owner must be root or $service_user, got $env_file_owner"
[[ "$env_file_group" == "$service_user" ]] || fail "EnvironmentFile group must match service user $service_user, got $env_file_group"
world_digit="${env_file_mode: -1}"
if (( world_digit & 6 )); then
  fail "EnvironmentFile must not be world-readable or world-writable, got mode $env_file_mode"
fi
pass "EnvironmentFile permissions are restricted: $env_file_owner:$env_file_group $env_file_mode"

if [[ "$REQUIRE_NGINX" == "true" ]]; then
  require_command nginx
  nginx_state="$(systemctl is-active nginx 2>/dev/null || true)"
  [[ "$nginx_state" == "active" ]] || fail "nginx is not active: $nginx_state"
  pass "nginx is active"

  nginx_enabled="$(systemctl is-enabled nginx 2>/dev/null || true)"
  case "$nginx_enabled" in
    enabled|enabled-runtime)
      pass "nginx is enabled for reboot startup"
      ;;
    *)
      fail "nginx must be enabled so it starts after EC2 reboot, got '$nginx_enabled'"
      ;;
  esac

  sudo nginx -t >/tmp/ez-one-nginx-test.out 2>&1 || {
    cat /tmp/ez-one-nginx-test.out >&2
    fail "nginx -t failed"
  }
  pass "nginx configuration test passed"
fi

headers_file="$(mktemp)"
body_file="$(mktemp)"
trap 'rm -f "$headers_file" "$body_file"' EXIT

health_url="$(join_url "$BASE_URL" "$HEALTH_PATH")"
wait_for_http_success "$health_url" "$headers_file" "$body_file"
pass "$health_url returned a successful response"

if grep -Eiq 'password|secret|token|jdbc|stacktrace|exception|trace' "$body_file"; then
  fail "$HEALTH_PATH response appears to expose sensitive implementation details"
fi
pass "$HEALTH_PATH body does not expose obvious sensitive internals"

root_headers="$(mktemp)"
trap 'rm -f "$headers_file" "$body_file" "$root_headers"' EXIT
curl --fail --silent --show-error --location --max-time 20 --dump-header "$root_headers" --output /dev/null "$BASE_URL"

grep -Eiq '^strict-transport-security:' "$root_headers" || fail "Strict-Transport-Security header is missing"
grep -Eiq '^x-content-type-options:[[:space:]]*nosniff' "$root_headers" || fail "X-Content-Type-Options: nosniff header is missing"
grep -Eiq '^referrer-policy:' "$root_headers" || fail "Referrer-Policy header is missing"
grep -Eiq '^permissions-policy:' "$root_headers" || fail "Permissions-Policy header is missing"
grep -Eiq '^cross-origin-opener-policy:[[:space:]]*same-origin' "$root_headers" || fail "Cross-Origin-Opener-Policy: same-origin header is missing"

if grep -Eiq '^x-frame-options:' "$root_headers" || grep -Eiq '^content-security-policy:.*frame-ancestors' "$root_headers"; then
  pass "frame protection header is present"
else
  fail "frame protection header is missing; set X-Frame-Options or CSP frame-ancestors"
fi

pass "required security headers are present"

http_url="http://${BASE_URL#https://}"
redirect_status="$(curl --silent --show-error --max-time 20 --output /dev/null --write-out '%{http_code} %{redirect_url}' "$http_url" || true)"
case "$redirect_status" in
  301\ https://*|302\ https://*|307\ https://*|308\ https://*)
    pass "$http_url redirects to HTTPS"
    ;;
  *)
    fail "$http_url must redirect to HTTPS, got '$redirect_status'"
    ;;
esac

pass "EC2 runtime preflight completed"
