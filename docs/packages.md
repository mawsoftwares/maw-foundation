# MAW Foundation — Packages

## Core Packages (Implemented)

| Package | Name | Description |
|---------|------|-------------|
| `packages/sdk` | `@mawsoftwares/sdk` | Kernel primitives (Result, Money, IDs) + contracts (ports) + i18n |
| `packages/core` | `@mawsoftwares/core` | Canonical import path for framework-independent primitives |
| `packages/config` | `@mawsoftwares/config` | Multi-level config engine, env utils, health checker, version |
| `packages/platform` | `@mawsoftwares/platform` | Session manager, crypto, storage engines |
| `packages/auth-core` | `@mawsoftwares/auth-core` | JWT, refresh tokens, password, MFA, registration |
| `packages/rbac-core` | `@mawsoftwares/rbac-core` | Permission resolver, module registry, ABAC scoping |
| `packages/users` | `@mawsoftwares/users` | User entities, CRUD, profile, status management |
| `packages/tenancy` | `@mawsoftwares/tenancy` | Tenant identity, context, resolution, isolation contracts |
| `packages/modules` | `@mawsoftwares/modules` | Module registry, lifecycle, dependency graph, event bus |
| `packages/feature-flags` | `@mawsoftwares/feature-flags` | Tenant-aware feature flag service with scoped evaluation |

## Infrastructure Packages (Implemented)

| Package | Name | Description |
|---------|------|-------------|
| `packages/database` | `@mawsoftwares/database` | PostgreSQL pool, repository base, query builder, migrations |
| `packages/api` | `@mawsoftwares/api` | API route definitions and handlers |
| `packages/api-client` | `@mawsoftwares/api-client` | Typed HTTP client with auto-refresh |
| `packages/theme` | `@mawsoftwares/theme` | Platform-agnostic design tokens |
| `packages/ui-web` | `@mawsoftwares/ui-web` | React web design system + RBAC guards |
| `packages/ui-native` | `@mawsoftwares/ui-native` | React Native design system |

## Adapters

| Adapter | Name | Wraps |
|---------|------|-------|
| `adapters/express` | `@mawsoftwares/express` | `@mawsoftwares/server-express` |
| `adapters/hono` | `@mawsoftwares/hono` | `@mawsoftwares/server-hono` |
| `adapters/postgres` | `@mawsoftwares/postgres` | `@mawsoftwares/database` |

## Placeholder Packages (Future Implementation)

| Package | Name | Description |
|---------|------|-------------|
| `packages/notifications` | `@mawsoftwares/notifications` | Multi-channel notification system |
| `packages/audit` | `@mawsoftwares/audit` | Audit trail and logging |
| `packages/files` | `@mawsoftwares/files` | File upload/download with storage providers |
| `packages/validation` | `@mawsoftwares/validation` | Schema-based validation framework |
| `packages/i18n` | `@mawsoftwares/i18n` | Internationalization and localization |
| `packages/workflow` | `@mawsoftwares/workflow` | State machine and approval workflows |
| `packages/billing` | `@mawsoftwares/billing` | Subscription and invoice management |
| `packages/queue` | `@mawsoftwares/queue` | Background job processing |
| `packages/offline` | `@mawsoftwares/offline` | Offline-first sync engine |
