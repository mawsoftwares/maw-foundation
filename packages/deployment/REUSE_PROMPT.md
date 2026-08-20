# Reusable prompt: apply deployment/ kit audit to another project

Paste this into Claude Code in any other project that has a copy of the same
deployment/ kit (frontend, backend, or both) to repeat the explore-first,
ask-before-assuming production topology setup done in classroom/src.

---

This project has a `deployment/` folder (frontend and/or backend) copied from a shared
internal deployment kit — config-driven, per-environment folders under
`deployment/environments/<name>/` with `app.config.json` + `.env`, templates under
`deployment/templates/`, and a single entry point `deployment/scripts/deploy.js`.

I want production deployable and the topology easy to flip later. Do this:

1. FIRST, explore before assuming anything:
   - Read `deployment/README.md` and every `deployment/environments/*/app.config.json`
     and `.env` (note: `.env` files are gitignored — read them directly, don't rely on
     `.env.example`).
   - For frontend: check `static.basePath` (subpath hosting) and `static.nginx.ssl`
     usage, and how `VITE_BASE_PATH`/`VITE_API_URL`/`VITE_BACKEND_URL` are consumed in
     the app (e.g. `src/config/environment.ts` equivalent, `vite.config.ts`).
   - For backend: check `domain`, `ports.backend`, and how `.env` values (FRONTEND_URL,
     CORS origins, any QR/webhook base URLs) are actually consumed in the server code.
   - Check `deployment/scripts/generate-runtime-files.js` and
     `deployment/templates/*.conf` to see whether nginx generation already supports
     BOTH of these, or only one:
       (a) shared domain + subpath (e.g. domain.com/appname, proxied under one nginx
           vhost, SSL terminated once at that shared vhost)
       (b) its own dedicated domain (e.g. app.domain.com / api.domain.com), needing
           its own HTTP→HTTPS bootstrap + SSL nginx config
   - Report what you find before changing anything — which environments exist, which
     topology each currently uses, and whether SSL/ACME support exists for the
     dedicated-domain case. Do NOT assume; grep and read the actual template files.

2. THEN ask me (don't guess): which topology should `production` use — shared domain +
   subpath like an existing environment, or its own dedicated domain? If dedicated
   domain, ask whether frontend and backend/API share one domain or use separate ones,
   and whether to use placeholder domains (app.yourdomain.com / api.yourdomain.com) or
   real ones I'll supply.

3. IMPLEMENT, once I've answered:
   - If dedicated-domain SSL support is missing from a `deployment/templates/*.conf`
     set, add it as a genuine gap fix, not a workaround: a new SSL-capable template
     (HTTP bootstrap with ACME challenge location + redirect, then a separate HTTPS
     server block), and branch the template-selection logic in
     `generate-runtime-files.js` on an explicit config flag (e.g. `nginx.ssl.enabled`
     or `static.nginx.ssl.enabled`) plus a `sslCertsPresent`/`--ssl-ready` toggle —
     mirror whatever pattern the OTHER deployment folder in this same repo already
     uses if there is one (frontend and backend often diverge slightly; make them
     consistent).
   - Derive certificate paths, ACME webroot, and site name from `domain`/`deployPath`
     by default — never hardcode a domain into a path that should follow the config.
   - Isolated nginx vhost is a required reusable step for Approach B (dedicated
     hostname), not a one-off per project:
     - Write only `{domain}.conf` under `/home/deploy/nginx/vhosts-enabled/`
       (`nginx.vhostDir`). Frontend dedicated-root uses the same folder via
       `static.nginx.sitesAvailable`.
     - Symlink **only that file** into `/etc/nginx/sites-enabled/`.
     - `server_name` must equal `domain`; never `default_server`.
     - Do not edit other apps' vhosts or the shared parent snippet dir
       (e.g. `snippets/apps.mawsoftwares.in/`).
     - One hostname = one vhost owner (do not `--yes-nginx` two apps onto the
       same domain).
     - Issue certs with `certbot certonly --webroot` (never `certbot --nginx`).
     - Approach A (`proxied-subpath`) must not enable public API nginx/SSL —
       the frontend snippet owns the path on the shared host.
   - Update the target environment's `app.config.json` and `.env` for the chosen
     topology.
   - Regenerate runtime files for every environment/service the templates touched
     (and ideally all of them, to catch pre-existing breakage).
   - Generate runtime files for both the bootstrap and post-cert states (e.g. with and
     without an `--ssl-ready`-style flag) and read the actual rendered output to
     confirm both are correct.
   - Run `deploy.js <env> --dry-run` to confirm the full plan executes without error.
   - For frontend, actually run the build (`vite build --mode <mode>`) with the new
     env and check `dist/index.html` for correct asset paths (root vs subpath).

4. GIT SAFETY: if `deployment/generated/` or `deployment/history/` are git-tracked in
   this repo, do not `rm -rf` them — use `git status`/`git diff` to check, and
   `git restore` anything your own test runs modified before finishing, so committed
   generated artifacts aren't left showing your test output.

Report back: what topology each environment ended up on, what was broken vs. added,
and exactly which placeholder values I still need to replace with real ones before
deploying.

---

Notes:
- Mirrors the explore-first, ask-before-assuming-domain/topology, fix-real-gaps
  approach used on classroom/src.
- Paste as-is into a new project's Claude Code session; step 1 is self-correcting if
  that project's kit has already diverged from this one.
- classroom/src's own staging env uses shared-domain subpath hosting:
  `VITE_BASE_PATH=/classroom-uat/`, `VITE_API_BASE_URL=/classroom-uat`
  (frontend/deployment/environments/staging/.env).
