#
# Dockerfile to generate a docker image that PHP-FPM
# with all the extensions needed for APM
#
# Created: 2025-05-21
#
FROM php:8.3-fpm
LABEL authors="Rafael Nájera"
RUN docker-php-ext-configure pcntl --enable-pcntl \
  && docker-php-ext-install pcntl;
ADD --chmod=0755 https://github.com/mlocati/docker-php-extension-installer/releases/latest/download/install-php-extensions /usr/local/bin/
RUN install-php-extensions gd yaml pdo pdo_mysql intl mbstring iconv zlib sockets posix
RUN apt-get update && apt-get upgrade -y
RUN apt-get install -y nodejs
RUN apt-get install -y zip
# Override default PHP config
RUN echo "memory_limit=1024M" > /usr/local/etc/php/conf.d/memory-limit.ini
RUN echo "post_max_size=256M" >/usr/local/etc/php/conf.d/post-size.ini
RUN echo "upload_max_filesize=256M" >/usr/local/etc/php/conf.d/max-file-size.ini