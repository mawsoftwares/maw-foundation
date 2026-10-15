# MAW Foundation — Package Guide

This document explains **what every package does** and **when to use it**.

MAW Foundation is a **platform, not a product**. Packages under `packages/` (`@mawsoftwares/*`) are reusable capabilities — auth, permissions, database, UI, email — written once so every app (web, mobile, desktop, server) shares the same implementation. Apps and project modules **compose** these packages; they do not reimplement them.

Published packages are installed from **GitHub Packages**. See [`publishing.md`](./publishing.md).

For the package-vs-template classification rule, see [`module-architecture.md`](./module-architecture.md).  
For layering rules, see [`.engineering/dependency-law.md`](../.engineering/dependency-law.md).

---

## Mental model

Dependencies only flow **downward**. A UI package may use the API client and RBAC. RBAC must not import React.

```
┌──────────────────────────────────────────────────┐
│  APPS (sample-server, sample-web, …)             │  composition roots
├──────────────────────────────────────────────────┤
│  UI  — theme, ui-web, ui-native, ui-auth         │
│  HTTP client — api-client                        │
├──────────────────────────────────────────────────┤
│  SERVER ADAPTERS — server-express, server-hono   │
├──────────────────────────────────────────────────┤
│  DOMAIN — auth-core, rbac-core, tenancy, …       │
├──────────────────────────────────────────────────┤
│  PLATFORM — platform, database, observability    │
├──────────────────────────────────────────────────┤
│  KERNEL — sdk, core, config                      │
└──────────────────────────────────────────────────┘
```

### How a typical request uses the packages

1. User opens login → **`ui-auth`** form on **`ui-web`**, styled by **`theme`**.
2. Submit → **`api-client`** prehashes the password, calls the API, stores tokens.
3. Server → **`server-express`** (or Hono) verifies the JWT via **`auth-core`**.
4. Next API call → **`rbac-core`** answers `can('Read_Orders')`.
5. Controller ( **`api`** contract) → repository in **`database`**, scoped by **`tenancy`**.
6. Failures throw **`AppError`** from **`sdk`/`core`** → standard `{ success: false, error }` envelope → client uses `getApiErrorMessage` / `getApiErrorFields`.

---

## Kernel

### `@mawsoftwares/sdk` — `packages/sdk`

**What it does:** Bottom of the stack. Shared language every other package speaks: IDs, `Result` (`ok` / `err`), money as integer minor units, dates, validation helpers, `AppError` / `ErrorCode`, logger and file utilities, and **ports** (interfaces) such as `IHasher`, `ISecureStore`, `IFileStorage`, `IUserRepository`. Also holds shared types for data grids, dynamic forms, branding, communication, and queues.

**Use it when:** You need a type, error, or contract that must work on Node, browser, and React Native with **no** MAW package dependencies. Prefer importing kernel pieces via `@mawsoftwares/core` in new application code when you only need primitives.

**Must not:** Import any other `@mawsoftwares/*` package.

---

### `@mawsoftwares/core` — `packages/core`

**What it does:** Canonical re-export of framework-independent primitives from the SDK (`AppError`, pagination, money, IDs, HTTP status, contracts). Config, modules, and feature-flags used to live here and now have their own packages.

**Use it when:** Writing application or module code that needs Result, errors, IDs, money, or pagination — import from `@mawsoftwares/core` rather than deep SDK paths when possible.

---

### `@mawsoftwares/config` — `packages/config`

**What it does:** Central configuration: typed env helpers (`getEnv`, `getRequiredEnv`, …), a multi-level config engine (Environment → App → Tenant → Module → User) with deep merge, health-check builders, and semver/build-info utilities.

**Use it when:** Reading secrets/URLs from the environment, or merging per-tenant settings (currency, timezone, date format) instead of hardcoding them.

---

## Platform

### `@mawsoftwares/platform` — `packages/platform`

**What it does:** Framework-agnostic runtime glue: session manager, memory secure store, browser/IndexedDB offline storage, network manager, conflict resolution for sync, memory rate limiter, password-policy checks, log redaction. Node-only crypto (AES, env secrets) lives on a separate server entry so browser bundles stay safe.

**Use it when:** You need session/token storage, offline sync primitives, or browser-safe security helpers shared by web and native — without pulling Express or React.

---

### `@mawsoftwares/database` — `packages/database`

**What it does:** PostgreSQL infrastructure: connection pool, transactions/savepoints, query builder, `BaseRepository`, tenant-scoped and soft-delete repositories, migrations, seeds, snake_case ↔ camelCase mappers, Drizzle helpers, and pool/migration health checks.

