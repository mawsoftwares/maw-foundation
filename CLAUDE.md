# Agent Operating Model — MAW Foundation

You are extending an **existing, working** foundation monorepo with enforced standards.
The **codebase is the source of truth**; preserve behavior.

## Before you change code

1. Inspect the complete repository structure.
2. Read `.engineering/constitution.md` and `.engineering/dependency-law.md`.
3. Search for existing equivalents of everything you plan to create.
4. Follow: **REUSE → COMPOSE → EXTEND → CREATE** (create only as last resort).

## Non-negotiables

- **Dependency law** (linter-enforced): `apps → ui-* + api-client + server-adapters → auth-core + rbac-core → platform → sdk`. See `.engineering/dependency-law.md`.
- **No `any`.** No hardcoding. No float/decimal for money.
- **Reuse before create; configure, don't hardcode.**
- **Preserve behavior** — don't refactor working code for purity.
- **Done = `npm run verify` green** (typecheck all workspaces + lint + tests).

## Map

- Dependency law: `.engineering/dependency-law.md`
- Constitution: `.engineering/constitution.md`
- Architecture: `MONOREPO.md`
- Error handling (every module): `.agents/AGENTS.md` + `.cursor/rules/error-handling.mdc`

---

## Mandatory Reuse & Engineering Rules

These rules are mandatory and take priority over convenience.

### 1. Follow the Existing Foundation

Before implementing anything:

1. Inspect the complete repository.
2. Read all applicable `.engineering` instructions.
3. Inspect existing packages, components, hooks, services, utilities.
4. Inspect existing API abstractions, validation, database abstractions.
5. Inspect existing authentication, RBAC, tenant handling, audit infrastructure.
6. Inspect existing UI/design system and testing utilities.
7. Inspect existing module patterns.

Do not start implementation based only on the task description.

### 2. Reuse Before Creating

The mandatory decision order is:

```
Existing Component → Existing Utility → Existing Hook → Existing Service
→ Existing Package → Existing Abstraction → Extend Existing → Create New ONLY if required
```

Before creating any new file, search the repository for an existing equivalent.

### 3. Never Duplicate Existing Functionality

Do NOT create a second implementation when an equivalent already exists.

If the repository already has `Button`, `Input`, `Modal`, `Table`, `DataGrid`, `Form`, `Select`, `DatePicker`, `Toast` — use them. Do not create `UserButton`, `UserInput`, `UserModal`, `UserTable` unless there is a genuine domain-specific reason.

If an existing utility already provides pagination, date formatting, currency formatting, validation, API requests, error handling, logging, ID generation — reuse it.

### 4. Existing UI Components Are Mandatory

Before creating any UI component, search `@mawsoftwares/ui-web` and `@mawsoftwares/ui-native`. Reuse: Button, Input, Select, Form, Table, DataTable, Modal, Drawer, Dialog, Card, Badge, Tabs, Dropdown, Pagination, Search, Filter, Avatar, Toast, Loading, EmptyState, ErrorState, ConfirmationDialog.

Use existing components exactly according to their established API. Do not introduce another UI library or create custom CSS/component implementations when the design system already supports the requirement.

### 5. Existing Business/Platform Services

Before creating a service, search for existing services: AuthService, PasswordService, PermissionService, TenantService, AuditService, NotificationService, FileService, StorageService, ConfigService, Logger, EventBus.

Reuse them. Do not create `UserPasswordService`, `UserAuditService`, etc. if the Foundation already provides those capabilities.

### 6. Existing API Infrastructure

Reuse existing: API client, HTTP client, controllers, route registration, middleware, request validation, response formatter, error handler, pagination, authentication middleware, authorization middleware.

Do not introduce a new HTTP client, response format, error format, pagination implementation, or authentication middleware unless the existing implementation genuinely cannot satisfy the requirement.

### 7. Existing Validation

Use the existing validation approach (Zod/Yup/Valibot/custom). Do not introduce another validation library. Reuse existing schemas/utilities.

### 8. Existing Database Layer

Use the existing database architecture. If the Foundation provides DatabaseService, Repository, BaseRepository, QueryBuilder, TransactionManager, TenantAwareRepository, Migration utilities — reuse them. Do not create a parallel database abstraction or access the database directly from controllers.

### 9. Existing Auth, RBAC, Tenant, Audit, Notification, Event Systems

- **Auth**: Do not implement another JWT/password hashing/token/session/OTP system.
- **RBAC**: Do not implement a new role/permission system. Modules should only define/register their required permissions.
- **Tenant**: Do not create another tenant-resolution mechanism. Use existing TenantContext/TenantResolver/tenant middleware.
- **Audit**: Do not create another audit-log implementation. Emit events with the existing Audit module.
- **Notification**: Use existing NotificationService/EmailService. Do not send emails directly from modules.
- **Events**: Use existing EventBus/DomainEvents/EventEmitter. Do not introduce another event infrastructure.

