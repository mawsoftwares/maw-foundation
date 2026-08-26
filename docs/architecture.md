# MAW Foundation — Architecture

## Layered Architecture

The foundation follows a strict layered architecture where dependencies flow downward only.

```
┌──────────────────────────────────────────────────┐
│                    APPS                           │
│   sample-server │ sample-web │ sample-mobile      │
├──────────────────────────────────────────────────┤
│                   ADAPTERS                        │
│   @maw/express │ @maw/hono │ @maw/postgres       │
├──────────────────────────────────────────────────┤
│              PLATFORM PACKAGES                    │
│   @maw/auth │ @maw/rbac │ @maw/users             │
│   @maw/tenancy │ @maw/modules │ @maw/feature-flags│
├──────────────────────────────────────────────────┤
│               FOUNDATION                          │
│         @maw/core │ @maw/config                   │
├──────────────────────────────────────────────────┤
│                KERNEL                             │
│               @maw/sdk                            │
└──────────────────────────────────────────────────┘
```

## Key Principles

1. **Contracts over implementations** — Logic depends on ports (interfaces), never on concrete engines, frameworks, or databases.
2. **Framework-agnostic core** — No package below `apps/` may import Express, Hono, Next, Expo, React DOM, or React Native (except `ui-web` and `ui-native`).
3. **Single authorization resolver** — `resolveEffectiveAccess()` in `@maw/rbac` is the single `can()` used everywhere.
4. **Multi-tenant by default** — Every access decision is scoped by `tenantId`.
5. **No `any`** — No hardcoded secrets, URLs/keys from env, strings from i18n, colors from theme.

## Dependency Graph

```
@maw/sdk (imports nothing of ours)
    ↑
@maw/core (re-exports sdk primitives)
    ↑
@maw/config (env, config engine, health)
    ↑
@maw/platform (session, storage, crypto)
    ↑
@maw/rbac / @maw/auth (framework-agnostic)
    ↑
@maw/server-express / @maw/server-hono (framework-specific)
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
- `@maw/express` — Express middleware for auth, RBAC, error handling
- `@maw/hono` — Hono middleware equivalent
- `@maw/postgres` — PostgreSQL connection pool, repository base, tenant isolation