**Use it when:** Implementing repositories and migrations. Controllers must **not** query the DB directly; use cases call repositories built on this package (or via `@mawsoftwares/postgres`).

---

### `@mawsoftwares/observability` — `packages/observability`

**What it does:** Logging, metrics, tracing, and error tracking behind swappable providers; request context (ALS); health checks; slow-operation timing; graceful shutdown. Defaults are in-memory or no-op so apps run before Prometheus/Sentry is wired.

**Use it when:** Initializing server observability in `main.ts`, or measuring/logging across modules without inventing a second logger.

---

### `@mawsoftwares/testing` — `packages/testing`

**What it does:** Shared test doubles — mock logger, event bus, cache, queue, hasher, fake request context — plus factories.

**Use it when:** Writing unit tests that must not hit Postgres, SMTP, or a real queue.

---

### `@mawsoftwares/tenancy` — `packages/tenancy`

**What it does:** Multi-tenant foundation: tenant identity and status lifecycle, `TenantContext`, resolvers (hostname, header, path, JWT), per-request context holder (`run()` scoping), and contracts for tenant repositories / tenant-scoped data access.

**Use it when:** Every access decision or DB row must be scoped by `tenantId`. Postgres implementation of the repository lives in the postgres adapter.

---

### `@mawsoftwares/modules` — `packages/modules`

**What it does:** Module registry — register/enable/disable modules, validate dependencies, topological init order, typed inter-module event bus, and cross-platform module definitions (menus, screens).

**Use it when:** Declaring product modules (invoices, users, orders) and their menus/lifecycle without hard-wiring module A into module B.

---

### `@mawsoftwares/feature-flags` — `packages/feature-flags`

**What it does:** Tenant-aware feature flags with scoped evaluation (global → environment → product → tenant → user), schedules, targeting, percentage rollout, flag dependencies (`REQUIRES` / `CONFLICTS_WITH`), and fail-closed behavior. Storage: in-memory or Postgres (optionally cached).

**Use it when:** Turning capabilities on/off per tenant or user without deploying new code. Prefer this over hardcoded `if (tenant === …)` branches.

---

## Auth and permissions

### `@mawsoftwares/auth-core` — `packages/auth-core`

**What it does:** Framework-agnostic authentication engine: scrypt password hashing, JWT sign/verify, refresh-token rotation, CSRF helpers, token blacklist, login protection / account lockout, registration, email verification, password reset/change, OTP/MFA, server sessions, Google/GitHub social auth, password history, account purge.

**Use it when:** Implementing or wiring login, tokens, MFA, or password flows on the **server**. Do not invent a second JWT or hashing scheme. Pair with `server-express` or `server-hono` for HTTP.

---

### `@mawsoftwares/rbac-core` — `packages/rbac-core`

**What it does:** The **single** authorization resolver. `resolveEffectiveAccess()` answers “can this user do this?” for both client nav-gates and server enforcement. Includes module permission registry/sync, master cache, dynamic permission checks (`Read_Orders`, `Create_Billing`), and role hierarchy (who may manage whom). Access is data-driven from permissions (e.g. `GET /me`) — no hardcoded admin bypass.

**Use it when:** Checking any permission on server or client. Register new module actions in the sample server registry and seed; gate UI with `useDynamicAccess().can(...)`.

---

## HTTP

### `@mawsoftwares/api` — `packages/api`

**What it does:** Framework-agnostic API foundation: standard success/error envelopes, controller contract (`ok` / `created` / `paginated`), request context, list-query parsing (page, sort, search), `AppError` → envelope translation, idempotency, OpenAPI metadata helpers.

**Use it when:** Writing controllers and shaping API responses. Controllers return `ok()` / `created()` and let `AppError` bubble — do not invent a local `{ success: false, message }` envelope.

---

### `@mawsoftwares/server-express` — `packages/server-express`

**What it does:** Express binding for auth + API: `requireAuth`, `requirePermission`, CSRF, rate limit, CORS, secure headers, input sanitize, validation, correlation IDs, request logger, tenant middleware/routes, file upload, global error handler, `/auth/*` routes, `createApiRouter`.

**Use it when:** The backend is Express (as in `apps/sample-server`). This is the only place Express-specific auth middleware should live.

---

### `@mawsoftwares/server-hono` — `packages/server-hono`

**What it does:** Same behavioral surface as `server-express`, implemented for Hono’s `Context`. Shares `auth-core` and `rbac-core` underneath.

**Use it when:** The backend is Hono. Products pick **one** framework adapter; they do not duplicate auth logic.

---

### `@mawsoftwares/api-client` — `packages/api-client`

