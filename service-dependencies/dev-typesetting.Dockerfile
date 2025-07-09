#
# Dockerfile to generate a docker image
# for APM's typesetting services.
#
# Created: 2025-07-08
#
FROM ubuntu:24.04
LABEL authors="Rafael Nájera"
RUN apt-get update && apt-get upgrade -y
RUN apt-get install -y wget python3 \
     pkg-config  \
     build-essential git \
     gobject-introspection \
     libgirepository1.0-dev \
     libcairo2 libcairo2-dev \
     libpangocairo-1.0 gir1.2-pango-1.0
RUN wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
RUN apt-get install python3-pip libgirepository-2.0-dev
ENTRYPOINT ["tail", "-f", "/dev/null"]


