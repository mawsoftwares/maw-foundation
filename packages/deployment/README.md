# @maw/deploy — Configuration-Driven Deployment Engine

Reusable deployment engine — shared scripts + templates live here once; each
project only adds a thin `deploy/` folder with its own environment configs.

## How it works

```
@maw/deploy (this package — shared engine)
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
npx @maw/deploy init

# 2. Edit your environment config
vim deploy/environments/staging/app.config.json

# 3. Copy .env.example → .env and fill in secrets
cp deploy/environments/staging/.env.example deploy/environments/staging/.env

# 4. Dry run to verify
npx @maw/deploy staging --dry-run

# 5. Deploy
npx @maw/deploy staging
```

## Commands

```bash
npx @maw/deploy list                           # List available environments
npx @maw/deploy info                           # Show resolved paths
npx @maw/deploy <environment>                  # Deploy
npx @maw/deploy <environment> --dry-run        # Preview without executing
npx @maw/deploy <environment> --setup-https    # First-time HTTPS setup
npx @maw/deploy <environment> --ssl-ready      # Use HTTPS template (certs exist)
npx @maw/deploy <environment> --skip-nginx     # App deploy only, skip nginx
npx @maw/deploy <environment> --yes-nginx      # Auto-confirm nginx install
```

## Environment contract

Each environment folder must have:

- **`app.config.json`** — the deployment manifest
- **`.env`** — environment variables (secrets)

Required manifest fields: `name`, `type`, `branch`, `server`, `deployPath`,
`generatedSubPath`, `domain`, `processManager.name`, `ports.backend`,
`database.name`, `database.host`, `database.port`, `features`, `runtime.*`,
`deployment.projectRoot`, `deployment.pm2Command`, `deployment.commands.*`

See `topology/` for sample configs (subpath vs dedicated domain).

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
