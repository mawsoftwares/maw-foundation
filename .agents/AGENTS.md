# MAW Foundation — Project-Scoped Agent Rules

These rules extend `CLAUDE.md` and apply to all AI coding agents working in this repository.

---

## RBAC Rules — Mandatory for Every New Module

The application uses **data-driven RBAC** (Role-Based Access Control).  
**No hardcoded role bypasses are allowed**. Permissions come exclusively from the database and are loaded at runtime via `GET /me`.

---

### Rule 1 — Register permissions on the backend

Every new module **must** register its permissions in the module registry in `apps/sample-server/src/main.ts` using `registry.register(...)`.

Each module should define a standard permission set following the `Action_Module` naming convention:

```ts
// Pattern: Action_ModuleName (PascalCase_PascalCase)
registry.register({
  key: 'my-module',
  name: 'My Module',
  audience: 'admin',       // 'admin' | 'operator' | 'shared'
  actions: ['Read', 'Create', 'Update', 'Delete'],
  // Results in: Read_MyModule, Create_MyModule, Update_MyModule, Delete_MyModule
});
```

Standard actions per module type:
- Read-only view: Read
- CRUD list: Read, Create, Update, Delete
- Reporting: Read, Create (Create = run/execute a report)
- Export: Read, Export
- Admin management: Read, Create, Update, Delete, Manage_*

---

### Rule 2 — Seed permissions for admin roles

After registering a new module, update `apps/sample-server/src/db/seed.ts` to assign ALL new permissions to `super_admin`, `owner`, and `admin` roles by default.

The seed file already has a loop that auto-assigns all permissions to these roles. As long as your module is registered before seeding runs, permissions will be picked up automatically. **Do not skip re-seeding after adding a module**.

---

### Rule 3 — Guard the sidebar menu entry

In `apps/sample-web/src/App.tsx`, add a `permission` field to the `NAV_ITEMS` entry for the new module:

```ts
// CORRECT — gated by the Read permission
{ key: 'my-module', label: 'My Module', icon: '🔷', path: '/my-module', group: 'Main', sortOrder: 10, permission: 'Read_MyModule' },

// WRONG — no permission, always visible regardless of RBAC
{ key: 'my-module', label: 'My Module', icon: '🔷', path: '/my-module', group: 'Main', sortOrder: 10 },
```

Also add the page to the `PAGE_PERMISSIONS` map so the page is blocked if navigated to directly:

```ts
const PAGE_PERMISSIONS: Partial<Record<Page, string>> = {
  // ... existing entries ...
  'my-module': 'Read_MyModule',   // add this
};
```

The `navConfig` in `Shell` already filters `NAV_ITEMS` using `canDynamic(item.permission)` — do not change the filtering logic.

---

### Rule 4 — Guard action buttons in the feature component

In the feature view component (`apps/sample-web/src/features/my-module.tsx`), import `useDynamicAccess` from `@mawsoftwares/ui-web` and check permissions before rendering any write action:

```tsx
import { useDynamicAccess } from '@mawsoftwares/ui-web';

export function MyModuleView(): ReactNode {
  const { can } = useDynamicAccess();

  const canCreate = can('Create_MyModule');
  const canDelete = can('Delete_MyModule');
  const canExport = can('Export_MyModule');

  return (
    <ListPage
      title="My Module"
      createLabel="New Item"
      onCreate={canCreate ? () => setShowCreate(true) : undefined}
      toolbar={canExport ? <Button onClick={handleExport}>Export CSV</Button> : undefined}
    >
      <DataTable
        columns={[
          ...COLUMNS,
          ...(canDelete ? [{
            key: 'actions',
            header: '',
            width: 70,
            render: (row) => (
              <Button variant="ghost" onClick={() => handleDelete(row.id)}
                style={{ color: 'var(--maw-danger)', fontSize: 'var(--maw-text-xs)' }}>
                Delete
              </Button>
            ),
          }] : []),
        ]}
        data={rows}
        keyField="id"
      />
    </ListPage>
  );
}
```

