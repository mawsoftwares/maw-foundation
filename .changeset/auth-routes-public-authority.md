---
'@mawsoftwares/server-express': minor
---

**Security:** the public auth endpoints no longer let the caller choose authority.

- `POST /register` refuses a `role` in the body (`400 FORBIDDEN_FIELD`). It used to be passed straight to `RegistrationService`, so an unauthenticated caller could register as `super_admin`. Roles come from the registration config default or are assigned by an administrator.
- New optional `tenantResolver` on `createAuthRoutes`. When set, `/register` and `/forgot-password` take the tenant from the server (`ITenantResolver`, e.g. `StaticTenantResolver`); `tenantId` in the body may be omitted and, if present, must equal the resolved tenant (`400 FORBIDDEN_FIELD`); an unresolved or inactive tenant gives 403. **Pass it.** Without it the legacy behaviour remains (the caller names its own tenant) and a warning is logged once; that is only acceptable for a single-tenant demo.
- `registrationService` and `passwordResetService` are typed as the narrow `Pick<…>` the routes use, so they are easy to fake in tests (still satisfied by the real services).

Products that mounted `createAuthRoutes` should upgrade and pass `tenantResolver`; those that cannot upgrade yet should put the equivalent guard in front of `/auth/register` and `/auth/forgot-password`.
