# @mawsoftwares/ui-web-tailwind

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
  - @mawsoftwares/ui-contract@1.0.0

## 0.1.2

### Patch Changes

- 9cc3c3d: `Icon` now knows `map-pin` and `share-2` (lucide `MapPin` / `Share2`) plus the menu-key aliases `sites` and `sources`. Previously these rendered as raw text in the Tailwind kit, e.g. the Area Master and Source Master cards.

## 0.1.1

### Patch Changes

- a020328: Tailwind kit parity fixes. `Icon` now knows `building-2` (it rendered as raw text, e.g. the Clients sidebar item). `theme.css` adds a minimal `button` reset in the `base` layer, so DataTable sort headers and the other utility-styled buttons no longer show the browser's default border/background in apps that load Tailwind without preflight.

## 0.1.0

### Minor Changes

- 639d135: First public release of the Tailwind + shadcn-style UI kit (`tailwindKit`, components and `theme.css`). Install it with `setUIKit(tailwindKit)` from `@mawsoftwares/ui-contract`; requires a single shared `@mawsoftwares/ui-contract` copy with `@mawsoftwares/ui-web`.
