# @mawsoftwares/rbac-core

## 0.2.1

### Patch Changes

- Theme: shared theme client (`createSharedThemeClient`) and full design.md spec support. ui-web: Icon component and token-driven component styling updates. rbac-core: role-hierarchy updates.

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

### Patch Changes

- Updated dependencies [74103ab]
  - @mawsoftwares/sdk@0.2.0

## 0.1.1

### Patch Changes

- 636448d: Prepare packages for GitHub Packages so other product repos can install `@mawsoftwares/*` instead of linking this monorepo locally.
- Updated dependencies [636448d]
  - @mawsoftwares/sdk@0.1.1
