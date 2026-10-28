# Config-Driven Layout & Theme Engine — Architecture and Migration Plan

Status: **plan (Phase 1 audit complete, no code changed)**

## 1. Audit findings (what already exists)

| Concern | Existing | Decision |
|---|---|---|
| Tailwind v4 + shadcn/Radix | `@mawsoftwares/ui-web-tailwind` (kit, `theme.css` mapping `@theme inline` onto `--maw-*`, demo app). Selected at build time via `VITE_UI_KIT=tailwind` (`apps/shared/ui-kit/tailwind.ts`). ADR: `ADR-ui-kit-contract.md`. | **REUSE.** Phase 1 integration is already done; no second Tailwind setup. |
| Tokens / theming | `@mawsoftwares/theme` (tokens, registry, design.md pipeline, CSS export, validation); `ThemeProvider`, `BrandProvider`, `ClientThemeProvider` in `ui-web`; `--maw-*` CSS variables. | **REUSE.** Theme Engine = existing system. Only add a thin "theme selection" config, not new tokens. |
| Theme persistence + RBAC | `apps/sample-server/src/theme-routes.ts` (`ThemeStore`, `Manage_Theme`, public read, size/validation limits), `tenant_theme` table. | **EXTEND by analogy:** layout routes mirror this exact pattern. |
| Shell | `AppShell` / `AppShellView` / `SidebarView` in `ui-web/navigation.tsx`, contract types in `ui-contract`, Tailwind implementations in `ui-web-tailwind`. Mobile drawer, sticky header, footer already exist. | **EXTEND.** The "Classic Admin" preset is the current shell, so it must render identically (behavior preserved). |
| Dashboard pieces | `KpiCard`, `Widget`, `WidgetGrid`, `DashboardPage`, charts in `ui-web/dashboard.tsx`. | **REUSE** as page-template widgets. |
| RBAC | Data-driven `can()` from `/me`; `NAV_ITEMS.permission`, `PAGE_PERMISSIONS`, `useDynamicAccess`. | Layout never reads roles; navigation items still arrive already filtered. Layout editing gated by a new `Manage_Layout` permission. |
| Tailwind class detection | `theme.css` has `@source "../"` (covers only `ui-web-tailwind/src`). | Any new package containing Tailwind classes must be added with its own `@source`. |

Gap: nothing models **layout as data**. The shell structure is hardcoded in `AppShell`.

## 2. Target architecture (three independent systems)

```
Layout Engine          Theme Engine (existing)       Page Template Engine
(structure)            (look)                        (page composition)
LayoutConfig  ──┐      ThemeProvider/--maw-*   ──┐   PageTemplateConfig ──┐
registry/resolve│      theme selection id        │   widget slot registry │
                └──────── ProjectUiConfig ───────┴────────────────────────┘
                          { version, layout, theme, templates }
```

Contract between them: **named slots and CSS variables only.** Layout knows slot names
(`sidebar`, `header`, `content`, `footer`, `rightPanel`); it never imports modules or business data.
Theme is applied through `--maw-*`; layouts use only semantic tokens, never colors.

### New code (and why it cannot be reused)

1. **`@mawsoftwares/layout`** (new, platform-agnostic, depends on `sdk` only, same tier as `theme`):
   - Zod-free typed schema + runtime validator (hand-rolled like `theme/validate`, since no validation lib is in `sdk`; to be confirmed in Phase 2 — reuse whatever `sdk` already uses).
   - `LayoutPreset` registry (`registerLayoutPreset`), `resolveLayout(config)` with safe fallback to `classic-admin`, `version` + `migrate()` chain.
   - Pure data: presets reference components **by id** from an approved slot-component list; no code or strings are executed.
   - Why new: `theme` is about tokens; `ui-contract` is prop types. Neither fits versioned config + resolver. Added to `eslint.config.js` dependency rules.
2. **Layout renderer in `ui-web`** (`layout/LayoutRenderer.tsx`): resolves config → composes existing kit primitives (`AppShellView`, `SidebarView`, `Drawer`). `AppShell` becomes a thin wrapper that reads config and defaults to Classic Admin (**no behavior change** when no config exists).
3. **Server:** `layout-routes.ts` + `tenant_layout` table, mirroring `theme-routes.ts`: draft vs published rows (preview ≠ published), `Manage_Layout` for writes, public read of the published config only, runtime validation on write, size limit.
4. **Layout Studio** (feature in `sample-web`, gated by `Manage_Layout`), gallery + live preview in an isolated, non-persisted provider scope + tablet/mobile frames.
5. **Page templates registry** (`ui-web`): dashboard, listing, details, form, kanban, calendar, communication — built on existing `ListPage`, `DynamicForm`, `DashboardPage`, widgets. Kanban/calendar/communication are net-new.

## 3. Phase map

| Phase | Deliverable | Verify |
|---|---|---|
| 1 | This audit/plan; confirm Tailwind kit works app-wide; add `@source` guidance. **No new Tailwind/shadcn setup is needed.** | `pnpm verify` unchanged |
| 2 | `@mawsoftwares/layout` (schema, registry, resolver, validation, migrations) + unit tests + lint rule | unit tests |
| 3 | `LayoutRenderer` + Classic Admin (= today's shell), Floating Sidebar, Enterprise Dashboard; responsive + mobile nav + a11y tests | component tests |
| 4 | Page template registry + widget slots | component tests |
| 5 | Layout Studio, draft/preview state, theme picker | integration |
| 6 | Remaining 5 presets, tablet/mobile previews, visual regression | screenshots |
| 7 | Server persistence, publish/version, per-user preference, migration of existing projects (no config ⇒ Classic Admin, version 1) | integration + DB tests |

## 4. Migration strategy

- Projects with no stored layout resolve to `classic-admin` @ current version, i.e. exactly the present shell.
- Stored config carries `version`; `migrate()` upgrades old versions on read; unknown/invalid ⇒ fallback + logged, never a crash.
- No change to `NAV_ITEMS`, `PAGE_PERMISSIONS`, `useDynamicAccess`, auth, or module code.

## 5. Open decisions for you

1. **Package name/tier:** new `@mawsoftwares/layout` (recommended) vs. placing schema inside `theme`.
2. **Kit scope:** layout renderer must work with the default `ui-web` kit too, or only with the Tailwind kit (recommended: Tailwind kit only for the new presets; Classic Admin works in both).
3. **Storage:** new `tenant_layout` table via drizzle migration (recommended) vs. a JSON column on an existing tenant-settings table.
4. **Naming:** permission `Manage_Layout`.
