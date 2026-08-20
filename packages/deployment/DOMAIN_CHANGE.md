# Change domain (same server)

Step-by-step guide to move the app and API to **new hostnames** while keeping the **same server**, deploy paths, ports, and PM2 processes.

Applies to **Approach B** (dedicated domains), e.g. production:

| Role     | Example (current)                 | Example (new)              |
| -------- | --------------------------------- | -------------------------- |
| Frontend | `classroom.mawsoftwares.in`       | `app.newdomain.com`        |
| Backend  | `api.classroom.mawsoftwares.in`   | `api.newdomain.com`        |

Related: [TOPOLOGY_SWITCHING.md](./topology/TOPOLOGY_SWITCHING.md) · [HTTPS_SETUP.md](./HTTPS_SETUP.md) · [README.md](./README.md)

Mirror on the frontend repo: `deployment/DOMAIN_CHANGE.md`.

---

## What stays the same

- Server IP / SSH host
- `deployPath` (frontend static dir, backend app dir)
- Backend `PORT` / `ports.backend` (e.g. `8200`)
- PM2 process name
- Database host and credentials (unless you intentionally change them)

## What you change

- DNS A records
- Domain fields in `app.config.json` (frontend + backend)
- URL / CORS vars in `.env` (frontend + backend)
- Let’s Encrypt certificates + nginx vhosts for the new names
- Remove old nginx site links (optional cleanup)

---

## Checklist overview

1. [ ] Point DNS for new app + API domains at the server
2. [ ] Wait until DNS resolves
3. [ ] Update 4 local config files
4. [ ] Deploy frontend with HTTPS setup (rebuild required)
5. [ ] Deploy backend with HTTPS setup
6. [ ] Remove old nginx vhosts
7. [ ] Verify certs, health, and login

---

## Step 1 — DNS

Create **A** records for both new hostnames pointing at the **same server IP**.

| Type | Name                 | Value      |
| ---- | -------------------- | ---------- |
| A    | `app.newdomain.com`  | server IP  |
| A    | `api.newdomain.com`  | server IP  |

Confirm resolution before continuing:

```bash
dig +short app.newdomain.com
dig +short api.newdomain.com
```

Both must return the server IP. Certbot will fail if DNS is not ready.

---

## Step 2 — Update local config (4 files)

Replace placeholders with your real new hostnames. Use the environment folder you are changing (usually `production`).

### 2a. Frontend — `deployment/environments/<env>/app.config.json`

| Field                                      | Set to                                                          |
| ------------------------------------------ | --------------------------------------------------------------- |
| `domain`                                   | `app.newdomain.com`                                             |
| `hosting.apiUrl`                           | `https://api.newdomain.com`                                     |
| `static.nginx.ssl.certificate`             | `/etc/letsencrypt/live/app.newdomain.com/fullchain.pem`         |
| `static.nginx.ssl.certificateKey`          | `/etc/letsencrypt/live/app.newdomain.com/privkey.pem`           |
| `static.nginx.ssl.acmeChallengeRoot`       | keep existing path (e.g. `/home/deploy/prod/classroom/acme-challenge`) |

Leave `server`, `deployPath`, `ssh`, and ports unchanged.

### 2b. Frontend — `deployment/environments/<env>/.env`

| Variable            | Set to                       |
| ------------------- | ---------------------------- |
| `VITE_BASE_PATH`    | `/`                          |
| `VITE_API_BASE_URL` | `https://api.newdomain.com`  |

`VITE_*` values are baked into the build — a full frontend rebuild/deploy is required.

Also update `.env.example` comments if you keep them as the documented template.

### 2c. Backend — `deployment/environments/<env>/app.config.json`

| Field                               | Set to                                                        |
| ----------------------------------- | ------------------------------------------------------------- |
| `domain`                            | `api.newdomain.com`                                           |
| `nginx.ssl.certificate`             | `/etc/letsencrypt/live/api.newdomain.com/fullchain.pem`       |
| `nginx.ssl.certificateKey`          | `/etc/letsencrypt/live/api.newdomain.com/privkey.pem`         |
| `nginx.ssl.acmeChallengeRoot`       | keep existing path                                            |

Leave `server`, `deployPath`, `ports`, PM2 name, and database settings unchanged.

### 2d. Backend — `deployment/environments/<env>/.env`

