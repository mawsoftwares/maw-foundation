---
'@mawsoftwares/server-express': minor
'@mawsoftwares/ui-web': minor
'@mawsoftwares/ui-web-tailwind': minor
---

Plug-and-play module host. A product module can now run standalone and also be mounted into a host app, and modules can be switched on or off by configuration (`DISABLED_MODULES`).

- `server-express`: `MawModule` contract, `installModules` / `registerModules` / `mountModuleRoutes`, `selectionFromDisabled` / `resolveModuleSelection`, `collectRoleGrants`, `requireModuleEnabled`, `listenWithGracefulShutdown`, `EnvironmentError`, `readDisabledModules`.
- `ui-web`: `FrontendModule` / `FrontendModuleState` contract and registry helpers (`disabledModuleKeys`, `hiddenNavKeys`, `moduleOfPage`, `modulePermissions`, `assertConsistent`, `assertStateConsistent`); new built-in icons (`chevron-down`, `map-pin`, `share-2`, `file-text`, `briefcase`, `calendar`, `activity`, `alert-circle`, `check-circle`, `circle`, `dollar-sign`, `plus`, `search`, `building`, `arrow-left-right`, `alert-triangle`).
- `ui-web-tailwind`: the Tailwind `Icon` knows the same new icons; `@mawsoftwares/ui-web-tailwind/vite` with `mawHostSingletons`, `mawHostFsAllow` and `HOST_DEDUPE` for integrated hosts.

All additions; existing exports and behaviour are unchanged.
