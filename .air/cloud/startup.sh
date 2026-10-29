#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

export REPO_ROOT="$repo_root"
export APM_SRC=apps/apm
export DEV_TMP=.air/runtime

mkdir -p \
  "$DEV_TMP/apm/logs/nginx" \
  "$DEV_TMP/apm/mysql-data" \
  "$DEV_TMP/apm/share" \
  "$DEV_TMP/apm/apm-fonts" \
  "$DEV_TMP/apm/valkey-data" \
  "$DEV_TMP/apm/typesense-data"

if [[ ! -f "$APM_SRC/www/config.yaml" ]]; then
  cat > "$APM_SRC/www/config.yaml" <<'EOF'
db:
  host: mysql
  user: root
  pwd: ''
  db: apm
nodeService:
  url: http://node:4711
url:
  collatexHttp: http://collatex:7369
valkey:
  host: valkey
typesense:
  host: typesense
  key: devel1234
EOF
fi

if [[ "${AIR_STARTUP_MODE:-}" == "warmup" ]]; then
  npm ci
  until docker compose -f docker/apm/dev/compose.yaml pull nginx mysql valkey typesense; do
    sleep 5
  done
  docker compose -f docker/apm/dev/compose.yaml build php
  docker compose -f docker/apm/dev/compose.yaml build node
  docker compose -f docker/apm/dev/compose.yaml build collatex
fi

docker compose -f docker/apm/dev/compose.yaml up -d collatex mysql nginx node php typesense valkey

healthcheck() {
  until docker info >/dev/null 2>&1; do
    sleep 2
  done

  until docker compose -f docker/apm/dev/compose.yaml ps --status running --services | \
    sort | diff - <(printf '%s\n' collatex mysql nginx node php typesense valkey | sort); do
    sleep 2
  done

  until docker exec apm-mysql mysqladmin ping -h 127.0.0.1 --silent >/dev/null 2>&1; do
    sleep 2
  done

  until [[ "$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' \
    http://127.0.0.1:8888/api/whoami 2>/dev/null)" == "401" ]]; do
    sleep 2
  done
}

if [[ "${AIR_STARTUP_MODE:-}" == "warmup" ]]; then
  docker compose -f docker/apm/dev/compose.yaml restart nginx
  docker exec -w /opt/apm/www apm-php /opt/composer/composer install --no-interaction --prefer-dist
  until docker exec apm-mysql mysqladmin ping -h 127.0.0.1 --silent >/dev/null 2>&1; do
    sleep 2
  done
  docker exec apm-mysql mysql -uroot -e 'CREATE DATABASE IF NOT EXISTS apm'
  if ! docker exec apm-mysql mysql -uroot apm -Nse "SHOW TABLES LIKE 'ap_settings'" | grep -q '^ap_settings$'; then
    docker exec -i apm-mysql mysql -uroot apm < "$APM_SRC/db/db37-creation.sql"
  fi
  docker exec apm-mysql mysql -uroot apm -e "UPDATE ap_settings SET value='38' WHERE setting='DatabaseVersion'"
  healthcheck
fi