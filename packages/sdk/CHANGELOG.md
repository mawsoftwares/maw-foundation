# @mawsoftwares/sdk

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
