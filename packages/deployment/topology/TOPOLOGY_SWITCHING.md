# Topology switching — what to change

Switch hosting style by editing **4 files** for that environment. No script changes.

**Samples:** `deployment/topology/samples/` (see [topology/README.md](./topology/README.md)).

| Approach | Frontend sample | Backend sample |
| -------- | --------------- | -------------- |
| **A — Shared subpath** | `topology/samples/frontend/approach-a-shared-subpath/` | `topology/samples/backend/approach-a-proxied-subpath/` |
| **B — Dedicated domains** | `topology/samples/frontend/approach-b-dedicated-root/` | `topology/samples/backend/approach-b-dedicated-domain/` |

| Approach | URLs look like |
| -------- | -------------- |
| **A — Shared subpath** | `https://domain.com/app-name/` + API at `/app-name/api` |
| **B — Dedicated domains** | `https://app.domain.com` + `https://api.domain.com` |

Keep pairs: **A frontend ↔ A backend**, or **B frontend ↔ B backend**.

**Same topology, new hostnames only (same server):** see [DOMAIN_CHANGE.md](../DOMAIN_CHANGE.md).

---

## Files to edit

| # | File |
| - | ---- |
| 1 | `frontend/deployment/environments/<env>/app.config.json` |
| 2 | `frontend/deployment/environments/<env>/.env` |
| 3 | `backend/deployment/environments/<env>/app.config.json` |
| 4 | `backend/deployment/environments/<env>/.env` |

---

## Approach A — Shared subpath

Example: `https://apps.mawsoftwares.in/classroom-prod/`

### 1. Frontend `app.config.json`

| Field | Set to |
| ----- | ------ |
| `hosting.topology` | `"shared-subpath"` |
| `hosting.apiUrl` | **remove** |
| `domain` | shared host, e.g. `"apps.mawsoftwares.in"` |
| `static.basePath` | `"/classroom-prod"` |
| `static.apiProxy.enabled` | `true` |
| `static.apiProxy.backendPort` | backend port, e.g. `8200` |
| `static.nginx.snippetDir` | snippet folder for that shared domain |
| `static.assets.verifyAfterBuild` | `true` |

### 2. Frontend `.env`

| Variable | Set to |
| -------- | ------ |
| `VITE_BASE_PATH` | `/classroom-prod/` *(trailing slash)* |
| `VITE_API_BASE_URL` | `/classroom-prod` *(no trailing slash)* |

### 3. Backend `app.config.json`

| Field | Set to |
| ----- | ------ |
| `hosting.topology` | `"proxied-subpath"` |
| `nginx.ssl` | **remove / disable** |
| `ports.backend` | same port as frontend `apiProxy.backendPort` |

### 4. Backend `.env`

| Variable | Set to |
| -------- | ------ |
| `ALLOWED_ORIGINS` | `https://apps.mawsoftwares.in` *(host only, no path)* |
| `FRONTEND_BASE_URL` | `https://apps.mawsoftwares.in/classroom-prod` *(with path)* |
| `API_BASE_URL` | `https://apps.mawsoftwares.in/classroom-prod` |
| `PORT` | same as `ports.backend` |

### Deploy

```bash
# Frontend — rebuild required (VITE_* baked in)
npm run deploy -- <env>

# Backend
node deployment/scripts/deploy.js <env>
```

---

## Approach B — Dedicated domains

Example: `app.yourdomain.com` + `api.yourdomain.com`

### 1. Frontend `app.config.json`

| Field | Set to |
| ----- | ------ |
| `hosting.topology` | `"dedicated-root"` |
| `hosting.apiUrl` | `"https://api.yourdomain.com"` |
| `domain` | `"app.yourdomain.com"` |
| `static.basePath` | **remove** |
| `static.apiProxy.enabled` | `false` |
| `static.nginx.snippetDir` | **remove** |
| `static.nginx.ssl.*` | cert paths for **app** domain |
| `static.assets.verifyAfterBuild` | `false` |

