#!/usr/bin/env bash
set -euo pipefail

if [[ -n "${BASH_EXTRA_PATH:-}" ]]; then
  export PATH="$BASH_EXTRA_PATH:$PATH"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_NAME="${SERVICE_NAME:-ez-one-backend}"
RELEASE_ID="${RELEASE_ID:-}"
RELEASE_ROOT="${RELEASE_ROOT:-/opt/ez-one/releases}"
BACKEND_ARTIFACT="${BACKEND_ARTIFACT:-}"
BACKEND_TARGET="${BACKEND_TARGET:-/opt/ez-one/backend/app.jar}"
FRONTEND_ARTIFACT="${FRONTEND_ARTIFACT:-}"
FRONTEND_TARGET="${FRONTEND_TARGET:-/var/www/ez-one}"
EXTENSION_ARTIFACT="${EXTENSION_ARTIFACT:-}"
RELEASE_MANIFEST="${RELEASE_MANIFEST:-}"
CHECKSUM_FILE="${CHECKSUM_FILE:-}"
BASE_URL="${BASE_URL:-}"
DRY_RUN="${DRY_RUN:-true}"
ALLOW_DIRTY_RELEASE="${ALLOW_DIRTY_RELEASE:-false}"
RUNTIME_CHECK_SCRIPT="${RUNTIME_CHECK_SCRIPT:-$SCRIPT_DIR/check-ec2-runtime.sh}"
HEALTH_TIMEOUT_SECONDS="${HEALTH_TIMEOUT_SECONDS:-60}"
HEALTH_INTERVAL_SECONDS="${HEALTH_INTERVAL_SECONDS:-2}"

fail() {
  printf '[FAIL] %s\n' "$*" >&2
  exit 1
}

pass() {
  printf '[PASS] %s\n' "$*"
}

run_cmd() {
  printf '[RUN] %s\n' "$*"
  if [[ "$DRY_RUN" == "true" ]]; then
    return 0
  fi
  "$@"
}

require_file() {
  [[ -f "$1" ]] || fail "Required file not found: $1"
}

require_dir() {
  [[ -d "$1" ]] || fail "Required directory not found: $1"
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "$1 is required but was not found"
}

