# Deployment Versioning

How to set, check and report the version an application is running, so MAW-HUB can compare it with the version declared in the Hub.

## How it works

1. You deploy with a version. `@mawsoftwares/deploy` stamps three values into the app's environment (the `.env` it uploads):

   | Variable | Meaning |
   |---|---|
   | `APP_VERSION` | The version you passed (or the git tag/commit) |
   | `APP_COMMIT` | Short git commit that was deployed |
   | `APP_DEPLOYED_AT` | ISO timestamp of the deploy |

2. The app reads them and exposes them (public, read-only, no secrets):
   - `GET /version` → `{ "service": "php|node|frontend", "version": "1.2.3", "commit": "a1b2c3d", "deployedAt": "2026-10-29T04:24:47.675Z" }`
   - `GET /health` also includes `version`, `commit`, `deployedAt`.
   - Frontends get a `/version.json` file in `dist/` with the same fields.
3. MAW-HUB calls `<app domain>/version` per environment and compares the running version with the declared one. A difference means the deploy did not happen or went wrong.

If the variables are not set, the app reports `"unknown"` — never an error.

## Setting the version when you deploy

```bash
npx @mawsoftwares/deploy staging --version 1.2.3
npx @mawsoftwares/deploy production --version 1.2.3
```

If `--version` is omitted, the version is the nearest git tag (`git describe --tags --always`), falling back to the short commit. Recommended: tag the release (`git tag v1.2.3`) and pass the same value that you enter in MAW-HUB.

The version and commit are also saved in `deploy/history/<env>/history.json`.

## Checking what is running

```bash
curl https://<app-domain>/version
curl https://<app-domain>/health
```

## Adding it to an application

Already included in `BASE`. For an existing project that predates this, copy four small changes:

1. **PHP** — `config/app.php`: add the `deploy` block (`APP_VERSION`, `APP_COMMIT`, `APP_DEPLOYED_AT`); `routes/auth_health.php`: add `GET /version` and spread `config('app.deploy')` into `/health`.
2. **Node** — `src/main.ts`: add the `deployInfo` object and `GET /version` next to `/health`.
3. **Docker** — if the compose file lists variables by hand (like `backend-php/docker-compose.prod.yml`), add:
   ```yaml
   APP_VERSION: ${APP_VERSION:-unknown}
   APP_COMMIT: ${APP_COMMIT:-unknown}
   APP_DEPLOYED_AT: ${APP_DEPLOYED_AT:-}
   ```
   Compose files that use `env_file: .env` need nothing.
4. **Frontend** — nothing; the deploy tool writes `version.json` into `dist/`.

Run `php artisan config:clear` (or rebuild) if the PHP config was cached before the first versioned deploy.

## Notes

- The version is set at deploy time, not baked into the Docker image, so redeploying or rolling back the same image reports the right version.
- A `--dry-run` also writes a history entry (with the version), as before.

## Checking from MAW-HUB

- **Projects** (BASE-style apps): Project → Deployments tab → **Check running versions**. For every active environment (and its portals) the Hub asks `<url>/version`, then `<url>/version.json`, and compares the answer with the latest *succeeded* deployment record for that environment (matched by environment name or type; `v1.2.3` and `1.2.3` count as the same). Record the same version you pass to `--version`.
- **Sites** (website_cms): Site → Deploy tab → **Check running versions**. The Hub asks the API base URL, admin domain and website domain, and compares with the release tag of the latest real (non-dry-run) succeeded deploy. `website_cms/deploy/deploy.sh` stamps `version.json` (release tag, commit, time) into the admin and website builds, and into the API's `public/` folder for the upload.
- Results: **Matches**, **Different**, **No answer**, **No version set** (app answers but has no version), **Nothing recorded**.
- The check runs only when you click it. It never contacts private or local addresses, does not follow redirects, and is rate-limited.
- For the API of a website_cms site, `version.json` is served from the API's public folder; if the API base URL does not map to that folder, the API row shows *No answer* while the admin and website rows still work.
