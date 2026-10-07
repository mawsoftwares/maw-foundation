# MAW Foundation — Dual Backend Architecture

## A. Current Architecture Analysis

### Monorepo Structure

```
MAW Foundation (pnpm workspaces)
├── packages/          — 27 shared packages (@mawsoftwares/ scope)
├── adapters/          — express, hono, postgres adapters
├── apps/              — sample-server (Express), sample-web, sample-mobile
├── templates/         — copy-to-own starters (users-module: server + web)
├── .engineering/      — constitution, decisions, patterns, anti-patterns
└── docs/              — architecture, security, component docs
```

### Packages Inventory

| Layer | Package | Purpose |
|-------|---------|---------|
| SDK | `sdk` | Shared types, contracts, kernel (money, errors, result, ids, validate, i18n) |
| SDK | `core` | Core kernel utilities |
| Platform | `platform` | Platform abstraction (storage, network, crypto) |
| Platform | `config` | Configuration engine |
| Platform | `feature-flags` | Feature flag system |
| Auth | `auth-core` | JWT, refresh tokens, CSRF, MFA/OTP, social auth, session, password hashing |
| Auth | `rbac-core` | Static + dynamic RBAC, ABAC conditional grants, module registry |
| Data | `database` | Drizzle ORM schemas, repository base, transactions, soft-delete, tenant-scoped |
| Data | `audit` | Audit trail types, store contracts, Express middleware |
| Infra | `server-express` | Express adapter: auth routes, tenant routes, CORS, rate limiting, headers |
| Infra | `server-hono` | Hono adapter (mirrors Express surface) |
| Infra | `api` | Framework-agnostic API foundation: response envelope, controller contract |
| Infra | `api-client` | Client-side API consumer with offline support |
| Infra | `tenancy` | Multi-tenancy (resolvers, ALS context, Pg RLS) |
| Infra | `queue` | Background jobs, workers, retry policies |
| Infra | `communication` | Notifications (email, SMS, WhatsApp, push, in-app) |
| Infra | `import-export` | Data import/export with CSV/JSON parsers |
| Infra | `reporting` | Reporting engine (definitions, execution, export) |
| Infra | `observability` | Structured logging, metrics, tracing, health checks |
| Infra | `deployment` | Config-driven deployment scripts |
| Infra | `modules` | Module registry system |
| Infra | `testing` | Test utilities |
| UI | `theme` | Theming engine (web + RN) |
| UI | `ui-web` | Web UI component library |
| UI | `ui-native` | React Native UI components |
| UI | `ui-auth` | Auth UI components |

### Database

- **ORM**: Drizzle ORM 0.45.2 with `drizzle-kit`
- **Database**: PostgreSQL (via `adapters/postgres`)
- **Schema files**: 17 files in `packages/database/src/schema/` — users, auth, rbac, tenants, audit, jobs, files, menu, clients, applications, credentials, email-templates, notifications, messaging, social, service-catalogue, masters, gateway-logs, password-history
- **Migrations**: 23 numbered up/down SQL pairs in `apps/sample-server/migrations/`
- **Features**: Repository pattern, soft-delete, transactions, tenant-scoped queries, RLS

### Authentication

- JWT access tokens (15-min TTL, HS256, JTI blacklisting)
- Refresh token rotation (SHA-256 stored, revocation support)
- Client-side SHA-256 password prehash → scrypt storage
- MFA/TOTP (enroll/verify/disable)
- Social auth (Google, GitHub via `ISocialAuthProvider`)
- Session management with concurrency limits
- CSRF double-submit cookie
- Login protection (brute-force lockout)
- Account lifecycle (status state machine, email verification, password reset, GDPR purge)

### RBAC

- Static: role → capability → permission mapping via `resolveEffectiveAccess`
- Dynamic: runtime module/permission registration, DB sync, master cache
- ABAC: conditional grants via `RolePolicy` with `when(context)` predicates
- Enforcement: Express middleware (`requirePermission`, `audienceGuard`)
- Tenant-scoped: `tenant_role_permissions` table

### API Surface (~80+ endpoints)

- **Auth** (12 endpoints): login, register, refresh, logout, MFA, social, sessions, account
- **Users** (8 endpoints): CRUD + activate/deactivate/reset-password
- **RBAC** (19 endpoints): roles, permissions, modules, assignments CRUD
- **Tenants** (4 endpoints): CRUD
- **Orders** (4 endpoints): CRUD + export
- **Menus** (6 endpoints): CRUD + tree + reorder
- **Messaging** (12+ endpoints): templates, credentials, send (email/SMS/WhatsApp), logs
- **Reporting** (6 endpoints): definitions, preview, run, save
- **Files** (4 endpoints): upload, list, URL, delete
- **Jobs** (3 endpoints): create, list, status
- **System** (4 endpoints): health, config, modules, notifications

