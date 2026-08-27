# MAW Foundation — Constitution

The foundation is a **platform, not a product**. It exists so common concerns —
authentication, RBAC, theming, API access, backend plumbing — are written **once** in
`@mawsoftwares/*` and reused by every product (Restaurant OS, Sushmapet, and future apps), across
**React Native** mobile, **React/Next** web, and **Node** backends.

This file is intentionally short. It points at the source of truth (the code and the
dependency law), it does not duplicate it.

## Principles

1. **Contracts over implementations.** Logic depends on a port (an interface in
   `@mawsoftwares/sdk/contracts`), never on a concrete engine, framework, or database. This is
   why the same auth/RBAC core runs under both Express and Hono, and on web and native.
2. **Platform is framework-agnostic.** No package below `apps/` may import Express,
   Hono, Next, Expo, React DOM, or React Native — except the two UI kits (`ui-web`,
   `ui-native`), which are the sanctioned platform-specific tiers.
3. **One resolver for authorization.** `resolveEffectiveAccess()` in `@mawsoftwares/rbac-core` is
   the single `can()` used by both client nav-gates and server enforcement. Never
   duplicate the decision.
4. **Money is integer minor units** via `@mawsoftwares/sdk/kernel/money`. Never float/decimal.
5. **No `any`.** No hardcoded secrets — URLs/keys come from env; strings from i18n;
   colors/spacing from `@mawsoftwares/theme`.
6. **Multi-tenant by default.** Every access decision is scoped by `tenantId`.
7. **Reuse before create; configure, don't fork.** Products consume `@mawsoftwares/*` as
   versioned packages; they do not copy-paste it (that is the drift the foundation exists
   to end).
8. **Done = `npm run verify` green** — typecheck + the dependency-law lint + tests.

## Authority

Where this foundation and a product disagree on a shared concern, the **foundation wins**
for that concern (so products stay convergent). A product may extend via its own
domain/app tiers; it may not fork the platform tiers without a plan to reconcile.

See [`dependency-law.md`](dependency-law.md) for the enforced layering and
[`platform-reuse.md`](platform-reuse.md) for how to adopt the base in a new product.
