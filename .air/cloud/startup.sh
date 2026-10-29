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

npm ci
npm run build --workspace apps/apm/www

docker compose -f docker/apm/dev/compose.yaml pull nginx mysql valkey typesense
docker compose -f docker/apm/dev/compose.yaml build php node collatex
docker compose -f docker/apm/dev/compose.yaml up -d

healthcheck() {
  until docker info >/dev/null 2>&1; do
    sleep 2
  done

  until docker compose -f docker/apm/dev/compose.yaml ps --status running --services | \
    sort | diff - <(printf '%s\n' collatex fonts mysql nginx node php typesense valkey | sort); do
    sleep 2
  done

  until curl --fail --silent --show-error http://127.0.0.1:8888/ -o /tmp/apm-healthcheck.html 2>/dev/null && \
    grep -qi '<html' /tmp/apm-healthcheck.html; do
    sleep 2
  done
}

healthcheck