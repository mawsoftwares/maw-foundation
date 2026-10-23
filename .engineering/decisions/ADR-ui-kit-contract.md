# ADR: Swappable Web UI Kits via a Shared Contract

**Status:** Accepted (prototype) · **Scope:** `packages/ui-contract`, `packages/ui-web`, `packages/ui-web-tailwind`

## Context

Clients differ on look and feel. `ui-web` is inline-styled and driven by `--maw-*` tokens from `@mawsoftwares/theme`; we also want a
Tailwind + Radix (shadcn-style) skin, selectable per client build, without forking apps or the business logic
(forms, RBAC, CRUD engines).

## Decision

1. **`@mawsoftwares/ui-contract`** holds the prop types every kit implements (`ButtonProps`, `DataTableProps`, …), a `UIKit`
   interface, and a one-slot registry (`setUIKit` / `getUIKitOverride`). Types and one setter only.
2. **`ui-web` is the default kit.** Its composites (ListPage, DynamicForm, DataGrid, navigation, offline UI, …) import primitives from
   `src/kit.tsx`, which renders `{ ...defaultKit, ...override }` at render time. Apps keep importing from `@mawsoftwares/ui-web` unchanged.
3. **Other kits export a `UIKit` object** typed against the contract (`tailwindKit`). Drift from the contract is a compile error.
4. **Selection is build-time.** An app installs a kit with `setUIKit(kit)` and, for direct imports, aliases `@mawsoftwares/ui-web` to an entry that
   re-exports the kit's components (see `apps/shared/ui-kit/tailwind.ts`, shared by sample-web and sample-desktop, selected with `VITE_UI_KIT=tailwind`).
5. **Tokens are the shared look.** Every kit reads the same `--maw-*` variables, so tenant branding and dark mode apply to all kits.

## Consequences

- Each new primitive is added to the contract, the default kit and every alternative kit (the compiler enforces it).
- Kits may cover part of the contract (`UIKitOverride = Partial<UIKit>`); anything omitted falls back to `ui-web`.
- Components not yet in the contract (DatePicker, Drawer, …) keep their `ui-web` implementation inside composites.
- The registry is module state: fine for one kit per app build; not per-subtree or per-request (SSR).
- `ui-contract` becomes a published dependency of `ui-web`.
- Alternative kits add dependencies (Tailwind, Radix, lucide, cva). This is an explicit, scoped exception to "no second UI library" and lives only in
  `ui-web-tailwind`, never in `ui-web`.
