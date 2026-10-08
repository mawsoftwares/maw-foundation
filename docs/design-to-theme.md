# Design → Theme

Turn a client's design into a theme without touching components or business logic.

```
design file → adapter → normalized design → analysis → theme (+ provenance) → validation → export / runtime
```

## Add a client theme

```bash
pnpm theme:generate --input path/to/design.md --client client-a --name "Client A"
```

Writes `apps/sample-web/src/themes/client-a/`:

| File | Purpose |
|---|---|
| `theme.json` | The theme and its provenance (`design` / `derived` / `estimated` / `manual`, with confidence). Source of truth. |
| `theme.ts` | The same theme as typed data, plus a registry `definition`. Only what differs from the theme it `extends`. |
| `theme.css` | Standalone stylesheet (light, dark, responsive, component states) for non-React hosts. |
| `report.json` | Static validation: area status, accessibility findings, what needs manual review. |
| `design.json` | The normalized design, so corrections can be re-applied. |

and regenerates `themes/index.ts` (`themeRegistry`). Options: `--extends <id>`, `--manual <corrections.json>`,
`--adaptation as-stated|importer`, `--strict` (exit 1 on open errors).

## Use it

- **Tenant-driven (sample-web):** `BrandProvider themes={themeRegistry}` — a tenant whose id matches a client theme gets it
  layered over its brand. Switching tenant switches the whole visual language.
- **Standalone:** `<ClientThemeProvider registry={themeRegistry} defaultThemeId="client-a" storageKey="theme">` and
  `useClientTheme().setThemeId(id)` to switch at runtime.
- **Direct:** `<ThemeProvider overrides={registry.resolveOverrides('client-a')}>`.

## Review it

Open **UI Showcase → Theme Playground**: validation per area, accessibility findings (accept with a reason, or apply a
suggested fix — never automatic), rendered-vs-design comparison, a reference-image overlay/difference view, and export.
`—` in a validation area means the design says nothing about it and built-in defaults are used.

## Rules

- Colours are taken **as stated** by default; contrast problems in a design are reported, not silently repaired.
  `--adaptation importer` restores the Theme Designer's re-mapping.
- Components read semantic tokens (`--maw-*`); never hard-code a client's values in a component.
- Unreadable formats (PDF, image, Figma) have no adapter yet: supply the values as a manual mapping (`kind: 'manual'`)
  or write an adapter (`DesignAdapter`) and register it with `createDesignPipeline`.
