# MAW Foundation — Source Module Templates

This directory contains **source module templates** that you copy into your project and own completely.

## What is a Source Module?

Some business/domain modules have fields, relationships, business rules, validation, permissions, API contracts and UI requirements that differ between projects. For these modules, the project developer should own the source code — not consume a locked npm package.

A source module can still depend on Foundation packages:

```
modules/users
      │
      ├── @mawsoftwares/auth-core   (password hashing, JWT)
      ├── @mawsoftwares/rbac-core   (permission registry)
      ├── @mawsoftwares/database    (PgPool, TenantScopedRepository)
      ├── @mawsoftwares/audit       (audit trail)
      └── @mawsoftwares/sdk         (contracts, types)
```

## Available Templates

| Template | Description |
|---|---|
| `users-module/` | Full user management module (domain, application, infra, api, web) |
| `crud-module/` | Minimal generic CRUD module scaffold for any domain entity |

## How to Use a Template

### 1. Copy the template into your project

```bash
# Copy the users template
cp -r templates/users-module/server apps/my-server/src/modules/users
cp -r templates/users-module/web    apps/my-web/src/modules/users

# Or copy the minimal CRUD template
cp -r templates/crud-module/server apps/my-server/src/modules/orders
cp -r templates/crud-module/web    apps/my-web/src/modules/orders
```

### 2. Rename entity references

For a `crud-module` copy, do a global find-replace:
- `Entity` → `Order` (or your entity name)
- `entity` → `order`
- `entities` → `orders`

For a `users-module` copy the naming is already specific to users.

### 3. Register permissions in the server registry

In `apps/my-server/src/modules/index.ts`:

```ts
import { myOrdersModule } from './orders/module';

registry.register(myOrdersModule);
```

### 4. Add backend routes

In `apps/my-server/src/main.ts`:

```ts
import { createOrdersRouter } from './modules/orders/api/routes';

app.use('/api/v1/orders', createOrdersRouter({
  requireAuth: auth.requireAuth,
  requirePermission: (p) => auth.requirePermission(p),
}));
```

### 5. Seed permissions (backend)

Re-run the seed script so admin roles receive the new module's permissions:

```bash
pnpm sample:seed
```

### 6. Add to the frontend nav

In `apps/my-web/src/App.tsx`, add to `NAV_ITEMS` and `PAGE_PERMISSIONS`:

```ts
// NAV_ITEMS
{ key: 'orders', label: 'Orders', icon: '🛒', path: '/orders', group: 'Main', sortOrder: 20, permission: 'Read_Orders' },

// PAGE_PERMISSIONS
'orders': 'Read_Orders',
```

### 7. Add the page route

```ts
// PageContent switch
case 'orders': return <OrdersView />;
```

## Module Classification Rule

### Make it a Foundation package when:

- ✅ Generic, reusable across many projects without modification
- ✅ Stable API — the interface rarely changes
- ✅ No project-specific database fields or business rules
- ✅ Represents infrastructure (auth, queues, files, notifications)

Examples: `@mawsoftwares/auth-core`, `@mawsoftwares/rbac-core`, `@mawsoftwares/queue`

### Keep it as a source module (copy from template) when:

- ✅ Database fields differ between projects
- ✅ Business rules differ between projects
- ✅ Validation rules differ between projects
- ✅ Workflow or permissions differ between projects
- ✅ Represents domain/business logic

Examples: `users`, `customers`, `orders`, `products`, `invoices`

## Extraction Rule

A source module should only be promoted to a Foundation npm package **after it has been used unchanged across multiple projects**. Premature packaging creates rigid interfaces that cause more friction than value.

```
Project A → modules/production
Project B → modules/production
Project C → modules/production
              ↓ (stable, generic)
         @mawsoftwares/production  ← only after proving abstraction
```
