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
  docker compose -f docker/apm/dev/compose.yaml pull nginx mysql valkey typesense
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

  until curl --fail --silent --show-error http://127.0.0.1:8888/ -o /tmp/apm-healthcheck.html 2>/dev/null && \
    grep -qi '<html' /tmp/apm-healthcheck.html && \
    ! grep -qi 'SERVER ERROR\|Fatal error\|Warning:' /tmp/apm-healthcheck.html; do
    sleep 2
  done
}

if [[ "${AIR_STARTUP_MODE:-}" == "warmup" ]]; then
  docker compose -f docker/apm/dev/compose.yaml restart nginx
  docker exec -w /opt/apm/www apm-php /opt/composer/composer install --no-interaction --prefer-dist
  healthcheck
fi