validate_https_origin() {
  local value="$1"
  local rest
  local rest_lower
  [[ "$value" == https://* ]] || fail "BASE_URL must use https:// when provided"
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

run_runtime_check() {
  if [[ -z "$BASE_URL" ]]; then
    return 0
  fi

  validate_https_origin "$BASE_URL"
  if [[ "$DRY_RUN" == "true" ]]; then
    printf '[RUN] BASE_URL=%s SERVICE_NAME=%s bash %s\n' "$BASE_URL" "$SERVICE_NAME" "$RUNTIME_CHECK_SCRIPT"
    return 0
  fi

  require_file "$RUNTIME_CHECK_SCRIPT"
  BASE_URL="$BASE_URL" SERVICE_NAME="$SERVICE_NAME" bash "$RUNTIME_CHECK_SCRIPT"
  pass "post-deploy EC2 runtime check passed"
}

wait_for_health() {
  local health_url="$1/api/health"
  local deadline=$((SECONDS + HEALTH_TIMEOUT_SECONDS))
  local attempt=1

  while (( SECONDS <= deadline )); do
    if curl --fail --silent --show-error --max-time 10 "$health_url" >/dev/null; then
      pass "post-deploy health check passed"
      return 0
    fi

    printf '[INFO] health check not ready yet, retrying (%s)\n' "$attempt"
    attempt=$((attempt + 1))
    sleep "$HEALTH_INTERVAL_SECONDS"
  done

  fail "post-deploy health check did not pass within ${HEALTH_TIMEOUT_SECONDS}s: $health_url"
}

artifact_name() {
  local path="$1"
  printf '%s\n' "${path##*/}"
}

artifact_dir() {
  local path="$1"
  if [[ "$path" != */* ]]; then
    printf '.\n'
  else
    printf '%s\n' "${path%/*}"
  fi
}

make_temp_file() {
  if command -v mktemp >/dev/null 2>&1; then
    mktemp
  else
    local dir="${TMPDIR:-/tmp}"
    mkdir -p "$dir"
    printf '%s\n' "$dir/ez-one-release-file-$$-$RANDOM"
  fi
}

make_temp_dir() {
  if command -v mktemp >/dev/null 2>&1; then
    mktemp -d
  else
    local dir="${TMPDIR:-/tmp}/ez-one-release-dir-$$-$RANDOM"
    mkdir -p "$dir"
    printf '%s\n' "$dir"
  fi
}

verify_checksum_manifest_shape() {
  local line_count
  local unexpected_entries
  if ! awk 'NF == 0 { next } NF != 2 { exit 1 }' "$normalized_checksum"; then
    fail "SHA256SUMS.txt must contain only '<sha256>  <filename>' lines"
  fi
  line_count="$(awk 'NF { count += 1 } END { print count + 0 }' "$normalized_checksum")"
  if [[ "$line_count" != "4" ]]; then
    fail "SHA256SUMS.txt must contain exactly 4 artifact entries"
  fi
  unexpected_entries="$(
    awk \
      -v backend="$(artifact_name "$BACKEND_ARTIFACT")" \
      -v frontend="$(artifact_name "$FRONTEND_ARTIFACT")" \
      -v extension="$(artifact_name "$EXTENSION_ARTIFACT")" \
      -v manifest="$(artifact_name "$RELEASE_MANIFEST")" \
      'NF && $2 != backend && $2 != frontend && $2 != extension && $2 != manifest { print $2 }' \
      "$normalized_checksum"
  )"
  if [[ -n "$unexpected_entries" ]]; then
    fail "SHA256SUMS.txt contains unexpected artifact entries: $unexpected_entries"
  fi
}

verify_checksum_entry() {
  local file="$1"
  local expected_name
  local expected_hash
  local actual_hash
  expected_name="$(artifact_name "$file")"
  expected_hash="$(awk -v name="$expected_name" '$2 == name { print tolower($1) }' "$normalized_checksum")"
  if [[ -z "$expected_hash" ]]; then
    fail "SHA256SUMS.txt does not contain $expected_name"
  fi
  if [[ "$(printf '%s\n' "$expected_hash" | wc -l | tr -d ' ')" != "1" ]]; then
    fail "SHA256SUMS.txt contains duplicate entries for $expected_name"
  fi
  actual_hash="$(sha256sum "$file" | awk '{ print $1 }')"
  if [[ "$actual_hash" != "$expected_hash" ]]; then
    fail "SHA256 mismatch for $file"
  fi
}

verify_backend_jar() {
  if ! unzip -t "$BACKEND_ARTIFACT" >/dev/null; then
    fail "Backend artifact must be a valid executable jar: $BACKEND_ARTIFACT"
  fi
  if ! unzip -l "$BACKEND_ARTIFACT" | awk '{ if ($4 ~ /^BOOT-INF[\\/]/) found = 1 } END { exit found ? 0 : 1 }'; then
    fail "Backend artifact must contain BOOT-INF: $BACKEND_ARTIFACT"
  fi
}

verify_extension_zip() {
  if ! unzip -t "$EXTENSION_ARTIFACT" >/dev/null; then
    fail "Extension artifact must be a valid zip: $EXTENSION_ARTIFACT"
  fi
  if ! unzip -l "$EXTENSION_ARTIFACT" | awk '{ print $4 }' | grep -Eq '(^|/)manifest\.json$'; then
    fail "Extension artifact must contain manifest.json: $EXTENSION_ARTIFACT"
  fi
}

verify_frontend_zip() {
  if ! unzip -t "$FRONTEND_ARTIFACT" >/dev/null; then
    fail "Frontend artifact must be a valid zip: $FRONTEND_ARTIFACT"
  fi
  if ! unzip -l "$FRONTEND_ARTIFACT" | awk '{ print $4 }' | grep -Eq '(^|/)index\.html$'; then
    fail "Frontend artifact must contain index.html: $FRONTEND_ARTIFACT"
  fi
}

manifest_value() {
  local key="$1"
  awk -F= -v key="$key" '$1 == key { print substr($0, length(key) + 2) }' "$RELEASE_MANIFEST" | tail -n 1 | tr -d '\r'
}

require_manifest_value() {
  local key="$1"
  local value
  value="$(manifest_value "$key")"
  [[ -n "$value" ]] || fail "RELEASE-MANIFEST.txt is missing $key"
  printf '%s\n' "$value"
}

verify_release_artifact_names() {
  local expected_backend="ez-one-backend-$RELEASE_ID.jar"
  local expected_frontend="ez-one-frontend-$RELEASE_ID.zip"
  local expected_extension="ez-one-extension-$RELEASE_ID.zip"
  [[ "$(artifact_name "$BACKEND_ARTIFACT")" == "$expected_backend" ]] || fail "backend artifact filename must be $expected_backend"
  [[ "$(artifact_name "$FRONTEND_ARTIFACT")" == "$expected_frontend" ]] || fail "frontend artifact filename must be $expected_frontend"
  [[ "$(artifact_name "$EXTENSION_ARTIFACT")" == "$expected_extension" ]] || fail "extension artifact filename must be $expected_extension"
  [[ "$(artifact_name "$RELEASE_MANIFEST")" == "RELEASE-MANIFEST.txt" ]] || fail "release manifest artifact filename must be RELEASE-MANIFEST.txt"
  [[ "$(artifact_name "$CHECKSUM_FILE")" == "SHA256SUMS.txt" ]] || fail "checksum artifact filename must be SHA256SUMS.txt"
}

verify_release_manifest() {
  local manifest_release_id
  local manifest_worktree
  local manifest_backend
  local manifest_frontend
  local manifest_extension

  manifest_release_id="$(require_manifest_value release_id)"
  [[ "$manifest_release_id" == "$RELEASE_ID" ]] || fail "RELEASE-MANIFEST.txt release_id must match RELEASE_ID ($RELEASE_ID), got $manifest_release_id"

  manifest_worktree="$(require_manifest_value git_worktree)"
  if [[ "$manifest_worktree" == "dirty" && "$ALLOW_DIRTY_RELEASE" != "true" ]]; then
    fail "RELEASE-MANIFEST.txt has git_worktree=dirty. Rebuild from a clean worktree or set ALLOW_DIRTY_RELEASE=true only for rehearsal artifacts."
  fi
  if [[ "$manifest_worktree" != "clean" && "$manifest_worktree" != "dirty" ]]; then
    fail "RELEASE-MANIFEST.txt git_worktree must be clean or dirty, got $manifest_worktree"
  fi

  manifest_backend="$(require_manifest_value backend_jar)"
  manifest_frontend="$(require_manifest_value frontend_zip)"
  manifest_extension="$(require_manifest_value extension_zip)"
  [[ "$manifest_backend" == "$(artifact_name "$BACKEND_ARTIFACT")" ]] || fail "RELEASE-MANIFEST.txt backend_jar does not match BACKEND_ARTIFACT"
  [[ "$manifest_frontend" == "$(artifact_name "$FRONTEND_ARTIFACT")" ]] || fail "RELEASE-MANIFEST.txt frontend_zip does not match FRONTEND_ARTIFACT"
  [[ "$manifest_extension" == "$(artifact_name "$EXTENSION_ARTIFACT")" ]] || fail "RELEASE-MANIFEST.txt extension_zip does not match EXTENSION_ARTIFACT"
}

if [[ "$DRY_RUN" != "true" && "$DRY_RUN" != "false" ]]; then
  fail "DRY_RUN must be true or false"
fi

if [[ "$ALLOW_DIRTY_RELEASE" != "true" && "$ALLOW_DIRTY_RELEASE" != "false" ]]; then
  fail "ALLOW_DIRTY_RELEASE must be true or false"
fi

require_command awk
require_command tr
require_command wc
require_command sha256sum
require_command unzip
require_command grep

if [[ "$DRY_RUN" == "false" ]]; then
  require_command sudo
  require_command systemctl
  require_command rsync
  require_command nginx
  if [[ -n "$BASE_URL" ]]; then
    require_command curl
    require_command bash
  fi
elif [[ -n "$BASE_URL" ]]; then
  require_command curl
fi

if [[ -z "$RELEASE_ID" ]]; then
  fail "RELEASE_ID is required"
fi

if [[ "$RELEASE_ID" =~ [^A-Za-z0-9_.-] ]]; then
  fail "RELEASE_ID may contain only letters, numbers, dot, underscore, and dash"
fi

require_file "$BACKEND_ARTIFACT"
require_file "$FRONTEND_ARTIFACT"
if [[ -z "$EXTENSION_ARTIFACT" ]]; then
  fail "EXTENSION_ARTIFACT is required"
fi
if [[ -z "$RELEASE_MANIFEST" ]]; then
  fail "RELEASE_MANIFEST is required"
fi
if [[ -z "$CHECKSUM_FILE" ]]; then
  fail "CHECKSUM_FILE is required"
fi
require_file "$EXTENSION_ARTIFACT"
require_file "$RELEASE_MANIFEST"
require_file "$CHECKSUM_FILE"
require_dir "$(artifact_dir "$BACKEND_TARGET")"
require_dir "$FRONTEND_TARGET"
verify_release_artifact_names

normalized_checksum="$(make_temp_file)"
trap 'rm -f "$normalized_checksum"' EXIT
tr -d '\r' < "$CHECKSUM_FILE" > "$normalized_checksum"
verify_checksum_manifest_shape
verify_checksum_entry "$BACKEND_ARTIFACT"
verify_checksum_entry "$FRONTEND_ARTIFACT"
verify_checksum_entry "$EXTENSION_ARTIFACT"
verify_checksum_entry "$RELEASE_MANIFEST"
pass "SHA256SUMS verified"
verify_backend_jar
pass "backend artifact jar verified"
verify_frontend_zip
pass "frontend artifact zip verified"
verify_extension_zip
pass "extension artifact zip verified"
verify_release_manifest
pass "RELEASE-MANIFEST verified"

if [[ -n "$BASE_URL" ]]; then
  validate_https_origin "$BASE_URL"
fi

if [[ "$DRY_RUN" == "true" ]]; then
  printf '[INFO] Dry run only. Re-run with DRY_RUN=false after confirming paths.\n'
fi

release_dir="$RELEASE_ROOT/$RELEASE_ID"
run_cmd sudo mkdir -p "$release_dir"
run_cmd sudo cp "$BACKEND_ARTIFACT" "$release_dir/$(artifact_name "$BACKEND_ARTIFACT")"
run_cmd sudo cp "$FRONTEND_ARTIFACT" "$release_dir/$(artifact_name "$FRONTEND_ARTIFACT")"

run_cmd sudo cp "$EXTENSION_ARTIFACT" "$release_dir/$(artifact_name "$EXTENSION_ARTIFACT")"
run_cmd sudo cp "$RELEASE_MANIFEST" "$release_dir/$(artifact_name "$RELEASE_MANIFEST")"
run_cmd sudo cp "$CHECKSUM_FILE" "$release_dir/$(artifact_name "$CHECKSUM_FILE")"

run_cmd sudo cp "$BACKEND_ARTIFACT" "$BACKEND_TARGET"
run_cmd sudo systemctl restart "$SERVICE_NAME"
run_cmd sudo systemctl is-active --quiet "$SERVICE_NAME"
pass "backend deploy target checked for $SERVICE_NAME"

temp_dir="$(make_temp_dir)"
trap 'rm -rf "$temp_dir" ${normalized_checksum:-}' EXIT
unzip -q "$FRONTEND_ARTIFACT" -d "$temp_dir"

if [[ "$DRY_RUN" == "true" ]]; then
  printf '[RUN] sudo rsync -a --delete %s/ %s/\n' "$temp_dir" "$FRONTEND_TARGET"
  printf '[RUN] sudo find %s -type d -exec chmod 755 {} +\n' "$FRONTEND_TARGET"
  printf '[RUN] sudo find %s -type f -exec chmod 644 {} +\n' "$FRONTEND_TARGET"
else
  sudo rsync -a --delete "$temp_dir"/ "$FRONTEND_TARGET"/
  sudo find "$FRONTEND_TARGET" -type d -exec chmod 755 {} +
  sudo find "$FRONTEND_TARGET" -type f -exec chmod 644 {} +
fi

run_cmd sudo nginx -t
run_cmd sudo systemctl reload nginx
pass "frontend deploy target checked for $FRONTEND_TARGET"

if [[ -n "$BASE_URL" && "$DRY_RUN" == "false" ]]; then
  wait_for_health "$BASE_URL"
elif [[ -n "$BASE_URL" ]]; then
  printf '[RUN] wait for %s/api/health up to %ss\n' "$BASE_URL" "$HEALTH_TIMEOUT_SECONDS"
fi
run_runtime_check

pass "deploy script completed"