| Variable            | Set to                       |
| ------------------- | ---------------------------- |
| `ALLOWED_ORIGINS`   | `https://app.newdomain.com` (plus any local origins you still need) |
| `FRONTEND_BASE_URL` | `https://app.newdomain.com`  |
| `API_BASE_URL`      | `https://api.newdomain.com`  |
| `PORT`              | unchanged (e.g. `8200`)      |

---

## Step 3 — Deploy with new SSL

Prefer one-shot when `deploy` has passwordless sudo for `ln`, `nginx`, `systemctl`, and `certbot`.

### Frontend (rebuild + HTTPS)

```bash
cd frontend
npm run deploy -- production --setup-https
```

### Backend (app + API HTTPS)

```bash
cd backend
npm run deploy -- production --setup-https
```

That flow: deploy app → HTTP nginx bootstrap → certbot for the new domain → HTTPS nginx → reload.

### If sudo asks for a password

Follow [HTTPS_SETUP.md](./HTTPS_SETUP.md) manual path:

1. Deploy HTTP bootstrap (`--yes-nginx` without SSL).
2. As root: symlink vhosts into `/etc/nginx/sites-enabled/`, then `nginx -t && systemctl reload nginx`.
3. As root: run `certbot certonly --webroot` for each new domain.
4. From your machine: redeploy with `--yes-nginx --ssl-ready`.

---

## Step 4 — Remove old nginx vhosts

On the server (as root), disable the previous domains so they stop answering on 443:

```bash
# Adjust old names to whatever you replaced
sudo rm -f /etc/nginx/sites-enabled/classroom.mawsoftwares.in.conf
sudo rm -f /etc/nginx/sites-enabled/api.classroom.mawsoftwares.in.conf

# Optional: remove generated copies
sudo rm -f /home/deploy/nginx/vhosts-enabled/classroom.mawsoftwares.in.conf
sudo rm -f /home/deploy/nginx/vhosts-enabled/api.classroom.mawsoftwares.in.conf

sudo nginx -t && sudo systemctl reload nginx
```

Optional later: delete unused Let’s Encrypt certs for the old names (`certbot delete`).

---

## Step 5 — Verify

```bash
# Cert CN must match each new domain
echo | openssl s_client -connect app.newdomain.com:443 \
  -servername app.newdomain.com 2>/dev/null | openssl x509 -noout -subject

echo | openssl s_client -connect api.newdomain.com:443 \
  -servername api.newdomain.com 2>/dev/null | openssl x509 -noout -subject

# App + API
curl -sS -o /dev/null -w "%{http_code}\n" https://app.newdomain.com/
curl -sS https://api.newdomain.com/health
```

In the browser:

- Open `https://app.newdomain.com/` — padlock valid, no wrong-certificate warning
- Log in — must succeed (CORS uses new `ALLOWED_ORIGINS`)

---

## Later deploys (domain already set)

```bash
# App only — nginx already correct
cd frontend && npm run deploy -- production --skip-nginx
cd backend  && npm run deploy -- production --skip-nginx

# Refresh HTTPS nginx after template/config changes
cd frontend && npm run deploy -- production --skip-build --yes-nginx --ssl-ready
cd backend  && npm run deploy -- production --yes-nginx --ssl-ready
```

---

## Approach A note (shared subpath)

If the environment uses **shared subpath** (e.g. staging on `apps.mawsoftwares.in/classroom-uat/`):

- You usually change path / parent host in the same 4 files — see [TOPOLOGY_SWITCHING.md](./topology/TOPOLOGY_SWITCHING.md).
- You do **not** need new Let’s Encrypt certs for the app if TLS stays on the parent domain.
- Frontend still needs a rebuild when `VITE_BASE_PATH` / `VITE_API_BASE_URL` change.

---

## Quick reference — fields by file

| File | Key fields |
| ---- | ---------- |
| Frontend `app.config.json` | `domain`, `hosting.apiUrl`, `static.nginx.ssl.certificate*` |
| Frontend `.env` | `VITE_BASE_PATH`, `VITE_API_BASE_URL` |
| Backend `app.config.json` | `domain`, `nginx.ssl.certificate*` |
| Backend `.env` | `ALLOWED_ORIGINS`, `FRONTEND_BASE_URL`, `API_BASE_URL` |
