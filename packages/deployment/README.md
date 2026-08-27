# @mawsoftwares/deploy — Configuration-Driven Deployment Engine

Reusable deployment engine — shared scripts + templates live here once; each
project only adds a thin `deploy/` folder with its own environment configs.

## How it works

```
@mawsoftwares/deploy (this package — shared engine)
├── scripts/        # deploy.js, generate-runtime-files.js, health-check.js, rollback.js
├── templates/      # PM2, nginx, Docker, runtime templates
├── topology/       # Hosting topology samples (subpath vs dedicated domain)
└── bin/            # CLI entry point

your-project/ (any consuming project)
├── deploy/
│   ├── environments/
│   │   ├── staging/
│   │   │   ├── app.config.json    ← server, ports, domain, DB, SSH, commands
│   │   │   └── .env               ← secrets (gitignored)
│   │   └── production/
│   │       ├── app.config.json
│   │       └── .env
│   ├── generated/                  (gitignored — auto-generated runtime files)
│   ├── logs/                       (gitignored — deployment logs)
│   └── history/                    (deployment history for rollback)
└── deploy.config.json              (optional — override deploy dir name)
```

## Quick start (new project)

```bash
# 1. Scaffold the deploy/ folder with sample configs
npx @mawsoftwares/deploy init

# 2. Edit your environment config
vim deploy/environments/staging/app.config.json

# 3. Copy .env.example → .env and fill in secrets
cp deploy/environments/staging/.env.example deploy/environments/staging/.env

# 4. Dry run to verify
npx @mawsoftwares/deploy staging --dry-run

# 5. Deploy
npx @mawsoftwares/deploy staging
```

## Commands

```bash
npx @mawsoftwares/deploy list                           # List available environments
npx @mawsoftwares/deploy info                           # Show resolved paths
npx @mawsoftwares/deploy <environment>                  # Deploy
npx @mawsoftwares/deploy <environment> --dry-run        # Preview without executing
npx @mawsoftwares/deploy <environment> --setup-https    # First-time HTTPS setup
npx @mawsoftwares/deploy <environment> --ssl-ready      # Use HTTPS template (certs exist)
npx @mawsoftwares/deploy <environment> --skip-nginx     # App deploy only, skip nginx
npx @mawsoftwares/deploy <environment> --yes-nginx      # Auto-confirm nginx install
npx @mawsoftwares/deploy <environment> --skip-build     # Skip frontend local build or backend remote build
```

## Environment contract

Each environment folder must have:

- **`app.config.json`** — the deployment manifest
- **`.env`** — environment variables (secrets)

Required manifest fields: `name`, `type`, `server`, `deployPath`,
`generatedSubPath`, `domain`. Backend also needs `branch`, `processManager.name`,
`ports.backend`, `database.*`, `features`, `runtime.*`, and
`deployment.pm2Command` plus `commands.migrate`. Frontend (`kind: "frontend"`)
builds locally and uploads `dist/` only — no git clone, npm install, or Node
runtime on the server. It needs `deployment.commands.build` (optional, defaults
to `npm run build`) plus static/nginx fields for its topology.

See `topology/` for sample configs (subpath vs dedicated domain), including
frontend samples under `topology/samples/frontend/`.

## Sample apps in this repo

`apps/sample-server` and `apps/sample-web` each have a `deploy/` folder.

```bash
# Preview (no SSH)
npm run deploy:server -- staging --dry-run
npm run deploy:web -- staging --dry-run

# After filling deploy/environments/<env>/.env and SSH/server fields:
npm run deploy:server -- staging
npm run deploy:web -- staging --setup-https
```

| Env | Topology | Web | API |
| --- | --- | --- | --- |
| **staging** | shared subpath | `https://apps.mawsoftwares.in/maw-foundation/` | `https://apps.mawsoftwares.in/maw-foundation/api` |
| **production** | dedicated domains | `https://maw-foundation.apps.mawsoftwares.in` | `https://api.maw-foundation.apps.mawsoftwares.in` |

Server: `66.116.243.198`. Backend needs a real `deployment.repoUrl`. Frontend
does not — copy `.env.example` → `.env` (`VITE_*` for web, `JWT_SECRET` /
`DATABASE_URL` for API) and run the deploy command.

## Design principles

- Single deploy command — all behavior from `app.config.json` + `.env`
- No environment-specific scripts
- No duplicated PM2/nginx/runtime logic across projects
- Generated artifacts are never edited manually
- Dry-run and list modes built-in
- Legacy support: works with old `deployment/environments/` layout too

## Overriding the deploy directory

By default, the engine looks for `deploy/` in your project root. To use a
different name, create `deploy.config.json` at your project root:

```json
{
  "deployDir": "infra/deploy"
}
```

## HTTPS & domain docs

- [HTTPS_SETUP.md](./HTTPS_SETUP.md) — TLS cert setup for dedicated domains
- [DOMAIN_CHANGE.md](./DOMAIN_CHANGE.md) — Change app/API domains on the same server
- [TOPOLOGY_SWITCHING.md](./topology/TOPOLOGY_SWITCHING.md) — Subpath vs dedicated domain
