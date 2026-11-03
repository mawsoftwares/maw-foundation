# @mawsoftwares/server-express

## 1.2.0

### Minor Changes

- fecab1b: **Security:** the public auth endpoints no longer let the caller choose authority.

  - `POST /register` refuses a `role` in the body (`400 FORBIDDEN_FIELD`). It used to be passed straight to `RegistrationService`, so an unauthenticated caller could register as `super_admin`. Roles come from the registration config default or are assigned by an administrator.
  - New optional `tenantResolver` on `createAuthRoutes`. When set, `/register` and `/forgot-password` take the tenant from the server (`ITenantResolver`, e.g. `StaticTenantResolver`); `tenantId` in the body may be omitted and, if present, must equal the resolved tenant (`400 FORBIDDEN_FIELD`); an unresolved or inactive tenant gives 403. **Pass it.** Without it the legacy behaviour remains (the caller names its own tenant) and a warning is logged once; that is only acceptable for a single-tenant demo.
  - `registrationService` and `passwordResetService` are typed as the narrow `Pick<…>` the routes use, so they are easy to fake in tests (still satisfied by the real services).

  Products that mounted `createAuthRoutes` should upgrade and pass `tenantResolver`; those that cannot upgrade yet should put the equivalent guard in front of `/auth/register` and `/auth/forgot-password`.

### Patch Changes

- Updated dependencies [4832e80]
  - @mawsoftwares/tenancy@1.1.0
  - @mawsoftwares/auth-core@1.0.1

## 1.1.0

### Minor Changes

- 20592e0: Plug-and-play module host. A product module can now run standalone and also be mounted into a host app, and modules can be switched on or off by configuration (`DISABLED_MODULES`).

  - `server-express`: `MawModule` contract, `installModules` / `registerModules` / `mountModuleRoutes`, `selectionFromDisabled` / `resolveModuleSelection`, `collectRoleGrants`, `requireModuleEnabled`, `listenWithGracefulShutdown`, `EnvironmentError`, `readDisabledModules`.
  - `ui-web`: `FrontendModule` / `FrontendModuleState` contract and registry helpers (`disabledModuleKeys`, `hiddenNavKeys`, `moduleOfPage`, `modulePermissions`, `assertConsistent`, `assertStateConsistent`); new built-in icons (`chevron-down`, `map-pin`, `share-2`, `file-text`, `briefcase`, `calendar`, `activity`, `alert-circle`, `check-circle`, `circle`, `dollar-sign`, `plus`, `search`, `building`, `arrow-left-right`, `alert-triangle`).
  - `ui-web-tailwind`: the Tailwind `Icon` knows the same new icons; `@mawsoftwares/ui-web-tailwind/vite` with `mawHostSingletons`, `mawHostFsAllow` and `HOST_DEDUPE` for integrated hosts.

  All additions; existing exports and behaviour are unchanged.

## 1.0.0

### Major Changes

- layout engine

### Patch Changes

- Updated dependencies
  - @mawsoftwares/api@1.0.0
  - @mawsoftwares/auth-core@1.0.0
  - @mawsoftwares/rbac-core@1.0.0
  - @mawsoftwares/sdk@1.0.0
  - @mawsoftwares/tenancy@1.0.0

## 0.2.0

### Minor Changes

- e1374be: Rate limiting hardening.

  - sdk: `SecurityConfig.rateLimit` gains a required `auth` tier (default 20 requests per 60s) for credential endpoints under `/auth/` other than login. Apps that build a `SecurityConfig` by hand instead of spreading `DEFAULT_SECURITY_CONFIG` must add it.
  - server-express / server-hono: the security pipeline applies the new `/auth/` tier.
  - server-express: the default rate-limit key is now `req.ip`, no longer the raw `X-Forwarded-For` header, which the client controls. Behind a reverse proxy set Express `trust proxy` (for example `app.set('trust proxy', 1)` behind nginx), otherwise all users share one bucket.
  - server-hono: the client IP is taken from the right of `X-Forwarded-For` by `trustedProxyHops` (default 1) instead of the spoofable first entry.
  - server-express / server-hono: a 429 now returns the standard `ApiResponse` error envelope with code `RATE_LIMITED` and `details.retryAfterMs`, replacing `{ error, retryAfterMs }`. Clients that parse the old body must switch to the envelope.

### Patch Changes

- Updated dependencies [e1374be]
  - @mawsoftwares/sdk@0.3.0
  - @mawsoftwares/api@0.1.4
  - @mawsoftwares/auth-core@0.1.5
  - @mawsoftwares/rbac-core@0.2.3
  - @mawsoftwares/tenancy@0.2.1

## 0.1.5

### Patch Changes

- @mawsoftwares/auth-core@0.1.4

## 0.1.4

### Patch Changes

- Updated dependencies [bb4dc84]
  - @mawsoftwares/tenancy@0.2.0
  - @mawsoftwares/sdk@0.2.1
  - @mawsoftwares/api@0.1.3
  - @mawsoftwares/auth-core@0.1.3
  - @mawsoftwares/rbac-core@0.2.2

## 0.1.3

### Patch Changes

- Updated dependencies
  - @mawsoftwares/rbac-core@0.2.1

## 0.1.2

### Patch Changes

- Updated dependencies [74103ab]
  - @mawsoftwares/rbac-core@0.2.0
  - @mawsoftwares/sdk@0.2.0
  - @mawsoftwares/auth-core@0.1.2
  - @mawsoftwares/tenancy@0.1.2
  - @mawsoftwares/api@0.1.2

## 0.1.1

### Patch Changes

- 636448d: Prepare packages for GitHub Packages so other product repos can install `@mawsoftwares/*` instead of linking this monorepo locally.
- Updated dependencies [636448d]
  - @mawsoftwares/sdk@0.1.1
  - @mawsoftwares/auth-core@0.1.1
  - @mawsoftwares/rbac-core@0.1.1
  - @mawsoftwares/tenancy@0.1.1
  - @mawsoftwares/api@0.1.1