### Frontend

- React (sample-web), React Native/Expo (sample-mobile)
- Communicates via `@mawsoftwares/api-client`
- Frontend is backend-agnostic — talks through typed API client

---

## B. Proposed Architecture

```
                    MAW Foundation Monorepo
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                  │
    Shared Layer      Node.js Backend    PHP Backend
         │                 │                  │
  ┌──────┴──────┐    ┌─────┴─────┐     ┌─────┴─────┐
  │  contracts/ │    │ packages/  │     │ backend-  │
  │  (OpenAPI)  │    │ server-*   │     │ php/      │
  │             │    │ adapters/  │     │ (Laravel) │
  │  packages/  │    │ apps/      │     │           │
  │  sdk        │    │ sample-    │     │ app/      │
  │  auth-core  │    │ server     │     │ Domain/   │
  │  rbac-core  │    │            │     │ App/      │
  │  api        │    │            │     │ Http/     │
  │  database   │    │            │     │ Infra/    │
  │  (schemas)  │    │            │     │           │
  └─────────────┘    └─────┬─────┘     └─────┬─────┘
                           │                  │
                           └────────┬─────────┘
                                    │
                              PostgreSQL
                           (same schema)
                                    │
                              Same Frontend
                         (React / React Native)
```

### Key Principles

