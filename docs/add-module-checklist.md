# Add a New Module — Simple Checklist

Use one **key** everywhere. Example below uses `customers`.

| Place | Value |
|---|---|
| Module key | `customers` |
| Menu key | `customers` (exact match) |
| Feature flag | `module.customers` |
| Read permission | `Read_Customers` |
| Path | `/customers` |

---

## Backend (code)

### 1. Create permissions file

`apps/sample-server/src/modules/customers/permissions.ts`

```ts
import type { ModuleDefinition } from '@mawsoftwares/rbac-core';

export const customersModule: ModuleDefinition = {
  key: 'customers',
  name: 'Customers',
  routePrefix: '/api/v1/customers',
  audience: 'admin',
  permissions: [
    { code: 'Read_Customers', name: 'Read Customers', description: 'View customers' },
    { code: 'Create_Customers', name: 'Create Customers', description: 'Create customers' },
    { code: 'Update_Customers', name: 'Update Customers', description: 'Edit customers' },
    { code: 'Delete_Customers', name: 'Delete Customers', description: 'Delete customers' },
  ],
};
```

### 2. Register the module

In `apps/sample-server/src/modules/index.ts`:

```ts
import { customersModule } from './customers/permissions';

registry.register(
  // ...existing modules
  customersModule,
);
```

### 3. Add API routes (when you have APIs)

In `apps/sample-server/src/main.ts`, mount the router and guard every route:

```ts
app.get('/api/v1/customers',     auth.requireAuth, auth.requirePermission('Read_Customers'), handler);
app.post('/api/v1/customers',    auth.requireAuth, auth.requirePermission('Create_Customers'), handler);
app.put('/api/v1/customers/:id', auth.requireAuth, auth.requirePermission('Update_Customers'), handler);
app.delete('/api/v1/customers/:id', auth.requireAuth, auth.requirePermission('Delete_Customers'), handler);
```

### 4. Sync permissions into the DB

**Restart the server** — boot sync upserts codes into `master_permissions`.

Then either:

```bash
cd apps/sample-server && npm run db:seed
```

…or open **Super Admin → RBAC Admin** and assign `Read_Customers` (etc.) to the roles that should see the module.

Seed also assigns all registry permissions to `super_admin`, `owner`, and `admin`.

---

## Frontend (code)

### 5. Wire the page in `apps/sample-web/src/App.tsx`

1. Add the key to the `Page` type:

```ts
type Page = /* ... */ | 'customers';
```

2. Add fallback nav (used if menu API fails):

```ts
{ key: 'customers', label: 'Customers', icon: 'list', path: '/customers', group: 'Main', sortOrder: 8, permission: 'Read_Customers' },
```

3. Gate direct URL access:

```ts
const PAGE_PERMISSIONS = {
  // ...
  customers: 'Read_Customers',
};
```

4. Render the page:

```ts
case 'customers': return <CustomersView />;
```

5. Enable the feature flag (required or the sidebar hides it):

```ts
<FeatureFlagProvider fetchFlags={async () => ({
  // ...
  'module.customers': true,
})}>
```

### 6. Build the feature UI

`apps/sample-web/src/features/customers.tsx` (or similar).

Use `useDynamicAccess()` and check before write actions:

```ts
const { can } = useDynamicAccess();
const canCreate = can('Create_Customers');
// pass onCreate={canCreate ? openCreate : undefined} to ListPage
```

---

## UI (Menu Management + RBAC)

### 7. Add the sidebar menu (DB)

Sign in as a user with `Manage_Menus` → **Super Admin → Menu Management** → create:

| Field | Value | Notes |
|---|---|---|
| key | `customers` | Must match module key + `module.customers` |
| label | Customers | |
| path | `/customers` | |
| icon | `list` | Lucide-style name used by the app |
| permission | `Read_Customers` | **One code only** — no commas |
| parent | _(empty)_ | Empty = top-level sidebar item |
| isActive | true | |

Reload the app after saving.

### 8. Assign permissions (if you did not re-seed)

**Super Admin → RBAC Admin** → give the role:

- `Read_Customers` (needed to see the menu)
- `Create_Customers` / `Update_Customers` / `Delete_Customers` as needed

**Log out and log back in** so `GET /me` reloads permissions.

---

## Why the menu might stay hidden

Check in this order:

1. **Feature flag** — `'module.<key>': true` in `App.tsx` (key must match menu key exactly).
2. **Menu permission** — exactly one code, e.g. `Read_Customers` (not a comma list).
3. **Menu key** — same string as module key (`customers`, not `customer`).
4. **Role has permission** — assigned in RBAC / seed, then re-login.
5. **Menu is root + active** — no parent; `isActive = true`.
6. **Page wired** — `Page` type + `PageContent` case exist (nav can show even if page is empty; missing case means click does nothing useful).

---

## Quick order (copy/paste)

```
[ ] 1. Backend: permissions.ts + registry.register
[ ] 2. Backend: restart server (sync master_permissions)
[ ] 3. Backend: db:seed OR RBAC Admin assign perms
[ ] 4. Frontend: Page type + PAGE_PERMISSIONS + PageContent case
[ ] 5. Frontend: NAV_ITEMS fallback + module.<key> feature flag
[ ] 6. Frontend: feature view + can() on buttons
[ ] 7. UI: Menu Management row (key + single Read_ permission, no parent)
[ ] 8. Re-login → confirm sidebar item appears
[ ] 9. Backend: routes with requirePermission (when APIs exist)
```

---

## Optional: nest under Super Admin instead

If the page should be a **card inside Super Admin** (not a top-level sidebar item):

1. Add it to `SUPERADMIN_TOOLS` in `apps/sample-web/src/superadmin-tools.ts`.
2. In Menu Management, set **parent** = Super Admin (do not leave parent empty).
3. Still register permissions + `PAGE_PERMISSIONS` + `PageContent` case.

---

## RBAC note: who can edit superadmin permissions

Only a user with the apex role (`super_admin`) can see and change permissions on the `super_admin` role (or another superadmin user). Owners/admins with `Manage_Rbac` still cannot. This is enforced in `@mawsoftwares/rbac-core` (`canManageRole` / apex peers).
