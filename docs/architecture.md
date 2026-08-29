# MAW Foundation — Architecture

## Two-Mode Module Architecture

MAW Foundation distinguishes two kinds of modules. **See [`docs/module-architecture.md`](./module-architecture.md) for the full specification.**

| Kind | Location | Who owns it | Editable? |
|---|---|---|---|
| **Foundation Package** | `packages/` (`@mawsoftwares/*`) | Foundation | No — use the public API |
| **Source Module** | Copied from `templates/` into the project | Project developer | Yes — fully owned |

```
                MAW FOUNDATION
                      │
      ┌───────────────┴────────────────┐
      │                                │
FOUNDATION PACKAGES              PROJECT MODULES
      │                                │
 @mawsoftwares/auth-core           users
 @mawsoftwares/rbac-core           customers
 @mawsoftwares/database            orders
 @mawsoftwares/communication       invoices
 @mawsoftwares/queue               inventory
 @mawsoftwares/audit               production
      │                                │
      └───────────────┬────────────────┘
                      │
                APPLICATION
```

## Layered Architecture

Foundation packages follow a strict layer hierarchy where dependencies flow downward only.

```
┌──────────────────────────────────────────────────┐
│                    APPS                           │
│  sample-server │ sample-web │ (project apps)      │
├──────────────────────────────────────────────────┤
│              PROJECT SOURCE MODULES               │
│   modules/users │ modules/orders │ modules/...    │
│   (copied from templates/, project-owned code)    │
├──────────────────────────────────────────────────┤
│              SERVER ADAPTERS                      │
│  @mawsoftwares/server-express │ server-hono       │
├──────────────────────────────────────────────────┤
│              DOMAIN PACKAGES                      │
│  @mawsoftwares/auth-core │ rbac-core │ tenancy    │
│  communication │ queue │ audit │ feature-flags     │
├──────────────────────────────────────────────────┤
│              PLATFORM PACKAGES                    │
│  @mawsoftwares/platform │ database │ observability │
├──────────────────────────────────────────────────┤
│             SDK / KERNEL                          │
│  @mawsoftwares/sdk │ core │ config                │
└──────────────────────────────────────────────────┘
```

## Key Principles

1. **Contracts over implementations** — Logic depends on ports (interfaces), never on concrete engines, frameworks, or databases.
2. **Framework-agnostic core** — No package below `apps/` may import Express, Hono, Next, Expo, React DOM, or React Native (except `ui-web` and `ui-native`).
3. **Single authorization resolver** — `resolveEffectiveAccess()` in `@mawsoftwares/rbac-core` is the single `can()` used everywhere.
4. **Multi-tenant by default** — Every access decision is scoped by `tenantId`.
5. **No `any`** — No hardcoded secrets, URLs/keys from env, strings from i18n, colors from theme.
6. **Foundation provides capabilities; project source modules implement domain behaviour.**

## Module Classification Rule

### Make it a Foundation package when:
- Generic, reusable identically across multiple projects
- Stable API — the interface rarely changes
- No project-specific database fields or business rules
- Represents infrastructure (auth, queues, files, notifications, audit)

### Keep it as a source module (copy from template) when:
- Database fields or relationships can change per project
- Business rules, validation, workflow differ between projects
- API contract or UI requirements differ between projects
- Represents domain/business logic

→ Full classification guide: [`docs/module-architecture.md`](./module-architecture.md)

## Dependency Graph

```
@mawsoftwares/sdk (imports nothing of ours)
    ↑
@mawsoftwares/core (re-exports sdk primitives)
    ↑
@mawsoftwares/config (env, config engine, health)
    ↑
@mawsoftwares/platform (session, storage, crypto)
    ↑
@mawsoftwares/rbac-core / @mawsoftwares/auth-core (framework-agnostic)
    ↑
@mawsoftwares/server-express / @mawsoftwares/server-hono (framework-specific)
    ↑
adapters/express / adapters/hono / adapters/postgres
    ↑
apps/* (composition roots — wire everything together)
    ↑ (imports from)
modules/* (project source modules — domain logic, owned by project)
```

## Package Boundaries

Every package:
- Exposes its public API through `src/index.ts`
- Uses `exports` field in `package.json` to control access
- Never lets consumers import internal implementation files

## Adapter Pattern

Framework-specific code lives in `adapters/`:
- `adapters/express` — Express middleware for auth, RBAC, error handling
- `adapters/hono` — Hono middleware equivalent
- `adapters/postgres` — PostgreSQL connection pool, repository base, tenant isolation

## Source Module Templates

Domain source modules are scaffolded from `templates/`:
- `templates/users-module/` — Full user management (domain, application, infra, api, web)
- `templates/crud-module/` — Minimal generic CRUD scaffold for any domain entity

See [`templates/README.md`](../templates/README.md) for usage instructions.
