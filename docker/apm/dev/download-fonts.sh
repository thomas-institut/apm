#!/bin/sh

set -eu

if [ -z "${FONTS_ZIP_URL:-}" ]; then
    echo "FONTS_ZIP_URL must be set in docker/apm/dev/.env" >&2
    exit 1
fi

apk add --no-cache curl unzip

temp_dir=$(mktemp -d)
trap 'rm -rf "$temp_dir"' EXIT

curl --fail --location --silent --show-error "$FONTS_ZIP_URL" -o "$temp_dir/fontserver.zip"
mkdir "$temp_dir/unpacked"
unzip -q "$temp_dir/fontserver.zip" -d "$temp_dir/unpacked"

if [ ! -d "$temp_dir/unpacked/fontserver" ]; then
    echo "The ZIP archive must contain a top-level fontserver directory" >&2
    exit 1
fi

rm -rf /var/apm/fontserver
mv "$temp_dir/unpacked/fontserver" /var/apm/fontserver