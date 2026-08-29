# Users Source Module Template

The canonical project-owned users module. Copy this into your project and own the code.

## What you get

A complete user management module following Clean Architecture:

```
server/
├── domain/
│   ├── entities/User.ts          ← User interface (add your fields here)
│   └── events/UserEvents.ts
├── application/
│   ├── dto/index.ts              ← All DTOs (CreateUser, UpdateUser, ListUsers)
│   └── use-cases/
│       ├── CreateUser.ts
│       ├── GetUser.ts
│       ├── ListUsers.ts
│       ├── UpdateUser.ts
│       └── DeleteUser.ts
├── infrastructure/
│   ├── repositories/UserRepository.ts   ← IUsersRepository + PgUserRepository
│   └── database/
│       └── migrations/001_create_users_table.ts
├── api/
│   ├── routes.ts                 ← Express router factory
│   └── controller.ts
├── module.ts                     ← ModuleDefinition (RBAC permissions)
└── index.ts

web/
├── pages/UsersView.tsx           ← List page with RBAC guards
├── components/
│   ├── UserForm.tsx              ← Create/edit drawer
│   └── UserDetails.tsx          ← Detail panel
└── index.ts
```

## After copying

You can freely modify:

| What | Why |
|---|---|
| `domain/entities/User.ts` | Add fields like `employeeCode`, `departmentId`, `shift` |
| `infrastructure/database/migrations/` | Add columns to match your `User` interface |
| `application/dto/index.ts` | Add/remove request/response fields |
| `application/use-cases/CreateUser.ts` | Add project-specific validation |
| `api/routes.ts` | Add/remove endpoints |
| `web/pages/UsersView.tsx` | Change the UI layout |
| `web/components/UserForm.tsx` | Add/remove form fields |
| `module.ts` | Change permissions, audience, featureSync |

## Foundation packages consumed

This module imports from Foundation (do not change these imports):

- `@mawsoftwares/auth-core` — `hashPassword`
- `@mawsoftwares/database` — `TenantScopedRepository`, `QueryBuilder`, `PgPool`
- `@mawsoftwares/sdk` — `AccountStatus`, contracts
- `@mawsoftwares/rbac-core` — `ModuleDefinition`
- `@mawsoftwares/ui-web` — UI components, `useDynamicAccess`
