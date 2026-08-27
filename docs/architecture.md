# MAW Foundation — Architecture

## Layered Architecture

The foundation follows a strict layered architecture where dependencies flow downward only.

```
┌──────────────────────────────────────────────────┐
│                    APPS                           │
│   sample-server │ sample-web │ sample-mobile      │
├──────────────────────────────────────────────────┤
│                   ADAPTERS                        │
│   @mawsoftwares/express │ @mawsoftwares/hono │ @mawsoftwares/postgres       │
├──────────────────────────────────────────────────┤
│              PLATFORM PACKAGES                    │
│   @mawsoftwares/auth │ @mawsoftwares/rbac │ @mawsoftwares/users             │
│   @mawsoftwares/tenancy │ @mawsoftwares/modules │ @mawsoftwares/feature-flags│
├──────────────────────────────────────────────────┤
│               FOUNDATION                          │
│         @mawsoftwares/core │ @mawsoftwares/config                   │
├──────────────────────────────────────────────────┤
│                KERNEL                             │
│               @mawsoftwares/sdk                            │
└──────────────────────────────────────────────────┘
```

## Key Principles

1. **Contracts over implementations** — Logic depends on ports (interfaces), never on concrete engines, frameworks, or databases.
2. **Framework-agnostic core** — No package below `apps/` may import Express, Hono, Next, Expo, React DOM, or React Native (except `ui-web` and `ui-native`).
3. **Single authorization resolver** — `resolveEffectiveAccess()` in `@mawsoftwares/rbac` is the single `can()` used everywhere.
4. **Multi-tenant by default** — Every access decision is scoped by `tenantId`.
5. **No `any`** — No hardcoded secrets, URLs/keys from env, strings from i18n, colors from theme.

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
@mawsoftwares/rbac / @mawsoftwares/auth (framework-agnostic)
    ↑
@mawsoftwares/server-express / @mawsoftwares/server-hono (framework-specific)
    ↑
adapters/express / adapters/hono / adapters/postgres
    ↑
apps/* (composition roots)
```

## Package Boundaries

Every package:
- Exposes its public API through `src/index.ts`
- Uses `exports` field in `package.json` to control access
- Never lets consumers import internal implementation files

## Adapter Pattern

Framework-specific code lives in `adapters/`:
- `@mawsoftwares/express` — Express middleware for auth, RBAC, error handling
- `@mawsoftwares/hono` — Hono middleware equivalent
- `@mawsoftwares/postgres` — PostgreSQL connection pool, repository base, tenant isolation