1. **contracts/** holds OpenAPI specs — the single source of truth for API shape
2. **Node.js backend** stays exactly as-is — zero changes to existing packages
3. **PHP backend** (Laravel) implements the same OpenAPI contract
4. **Same database** — PHP uses the existing Postgres schema and migrations
5. **Same frontend** — `api-client` doesn't know or care which backend serves it
6. **Framework choice**: Laravel (documented decision below)

### Laravel Decision Rationale

| Criterion | Laravel |
|-----------|---------|
| Maturity | 13+ years, LTS releases |
| Developer availability | Largest PHP framework talent pool |
| Auth | Built-in (Sanctum, Passport) |
| Queues/Jobs | Native queue system with multiple drivers |
| Testing | PHPUnit + built-in HTTP/DB testing |
| Database | Eloquent ORM + raw queries, migration system |
| Validation | Comprehensive built-in validator |
| API development | API Resources, Form Requests, middleware |
| Deployment | Laravel Forge, Vapor, Docker |
| Static analysis | PHPStan/Larastan integration |
| Long-term support | Predictable release cycle |

---

## C. Gap Analysis

### Already Exists (no changes needed)

| What | Where |
|------|-------|
| All SDK contracts/interfaces | `packages/sdk/src/contracts/` |
| Domain types (User, Customer, Order) | `packages/sdk/src/domains/` |
| Error codes and AppError hierarchy | `packages/sdk/src/kernel/errors.ts` |
| Security config and types | `packages/sdk/src/security/` |
| Auth domain logic | `packages/auth-core/` |
| RBAC domain logic | `packages/rbac-core/` |
| Database schemas (Drizzle) | `packages/database/src/schema/` |
| SQL migrations | `apps/sample-server/migrations/` |
| API response envelope/contract | `packages/api/` |
| Communication contracts | `packages/sdk/src/communication/` |
| Queue contracts | `packages/sdk/src/queue/` |
| i18n system | `packages/sdk/src/i18n/` |
| RouteRegistry (OpenAPI metadata) | `packages/api/src/openapi/` |

### Needs to Be Created

| What | Purpose |
|------|---------|
| `contracts/openapi/` | Formal OpenAPI 3.1 YAML specs extracted from existing routes |
| `contracts/schemas/` | JSON Schema for request/response bodies |
| `contracts/errors/` | Standard error code registry |
| `backend-php/` | Laravel application root |
| PHP Domain layer | Port of business rules (validation, authorization checks) |
| PHP Application layer | Use cases / service classes |
| PHP Infrastructure | Eloquent repositories implementing same interfaces |
| PHP HTTP layer | Controllers conforming to OpenAPI contract |
| PHP Auth | Laravel Sanctum-based auth matching the JWT/session contract |
| PHP RBAC | Permission enforcement matching the existing model |
| PHP tests | Unit + integration + contract tests |
| Contract test suite | Verify Node and PHP return conforming responses |
| Docker configs | docker-compose for both backends |
| ADR: Backend Selection | Decision record for dual-backend architecture |
| ADR: Laravel Choice | Decision record for PHP framework selection |

### Must NOT Change

- Any file in `packages/` (SDK, auth-core, rbac-core, server-express, etc.)
- Any file in `apps/sample-server/` or `apps/sample-web/`
- Any existing migration
- The dependency law: `apps → domains + ui → platform → sdk`
- The existing Node.js test suite

---

## D. Implementation Plan

### Phase 1: Contract Extraction (no code changes to Node)

1. Create `contracts/openapi/` with OpenAPI 3.1 specs for all endpoints
2. Create `contracts/schemas/` with JSON Schema for DTOs
3. Create `contracts/errors/` with error code registry
4. Add contract validation tooling (spectral linter)

### Phase 2: Laravel Scaffold

1. Create `backend-php/` with Laravel (latest stable)
2. Configure for PostgreSQL (same connection as Node)
3. Set up PHPStan (level 8), PHP-CS-Fixer, PHPUnit
4. Configure `.env` structure matching Node's env vars
5. Add to pnpm-workspace.yaml (excluded from Node build)

### Phase 3: Proof-of-Concept Vertical Slice (Auth + Users + RBAC)

1. **Domain**: PHP value objects, entities, repository interfaces
2. **Application**: Auth use cases (login, register, refresh, logout, MFA)
3. **Infrastructure**: Eloquent repositories for users, sessions, tokens
4. **HTTP**: Auth controllers matching OpenAPI contract exactly
5. **Auth**: JWT token handling (matching HS256 + JTI + blacklist strategy)
6. **RBAC**: Permission enforcement middleware
7. **Tests**: Unit + integration + contract tests

### Phase 4: Verify Contract Conformance

1. Contract tests: same requests → both backends → validate against OpenAPI
2. Database compatibility: PHP reads/writes same tables Node does
3. Auth interop: token issued by Node works in PHP (same JWT secret)

### Phase 5: Remaining Modules

1. Orders, Menus, Messaging, Reporting, Files, Jobs
2. Each module follows: Domain → Application → Infrastructure → HTTP → Tests

### Phase 6: Infrastructure

1. Docker Compose (Node + PHP + Postgres + Redis)
2. Health checks, readiness probes
3. Structured logging (matching Node's format)
4. Queue workers (Laravel Queue)

### Phase 7: Documentation

1. Backend selection guide
2. Node backend docs
3. PHP backend docs
4. Deployment docs for both
5. Developer setup instructions

---

## E. Risks

| Risk | Mitigation |
|------|------------|
| **Contract drift** — Node and PHP APIs diverge over time | OpenAPI spec is the source of truth; contract tests in CI fail on drift |
| **Auth differences** — JWT handling subtleties between languages | Same signing secret, same algorithm (HS256), same token structure; contract tests verify |
| **ORM differences** — Drizzle vs Eloquent query behavior | Repository pattern isolates this; integration tests verify same DB state |
| **Transaction semantics** — different isolation/locking behavior | Both use PostgreSQL; test concurrent scenarios |
| **Password hashing** — scrypt parameters must match exactly | Document exact params (N=16384, r=8, p=1, 128-bit salt); PHP uses same |
| **Migration ownership** — who runs migrations? | Single migration source (SQL files); both backends consume, neither generates |
| **Queue compatibility** — different job serialization | Jobs are backend-specific; shared queue table schema if needed |
| **Duplicated business logic** — validation rules written twice | Extract rules to contracts/schemas; generate where possible |
| **Team context switching** — developers need both ecosystems | Clear separation; a PHP dev never touches Node code and vice versa |
| **Deployment complexity** — two runtimes to operate | Docker standardizes; choose one backend per project deployment |

---

## F. Folder Structure (Final)

```
MAW Foundation
│
├── contracts/                    ← NEW
│   ├── openapi/
│   │   ├── auth.yaml
│   │   ├── users.yaml
│   │   ├── rbac.yaml
│   │   ├── tenants.yaml
│   │   ├── orders.yaml
│   │   ├── menus.yaml
│   │   ├── messaging.yaml
│   │   ├── reporting.yaml
│   │   ├── files.yaml
│   │   └── system.yaml
│   ├── schemas/
│   │   ├── common.json           (pagination, error envelope)
│   │   ├── auth.json
│   │   ├── user.json
│   │   └── ...
│   └── errors/
│       └── error-codes.json
│
├── backend-php/                  ← NEW
│   ├── app/
│   │   ├── Domain/               # Business logic — no framework imports
│   │   │   ├── Auth/             # Password hashing, JWT, sessions
│   │   │   ├── User/             # UserEntity, repository interface
│   │   │   ├── Rbac/             # Roles, permissions, modules
│   │   │   ├── Tenant/           # TenantEntity, repository interface
│   │   │   ├── Order/            # OrderEntity, OrderStatus enum
│   │   │   ├── Menu/             # MenuEntity (flat + tree)
│   │   │   ├── File/             # FileEntity, repository interface
│   │   │   ├── Job/              # JobEntity, JobStatus enum
│   │   │   ├── Messaging/        # Email templates, credentials
│   │   │   ├── Reporting/        # Report definitions, saved reports
│   │   │   └── Shared/           # Value objects, exceptions, contracts
│   │   ├── Infrastructure/
│   │   │   ├── Auth/             # Scrypt hasher, JWT service, blacklist
│   │   │   └── Persistence/
│   │   │       ├── Eloquent/
│   │   │       │   └── Models/   # Eloquent models for all domains
│   │   │       └── Repositories/ # Eloquent repository implementations
│   │   ├── Http/
│   │   │   ├── Controllers/
│   │   │   │   ├── Auth/         # Login, register, sessions
│   │   │   │   ├── User/         # User CRUD
│   │   │   │   ├── Rbac/         # Roles, modules
│   │   │   │   ├── Tenant/       # Tenant CRUD
│   │   │   │   ├── Order/        # Orders + export
│   │   │   │   ├── Menu/         # Menu CRUD + tree
│   │   │   │   ├── File/         # Upload, list, URL, delete
│   │   │   │   ├── Job/          # Job list, create, show
│   │   │   │   ├── Messaging/    # Templates, credentials, send
│   │   │   │   └── Reporting/    # Definitions, run, save
│   │   │   └── Middleware/       # JWT auth, tenant resolver, permissions
│   │   ├── Providers/            # DI bindings (10 repository interfaces)
│   │   └── Shared/               # Exception handler
│   ├── docker/
│   │   ├── nginx.conf            # Reverse proxy + security headers
│   │   ├── opcache.ini           # OPcache + JIT tracing config
│   │   └── php-fpm.conf          # FPM process manager tuning
│   ├── routes/
│   │   └── api.php               # 67 routes across 10 modules
│   ├── config/
│   ├── tests/
│   │   ├── Unit/
│   │   ├── Integration/
│   │   └── Contract/             # Route + response conformance
│   ├── composer.json
│   ├── phpstan.neon
│   ├── phpunit.xml
│   ├── Dockerfile                # Multi-stage: base → dev → app
│   ├── docker-compose.yml        # Dev stack + test profile
│   ├── docker-compose.prod.yml   # Production stack with resource limits
│   ├── Makefile                   # 14 developer commands
│   └── .env.example
│
├── packages/                     ← UNCHANGED
│   ├── sdk/
│   ├── auth-core/
│   ├── rbac-core/
│   ├── server-express/
│   ├── server-hono/
│   ├── database/
│   ├── api/
│   ├── api-client/
│   └── ... (all existing)
│
├── adapters/                     ← UNCHANGED
├── apps/                         ← UNCHANGED
│   ├── sample-server/
│   ├── sample-web/
│   └── sample-mobile/
│
├── docs/                         ← EXTENDED
│   ├── dual-backend-architecture.md
│   └── ...
│
└── .engineering/                 ← EXTENDED (new ADRs)
    └── decisions/
        ├── ADR-dual-backend.md
        └── ADR-php-laravel.md
```

---

## G. Implementation Status

All 7 phases are complete. The PHP/Laravel backend covers 10 domain modules:

| Module | Domain | Infrastructure | HTTP | Contract Tests |
|--------|--------|---------------|------|---------------|
| Auth | done | done | done | done |
| Users | done | done | done | done |
| RBAC | done | done | done | done |
| Tenants | done | done | done | done |
| Orders | done | done | done | done |
| Menus | done | done | done | done |
| Files | done | done | done | done |
| Jobs | done | done | done | done |
| Messaging | done | done | done | done |
| Reporting | done | done | done | done |

### Infrastructure

- **CI pipeline**: 3 parallel jobs (Node.js, PHP, contract-conformance) in `.github/workflows/ci.yml`
- **Docker**: Multi-stage production build with OPcache JIT, PHP-FPM tuning, nginx reverse proxy
- **Developer tooling**: Makefile with 14 commands, docker-compose dev + test + prod stacks

### What's Stubbed

These are functional stubs returning valid response shapes (contract-conformant) but without real backend logic:

- `MessagingRepository::send()` / `listLogs()` — no actual email/SMS delivery
- `ReportingRepository` — 3 hardcoded report definitions, preview/run return sample data
- `OrderController::export()` — returns 501
- `FileController::upload()` — validates request but doesn't store to a real storage backend