### 10. Existing Types and Utilities

Search for existing types before creating: UserId, EntityId, TenantId, Pagination, PaginatedResponse, ApiResponse, ApiError, Timestamp, Status, Result. Do not create duplicates with slightly different names.

### 11. Follow Existing Module Patterns

New modules must follow the same architecture as existing Foundation modules. Consistency with the existing Foundation is more important than theoretical cleanliness.

### 12. Before Adding Any New Dependency

Decision order: Existing dependency → Existing internal utility → Existing package → Existing platform capability → New dependency ONLY if absolutely necessary.

### 13. Preserve Existing Contracts

Do not unnecessarily change existing APIs, component APIs, database contracts, package exports, authentication flows, RBAC behavior, tenant behavior, response formats, or design system. If a change is necessary, identify all consumers and update them safely.

### 14. No "Better Rewrite"

Do NOT rewrite existing code simply because you prefer another approach. The task is to **extend the Foundation**, not replace it. Only refactor when required for the new module and existing behavior remains compatible.

### 15. Minimal New Code Principle

Prefer: `reuse > compose > extend > create`. Never: `create > reuse`.

### 16. Mandatory Repository Search Before Implementation

Before coding, search for at least: User, UserService, UserRepository, Role, Permission, Tenant, Auth, Password, Audit, Notification, Pagination, DataTable, Form, Input, Modal, Dialog, Button, API client, Validation, Repository, EventBus.

### 17. Implementation Report Must Include Reuse Decisions

At completion, report what existing infrastructure was reused (components, services, utilities, packages, API/DB/Auth/RBAC infrastructure) vs. what was newly created. For every new abstraction, explain why the existing implementation could not be reused.

---

## RBAC Mandatory Rules — Every New Module

> **Full detail in `.agents/AGENTS.md`**. The summary below is mandatory.

This project uses **data-driven RBAC**. All permission checks are driven exclusively by the permissions returned from `GET /me`. No hardcoded role bypasses are permitted.

### Adding a new module — required steps

1. **Backend**: Register in `registry.register(...)` in `apps/sample-server/src/main.ts` with `actions` array using `Read`, `Create`, `Update`, `Delete`, `Export` etc.  
2. **Backend**: Add `auth.requirePermission('Action_Module')` to every route handler.  
3. **Seed**: Re-run seed — the existing loop in `apps/sample-server/src/db/seed.ts` assigns all permissions to admin roles automatically.  
4. **Frontend nav**: Add `permission: 'Read_MyModule'` to the `NAV_ITEMS` entry in `apps/sample-web/src/App.tsx`. This is what hides the sidebar item for unauthorized users.  
5. **Frontend nav**: Add `'my-module': 'Read_MyModule'` to `PAGE_PERMISSIONS` in `App.tsx` so direct URL navigation is also blocked.  
6. **Frontend buttons**: In the feature component, `import { useDynamicAccess } from '@mawsoftwares/ui-web'` and check `can('Create_MyModule')` / `can('Delete_MyModule')` before rendering action buttons. Pass `onCreate={undefined}` to `ListPage` when the user lacks the create permission — the button disappears automatically.

### Forbidden patterns

```ts
// FORBIDDEN — hardcoded role bypass
if (role === 'super_admin') { /* show button */ }

// FORBIDDEN — isAdmin short-circuit in can()
can: (p) => isAdmin || matchesPermission(permissions, p)

// FORBIDDEN — nav item without a permission field when the module has a Read permission
{ key: 'my-module', label: 'My Module', path: '/my-module' }  // missing permission:
```

### Permission naming convention

```
Action_ModuleName     →   Read_Orders | Create_Billing | Export_AuditLogs | Master_Manage_Values
```

The `DynamicAccessProvider` in `packages/ui-web/src/dynamic-access.tsx` has `defaultIsAdmin = () => false` by design — `can()` is purely data-driven for all roles including `super_admin`. Do not change this.

---

## Error handling — every module

> **Full detail in `.agents/AGENTS.md`**. The summary below is mandatory.

Do not throw `new Error('MODULE_CODE')` or return a local `{ success: false, message }` envelope.

1. **Use cases** throw `AppError` / `NotFoundError` / `ValidationError` from `@mawsoftwares/sdk/kernel/errors` with a human `message` and the correct `ErrorCode` (and `details.field` when the UI should highlight a form field). Domain helpers live in `packages/<module>/src/errors/` (see users + masters).
2. **Routes** use `createApiRouter`. Controllers return `ok()` / `created()` / `paginated()` and **do not catch** — `withErrorTranslation` maps `AppError` to `{ success: false, error: { code, message, details? } }`.
3. **Client** uses `getApiErrorMessage` / `getApiErrorFields` from `@mawsoftwares/api-client`. Do not stringify `error` objects. Unknown errors stay `500` / `INTERNAL` / `Internal server error`.
