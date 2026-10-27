# @mawsoftwares/ui-web

## 0.5.0

### Minor Changes

- 9e91213: URL sync now handles inner pages. `matchPagePath` / `pageFromPathname` resolve by longest menu-path prefix (`/users/42` -> `users` + `['42']`), and `useUrlSyncedPage` leaves an inner path alone while the page is unchanged and re-resolves a deep link once the menu tree loads. New helpers: `usePageSubPath(page, base, entries)` (read/write the inner path), `useSearchParams()` (read/update the query string) and `applySearchParams`. Behaviour change: changing page now drops the previous page's query string (it is kept only when replacing the root URL).

## 0.4.0

### Minor Changes

- d658aeb: Add `useUrlSyncedPage` (plus `pageFromPathname`, `pathnameForPage`, `stripBase`) to keep the browser address bar in step with the active page: pushes the page's URL on change, restores the page from the URL on load, and follows back/forward. Honours a deploy base path. Additive; existing exports are unchanged.

## 0.3.1

### Patch Changes

- Updated dependencies [98b0b03]
- Updated dependencies [e1374be]
  - @mawsoftwares/api-client@0.2.2
  - @mawsoftwares/sdk@0.3.0
  - @mawsoftwares/rbac-core@0.2.3

## 0.3.0

### Minor Changes

- bb4dc84: Design → Theme pipeline. `@mawsoftwares/theme` gains `designToTheme()` (adapter → normalized design → analysis → theme),
  `validateTheme()` (accessibility, mismatches, confidence), `extendTheme()`/`createThemeRegistry()` for base + client overrides,
  responsive and provenance tokens, component state tokens, and `theme.json`/`theme.css`/`theme.ts` export. `parseDesignMarkdown`
  accepts `{ adapt: false }` (default unchanged). `@mawsoftwares/ui-web` themes Button (secondary/outline/link variants, per-variant
  sizing), Input, Card (variants), Badge, Tabs, Modal, Table, Form controls; adds `ClientThemeProvider`, `BrandProvider`'s `themes`
  prop, and `ThemeProbes`. Existing themes render as before unless they define the new tokens.

### Patch Changes

- Updated dependencies [bb4dc84]
- Updated dependencies [bb4dc84]
  - @mawsoftwares/theme@0.3.0
  - @mawsoftwares/sdk@0.2.1
  - @mawsoftwares/api-client@0.2.1
  - @mawsoftwares/rbac-core@0.2.2

## 0.2.1

### Patch Changes

- Theme: shared theme client (`createSharedThemeClient`) and full design.md spec support. ui-web: Icon component and token-driven component styling updates. rbac-core: role-hierarchy updates.
- Updated dependencies
  - @mawsoftwares/theme@0.2.1
  - @mawsoftwares/rbac-core@0.2.1

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
  - @mawsoftwares/theme@0.2.0
  - @mawsoftwares/api-client@0.2.0
  - @mawsoftwares/rbac-core@0.2.0
  - @mawsoftwares/sdk@0.2.0

## 0.1.1

### Patch Changes

- 636448d: Prepare packages for GitHub Packages so other product repos can install `@mawsoftwares/*` instead of linking this monorepo locally.
- Updated dependencies [636448d]
  - @mawsoftwares/sdk@0.1.1
  - @mawsoftwares/rbac-core@0.1.1
  - @mawsoftwares/api-client@0.1.1
  - @mawsoftwares/theme@0.1.1
