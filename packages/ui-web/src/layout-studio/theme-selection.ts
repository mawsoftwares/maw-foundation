import {
  createTheme,
  extendTheme,
  tokensToCssVars,
  type ThemeOverrides,
  type ThemeRegistry,
} from '@mawsoftwares/theme';
import type { ThemeSelection } from '@mawsoftwares/layout';

/** Scale factors for the closed typography/spacing presets. `default` leaves the theme exactly as designed. */
export const TYPOGRAPHY_SCALE = { compact: 0.92, default: 1, comfortable: 1.08 } as const;
export const SPACING_SCALE = { compact: 0.8, default: 1, spacious: 1.25 } as const;

/**
 * Theme Engine overrides for a project's theme selection: the chosen registry theme, then typography and spacing
 * presets applied as scales over THAT theme's own values (so a preset never replaces a client's design).
 * Returns `undefined` when nothing is selected, so callers leave the active theme alone.
 */
export function themeSelectionToOverrides(selection: ThemeSelection, registry?: ThemeRegistry): ThemeOverrides | undefined {
  const chosen = selection.themeId !== null && registry?.has(selection.themeId) === true ? registry.resolveOverrides(selection.themeId) : undefined;
  if (selection.typography === 'default' && selection.spacing === 'default') return chosen;

  const base = createTheme(chosen);
  const patch: ThemeOverrides = {};
  if (selection.spacing !== 'default') {
    const k = SPACING_SCALE[selection.spacing];
    patch.spacing = Object.fromEntries(Object.entries(base.spacing).map(([name, px]) => [name, Math.round(px * k)]));
  }
  if (selection.typography !== 'default') {
    const k = TYPOGRAPHY_SCALE[selection.typography];
    patch.extraTokens = Object.fromEntries(Object.entries(base.typography.size).map(([name, px]) => [`text-${name}`, `${Math.round(px * k * 10) / 10}px`]));
  }
  return chosen === undefined ? patch : extendTheme(chosen, patch);
}

/** CSS custom properties for a scoped preview (apply as `style` on a container; nothing global changes). */
export function previewCssVars(selection: ThemeSelection, registry: ThemeRegistry | undefined, prefersDark: boolean): Record<string, string> {
  const dark = selection.colorMode === 'dark' || (selection.colorMode === 'system' && prefersDark);
  return tokensToCssVars(dark, createTheme(themeSelectionToOverrides(selection, registry)));
}

/**
 * What the running app should apply: the tenant's shared theme (Theme Designer) with the project's published theme
 * selection layered ON TOP. `undefined` = nothing to apply, so the built-in theme stays untouched.
 */
export function composeProjectTheme(shared: ThemeOverrides | undefined, selection: ThemeSelection | undefined, registry?: ThemeRegistry): ThemeOverrides | undefined {
  const project = selection === undefined ? undefined : themeSelectionToOverrides(selection, registry);
  if (shared === undefined) return project;
  return project === undefined ? shared : extendTheme(shared, project);
}
