# Users Source Module Template

The canonical, project-owned users module. **Copy it into your project and own the code** — it is deliberately not a
package, because user fields (employee code, outlet, department, shift …) change per product.

Everything here typechecks as part of the root `pnpm typecheck`, and the unit tests run with `pnpm test`, so the
template stays in step with the Foundation packages.

## What you get

```
server/                                  → your backend's  modules/users/
├── domain/entities/User.ts              ← User interface — add your fields here
├── domain/events/UserEvents.ts
├── application/
│   ├── dto/index.ts                     ← Create / Update / List / Response DTOs + validation schemas
│   └── use-cases/                       ← Create, Get, List, Update, Delete, Activate, PasswordOperations
├── api/controllers/UsersController.ts   ← framework-agnostic controllers (mount them in your Express/Hono app)
├── infrastructure/
│   ├── repositories/UserRepository.ts   ← IUsersRepository + Postgres implementation
│   └── database/migrations/             ← users table migration
├── errors/                              ← typed domain error helpers
├── __tests__/unit/                      ← use-case unit tests
├── module.ts                            ← ModuleDefinition (RBAC permissions, feature sync)
└── index.ts

web/src/                                 → your frontend's  src/   (mirrors apps/sample-web/src)
├── features/users/
│   ├── usersApi.ts                      ← RTK Query slice (createApi) — list/get/create/update/delete/activate/deactivate/roles
│   ├── index.tsx                        ← UsersView: mounts UsersManager; avatar upload stays on ApiClient
│   └── ui/
│       ├── UsersManager.tsx             ← orchestration over the generated RTK Query hooks (no useCrud / initiate())
│       ├── UsersList.tsx
│       ├── UserForm.tsx                 ← schema-driven create/edit form
│       ├── UserDetails.tsx
│       ├── types.ts                     ← web-side DTOs (no server imports)
│       └── index.ts
├── store/
│   ├── apiBaseQuery.ts                  ← RTK Query baseQuery over the app's ApiClient
│   └── index.ts                         ← reference configureStore — register usersApi reducer + middleware
├── api.ts, config-context.tsx           ← typecheck-only stand-ins for the host app's files; do NOT copy
```

`apps/sample-server` (`src/modules/users`), `apps/sample-web` and `apps/sample-desktop` (`features/users`) each hold a
working copy — read them for how the pieces are wired (RTK Query hooks, store registration, route mounting, etc.).

## After copying

| What | Why |
|---|---|
| `server/domain/entities/User.ts` | Add fields like `employeeCode`, `departmentId`, `shift` |
| `server/infrastructure/database/migrations/` | Add columns to match your `User` interface |
| `server/infrastructure/repositories/UserRepository.ts` | Map + insert the new columns |
| `server/application/dto/index.ts` | Add/remove request/response fields and validators |
| `server/application/use-cases/CreateUser.ts` | Project-specific validation |
| `web/src/features/users/ui/types.ts` | Mirror the DTO changes (the web copy never imports server code) |
| `web/src/features/users/ui/{UserForm,UsersList,UserDetails}.tsx` | Add/remove fields and columns |
| `server/module.ts` | Permissions, audience, feature sync |

## Foundation packages consumed

These are published packages — keep importing them, don't copy them:

- `@mawsoftwares/auth-core` — password hashing
- `@mawsoftwares/database` — `TenantScopedRepository`, `QueryBuilder`
- `@mawsoftwares/api` — controller types and helpers
- `@mawsoftwares/sdk` — `AccountStatus`, validators, contracts
- `@mawsoftwares/rbac-core` — `ModuleDefinition`
- `@mawsoftwares/ui-web` — UI components, `useCrud`, `DynamicForm`
