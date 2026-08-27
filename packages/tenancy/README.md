# @mawsoftwares/tenancy

Multi-tenant foundation for the MAW ecosystem.

## Features

- **Tenant** — Identity model with status lifecycle (`active`, `inactive`, `suspended`, `pending`, `archived`)
- **TenantContext** — Lightweight context object carried through requests
- **ITenantResolver** — Contract for resolving tenant from hostname, header, path, or JWT
- **ITenantRepository** — CRUD contract (implemented by adapters like `@mawsoftwares/postgres`)
- **ITenantContextHolder** — Per-request context storage with `run()` scoping
- **ITenantScoped** — Marker interface for tenant-scoped repositories

## Usage

```ts
import { createTenantContextHolder, type TenantContext } from '@mawsoftwares/tenancy';

const holder = createTenantContextHolder();
const ctx: TenantContext = { tenantId: 'acme-123', tenantName: 'Acme Corp' };

holder.run(ctx, () => {
  // All operations in this scope are scoped to Acme Corp
  console.log(holder.get()?.tenantId); // 'acme-123'
});
```
