# shared-php Docker Environment

This directory contains the Docker configuration for the `shared-php` library.

## Prerequisites

- Docker
- Docker Compose

## Usage

Go to this directory:
```bash
cd docker/shared-php
```

### Install Dependencies

```bash
docker compose run --rm shared-php composer install
```

### Run Tests

```bash
docker compose run --rm shared-php vendor/bin/phpunit
```

### Run Arbitrary PHP Code

```bash
docker compose run --rm shared-php php -r "echo 'Hello World';"
```

### Enter the container

```bash
docker compose run --rm shared-php bash
```
