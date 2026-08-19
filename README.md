# MAW Foundation

One reusable base for every MAW app — **React Native** mobile (iOS/Android),
**React/Next** web, and **Node** backends — so common features (auth, RBAC, theming,
API client, backend middleware) are written **once** in `@maw/*` and shared, instead of
re-implemented per project.

## Why

Two existing products needed the same things built differently:

- **Restaurant OS** — mature Expo RN + Next.js + Hono monorepo with token auth and a
  configurable per-tenant RBAC matrix.
- **Sushmapet** — Express + Vite React, session/CSRF auth, DB-backed RBAC, with its
  design system copy-pasted between two apps.

This foundation extracts the product-neutral core (seeded mainly from Restaurant OS,
with Sushmapet's dual-audience gating, plant-scoping, feature-flags and web UI folded in)
so both — and every future app — build on one shared base.

## Layout

```
packages/
  sdk           kernel (money/result/id) + contracts (ports) + i18n
  platform      engines: session manager, config, crypto, storage clients
  rbac-core     capability→permission vocab + resolveEffectiveAccess() + ABAC scoping
  auth-core     JWT sign/verify + refresh rotation + password hash (framework-agnostic)
  server-express  requireAuth / requirePermission / audienceGuard middleware (Express)
  server-hono     the same middleware, Hono flavor
  api-client    typed client for web + native: token store, auto-refresh, optional CSRF
  theme         platform-agnostic design tokens (feeds both UI kits)
  ui-web        React web design system (Radix/shadcn/Tailwind) + RBAC guards/providers
  ui-native     React Native design system
apps/
  sample-server   Express backend proving auth + RBAC end-to-end (in-memory repo, no DB)
  sample-web      Vite React app: login + an RBAC-gated page (same core)
  sample-mobile   Expo RN app: login + an RBAC-gated screen (same core)
```

See [`.engineering/dependency-law.md`](.engineering/dependency-law.md) for the enforced
layering and [`.engineering/constitution.md`](.engineering/constitution.md) for the rules.

## Develop

```bash
npm install
npm run verify        # typecheck + dependency-law lint + tests
npm run sample:server # run the Express proof backend
npm run sample:web    # run the web proof app
```

The single proof of the whole thesis: `resolveEffectiveAccess()` is written once in
`@maw/rbac-core` and drives the Node backend, the web app, and the mobile app identically.
