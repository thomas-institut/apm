#
# Dockerfile to generate a docker image
# for APM's typesetting services.
#
# Created: 2025-07-08
#
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

# Install Node.js 18
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs

# Install python dependencies
RUN pip3 install PyGObject simplejson==3.18.0 --break-system-packages

# Create font symlink
RUN mkdir -p /usr/share/fonts && ln -s /var/apm/apm-fonts /usr/share/fonts/apm-fonts

COPY entrypoint-node.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint-node.sh

ENTRYPOINT ["entrypoint-node.sh"]
CMD ["tail", "-f", "/dev/null"]


