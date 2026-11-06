FROM alpine:3.22 AS fontserver
ARG FONTS_ZIP_URL
RUN set -eu; \
    if [ -z "$FONTS_ZIP_URL" ]; then \
        echo "FONTS_ZIP_URL must be provided as a build argument" >&2; \
        exit 1; \
    fi; \
    apk add --no-cache curl unzip; \
    mkdir -p /tmp/fontserver; \
    curl --fail --location --silent --show-error "$FONTS_ZIP_URL" -o /tmp/fontserver.zip; \
    unzip -q /tmp/fontserver.zip -d /tmp/fontserver; \
    test -d /tmp/fontserver/fontserver

FROM nginx:latest
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=fontserver /tmp/fontserver/fontserver/ /usr/share/nginx/html/