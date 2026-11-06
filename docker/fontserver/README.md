# Font server

The font server is an optional development service, independent of the APM
development containers. Its image downloads the fontserver ZIP at build time
and includes the extracted files directly in the Nginx image; it does not use a
shared host directory or the APM containers.

To run it, copy `.env.sample` to `.env`, set `FONTS_ZIP_URL` to a ZIP URL whose
archive contains a top-level `fontserver` directory, and start the service:

```sh
cp .env.sample .env
docker compose up --build -d
```

The service is available at `http://localhost:4567` by default. Change
`FONTS_PORT` in `.env` to use a different host port. To stop the service, run
`docker compose down` from this directory.