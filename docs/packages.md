# MAW Foundation — Packages

## Core Packages (Implemented)

| Package | Name | Description |
|---------|------|-------------|
| `packages/sdk` | `@maw/sdk` | Kernel primitives (Result, Money, IDs) + contracts (ports) + i18n |
| `packages/core` | `@maw/core` | Canonical import path for framework-independent primitives |
| `packages/config` | `@maw/config` | Multi-level config engine, env utils, health checker, version |
| `packages/platform` | `@maw/platform` | Session manager, crypto, storage engines |
| `packages/auth-core` | `@maw/auth-core` | JWT, refresh tokens, password, MFA, registration |
| `packages/rbac-core` | `@maw/rbac-core` | Permission resolver, module registry, ABAC scoping |
| `packages/users` | `@maw/users` | User entities, CRUD, profile, status management |
| `packages/tenancy` | `@maw/tenancy` | Tenant identity, context, resolution, isolation contracts |
| `packages/modules` | `@maw/modules` | Module registry, lifecycle, dependency graph, event bus |
| `packages/feature-flags` | `@maw/feature-flags` | Tenant-aware feature flag service with scoped evaluation |

## Infrastructure Packages (Implemented)

| Package | Name | Description |
|---------|------|-------------|
| `packages/database` | `@maw/database` | PostgreSQL pool, repository base, query builder, migrations |
| `packages/api` | `@maw/api` | API route definitions and handlers |
| `packages/api-client` | `@maw/api-client` | Typed HTTP client with auto-refresh |
| `packages/theme` | `@maw/theme` | Platform-agnostic design tokens |
| `packages/ui-web` | `@maw/ui-web` | React web design system + RBAC guards |
| `packages/ui-native` | `@maw/ui-native` | React Native design system |

## Adapters

| Adapter | Name | Wraps |
|---------|------|-------|
| `adapters/express` | `@maw/express` | `@maw/server-express` |
| `adapters/hono` | `@maw/hono` | `@maw/server-hono` |
| `adapters/postgres` | `@maw/postgres` | `@maw/database` |

## Placeholder Packages (Future Implementation)

| Package | Name | Description |
|---------|------|-------------|
| `packages/notifications` | `@maw/notifications` | Multi-channel notification system |
| `packages/audit` | `@maw/audit` | Audit trail and logging |
| `packages/files` | `@maw/files` | File upload/download with storage providers |
| `packages/validation` | `@maw/validation` | Schema-based validation framework |
| `packages/i18n` | `@maw/i18n` | Internationalization and localization |
| `packages/workflow` | `@maw/workflow` | State machine and approval workflows |
| `packages/billing` | `@maw/billing` | Subscription and invoice management |
| `packages/queue` | `@maw/queue` | Background job processing |
| `packages/offline` | `@maw/offline` | Offline-first sync engine |
