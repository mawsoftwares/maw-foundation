# MAW Foundation — Package Reference

28 packages in 5 layers. Dependency law: `apps → domains + ui → platform → sdk`.

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
| `packages/users` | `@mawsoftwares/users` | Stable | User entities, CRUD, profile, status management, PgUserRepository |
| `packages/tenancy` | `@mawsoftwares/tenancy` | Stable | Tenant contracts, PgTenantRepository, resolvers (header, subdomain, JWT, composite), ALS context holder |
| `packages/modules` | `@mawsoftwares/modules` | Stable | Module registry, lifecycle, dependency graph, event bus |
| `packages/feature-flags` | `@mawsoftwares/feature-flags` | WIP | Tenant-aware feature flag service (has pre-existing type errors) |
| `packages/communication` | `@mawsoftwares/communication` | Stable | NotificationService, email/SMS/in-app, SMTP provider, PgInAppNotificationStore, PgTemplateStore |
| `packages/queue` | `@mawsoftwares/queue` | Stable | QueueService, JobRunner, InMemoryProvider, PgQueueProvider |
| `packages/audit` | `@mawsoftwares/audit` | Stable | Audit trail and structured event logging |
| `packages/masters` | `@mawsoftwares/masters` | Stable | Master data management with caching |
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
| `packages/ui-users` | `@mawsoftwares/ui-users` | Stable | User management UI components |

## Sample Apps

| App | Description |
|-----|-------------|
| `apps/sample-server` | Express server wiring all domain packages — auth, RBAC, tenancy, queue, files, communication |
| `apps/sample-web` | React web app showcasing all UI packages |