Button permission mapping:
- Create / "New X" button → Create_ModuleName — pass onCreate={undefined} to ListPage when absent
- Delete button / column → Delete_ModuleName — omit the column from DataTable when absent
- Edit / Update action → Update_ModuleName — hide the Edit button when absent
- Export CSV / Download → Export_ModuleName — pass toolbar={undefined} to ListPage when absent
- Run / Execute (e.g. reports) → Create_ModuleName — hide the button when absent

---

### Rule 5 — Never bypass permissions with role checks

FORBIDDEN — do NOT do this anywhere in frontend or backend:

```ts
// Hardcoded role bypass — ignores actual permission assignments
if (user.role === 'super_admin' || user.role === 'admin') { ... }

// isAdmin bypass in DynamicAccessProvider
can: (permission) => isAdmin || matchesPermission(snapshot.permissions, permission)
```

REQUIRED — always use the permission check:

```ts
// Purely data-driven, works for all roles including super_admin
const { can } = useDynamicAccess();
if (can('Create_Orders')) { ... }
```

The `DynamicAccessProvider` in `packages/ui-web/src/dynamic-access.tsx` intentionally has `defaultIsAdmin = (_role) => false` so that `can()` is **always** data-driven from the permissions snapshot. Do not change this default.

---

### Rule 6 — Backend route guards

Every backend route for the new module must use `auth.requirePermission(...)`:

```ts
app.get('/my-module',     auth.requireAuth, auth.requirePermission('Read_MyModule'),   handler);
app.post('/my-module',    auth.requireAuth, auth.requirePermission('Create_MyModule'), handler);
app.put('/my-module/:id', auth.requireAuth, auth.requirePermission('Update_MyModule'), handler);
app.delete('/my-module/:id', auth.requireAuth, auth.requirePermission('Delete_MyModule'), handler);
```

The backend is the authoritative security boundary. Frontend hiding of buttons is a UX improvement — the backend **must always enforce** the same permissions independently.

---

### Rule 7 — Full checklist when adding a new module

Complete ALL of these steps:

- [ ] Register module in `apps/sample-server/src/main.ts` via registry.register(...)
- [ ] Add backend routes with auth.requirePermission(...) guards
- [ ] Re-seed the database to assign permissions to admin roles
- [ ] Add NAV_ITEMS entry in App.tsx with permission: 'Read_ModuleName'
- [ ] Add entry to PAGE_PERMISSIONS map in App.tsx
- [ ] Add the new page key to the Page union type in App.tsx
- [ ] Add case 'my-module': return <MyModuleView />; to PageContent in App.tsx
- [ ] In the feature component: import useDynamicAccess, check can(permission) before every write button
- [ ] Test: disable a permission in RBAC Admin → verify menu item disappears AND button disappears AND backend returns 403 if called directly

---

### Rule 8 — RBAC Admin page is always superadmin-only

The RBAC Admin page (/rbac) is in SUPERADMIN_ONLY_KEYS and intentionally does NOT have a permission field in NAV_ITEMS. It is restricted by role, not by a database permission, because it is the interface that manages permissions themselves.

Do not add a permission field to the rbac NAV_ITEM entry.

---

## Key files for RBAC

| File | Purpose |
|---|---|
| apps/sample-server/src/main.ts | Module registry, backend route guards |
| apps/sample-server/src/db/seed.ts | Seeds permissions for admin roles |
| apps/sample-web/src/App.tsx | NAV_ITEMS, PAGE_PERMISSIONS, PageContent switch |
| packages/ui-web/src/dynamic-access.tsx | DynamicAccessProvider, useDynamicAccess, can() |
| packages/ui-web/src/guards.tsx | matchesPermission, PermissionRoute, Can |
| apps/sample-web/src/session.ts | loadDynamicAccess() — loads /me + /modules |
