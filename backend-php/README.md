# MAW Foundation — PHP/Laravel Backend

Drop-in PHP alternative to the Node.js backend. Same PostgreSQL database, same API contracts, same frontend.

## Prerequisites

- PHP 8.3+ with extensions: `pdo_pgsql`, `sodium`, `intl`, `mbstring`
- Composer 2.x
- PostgreSQL 15+ (shared with Node.js backend)

## Quick Start

```bash
# Install dependencies
composer install

# Configure environment
cp .env.example .env
# Edit .env — set DB_*, JWT_SECRET (must match Node.js), APP_KEY

# Generate app key
php artisan key:generate

# Run (Node.js migrations already created the schema)
php artisan serve --port=8080
```

## Docker

```bash
# Development (app + nginx + postgres)
make up
# App at http://localhost:8080

# Run tests in Docker
make test

# Production build
make prod-build
make prod-up
```

### Available Make Commands

| Command | Description |
|---------|-------------|
| `make up` | Start dev environment (app + nginx + postgres) |
| `make down` | Stop all containers |
| `make build` | Rebuild Docker images |
| `make test` | Run full test suite in Docker |
| `make verify` | Run typecheck + lint + tests locally |
| `make typecheck` | Run PHPStan level 8 |
| `make lint` | Check code style with Pint |
| `make lint-fix` | Fix code style with Pint |
| `make shell` | Open shell in app container |
| `make logs` | Tail app container logs |
| `make fresh` | Reset database and restart |
| `make prod-build` | Build production image |
| `make prod-up` | Start production stack |

## Deployment

Uses the shared `@mawsoftwares/deploy` engine with `kind: "docker"`. The deploy
engine clones the repo on the server, copies `.env`, and runs
`docker compose -f docker-compose.prod.yml build && up`.

```bash
# From monorepo root:

# Dry run (preview, no SSH)
npm run deploy:php -- staging --dry-run

# Deploy staging
npm run deploy:php -- staging

# Deploy production with HTTPS
npm run deploy:php -- production --setup-https

# Skip rebuild (just restart containers)
npm run deploy:php -- staging --skip-build
```

Before first deploy:
1. Copy `deploy/environments/<env>/.env.example` → `.env`
2. Fill in `APP_KEY`, `DB_PASSWORD`, `JWT_SECRET`
3. Set `server` and `ssh.keyPath` in `app.config.json`
4. Set `deployment.repoUrl` in `app.config.json`

### Production Docker

The production image uses a multi-stage build:

1. **base** — PHP 8.3 FPM Alpine + required extensions
2. **dev** — Full dev dependencies for local/CI
3. **app** — Production-optimized: OPcache with JIT tracing, PHP-FPM tuning, optimized autoloader, route/config cache, runs as non-root `www-data`

```bash
# Build and run production stack
docker compose -f docker-compose.prod.yml up -d
```

## Tests

```bash
# Unit tests (no database needed)
composer test:unit

# Contract conformance tests
composer test:contract

# Integration tests (requires test database)
composer test:integration

# All tests
composer test

# Static analysis (PHPStan level 8)
composer typecheck

# Code style (Laravel Pint)
composer lint

# Full verification (typecheck + lint + tests)
composer verify
```

## Architecture

```
app/
├── Domain/              # Business logic — no framework imports
│   ├── Auth/            # Password hashing, JWT, sessions, prehash
│   ├── User/            # UserEntity, repository interface
│   ├── Rbac/            # Roles, permissions, modules
│   ├── Tenant/          # TenantEntity, repository interface
│   ├── Order/           # OrderEntity, OrderStatus enum, repository
│   ├── Menu/            # MenuEntity (flat + tree), repository
│   ├── File/            # FileEntity, repository interface
│   ├── Job/             # JobEntity, JobStatus enum, repository
│   ├── Messaging/       # Email templates, credentials, repository
│   ├── Reporting/       # Report definitions, saved reports, repository
│   └── Shared/          # Value objects, exceptions, contracts
├── Infrastructure/      # Framework adapters
│   ├── Auth/            # Scrypt hasher, JWT service, blacklist
│   └── Persistence/
│       ├── Eloquent/
│       │   └── Models/  # Eloquent models for all domains
│       └── Repositories/# Eloquent repository implementations
├── Http/                # Controllers, middleware, requests
│   ├── Controllers/
│   │   ├── Auth/        # Login, register, sessions
│   │   ├── User/        # User CRUD + activate/deactivate
│   │   ├── Rbac/        # Roles, modules, permissions
│   │   ├── Tenant/      # Tenant CRUD
│   │   ├── Order/       # Orders + export
│   │   ├── Menu/        # Menu CRUD + tree + reorder
│   │   ├── File/        # Upload, list, URL, delete
│   │   ├── Job/         # Job list, create, show
│   │   ├── Messaging/   # Email templates, credentials, send
│   │   └── Reporting/   # Definitions, preview, run, save
│   └── Middleware/      # JWT auth, tenant resolver, permission check
├── Providers/           # DI bindings
└── Shared/              # Exception handler
```

## API Routes

All 67 routes mirror the Node.js backend. Grouped by module:

| Module | Routes | Wrapper |
|--------|--------|---------|
| **Health** | `GET /health` | flat |
| **Auth** (public) | login, register, refresh, verify-email, forgot/reset-password | flat `{error, code}` |
| **Auth** (protected) | logout, me, sessions CRUD | flat |
| **Users** | CRUD + activate/deactivate | `{success, data, meta}` |
| **RBAC** | roles CRUD + permissions, modules CRUD + tree | `{data}` |
| **Tenants** | list, create, show, update | `{data}` |
| **Orders** | list (paginated), create, show, export | `{data, meta.pagination}` |
| **Menus** | CRUD + tree + reorder | `{data}` |
| **Files** | upload, list, URL, delete | flat (upload), `{data}` (list) |
| **Jobs** | list, create, show | `{data}` (list), flat (single) |
| **Messaging** | email templates CRUD, credentials CRUD, send (email/sms/whatsapp), logs | `{data}` |
| **Reporting** | definitions, metadata, preview, run, save, saved reports | `{data}` |

## Key Design Decisions

- **Same database**: No Laravel migrations — uses the schema from Node.js migrations
- **Same JWT**: HS256, same secret, same claims shape, JTI blacklisting
- **Same password hashing**: scrypt with N=16384, r=8, p=1 (via libsodium)
- **Same prehash protocol**: `sha256:<hex>` + `x-password-prehashed: sha256` header
- **Money = integer minor units**: `total_amount` stored as integer cents, never float/decimal
- **Response conventions per module**: Each module follows the same wrapper as its Node.js counterpart
- **Domain-Driven Design**: Business logic is framework-agnostic, testable without Laravel
- **Repository pattern**: Domain defines interfaces, infrastructure provides Eloquent implementations

## API Compatibility

All endpoints follow the shared OpenAPI specs in `contracts/openapi/`. The PHP and Node.js backends are interchangeable — the frontend doesn't know which one is running.

See also:
- [`docs/dual-backend-architecture.md`](../docs/dual-backend-architecture.md) — full architecture overview
- [`.engineering/decisions/ADR-dual-backend.md`](../.engineering/decisions/ADR-dual-backend.md) — why dual backends
- [`.engineering/decisions/ADR-php-laravel.md`](../.engineering/decisions/ADR-php-laravel.md) — why Laravel