### 2. Frontend `.env`

| Variable | Set to |
| -------- | ------ |
| `VITE_BASE_PATH` | `/` |
| `VITE_API_BASE_URL` | `https://api.yourdomain.com` |

### 3. Backend `app.config.json`

| Field | Set to |
| ----- | ------ |
| `hosting.topology` | `"dedicated-domain"` |
| `domain` | `"api.yourdomain.com"` |
| `nginx.ssl.enabled` | `true` |
| `nginx.ssl.certificate` / `certificateKey` | cert paths for **api** domain |
| `nginx.ssl.acmeChallengeRoot` | ACME webroot path |
| `nginx.autoInstall` | `true` to install vhost during deploy |
| `nginx.vhostDir` | e.g. `/home/deploy/nginx/vhosts-enabled` |
| `nginx.certbot.email` | Let's Encrypt contact (or `CERTBOT_EMAIL`) |
| `health.protocol` | `"http"` (deploy probes Node on `ports.backend`) |

### 4. Backend `.env`

| Variable | Set to |
| -------- | ------ |
| `ALLOWED_ORIGINS` | `https://app.yourdomain.com` |
| `FRONTEND_BASE_URL` | `https://app.yourdomain.com` |
| `API_BASE_URL` | `https://api.yourdomain.com` |
| `PORT` | backend port, e.g. `8200` |

### Deploy (SSL first time)

```bash
# Approach A — shared-subpath (snippet only; parent domain already has TLS)
# Frontend
npm run deploy -- <env> --setup-https
# Backend (no public API nginx)
npm run deploy -- <env>

# Approach B — dedicated domains (one-shot HTTPS)
# Frontend app domain
npm run deploy -- <env> --setup-https
# Backend API domain
npm run deploy -- <env> --setup-https
```

That install step is **one isolated vhost per hostname** (`{domain}.conf` in
`vhosts-enabled`, symlink only that file). It must not rewrite other apps on the
same nginx. Use `certbot certonly --webroot`, never `certbot --nginx`. One
hostname = one vhost owner (admin and worker must not both autoInstall on the
same domain).

---

## Side-by-side cheat sheet

| What | A — Subpath | B — Dedicated |
| ---- | ----------- | ------------- |
| Frontend topology | `shared-subpath` | `dedicated-root` |
| Backend topology | `proxied-subpath` | `dedicated-domain` |
| Frontend `domain` | shared host | app host |
| Backend `domain` | label only | api host |
| `basePath` / `apiProxy` | required | off |
| `hosting.apiUrl` | omit | required |
| `VITE_BASE_PATH` | `/app/` | `/` |
| `VITE_API_BASE_URL` | `/app` | `https://api…` |
| Backend SSL nginx | no | yes |
| CORS origin | shared host (no path) | app host |
| `FRONTEND_BASE_URL` | host **+** path | app host only |

---

## Check before deploy

```bash
node deployment/scripts/validate-config.js <env>
npm run deploy -- <env> --dry-run                    # frontend
node deployment/scripts/deploy.js <env> --dry-run    # backend
```

---

## Avoid

| Don’t | Do |
| ----- | -- |
| Change topology without rebuilding frontend | Always rebuild after `.env` / topology change |
| Put path in `ALLOWED_ORIGINS` | Origin = scheme + host only |
| Omit path in `FRONTEND_BASE_URL` for A | Include `/classroom-prod` |
| Mix A frontend with B backend | Keep matching pairs |
| Enable HTTPS nginx before certs exist | Bootstrap → certbot → `--ssl-ready` |
| Edit another app's vhost / shared parent | Add `{domain}.conf` only |
| Two apps autoInstall on the same hostname | One vhost owner per hostname |
| `certbot --nginx` (rewrites other sites) | `certbot certonly --webroot` |
