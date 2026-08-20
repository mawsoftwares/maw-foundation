# HTTPS setup (dedicated domains)

Guide for Approach B: API on its own domain (e.g. `api.classroom.mawsoftwares.in`), paired with frontend `classroom.mawsoftwares.in`.

Related: [TOPOLOGY_SWITCHING.md](./topology/TOPOLOGY_SWITCHING.md) · [README.md](./README.md)

Mirror doc on the frontend repo: `deployment/HTTPS_SETUP.md`.

---

## Symptom: `ERR_CERT_COMMON_NAME_INVALID`

Browser warning on the **frontend** domain often means nginx is presenting the wrong cert (e.g. `apps.mawsoftwares.in` instead of `classroom.mawsoftwares.in`). The same class of failure hits the API if `api.classroom.mawsoftwares.in` has no SSL vhost in `sites-enabled`.

**Cause:**

1. Vhost under `/home/deploy/nginx/vhosts-enabled/` not linked in `/etc/nginx/sites-enabled/` (sudo failed).
2. Only HTTP bootstrap (`listen 80`) is installed — no `443 ssl` server block.
3. Let’s Encrypt cert not issued yet for the API (or app) hostname.

---

## Prerequisites

- DNS `A` for `api.<app-domain>` (and the app domain) points at the server.
- Backend already running (PM2); deploy health uses **`http://SERVER:ports.backend/health`** (keep `health.protocol: "http"`).
- `nginx.autoInstall: true`, `vhostDir`, `certbot.email` (or `CERTBOT_EMAIL`) set in `app.config.json`.
- Root/sudo for `ln`, `nginx`, `systemctl`, `certbot` (or passwordless sudo for `deploy`).

---

## One-shot (passwordless sudo available)

```bash
cd backend
npm run deploy -- production --setup-https
```

Flow: app deploy → HTTP nginx bootstrap → certbot → HTTPS nginx → reload.

Frontend (separate repo):

```bash
cd frontend
npm run deploy -- production --setup-https
```

---

## Manual fix (sudo password required)

### 1. Enable HTTP bootstrap (as root on the server)

```bash
sudo ln -sf /home/deploy/nginx/vhosts-enabled/classroom.mawsoftwares.in.conf \
  /etc/nginx/sites-enabled/classroom.mawsoftwares.in.conf

sudo ln -sf /home/deploy/nginx/vhosts-enabled/api.classroom.mawsoftwares.in.conf \
  /etc/nginx/sites-enabled/api.classroom.mawsoftwares.in.conf

sudo nginx -t && sudo systemctl reload nginx
```

Generate/upload bootstrap configs first if missing:

```bash
cd frontend && npm run deploy -- production --skip-build --yes-nginx
cd backend  && npm run deploy -- production --yes-nginx
```

### 2. Issue certificates (as root)

```bash
sudo certbot certonly --webroot \
  -w /home/deploy/prod/classroom/acme-challenge \
  -d classroom.mawsoftwares.in \
  --agree-tos -m ops@mawsoftwares.in --non-interactive

sudo certbot certonly --webroot \
  -w /home/deploy/prod/classroom/acme-challenge \
  -d api.classroom.mawsoftwares.in \
  --agree-tos -m ops@mawsoftwares.in --non-interactive
```

```bash
sudo ls /etc/letsencrypt/live/classroom.mawsoftwares.in/
sudo ls /etc/letsencrypt/live/api.classroom.mawsoftwares.in/
```

### 3. Install HTTPS nginx (from your Mac)

```bash
cd frontend && npm run deploy -- production --skip-build --yes-nginx --ssl-ready
cd backend  && npm run deploy -- production --yes-nginx --ssl-ready
```

Re-run the `ln -sf` + `nginx reload` from step 1 as root if deploy cannot sudo.

---

## Verify

```bash
echo | openssl s_client -connect api.classroom.mawsoftwares.in:443 \
  -servername api.classroom.mawsoftwares.in 2>/dev/null | openssl x509 -noout -subject
# expect: CN = api.classroom.mawsoftwares.in

curl -sS https://api.classroom.mawsoftwares.in/health
# {"success":true,"message":"OK","data":{"db":"connected",...}}

# Deploy probe (always HTTP on Node port — not HTTPS)
curl -sS http://SERVER_IP:8200/health
```

Frontend padlock:

```bash
echo | openssl s_client -connect classroom.mawsoftwares.in:443 \
  -servername classroom.mawsoftwares.in 2>/dev/null | openssl x509 -noout -subject
# expect: CN = classroom.mawsoftwares.in (NOT apps.mawsoftwares.in)
```

---

## Later deploys

```bash
npm run deploy -- production --skip-nginx              # app only
npm run deploy -- production --yes-nginx --ssl-ready   # refresh HTTPS vhost
```

---

## Passwordless sudo (recommended)

```text
deploy ALL=(root) NOPASSWD: /usr/bin/ln, /usr/sbin/nginx, /bin/systemctl, /usr/bin/certbot
```

```bash
ssh deploy@SERVER 'sudo -n true && sudo -n nginx -t && echo ok'
```

---

## Proxied-subpath (Approach A)

Backend `hosting.topology: "proxied-subpath"` — **do not** enable API SSL nginx. The frontend shared host proxies `/basePath/api` to localhost. Use frontend `--setup-https` only to install the location snippet.

---

## Checklist

- [ ] DNS for API (+ app) domains
- [ ] Bootstrap vhosts enabled in `sites-enabled`
- [ ] Certs under `/etc/letsencrypt/live/<domain>/`
- [ ] `--ssl-ready` or `--setup-https` applied
- [ ] openssl CN matches API domain
- [ ] `https://api…/health` OK
- [ ] Frontend uses `API_BASE_URL` / `VITE_API_BASE_URL` over HTTPS and login works
