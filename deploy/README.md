# Deploying Kort

Kort runs as a private instance on a small VPS (Docker + Caddy), behind a shared Google sign-in.
Two containers from one Compose file: `kort-db` (Postgres 17) and `kort` (web app + import API).
The compose file, the Postgres data, the media folder (images and videos) and the env files live
together in one folder on the server. Caddy serves kort.gallab.top (`deploy/kort.caddy`).

## How it deploys

Push to `main`. `.github/workflows/deploy.yml` joins the private network, syncs the repo to the
server, rebuilds the container, installs the Caddy site and runs a smoke test. Secrets never leave
the server: the app env file (see `kort.env.example`) and the Postgres env file (`POSTGRES_PASSWORD`).

## One-time facts

- Data was moved from the previous hosted database on 2026-10-18; the app has used Postgres only since.
- Identity: Caddy sets `Remote-Email` after the Google sign-in; the server maps it to a user in the
  household. `KORT_ALLOWED_EMAILS` limits who may use the API.
- iPhone Shortcut: opens `https://kort.gallab.top/import?url=` in the browser (carries the login).
- An optional `cookies.txt` (Netscape format) next to the compose file makes Instagram/Facebook
  downloads more reliable.
- Backups: a nightly `pg_dump` plus the media folder are part of the server's off-site backup.
