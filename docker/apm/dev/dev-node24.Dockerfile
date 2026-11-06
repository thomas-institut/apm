#
# Dockerfile to generate a docker image
# for APM's typesetting services.
#
# Created: 2025-07-08
#
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

FROM ubuntu:24.04
LABEL authors="Rafael Nájera"
RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y wget python3 \
    pkg-config \
    build-essential git \
    gobject-introspection \
    libgirepository1.0-dev \
    libcairo2 libcairo2-dev \
    libpangocairo-1.0 gir1.2-pango-1.0 \
    python3-pip libgirepository-2.0-dev \
    curl

RUN curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
RUN apt install -y nodejs

# Install python dependencies
RUN pip3 install PyGObject simplejson==3.18.0 --break-system-packages

# Install fontserver files in the image so the node container is self-contained.
COPY --from=fontserver /tmp/fontserver/fontserver/ /usr/share/fonts/apm-fonts/
RUN if command -v fc-cache >/dev/null 2>&1; then fc-cache -f; fi

COPY entrypoint-node.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint-node.sh

ENTRYPOINT ["entrypoint-node.sh"]
CMD ["tail", "-f", "/dev/null"]


