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
# Override default PHP config
RUN echo "memory_limit=1024M" > /usr/local/etc/php/conf.d/memory-limit.ini
RUN echo "php_value post_max_size 64M" >/usr/local/etc/php/conf.d/post-size.ini