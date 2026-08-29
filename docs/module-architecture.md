# MAW Foundation — Module Architecture

## The Core Principle

> **Foundation packages provide capabilities. Project source modules implement business/domain behaviour.**

MAW Foundation distinguishes between two kinds of modules:

| Kind | Location | Who owns it | Editable? |
|---|---|---|---|
| **Foundation Package** | `packages/` (published as `@mawsoftwares/*`) | Foundation team | No — consume the public API only |
| **Source Module** | Copied from `templates/` into your project | Project developer | Yes — fully owned by the project |

---

## Visual Architecture

```
                    MAW FOUNDATION
                          │
          ┌───────────────┴────────────────┐
          │                                │
   FOUNDATION PACKAGES              PROJECT MODULES
          │                                │
     @mawsoftwares/auth-core           users
     @mawsoftwares/rbac-core           customers
     @mawsoftwares/config              products
     @mawsoftwares/database            orders
     @mawsoftwares/communication       invoices
     @mawsoftwares/files               inventory
     @mawsoftwares/audit               production
     @mawsoftwares/logger              leads
     @mawsoftwares/queue               appointments
     @mawsoftwares/observability       etc.
          │                                │
          └───────────────┬────────────────┘
                          │
                   APPLICATION
```

---

## 1. What Should Become a Foundation Package?

Make a module a Foundation npm package when **all** of the following are true:

- ✅ **Generic** — provides infrastructure/platform capability, not business logic
- ✅ **Stable API** — the interface rarely changes between projects
- ✅ **No project-specific fields** — no database columns or entity fields that differ per project
- ✅ **Multiple projects consume it identically** — no project needs to modify the internal implementation
- ✅ **Represents infrastructure** — auth, RBAC, queues, files, notifications, observability, audit

### Current Foundation Packages

| Package | Purpose |
|---|---|
| `@mawsoftwares/sdk` | Kernel contracts, Result type, IDs, i18n, security types |
| `@mawsoftwares/core` | Re-exports SDK primitives |
| `@mawsoftwares/config` | Multi-level config engine, env utilities, health checker |
| `@mawsoftwares/database` | PgPool, TenantScopedRepository, QueryBuilder, migrations |
| `@mawsoftwares/platform` | Session manager, file storage, crypto, rate limiting |
| `@mawsoftwares/observability` | Logger, metrics, tracing, ALS context |
| `@mawsoftwares/auth-core` | JWT, password hashing, MFA/OTP, registration, sessions, OAuth |
| `@mawsoftwares/rbac-core` | Module registry, permission resolver, RBAC sync, master cache |
| `@mawsoftwares/tenancy` | Tenant contracts, PgTenantRepository, resolvers |
| `@mawsoftwares/modules` | Module lifecycle, event bus |
| `@mawsoftwares/communication` | Email, SMS, in-app notifications |
| `@mawsoftwares/queue` | QueueService, JobRunner, PgQueueProvider |
| `@mawsoftwares/audit` | Audit trail middleware and store |
| `@mawsoftwares/import-export` | CSV/JSON import and export engine |
| `@mawsoftwares/reporting` | Report engine (filter, sort, group, aggregate, save) |
| `@mawsoftwares/feature-flags` | Tenant-aware feature flag service |
| `@mawsoftwares/server-express` | Express auth, RBAC, tenant, file, security middleware |
| `@mawsoftwares/server-hono` | Hono equivalent adapters |
| `@mawsoftwares/api` | API route contracts |
| `@mawsoftwares/api-client` | Typed HTTP client with refresh, cancellation, offline |
| `@mawsoftwares/theme` | Platform-agnostic design tokens |
| `@mawsoftwares/ui-web` | React web design system (40+ components) |
| `@mawsoftwares/ui-auth` | Auth UI (login, register, password reset) |
| `@mawsoftwares/masters` | Dynamic master data engine |
| `@mawsoftwares/testing` | Test utilities |

---

## 2. What Should Remain Source Code?

Keep a module as project-owned source code when **any** of the following is true:

- ⚠️ **Database fields differ** between projects
- ⚠️ **Database relationships differ** between projects
- ⚠️ **Business rules differ** between projects
- ⚠️ **Validation rules differ** between projects
- ⚠️ **Workflow differs** between projects
- ⚠️ **API contract differs** between projects
- ⚠️ **UI requirements differ** between projects
- ⚠️ **Permissions differ** in meaning between projects
- ⚠️ **Represents domain/business logic**, not platform capability

### Example — The User Module Problem

The `User` entity looks completely different across project types:

```
Restaurant SaaS               ERP / HR                  CRM
────────────────             ──────────────────        ──────────────────
firstName                    firstName                  firstName
lastName                     lastName                   lastName
email                        email                      email
waiterCode                   employeeCode               salesRegion
outletId                     departmentId               teamId
operationalRole              plantId                    targetAmount
cashierAccess: boolean        designation
kitchenAccess: boolean        shift
                             joiningDate
```

All three projects can share `@mawsoftwares/auth-core`, `@mawsoftwares/rbac-core`, `@mawsoftwares/audit`.
None of them should be forced to use the same `users` table schema.

Therefore: **`users` is a source module, not a Foundation package.**

### Examples of Source Modules

```
users          customers      products       orders
invoices       inventory      employees      suppliers
production     appointments   leads          contracts
assets         reservations   tasks          cases
```

---

## 3. How to Create a New Project Source Module

### Step 1 — Copy the appropriate template

```bash
# Full users management module
cp -r templates/users-module/server  apps/my-server/src/modules/users
cp -r templates/users-module/web     apps/my-web/src/modules/users

# Generic CRUD module (rename Entity → your noun)
cp -r templates/crud-module/server   apps/my-server/src/modules/orders
cp -r templates/crud-module/web      apps/my-web/src/modules/orders
```

### Step 2 — Customise the domain entity

Edit `server/domain/entities/User.ts` (or `Entity.ts`) and add your project-specific fields:

```ts
// ERP project
export interface User extends AuditableEntity, TenantScopedEntity, SoftDeletableEntity {
  firstName: string;
  lastName: string;
  email: string;
  employeeCode: string;      // ← project-specific
  departmentId: string;      // ← project-specific
  designation?: string;      // ← project-specific
  shift?: string;            // ← project-specific
  joiningDate?: string;      // ← project-specific
  // ...foundation fields
}
```

### Step 3 — Update the migration

Edit `server/infrastructure/database/migrations/001_create_users_table.ts` to add columns.

### Step 4 — Update the repository mapper

Edit `server/infrastructure/repositories/UserRepository.ts`, add new columns to the `mapper`, `create()`, and `updateUser()` methods.

### Step 5 — Update DTOs

Edit `server/application/dto/index.ts` to add fields to `CreateUserDto`, `UpdateUserDto`, and `UserResponseDto`.

### Step 6 — Register permissions in the server

```ts
// apps/my-server/src/modules/index.ts
import { usersModule } from './users/module';
registry.register(usersModule);
```

### Step 7 — Wire up the router

```ts
// apps/my-server/src/main.ts
import { createUsersRouter } from './modules/users/api/routes';
import { PgUserRepository } from './modules/users/infrastructure/repositories/UserRepository';

const usersRepo = new PgUserRepository(data.pool);
app.use('/api/v1/users', createUsersRouter({
  repository: usersRepo,
  requireAuth: auth.requireAuth,
  requirePermission: (p) => auth.requirePermission(p),
}));
```

### Step 8 — Seed permissions

```bash
pnpm sample:seed
```

### Step 9 — Add to the frontend nav and routing

Follow the RBAC rules in `AGENTS.md`:
- Add to `NAV_ITEMS` with `permission: 'Read_Users'`
- Add to `PAGE_PERMISSIONS`
- Add the route case in `PageContent`

### Step 10 — Update the web form

Edit `web/components/UserForm.tsx` to add project-specific input fields.

---

## 4. How Source Modules Consume Foundation Packages

A source module freely imports Foundation packages. The module owns its domain logic; Foundation provides the infrastructure.

```
modules/users
      │
      ├── @mawsoftwares/auth-core      hashPassword, AccountStatus
      ├── @mawsoftwares/rbac-core      ModuleDefinition (for permissions)
      ├── @mawsoftwares/database       TenantScopedRepository, QueryBuilder, PgPool
      ├── @mawsoftwares/audit          AuditService (injected via constructor)
      ├── @mawsoftwares/sdk            AccountStatusValue, contracts
      └── @mawsoftwares/ui-web         UI components, useDynamicAccess
```

The **dependency flows one way**: source modules → Foundation packages. Foundation packages **never** import from source modules.

---

## 5. Authentication vs User Management

These are two separate concerns that must not be tightly coupled:

### `@mawsoftwares/auth-core` (Foundation Package) provides:

- Login / logout
- JWT access tokens
- Refresh token lifecycle
- Password hashing (Scrypt)
- Session management
- MFA / OTP
- OAuth (Google, GitHub)
- Email verification
- Password reset

It only needs a `IUserRepository` port — a minimal interface with `findByEmail`, `updateLastLogin`, etc.

### `modules/users` (Source Module) provides:

- User entity with project-specific fields
- User CRUD (create, read, update, delete)
- User profile management
- User-specific business rules
- User-specific validation
- User-specific UI (list, form, details)
- User-specific permissions (Read_Users, Create_Users…)

**The auth package calls into the user repository port. The user module implements that port.** They are linked by a contract, not by direct import.

---

## 6. Module Registry

Both Foundation packages and project source modules use the same RBAC Module Registry. Use the `source` field to classify:

```ts
// Foundation package module
registry.register({
  key:     'notifications',
  name:    'Notifications',
  source:  'foundation',      // ← stable Foundation package
  routePrefix: '/api/v1/notifications',
  audience: 'shared',
  permissions: [ ... ],
});

// Project source module
registry.register({
  key:     'users',
  name:    'Users',
  source:  'project',         // ← project-owned source code
  routePrefix: '/api/v1/users',
  audience: 'admin',
  permissions: [ ... ],
});
```

The `source` field is **informational only** — the RBAC engine treats both identically.

---

## 7. When to Promote a Source Module to a Package

Only promote a source module to a Foundation npm package when **all** of these apply:

1. **Identical implementation across ≥ 3 projects** — no significant differences
2. **Stable interface** — the API hasn't changed between projects
3. **No project-specific fields** — the database schema is generic
4. **Others would genuinely benefit** — it saves real duplication, not imagined duplication

### The Promotion Path

```
Project A → modules/production    (custom implementation)
Project B → modules/production    (similar, but different fields)
Project C → modules/production    (converging to common shape)
                ↓
        Identify stable subset
                ↓
        @mawsoftwares/production  (only after proving it works)
```

**Do not prematurely package.** A rigid package with wrong abstractions creates more friction than duplicated source code.

---

## 8. Do Not Create `@mawsoftwares/users`

The historical `packages/users` in this repository is now marked `private: true` and is not published.

Do NOT create a large generic `@mawsoftwares/users` package attempting to serve all project types. The configuration surface required to support Restaurant, ERP, CRM, HR, Manufacturing schemas would be enormous and brittle.

Instead:
- Use `@mawsoftwares/auth-core` for authentication
- Use `@mawsoftwares/rbac-core` for permissions
- Copy `templates/users-module` into your project for user management

---

## 9. Avoiding Business Logic in Foundation Packages

Foundation packages must not contain project-specific business rules.

| ❌ Wrong | ✅ Correct |
|---|---|
| `@mawsoftwares/auth` validates that users must have a department | Project's `CreateUser` use case validates department |
| `@mawsoftwares/rbac` has hardcoded `waiter`, `cashier` roles | Project's `module.ts` registers project-specific roles |
| `@mawsoftwares/users` has a `waiterCode` field | Project's `modules/users/domain/entities/User.ts` has `waiterCode` |

The test: **"Would this logic make sense in a school management system AND a restaurant AND a hospital?"** If not, it's project logic, not Foundation logic.

---

## 10. Engineering Standards for Source Modules

Source modules must follow the same standards as Foundation packages:

- TypeScript strict mode — no `any` unless explicitly justified
- No hardcoded user-facing strings
- No business logic inside infrastructure layer (repositories, migrations)
- No circular dependencies
- Use Foundation packages for infrastructure (auth, audit, queue, notifications)
- Never call Foundation internals directly — use the published API only
- Maintain unit tests for use-cases
- Run `pnpm typecheck` and `pnpm lint` before committing

---

## 11. Directory Reference

```
maw-foundation/
│
├── packages/             ← Foundation npm packages (@mawsoftwares/*)
│   ├── auth-core/        ← Authentication primitives
│   ├── rbac-core/        ← RBAC engine + module registry
│   ├── database/         ← DB infrastructure
│   ├── communication/    ← Email / SMS / in-app notifications
│   ├── queue/            ← Background jobs
│   ├── audit/            ← Audit trail
│   ├── ui-web/           ← React web design system
│   └── ...               ← (all other Foundation packages)
│
├── templates/            ← Source module templates (copy-and-own)
│   ├── README.md         ← How to use templates
│   ├── users-module/     ← Full users management template
│   │   ├── server/       ← domain, application, infra, api
│   │   └── web/          ← pages, components, forms
│   └── crud-module/      ← Minimal generic CRUD template
│       ├── server/
│       └── web/
│
└── apps/
    ├── sample-server/    ← Composition root (wires everything together)
    │   └── src/
    │       └── modules/  ← Project source modules in an app
    │           ├── orders/
    │           ├── masters/
    │           └── ...
    └── sample-web/       ← React composition root
```
