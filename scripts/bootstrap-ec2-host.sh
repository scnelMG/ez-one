#!/usr/bin/env bash
set -euo pipefail

DRY_RUN="${DRY_RUN:-true}"
APP_USER="${APP_USER:-ezone}"
APP_GROUP="${APP_GROUP:-ezone}"
DEPLOY_USER="${DEPLOY_USER:-ubuntu}"
DEPLOY_GROUP="${DEPLOY_GROUP:-ubuntu}"
APP_ROOT="${APP_ROOT:-/opt/ez-one}"
ENV_DIR="${ENV_DIR:-/etc/ez-one}"
FRONTEND_ROOT="${FRONTEND_ROOT:-/var/www/ez-one}"
SOURCE_DIR="${SOURCE_DIR:-/opt/ez-one/source/current}"
APPLY_TEMPLATES="${APPLY_TEMPLATES:-false}"
DOMAIN_NAME="${DOMAIN_NAME:-}"

PACKAGES="git openjdk-17-jre-headless nginx unzip rsync curl ca-certificates certbot mysql-client"

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

run_cmd() {
  printf '[RUN] %s\n' "$*"
  if [[ "$DRY_RUN" == "true" ]]; then
    return 0
  fi
  "$@"
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "$1 is required but was not found"
}

require_file() {
  [[ -f "$1" ]] || fail "Required file not found: $1"
}

if [[ "$DRY_RUN" != "true" && "$DRY_RUN" != "false" ]]; then
  fail "DRY_RUN must be true or false"
fi

if [[ "$APPLY_TEMPLATES" != "true" && "$APPLY_TEMPLATES" != "false" ]]; then
  fail "APPLY_TEMPLATES must be true or false"
fi

if [[ "$DRY_RUN" == "false" ]]; then
  require_command sudo
  require_command apt-get
fi

info "EC2 bootstrap uses DRY_RUN=$DRY_RUN. Re-run with DRY_RUN=false after reviewing the printed commands."
info "Set DOMAIN_NAME to the real production domain and update infra/nginx/ez-one.conf before APPLY_TEMPLATES=true."

run_cmd sudo apt-get update
run_cmd sudo apt-get install -y $PACKAGES

if getent group "$APP_GROUP" >/dev/null 2>&1; then
  pass "group already exists: $APP_GROUP"
else
  run_cmd sudo groupadd --system "$APP_GROUP"
fi

if id "$APP_USER" >/dev/null 2>&1; then
  pass "user already exists: $APP_USER"
else
  run_cmd sudo useradd --system --gid "$APP_GROUP" --home "$APP_ROOT" --shell /usr/sbin/nologin "$APP_USER"
fi

run_cmd sudo mkdir -p "$APP_ROOT/backend" "$APP_ROOT/incoming" "$APP_ROOT/releases" "$APP_ROOT/source" "$ENV_DIR" "$FRONTEND_ROOT"
run_cmd sudo chown -R "$APP_USER:$APP_GROUP" "$APP_ROOT/backend" "$APP_ROOT/releases"
run_cmd sudo chown -R "$DEPLOY_USER:$DEPLOY_GROUP" "$APP_ROOT/incoming" "$APP_ROOT/source"
run_cmd sudo chmod 750 "$ENV_DIR"
run_cmd sudo chmod 755 "$FRONTEND_ROOT"

if [[ "$APPLY_TEMPLATES" == "true" ]]; then
  if [[ -z "$DOMAIN_NAME" ]]; then
    fail "DOMAIN_NAME is required when APPLY_TEMPLATES=true."
  fi
  if [[ "$DOMAIN_NAME" == "ez-one.kr" ]]; then
    info "Using the checked-in example domain ez-one.kr. Confirm this is the actual production domain."
  fi
  require_file "$SOURCE_DIR/infra/systemd/ez-one-backend.service"
  require_file "$SOURCE_DIR/infra/nginx/ez-one.conf"
  run_cmd sudo cp "$SOURCE_DIR/infra/systemd/ez-one-backend.service" /etc/systemd/system/ez-one-backend.service
  run_cmd sudo cp "$SOURCE_DIR/infra/nginx/ez-one.conf" /etc/nginx/sites-available/ez-one
  run_cmd sudo ln -sf /etc/nginx/sites-available/ez-one /etc/nginx/sites-enabled/ez-one
  run_cmd sudo systemctl daemon-reload
  run_cmd sudo nginx -t
  run_cmd sudo systemctl enable ez-one-backend
  run_cmd sudo systemctl enable nginx
else
  info "Skipped template installation. Set APPLY_TEMPLATES=true after certificates and domain-specific nginx values are ready."
fi

pass "EC2 bootstrap preflight completed"