**What it does:** Typed HTTP client for browser, React Native, and Electron: token (or cookie) mode, proactive/reactive refresh on 401, password prehash on auth endpoints, `ApiError` + `getApiErrorMessage` / `getApiErrorFields`, retries for network/5xx, upload with progress, interceptors, offline repository/sync helpers.

**Use it when:** Any frontend talks to the MAW API. Never parse API errors ad hoc; use this package’s error helpers (and `DynamicForm` field mapping on web).

---

## UI

### `@mawsoftwares/theme` — `packages/theme`

**What it does:** Platform-agnostic design tokens (palette, spacing, radius, type, shadows, breakpoints) plus `createTheme()` for tenant branding. Emits CSS variables for web and RN style objects for native. Supports design.md parsing and white-label overrides without forking components.

**Use it when:** Setting brand colors/fonts or ensuring web and native look the same. Do not hardcode hex values in feature UI when a token exists.

---

### `@mawsoftwares/ui-web` — `packages/ui-web`

**What it does:** React web design system (Radix/shadcn/Tailwind): Button, Input, Select, Modal, Table/DataTable, DynamicForm, toasts, empty/error states, AppShell, plus `AuthProvider`, `DynamicAccessProvider` (`can('Create_Users')`), permission route guards, theme/i18n/feature-flag providers.

**Use it when:** Building any web screen. Reuse these components; do not add a second UI library or duplicate Button/Modal/Table.

---

### `@mawsoftwares/ui-native` — `packages/ui-native`

**What it does:** React Native design system with the same product ideas (Button, Card, Modal, DataList, toast, theme, brand) built on `View`/`Text`/`StyleSheet`. Web and native cannot share a render tree, so only the view layer is split; tokens and API/RBAC stay shared.

**Use it when:** Building Expo/React Native screens in `sample-mobile` or a product mobile app.

---

### `@mawsoftwares/ui-auth` — `packages/ui-auth`

**What it does:** Ready-made auth screens and forms: login, register, verify email, forgot/reset password, change password, MFA setup, sessions manager, user profile — with i18n strings — on top of `ui-web` and the API client.

**Use it when:** Shipping authentication UI. Prefer these forms over rebuilding login/forgot-password per product.

---

## Domain capabilities

### `@mawsoftwares/communication` — `packages/communication`

**What it does:** Notification pipeline: template rendering, provider registry, email (`EmailService` / SMTP), SMS, WhatsApp, in-app notifications, console provider for local/dev. Stores for templates and in-app messages (memory or Postgres).

**Use it when:** Sending mail, SMS, or in-app notices. Modules call `NotificationService` / `EmailService`; they must not open SMTP sockets themselves.

---

### `@mawsoftwares/queue` — `packages/queue`

**What it does:** Background jobs: enqueue work, worker registry, job runner, retry/backoff policy. Providers: in-memory (dev/tests) or Postgres (production).

**Use it when:** Work that must not block an HTTP request (imports, report generation, emails). Register a worker; do not invent a second job runner.

---

### `@mawsoftwares/audit` — `packages/audit`

**What it does:** Reusable audit trail — event types, store contract, in-memory and Postgres stores, Express middleware, module registration.

**Use it when:** Recording who did what for compliance or admin history. Emit via this package; do not create a parallel audit log per module.

---

### `@mawsoftwares/import-export` — `packages/import-export`

**What it does:** CSV/JSON import and export pipeline: parsers/formatters, column mapping, row/file validation, duplicate detection, progress, state machine, history store. Domain modules supply the row processor; this package owns the pipeline.

**Use it when:** Bulk upload/download of tabular domain data (users, masters, orders).

---

### `@mawsoftwares/reporting` — `packages/reporting`

**What it does:** Report engine: definitions (columns, filters, date ranges, sort, group, aggregate), execution against a pluggable data source, preview, saved reports, history, optional queue worker, and export adapter into `import-export`.

**Use it when:** Building filterable/aggregatable reports without each module inventing its own query UI and executor.

---

### `@mawsoftwares/deploy` — `packages/deployment`

**What it does:** Configuration-driven deployment CLI. Shared PM2/nginx/Docker templates live here; each project adds a thin `deploy/` folder with `app.config.json` + `.env` per environment. Supports backend (git + PM2), frontend (local build + static upload), and Docker (e.g. PHP) kinds, plus dry-run and rollback helpers.

**Use it when:** Deploying sample apps or a product to staging/production. Run via `npx @mawsoftwares/deploy` or the repo’s `pnpm deploy:*` scripts. See [`packages/deployment/README.md`](../packages/deployment/README.md).

---

## Adapters

Thin packages that wrap or re-export framework/DB implementations. Adapters are exempt from the same layering lint as core packages; prefer them at the app composition root.

