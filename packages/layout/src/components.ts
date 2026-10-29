/**
 * Approved slot components. Layout config can reference ONLY these ids; the UI kit decides how each renders.
 * Extend with `registry.registerComponent(id)` (and a renderer in the kit) — the core never changes.
 */
export const DEFAULT_LAYOUT_COMPONENTS = [
  'brand',
  'navigation',
  'search',
  'breadcrumbs',
  'page-title',
  'notifications',
  'user-menu',
  'theme-toggle',
  'sidebar-toggle',
  'actions',
] as const;
