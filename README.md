# MAW Foundation

One reusable base for every MAW app — **React Native** mobile (iOS/Android),
**React/Next** web, and **Node** backends — so common features (auth, RBAC, theming,
API client, backend middleware) are written **once** in `@mawsoftwares/*` and shared, instead of
re-implemented per project.

## Why

Two existing products needed the same things built differently:

- **Restaurant OS** — mature Expo RN + Next.js + Hono monorepo with token auth and a
  configurable per-tenant RBAC matrix.
- **Sushmapet** — Express + Vite React, session/CSRF auth, DB-backed RBAC, with its
  design system copy-pasted between two apps.

This foundation extracts the product-neutral core so both — and every future app — build
on one shared base.

## Architecture

```
packages/
  core           @mawsoftwares/core — Result, errors, IDs, money, contracts (ports)
  config         @mawsoftwares/config — multi-level config engine, env, health, version
  sdk            @mawsoftwares/sdk — kernel + contracts (canonical source, re-exported by core)
  platform       @mawsoftwares/platform — session, crypto, storage engines
  rbac-core      @mawsoftwares/rbac — capability→permission vocab + resolveEffectiveAccess()
  auth-core      @mawsoftwares/auth — JWT, refresh, password, MFA (framework-agnostic)
  users          @mawsoftwares/users — user management foundation
  tenancy        @mawsoftwares/tenancy — multi-tenant context, resolution, isolation
  modules        @mawsoftwares/modules — module registry + lifecycle + events
  feature-flags  @mawsoftwares/feature-flags — tenant-aware feature flag service
  api-client     @mawsoftwares/api-client — typed HTTP client with token management

adapters/
  express        @mawsoftwares/express — Express auth/RBAC middleware
  hono           @mawsoftwares/hono — Hono security middleware
  postgres       @mawsoftwares/postgres — PostgreSQL repository + tenant + migration

apps/
  sample-server  Express proof backend (in-memory, no DB)
  sample-web     Vite React proof app
  sample-mobile  Expo RN proof app
```

## Dependency Direction

```
apps
  ↓
adapters
  ↓
packages
```

Core packages never import apps or adapters. See [dependency law](.engineering/dependency-law.md).

## Develop

```bash
# Install (uses pnpm workspaces)
pnpm install

# Run all checks
pnpm verify        # typecheck + lint + tests

# Individual commands
pnpm typecheck
pnpm lint
pnpm test
pnpm build

# Development servers
pnpm sample:server  # Express proof backend
pnpm sample:web     # Vite React proof app
```

## Versioning & Publishing

Packages are versioned independently using [Changesets](https://github.com/changesets/changesets).

```bash
pnpm changeset           # create a changeset
pnpm version-packages    # bump versions
pnpm release             # publish to registry
```

Packages are published to GitHub Packages under the `@maw` scope.
Authentication uses `NODE_AUTH_TOKEN` — see `.npmrc`.

## Package Creation Rules

1. Every package uses the `@mawsoftwares/` namespace
2. Public API goes through `src/index.ts` only
3. Consumers import `from "@mawsoftwares/auth"`, never `from "@mawsoftwares/auth/src/internal/..."`
4. No `any` unless documented
5. No hardcoded secrets, strings, or business rules
6. Framework-specific code goes in adapters

## Documentation

- [Architecture](docs/architecture.md)
- [Packages](docs/packages.md)
- [Development](docs/development.md)
- [Publishing](docs/publishing.md)
- [Constitution](.engineering/constitution.md)
- [Dependency Law](.engineering/dependency-law.md)

## License

MIT