| Package | Scope | Role |
|---------|-------|------|
| `adapters/express` | `@mawsoftwares/express` | Re-exports Express auth/RBAC/security from `server-express` |
| `adapters/hono` | `@mawsoftwares/hono` | Re-exports Hono security middleware from `server-hono` |
| `adapters/postgres` | `@mawsoftwares/postgres` | Re-exports pool, repositories, tenant isolation, migrations from `database` (+ tenant repo) |

---

## Sample apps

These are **composition roots** (examples), not libraries other products import.

| App | Role |
|-----|------|
| `apps/sample-server` | Express API wiring auth, RBAC, tenancy, queue, files, communication, audit, reporting |
| `apps/sample-web` | Vite React app using `ui-web`, `ui-auth`, `api-client`, theme |
| `apps/sample-mobile` | Expo RN proof app using `ui-native` |
| `apps/sample-desktop` | Electron proof app sharing web UI packages |

---

## Source module templates (not packages)

Domain modules whose fields, rules, or UI differ per product stay as **project-owned source**, scaffolded from `templates/`. Do **not** import these as `@mawsoftwares/*` packages.

| Template | Location | Description |
|----------|----------|-------------|
| `users-module` | `templates/users-module/` | Full user management (domain, use cases, API, Postgres, React UI) |
| `crud-module` | `templates/crud-module/` | Minimal CRUD scaffold for any entity |
| `storage-module` | `templates/storage-module/` | File storage (local/S3), folders, signed upload, admin settings |

There is no `@mawsoftwares/users` package. Copy the template into the product and own it. See [`module-architecture.md`](./module-architecture.md) and [`templates/README.md`](../templates/README.md).

---

## Quick reference

| Folder | Package | One-line purpose |
|--------|---------|------------------|
| `packages/sdk` | `@mawsoftwares/sdk` | Kernel + ports (imports nothing of ours) |
| `packages/core` | `@mawsoftwares/core` | Re-export of framework-independent primitives |
| `packages/config` | `@mawsoftwares/config` | Env, layered config, health, version |
| `packages/platform` | `@mawsoftwares/platform` | Session, storage, offline, browser-safe security |
| `packages/database` | `@mawsoftwares/database` | Postgres pool, repos, migrations |
| `packages/observability` | `@mawsoftwares/observability` | Logs, metrics, tracing, health, shutdown |
| `packages/testing` | `@mawsoftwares/testing` | Mocks and test factories |
| `packages/tenancy` | `@mawsoftwares/tenancy` | Multi-tenant context and contracts |
| `packages/modules` | `@mawsoftwares/modules` | Module registry, lifecycle, events |
| `packages/feature-flags` | `@mawsoftwares/feature-flags` | Tenant-aware feature flags |
| `packages/auth-core` | `@mawsoftwares/auth-core` | Passwords, JWT, MFA, registration (no HTTP framework) |
| `packages/rbac-core` | `@mawsoftwares/rbac-core` | Single `can()` / permission resolver |
| `packages/api` | `@mawsoftwares/api` | Response envelope, controllers, error translation |
| `packages/server-express` | `@mawsoftwares/server-express` | Express auth, RBAC, security, API router |
| `packages/server-hono` | `@mawsoftwares/server-hono` | Hono equivalent of server-express |
| `packages/api-client` | `@mawsoftwares/api-client` | Frontend HTTP + auth token handling |
| `packages/theme` | `@mawsoftwares/theme` | Design tokens + tenant branding |
| `packages/ui-web` | `@mawsoftwares/ui-web` | React web design system + access providers |
| `packages/ui-native` | `@mawsoftwares/ui-native` | React Native design system |
| `packages/ui-auth` | `@mawsoftwares/ui-auth` | Login/register/password/MFA forms |
| `packages/communication` | `@mawsoftwares/communication` | Email, SMS, WhatsApp, in-app notifications |
| `packages/queue` | `@mawsoftwares/queue` | Background jobs and workers |
| `packages/audit` | `@mawsoftwares/audit` | Audit trail store + middleware |
| `packages/import-export` | `@mawsoftwares/import-export` | CSV/JSON import & export pipeline |
| `packages/reporting` | `@mawsoftwares/reporting` | Report definitions and execution |
| `packages/deployment` | `@mawsoftwares/deploy` | Config-driven deploy CLI |

---

## Related docs

- [Architecture](./architecture.md)
- [Module architecture](./module-architecture.md)
- [Development](./development.md)
- [Publishing](./publishing.md)
- [Constitution](../.engineering/constitution.md)
- [Dependency law](../.engineering/dependency-law.md)
