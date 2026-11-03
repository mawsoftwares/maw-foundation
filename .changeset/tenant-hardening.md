---
'@mawsoftwares/tenancy': minor
'@mawsoftwares/database': minor
---

Tenant isolation that actually works at the database, and a resolver for single-tenant deployments.

- `tenancy`: `StaticTenantResolver` resolves one configured tenant and ignores every caller-controlled input (hostname, header, path, JWT claims). Use it for single-tenant deployments; switch to `SubdomainTenantResolver` or a `CompositeTenantResolver` for multi-tenant without changing product code.
- `database`: **fix** `setTenantContext`. It ran `SET LOCAL app.tenant_id = $1`, which Postgres rejects (utility statements cannot take bind parameters), so it could never have worked against a real database; it now uses `set_config('app.tenant_id', $1, true)`. It also rejects an empty tenant id.
- `database`: `withTenantTransaction(pool, tenantId, fn)` runs a callback in one transaction with the tenant set (the setting ends with the transaction, so pooled connections never carry a tenant over).
- `database`: `appRoleStatements` and `forceRlsStatements` build the SQL for a non-bypassing application role and for `FORCE ROW LEVEL SECURITY`. RLS policies are skipped by superusers, roles with BYPASSRLS and (unless forced) table owners, so an app connecting as such a role has no database-level isolation. The builders validate identifiers and never include secrets.

All additions plus the `setTenantContext` fix; no existing export is removed.
