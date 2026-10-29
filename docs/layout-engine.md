# Layout engine (`@mawsoftwares/layout`)

Pure data + logic (no React, Tailwind or kit dependency). Describes *structure* only; look is the Theme Engine
(`@mawsoftwares/theme`, `--maw-*`), page composition is the Page Template Engine (later phase).

```ts
import { resolveLayout, defaultLayoutRegistry } from '@mawsoftwares/layout';

const layout = resolveLayout(storedConfigOrNull); // never throws; always renderable
layout.presetId; layout.settings.sidebar.variant; layout.source; // 'default' | 'config' | 'fallback'
```

- **Stored shape:** `{ version, presetId, overrides? }` — only differences from the preset. Draft and published copies live in `tenant_layout`; history in `tenant_layout_revision` (append-only; rollback = re-publish an old revision).
- **Fallback:** nothing stored, unknown preset, invalid or newer-than-supported config → `classic-admin` (today's shell). `issues` explains why.
- **Safety:** strict validation (unknown keys rejected, closed enums, component ids only from the approved registry). No code or class names in config.
- **New preset:** `defaultLayoutRegistry.registerPreset({ id, label, description, settings })` — core untouched. New slot component: `registerComponent(id)` plus a renderer in the kit.
- **Versioning:** bump `CURRENT_LAYOUT_VERSION`, add a step to `LAYOUT_MIGRATIONS` (keyed by the version it migrates from).
- **Permissions:** `Read_Layout`, `Update_Layout`, `Publish_Layout` (module `layout` in sample-server). Enforcement arrives with the routes in Phase 7.
- **Tailwind:** this package contains no classes. The renderer (Phase 3) will live in `ui-web`/`ui-web-tailwind`; any new package with classes needs its own `@source` in the app's CSS.

## Rendering (Phase 3)

```tsx
const layout = resolveLayout(storedConfig);
<AppShell layout={layout} slots={{ search: <Search/>, notifications: <Bell/> }} rightPanel={<Filters/>} sidebar={...} actions={...}>
  {/* business content — identical under every layout */}
</AppShell>
```

- No `layout` prop = the classic shell, unchanged. `ui-web` maps settings → `ShellFrame` (`toShellFrame`); the kit renders it.
- Header ids: built-in `breadcrumbs`, `page-title`, `actions`; any other approved id renders only if the app passes it in `slots`.
- Tailwind kit renders: floating/docked sidebar, left/right position, header variants + sticky, density, full/contained content, footer toggle, collapsible right panel, skip link. The default kit honours header on/off, sticky, footer and content width.
- Sidebar behaviour from config (Phase 6): `variant: 'rail'` forces the icon rail with no expand button; `collapsible: false` pins it open; `width` (sm 200 / md 260 / lg 300 px; md is the classic width); `defaultCollapsed` is applied on desktop whenever the layout changes (both directions). `sidebar.top` / `sidebar.bottom`: `brand` keeps the app's `<Sidebar logo/title>`, `user-menu` keeps its `footer`; any other approved id renders from `slots` (hidden in the rail). The navigation items themselves always come from the app.
- `responsive.mobileNavigation: 'bottom-bar'` adds a bottom tab bar of the top-level destinations (max 5) on mobile; the header menu still opens the full drawer. The right panel is hidden on small screens (drawer planned).
- Try it: `pnpm --filter @mawsoftwares/ui-web-tailwind dev`, open `/?kit=tailwind&layout=floating-sidebar#shell`.

## Layout Studio (Phase 5)

`<LayoutStudio store themes can onPublished />` from `@mawsoftwares/ui-web`.

- **Draft vs live:** Studio edits a working copy and writes only the DRAFT (`store.saveDraft`). End users render `published` only; `publish()` is a separate step needing `Publish_Layout`, and rollback re-publishes an earlier revision as a new one. Editing needs `Update_Layout`; viewing needs `Read_Layout` (page guard) and without `Update_Layout` every control is disabled.
- **Preview** (`ShellPreview`) is the REAL application shell — the same `AppShell`, `Sidebar` and kit components as the app — with sample content, evaluated at 1280 / 820 / 390 px (`AppShell viewportWidth`, so the window's width doesn't decide), scaled into its frame. It has its own navigation context, is `inert` (nothing clickable or focusable), exposes a text alternative, and theme choices apply as CSS variables on the frame only. The gallery thumbnails are the same component at thumbnail scale. It follows whichever UI kit the app installed.
- **Theme choices** are names from the Theme Engine registry plus closed colour-mode / typography / spacing presets (`ThemeSelection`); they never contain token values. Presets scale the chosen theme's own spacing and type sizes.
- **Persistence port:** `ProjectUiStore` (`load / saveDraft / discardDraft / publish / rollback`) in `@mawsoftwares/layout`, with `createMemoryProjectUiStore` and `createStorageProjectUiStore` (localStorage). The server implementation (tenant_layout, Phase 7) implements the same interface.
- **Editing model** (pure, reusable): `setLayoutPreset`, `setLayoutSetting` (removes an override equal to the preset default), `restorePresetDefaults`, `layoutConfigsEqual`, `countLayoutOverrides`.
- **Try it:** `pnpm --filter @mawsoftwares/ui-web-tailwind dev` → `/?kit=tailwind#studio` (add `&readonly=1` for the view-only state). In sample-web: Super Admin → Layout Studio (`Read_Layout`).
- **sample-web wiring:** the shell applies the published layout (none published = unchanged classic shell) and the published theme selection (see Persistence below).

## Presets (Phase 6)

| id | sidebar | header | right panel | content | notes |
|---|---|---|---|---|---|
| `classic-admin` (default/fallback) | docked, md | default, sticky | – | contained | today's shell |
| `floating-sidebar` | floating card | minimal | – | contained | no footer |
| `enterprise-dashboard` | docked, sm | prominent + search | open | full, compact | collapses below `lg` |
| `split-workspace` | rail | minimal | – | full | launcher / picker apps |
| `communication-workspace` | rail | prominent + search | open | full, compact | pair with the `communication` page template |
| `analytics-dashboard` | rail | minimal + title | open | contained | pair with the `dashboard` template |
| `project-workspace` | docked, sm | breadcrumbs + search | – | full, compact | boards / timelines; collapses below `lg` |
| `listing-workspace` | docked, md | prominent + search | – | contained | bottom tab bar on phones |

Every built-in preset keeps `actions` in the header (the app's user menu / logout live there) and a reachable sidebar — enforced by tests.

**Regression net:** `apps/sample-web/src/layout-regression.test.tsx` snapshots the Tailwind shell's element tree and classes for all presets at desktop and mobile, plus cross-preset invariants (same business content, main landmark and skip link everywhere; no right panel/footer on mobile; bottom bar only where requested). These are structural snapshots, not pixel comparisons — review a snapshot diff like a code change (`pnpm vitest run -u` to accept).

## Persistence, publishing and migration (Phase 7)

### API (`/api/v1/layout`, sample-server)

| Route | Permission | Purpose |
|---|---|---|
| `GET /` | signed-in | The **live** config only: `{ published, publishedRevision }`. No draft, history or authors. Every user needs it to render the app. |
| `GET /studio` | `Read_Layout` | Draft, live config and history. |
| `PUT /draft` / `DELETE /draft` | `Update_Layout` | Save / discard the draft. Never changes what users see. |
| `POST /publish` | `Publish_Layout` | Make the saved draft live (new revision, draft cleared). |
| `POST /rollback` `{ revision }` | `Publish_Layout` | Re-publish an earlier revision as a **new** revision; history is append-only. |

Editing and publishing are separate: `Update_Layout` cannot publish and `Publish_Layout` cannot edit. Every write is validated server-side by the same `validateProjectUiConfig` used in the browser (strict keys, closed enums, approved component ids, ≤32 KB), returns the standard `{ success:false, error:{ code, message, details.fields } }` envelope, and is recorded in the audit log (`layout.draft.save`, `layout.draft.discard`, `layout.publish`, `layout.rollback`).

Storage is `tenant_layout` (draft + denormalised live copy) and `tenant_layout_revision` (append-only history) — migration `033`. Each call runs in one transaction holding a row lock on the tenant's row, so two admins can't interleave and revision numbers stay gap-free. Rows are keyed `(tenant_id, scope, scope_id)`; only `scope='tenant'` is used today. `project` and `user` scopes (project-level overrides, per-user preferences) are reserved and need no schema change, but **are not implemented**.

### What users get
- The shell reads only the published config, fetched after sign-in and on window focus / publish, with a per-tenant `localStorage` copy as a first-paint cache only.
- Theme: `shared theme (Theme Designer) < project's published theme selection`. A chosen registry theme and the typography/spacing presets are layered over the shared theme; the published colour mode is a project *default* and never overrides a user's own light/dark choice.
- Nothing configured (or fetch fails offline with no cache) → the classic shell and the existing theme, exactly as before.

### Migration strategy
**Existing projects need no data migration.** No row = no published config = Classic Admin, unchanged. Adopting the feature in a project is:
1. Deploy code and run migration `033` (`pnpm --filter @mawsoftwares/sample-server db:migrate`). It is additive (two new tables) and reversible (`033…down.sql`).
2. Re-run the seed / boot-time permission sync so `Read_Layout`, `Update_Layout`, `Publish_Layout` exist and are assigned to admin roles (also adds the *Layout Studio* menu item). Grant them to other roles via RBAC admin as needed.
3. An admin opens Layout Studio, saves a draft and publishes.

**Independent client deployments / databases:** every deployment owns its tables; there are no cross-database references. A client that has not upgraded simply has no layout feature. A client upgraded later starts at "nothing published".

**Schema evolution:** stored configs carry `version` at two levels (project UI envelope and nested layout). When the shape changes, bump `CURRENT_PROJECT_UI_VERSION` or `CURRENT_LAYOUT_VERSION` and add a step to `PROJECT_UI_MIGRATIONS` / `LAYOUT_MIGRATIONS`. Rows are upgraded **on read** (`upgradeProjectUiConfig`) and written back in the new shape on their next save, so rollout needs no bulk job. A row that cannot be upgraded (corrupt, or written by a *newer* release after a rollback of the code) is skipped and logged rather than failing the request; the previous valid revision stays live.

**Rollback of the feature:** removing the routes leaves the app on the classic shell; the tables can be dropped with the `down` migration.

### Testing
- `layout-routes.test.ts`: permission matrix for every route, draft/live separation, publish/rollback, validation, tenant isolation, audit, concurrency (in-memory persistence).
- `layout-store.pg.integration.test.ts`: the same store on real Postgres — migration up/down, row locking under parallel publishes/rollbacks, JSONB round-trips, unreadable rows. Opt-in: `LAYOUT_TEST_DATABASE_URL=postgres:///<scratch-db> pnpm vitest run apps/sample-server/src/__tests__/layout-store.pg.integration.test.ts`.

## Look = theme + shape (Phase 8)

Your references differ in colour and in geometry. The two are separate settings, so any theme works with any layout.

**Theme (colour, radius, shadow):** `starterThemes` in `@mawsoftwares/theme` — `medical-blue`, `violet-studio`, `midnight-rose`, `clean-light` — are ordinary Theme Engine definitions (`createThemeRegistry(starterThemes)`). Coloured sidebars use `shell.*` tokens plus `components['nav-item'|'nav-item-hover'|'nav-item-active']` for the white active pill. All pass WCAG AA checks in the test suite (body/muted/brand text and sidebar text, light and dark). New optional tokens, with today's tokens as fallbacks so existing themes are unchanged: `shell-header-bg|fg|border` (header can differ from the sidebar) and `shell-logo` (logo colour on a coloured sidebar). sample-web offers `starterThemes` + its generated client themes in Layout Studio (`project-themes.ts`).

**Shape (geometry only):** `LayoutSettings.shape` = `{ frame: 'full-bleed' | 'inset', corners: 'sharp' | 'soft' | 'round', nav: 'rounded' | 'pill' }`. `inset` puts the app in a rounded card on a brand-tinted canvas (desktop only); `corners` sets the radius of that card and the floating sidebar (`--maw-shell-radius`); `pill` makes navigation items fully rounded. Adding the field needs no data migration: stored configs hold only overrides, and presets supply the rest.

| preset | shape | reference it follows |
|---|---|---|
| `classic-admin` | full-bleed, soft, rounded | today's shell |
| `floating-sidebar` | full-bleed, round, rounded | floating rail |
| `enterprise-dashboard` | full-bleed, soft, rounded | – |
| `split-workspace` | inset, round, pill | dark pill rail |
| `communication-workspace` | inset, round, rounded | purple chat shell |
| `analytics-dashboard` | inset, round, pill | GoDoc / primary dashboard |
| `project-workspace` | full-bleed, soft, rounded | ClickUp / Jiron |
| `listing-workspace` | inset, soft, pill | Jobie |

Good starting pairs: `analytics-dashboard` + `medical-blue`, `listing-workspace` + `violet-studio`, `split-workspace` + `midnight-rose`, `project-workspace` + `clean-light`.

Kit notes: the shell height is `--maw-shell-height` (default `100vh`) so the shell can live in a sized frame; the sidebar fills its parent instead of `min-height: 100vh`. The Tailwind kit renders all of the above; the default kit renders shape, header/footer/content width and the bottom bar, but not the right panel.

## Phase 9 — sidebar styles, motion and suggested themes

Layouts now differ in more than structure. All of it is configuration (additive: stored configs without these keys keep resolving, using the preset's values).

| Setting | Values | Effect |
|---|---|---|
| `sidebar.labels` | `beside` · `below` | `below` = a fixed 88px tile bar, icon with a small label under it (never collapsed) |
| `sidebar.expandOnHover` | boolean | a rail opens over the content while hovered/focused and folds back; the layout keeps the rail's width |
| `shape.indicator` | `fill` · `bar` · `dot` | how the active item is marked. `bar`/`dot` use the sidebar's text colour, so they contrast on any sidebar |
| `motion.sidebar` | `none` · `smooth` · `spring` | width animation (`smooth` is the existing 200ms ease) |
| `motion.items` | `none` · `slide` · `lift` | hover feedback on nav items |
| `motion.page` | `none` · `fade` · `rise` | page entrance, replayed when the active page changes |

All motion is switched off by `prefers-reduced-motion`. These are honoured by the Tailwind kit; the default (inline-style) kit ignores them and renders the classic sidebar.

Classic Admin keeps exactly its previous behaviour (`fill`, `smooth`, `slide`, no page animation). A test asserts that no two presets share the same combination of look, so the presets stay visibly distinct.

`LayoutPreset.suggestedThemeId` is an optional hint (layout and theme remain independent). Until a theme is chosen, the Studio gallery shows each preset in the look it was designed around, and the Layout tab offers "Use the matching theme".

### Preview before publishing

"Preview in the app" (Studio toolbar) applies the editor's working copy, saved or not, to the real application for the current viewer only: it is kept in `sessionStorage` for that tab, never sent to the server, and a floating bar offers "Back to Studio" and "Exit preview". Publishing ends the preview. Anyone who can open the Studio can preview; it changes nothing for other users.

### Phase 10 — more themes, icons and a tighter inset frame

- Three more starter themes (all WCAG AA tested, usable with any layout): `aurora` (deep indigo sidebar), `slate-minimal` (flat, hairline, tight radius — Linear/Vercel style) and `emerald-fresh` (green sidebar, white active pill). Presets now suggest seven different themes.
- The Tailwind kit knows every icon name the seeded menu uses (`briefcase`, `file-text`, `calendar`, `building`, `alert-triangle`, `arrow-left-right`, …) plus a few common extras, so none is drawn as plain text.
- The `inset` frame's gap around the app card is one step smaller (`--maw-space-md`).

### Which UI kit the sample app runs

The layout engine's full set of looks (right panel, tile bar, hover-expand, active-item markers, motion) is drawn by the Tailwind kit, so `pnpm sample:web` / `pnpm --filter @mawsoftwares/sample-web dev` now runs with `VITE_UI_KIT=tailwind`. The previous default is `pnpm --filter @mawsoftwares/sample-web dev:web`. Production `build` is unchanged (default kit; `build:tailwind` for the Tailwind kit).

### Phase 11 — more motion, twelve themes, direct theme selection

- **Motion options** (all additive; all off under `prefers-reduced-motion`): `motion.sidebar` `none · snappy · smooth · gentle · spring`; `motion.items` `none · slide · lift · scale · glow`; `motion.page` `none · fade · rise · slide · zoom · blur`; new `motion.nav` `none · stagger` (menu items enter one after another).
- **Twelve starter themes**, each with a `label` and `description` (new optional fields on `ThemeDefinition`; `registry.get(id)` returns them): medical-blue, violet-studio, midnight-rose, clean-light, aurora, slate-minimal, emerald-fresh, ocean-teal, sunset-coral, graphite, lavender-soft, royal-navy. All pass the WCAG AA checks in `starter-themes.test.ts`.
- **Direct theme selection:** `ThemeGallery` shows one card per theme drawn in that theme's own colours; clicking it selects the theme (the preview updates at once). It appears on the Layout tab (compact) and the Theme tab (with descriptions). Colour mode, typography and spacing remain separate controls.

### Phase 12 — closer to the reference designs

- **`shape.indicator: 'tab'`:** the active item becomes a tall, page-coloured tab, fully rounded on its content side, that reaches the sidebar's edge and curves into the content with 28px concave corners above and below (Jobie / GoDoc style); items get airier spacing. Used by Analytics and Listing. The `deep-violet` theme (suggested for Listing) matches the Jobie sidebar colour.
- **`HeroBanner`** (welcome / promo banner with gradient or soft tint, action and decorative art) and **`ProfileCard`** (avatar, role, stats, progress) are exported from `@mawsoftwares/ui-web`. They use theme tokens only, so they follow the active theme. The Studio preview now shows them, so presets look like real products instead of grey boxes.
- Still page content rather than layout, not built: illustrations, calendars/Gantt, kanban boards, chat UI and category tile grids.



## Light/dark preview and your own colours

- **Preview in Light / Dark** (Studio preview card): flips only the preview. It saves nothing; the project's colour mode is still set on the Theme tab.
- **Your own colours** (Theme tab): `theme.colors` = optional `{ brand, sidebar, page }`, each a complete `#rrggbb`. They are layered over the chosen theme (and over the typography/spacing presets); text colours on the brand and sidebar are derived (white or near-black) so they stay readable. `page` sets the light-mode page background. Stored configs without `colors` are unchanged. "Reset my colours" removes them.

## MAW Hub look

The Hub (`MAW-HUB/frontend`) uses the Classic Admin shell with its own "Aurora" design (`design.md`). The `maw-hub` starter theme is that design, generated with the Theme Engine's design-markdown parser. Choose **Classic Admin** and the **MAW Hub** theme card to get the Hub look; Classic Admin suggests it.
