# @mawsoftwares/sdk

## 1.0.0

### Major Changes

- aa2b249: test

### Minor Changes

- e1374be: Rate limiting hardening.

  - sdk: `SecurityConfig.rateLimit` gains a required `auth` tier (default 20 requests per 60s) for credential endpoints under `/auth/` other than login. Apps that build a `SecurityConfig` by hand instead of spreading `DEFAULT_SECURITY_CONFIG` must add it.
  - server-express / server-hono: the security pipeline applies the new `/auth/` tier.
  - server-express: the default rate-limit key is now `req.ip`, no longer the raw `X-Forwarded-For` header, which the client controls. Behind a reverse proxy set Express `trust proxy` (for example `app.set('trust proxy', 1)` behind nginx), otherwise all users share one bucket.
  - server-hono: the client IP is taken from the right of `X-Forwarded-For` by `trustedProxyHops` (default 1) instead of the spoofable first entry.
  - server-express / server-hono: a 429 now returns the standard `ApiResponse` error envelope with code `RATE_LIMITED` and `details.retryAfterMs`, replacing `{ error, retryAfterMs }`. Clients that parse the old body must switch to the envelope.

## 0.2.1

### Patch Changes

- bb4dc84: `PgTenantRepository` moved from `@mawsoftwares/tenancy` to `@mawsoftwares/postgres` (tenancy no longer depends on the database
  layer, as the dependency law requires): `import { PgTenantRepository } from '@mawsoftwares/postgres'`.
  feature-flags: dependency checks no longer treat a shared dependency (A needs B and C, both need D) as circular; evaluators import
  their enums from the right module; added `InMemoryFeatureFlagRepository`; README updated to the current API.
  sdk: `isRolledOut(id, percentage, salt?)` accepts an optional salt (the flag key) so flags roll out to different users; two-argument calls are unchanged.

## 0.2.0

### Minor Changes

- 74103ab: Menu management, MUI-like theme/shell tokens, RBAC `|` permission codes, and related client/UI work.

  - **ui-web**: ready-made field components, Icon, shell-aware navigation/theme, skeleton helpers
  - **theme**: design.md engine, shell tokens, denser MUI-like radius/shadow/typography defaults
  - **api-client**: axios transport, retry/refresh hardening, optional `@mawsoftwares/api-client/react`
  - **database**: menu + messaging/gateway/service-catalogue schemas; `master_permissions.is_system`
  - **rbac-core**: `Action|Module` permission codes with legacy `Action_Module` support
  - **sdk**: stronger phone validation; dynamic-form type tweaks
  - **communication**: HTTP SMS and WhatsApp providers

## 0.1.1

### Patch Changes

- 636448d: Prepare packages for GitHub Packages so other product repos can install `@mawsoftwares/*` instead of linking this monorepo locally.
