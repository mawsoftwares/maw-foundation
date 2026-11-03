# @mawsoftwares/tenancy

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
  - @mawsoftwares/core@1.0.0

## 0.2.1

### Patch Changes

- @mawsoftwares/core@0.1.4

## 0.2.0

### Minor Changes

- bb4dc84: `PgTenantRepository` moved from `@mawsoftwares/tenancy` to `@mawsoftwares/postgres` (tenancy no longer depends on the database
  layer, as the dependency law requires): `import { PgTenantRepository } from '@mawsoftwares/postgres'`.
  feature-flags: dependency checks no longer treat a shared dependency (A needs B and C, both need D) as circular; evaluators import
  their enums from the right module; added `InMemoryFeatureFlagRepository`; README updated to the current API.
  sdk: `isRolledOut(id, percentage, salt?)` accepts an optional salt (the flag key) so flags roll out to different users; two-argument calls are unchanged.

### Patch Changes

- @mawsoftwares/core@0.1.3

## 0.1.2

### Patch Changes

- Updated dependencies [74103ab]
  - @mawsoftwares/database@0.2.0
  - @mawsoftwares/core@0.1.2

## 0.1.1

### Patch Changes

- 636448d: Prepare packages for GitHub Packages so other product repos can install `@mawsoftwares/*` instead of linking this monorepo locally.
- Updated dependencies [636448d]
  - @mawsoftwares/core@0.1.1
  - @mawsoftwares/database@0.1.1
