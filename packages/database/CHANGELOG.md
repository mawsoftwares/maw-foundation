# @mawsoftwares/database

## 1.1.0

### Minor Changes

- 4832e80: Tenant isolation that actually works at the database, and a resolver for single-tenant deployments.

  - `tenancy`: `StaticTenantResolver` resolves one configured tenant and ignores every caller-controlled input (hostname, header, path, JWT claims). Use it for single-tenant deployments; switch to `SubdomainTenantResolver` or a `CompositeTenantResolver` for multi-tenant without changing product code.
  - `database`: **fix** `setTenantContext`. It ran `SET LOCAL app.tenant_id = $1`, which Postgres rejects (utility statements cannot take bind parameters), so it could never have worked against a real database; it now uses `set_config('app.tenant_id', $1, true)`. It also rejects an empty tenant id.
  - `database`: `withTenantTransaction(pool, tenantId, fn)` runs a callback in one transaction with the tenant set (the setting ends with the transaction, so pooled connections never carry a tenant over).
  - `database`: `createTenantScopedPool(pool, { tenantId })` wraps a `pg.Pool` so every statement (and every checked-out client, for ORM transactions) runs with `app.tenant_id` set to the current tenant and cleared on release; with no tenant in context an application role sees nothing (fail closed). Pair it with an `AsyncLocalStorage`/`AlsTenantContextHolder` set by the tenant middleware.
  - `database`: `appRoleStatements` and `forceRlsStatements` build the SQL for a non-bypassing application role and for `FORCE ROW LEVEL SECURITY`. RLS policies are skipped by superusers, roles with BYPASSRLS and (unless forced) table owners, so an app connecting as such a role has no database-level isolation. The builders validate identifiers and never include secrets.

  All additions plus the `setTenantContext` fix; no existing export is removed.

## 1.0.0

### Major Changes

- layout engine

### Patch Changes

- Updated dependencies
  - @mawsoftwares/sdk@1.0.0

## 0.3.1

### Patch Changes

- Updated dependencies [e1374be]
  - @mawsoftwares/sdk@0.3.0

## 0.3.0

### Minor Changes

- d5e7135: Schema: `master_roles.level` (role hierarchy rank used by `rbac-core` and the PHP backend) and the new `tenant_theme` table (`schema.tenantTheme`). These were committed to the repo but never released, so consumers of the published package could not use role hierarchy or per-tenant themes.

## 0.2.1

### Patch Changes

- Updated dependencies [bb4dc84]
  - @mawsoftwares/sdk@0.2.1

## 0.2.0

### Minor Changes

- 74103ab: Menu management, MUI-like theme/shell tokens, RBAC `|` permission codes, and related client/UI work.

  - **ui-web**: ready-made field components, Icon, shell-aware navigation/theme, skeleton helpers
  - **theme**: design.md engine, shell tokens, denser MUI-like radius/shadow/typography defaults
  - **api-client**: axios transport, retry/refresh hardening, optional `@mawsoftwares/api-client/react`
  - **database**: menu + messaging/gateway/service-catalogue schemas; `master_permissions.is_system`
  - **rbac-core**: `Action|Module` permission codes with legacy `Action_Module` support
  - **sdk**: stronger phone validation; dynamic-form type tweaks
  - **communication**: HTTP SMS and WhatsApp providers

### Patch Changes

- Updated dependencies [74103ab]
  - @mawsoftwares/sdk@0.2.0

## 0.1.1

### Patch Changes

- 636448d: Prepare packages for GitHub Packages so other product repos can install `@mawsoftwares/*` instead of linking this monorepo locally.
- Updated dependencies [636448d]
  - @mawsoftwares/sdk@0.1.1
