# MAW Foundation — Package Reference

28 packages in 5 layers. Dependency law: `apps → domains + ui → platform → sdk`.

Published packages are installed by other developers from **GitHub Packages** (`@mawsoftwares/*`). See [`docs/publishing.md`](./publishing.md).

See [`docs/module-architecture.md`](./module-architecture.md) for the full classification rule: **when should a module be a package vs project-owned source code?**

## SDK Layer

| Package | Scope Name | Status | Description |
|---------|-----------|--------|-------------|
| `packages/sdk` | `@mawsoftwares/sdk` | Stable | Kernel primitives (Result, Money, IDs), contracts (ports), i18n, file utils |
| `packages/core` | `@mawsoftwares/core` | Stable | Canonical re-export of framework-independent primitives |
| `packages/config` | `@mawsoftwares/config` | Stable | Multi-level config engine, env utils, health checker, version |

## Platform Layer

| Package | Scope Name | Status | Description |
|---------|-----------|--------|-------------|
| `packages/platform` | `@mawsoftwares/platform` | Stable | Session manager, LocalFileStorage, S3FileStorage, PgFileMetadataStore, offline adapters, security utilities |
| `packages/database` | `@mawsoftwares/database` | Stable | PostgreSQL pool, PgPool interface, query utilities, migration runner |
| `packages/observability` | `@mawsoftwares/observability` | Stable | Logger, metrics, tracing, error tracking, performance, health, shutdown manager, ALS context |
| `packages/testing` | `@mawsoftwares/testing` | Stable | Test utilities and helpers |

## Domain Layer

| Package | Scope Name | Status | Description |
|---------|-----------|--------|-------------|
| `packages/auth-core` | `@mawsoftwares/auth-core` | Stable | JWT, refresh tokens, password hashing, MFA/OTP, registration, email verification, password reset, social auth (Google + GitHub providers), PgSocialAccountStore |
| `packages/rbac-core` | `@mawsoftwares/rbac-core` | Stable | Permission resolver, module registry, ABAC scoping, dynamic permission checks, MasterCache |
| `packages/tenancy` | `@mawsoftwares/tenancy` | Stable | Tenant contracts, resolvers (header, subdomain, JWT, composite), ALS context holder (the Postgres repository is `PgTenantRepository` in `@mawsoftwares/postgres`) |
| `packages/modules` | `@mawsoftwares/modules` | Stable | Module registry, lifecycle, dependency graph, event bus |
| `packages/feature-flags` | `@mawsoftwares/feature-flags` | WIP | Tenant-aware feature flag service (has pre-existing type errors) |
| `packages/communication` | `@mawsoftwares/communication` | Stable | NotificationService, email/SMS/in-app, SMTP provider, PgInAppNotificationStore, PgTemplateStore |
| `packages/queue` | `@mawsoftwares/queue` | Stable | QueueService, JobRunner, InMemoryProvider, PgQueueProvider |
| `packages/audit` | `@mawsoftwares/audit` | Stable | Audit trail and structured event logging |

| `packages/import-export` | `@mawsoftwares/import-export` | Stable | CSV/JSON import with validation, mapping, dedup; export with background processing |
| `packages/reporting` | `@mawsoftwares/reporting` | Stable | Report definitions, filter/sort/group/aggregate, execution engine, saved reports |
| `packages/deployment` | `@mawsoftwares/deployment` | Scaffold | Deployment utilities and configuration |

## Server Adapters

| Package | Scope Name | Status | Description |
|---------|-----------|--------|-------------|
| `packages/server-express` | `@mawsoftwares/server-express` | Stable | Express auth middleware, RBAC, file upload, CSRF, rate-limit, CORS, security pipeline, tenant middleware, tenant routes, auth routes |
| `packages/server-hono` | `@mawsoftwares/server-hono` | Stable | Hono auth middleware, RBAC, file upload, auth routes, rate-limit, CORS, security pipeline |
| `packages/api` | `@mawsoftwares/api` | Stable | API route definitions, typed handlers |
| `packages/api-client` | `@mawsoftwares/api-client` | Stable | Typed HTTP client with auto-refresh, cancellation, interceptors, offline support |

## UI Layer

| Package | Scope Name | Status | Description |
|---------|-----------|--------|-------------|
| `packages/theme` | `@mawsoftwares/theme` | Stable | Platform-agnostic design tokens, brand config bridge |
| `packages/ui-web` | `@mawsoftwares/ui-web` | Stable | React web design system — 40+ components, DataGrid, DynamicForm, RBAC guards |
| `packages/ui-native` | `@mawsoftwares/ui-native` | Stable | React Native design system |
| `packages/ui-auth` | `@mawsoftwares/ui-auth` | Stable | Auth UI components (login, register, password reset forms) |


## Sample Apps

| App | Description |
|-----|-------------|
| `apps/sample-server` | Express server wiring all domain packages — auth, RBAC, tenancy, queue, files, communication |
| `apps/sample-web` | React web app showcasing all UI packages |

---

## Source Module Templates

Domain modules whose fields, rules, or UI differ between projects must remain as **project-owned source code**. They are scaffolded from templates (not imported as packages).

| Template | Location | Description |
|---|---|---|
| `users-module` | `templates/users-module/` | Full user management — domain entity, use-cases, controllers, Postgres repository, migrations, React UI (UsersManager, list, form, details) |
| `crud-module` | `templates/crud-module/` | Minimal generic CRUD scaffold for any domain entity |
| `storage-module` | `templates/storage-module/` | Provider-agnostic file storage (local/S3), folders, signed uploads, admin settings UI |

### The users module is a template, not a package

There is no `@mawsoftwares/users` or `@mawsoftwares/ui-users` package. User fields change per product (employee codes, outlets, departments…), so the module ships as source in `templates/users-module/`:

```
templates/users-module/
├── server/   domain, use-cases, controllers, repository, migrations, errors, tests, module.ts
└── web/      UsersManager, UsersList, UserForm, UserDetails, types.ts
```

Copy `server/` into your backend's `modules/users/` and `web/` into your frontend's `features/users/ui/`, then own it. `apps/sample-server`, `apps/sample-web` and `apps/sample-desktop` each hold their own copy as the worked example. `web/types.ts` carries the DTOs so the web copy never imports server code; keep it in step with `server/application/dto`.

See [`docs/module-architecture.md`](./module-architecture.md) for the classification rule and scaffolding guide.
