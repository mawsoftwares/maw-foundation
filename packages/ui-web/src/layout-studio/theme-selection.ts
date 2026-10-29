import {
  contrastOn,
  createTheme,
  extendTheme,
  mixHex,
  tokensToCssVars,
  type ThemeOverrides,
  type ThemeRegistry,
} from '@mawsoftwares/theme';
import type { ThemeColors, ThemeSelection } from '@mawsoftwares/layout';

/** Scale factors for the closed typography/spacing presets. `default` leaves the theme exactly as designed. */
export const TYPOGRAPHY_SCALE = { compact: 0.92, default: 1, comfortable: 1.08 } as const;
export const SPACING_SCALE = { compact: 0.8, default: 1, spacious: 1.25 } as const;

/**
 * Theme overrides for the colours a project picked itself. Text colours are derived so they stay readable on the
 * chosen background (white or near-black), and the brand's light/dark shades follow from it.
 */
export function colorsToOverrides(colors: ThemeColors): ThemeOverrides {
  const patch: ThemeOverrides = {};
  const { brand, sidebar, page } = colors;
  if (brand !== undefined) {
    patch.palette = { brand, brandLight: mixHex(brand, '#ffffff', 0.35) ?? brand, brandDark: mixHex(brand, '#000000', 0.25) ?? brand, brandContrast: contrastOn(brand), borderFocus: brand };
    patch.paletteDark = { brand, brandLight: mixHex(brand, '#ffffff', 0.35) ?? brand, brandDark: mixHex(brand, '#000000', 0.25) ?? brand, brandContrast: contrastOn(brand), borderFocus: brand };
    patch.components = { 'nav-item-active': { backgroundColor: brand, textColor: contrastOn(brand) } };
  }
  if (sidebar !== undefined) {
    const fg = contrastOn(sidebar);
    const hover = mixHex(sidebar, fg, 0.14) ?? sidebar;
    patch.shell = { bg: sidebar, fg, fgMuted: fg, border: mixHex(sidebar, fg, 0.18) ?? sidebar, hover };
    patch.components = { ...patch.components, 'nav-item': { textColor: fg }, 'nav-item-hover': { backgroundColor: hover, textColor: fg } };
    patch.extraTokens = { 'shell-logo': fg };
  }
  if (page !== undefined) patch.palette = { ...patch.palette, bgSubtle: page };
  return patch;
}

/**
 * Theme Engine overrides for a project's theme selection: the chosen registry theme, then typography and spacing
 * presets applied as scales over THAT theme's own values (so a preset never replaces a client's design).
 * Returns `undefined` when nothing is selected, so callers leave the active theme alone.
 */
export function themeSelectionToOverrides(selection: ThemeSelection, registry?: ThemeRegistry): ThemeOverrides | undefined {
  const chosen = selection.themeId !== null && registry?.has(selection.themeId) === true ? registry.resolveOverrides(selection.themeId) : undefined;
  const colors = selection.colors === undefined || Object.keys(selection.colors).length === 0 ? undefined : colorsToOverrides(selection.colors);
  if (selection.typography === 'default' && selection.spacing === 'default') return colors === undefined ? chosen : chosen === undefined ? colors : extendTheme(chosen, colors);

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
  const scaled = chosen === undefined ? patch : extendTheme(chosen, patch);
  return colors === undefined ? scaled : extendTheme(scaled, colors);
}

/** CSS custom properties for a scoped preview (apply as `style` on a container; nothing global changes). */
export function previewCssVars(selection: ThemeSelection, registry: ThemeRegistry | undefined, prefersDark: boolean): Record<string, string> {
  const dark = selection.colorMode === 'dark' || (selection.colorMode === 'system' && prefersDark);
  const vars = tokensToCssVars(dark, createTheme(themeSelectionToOverrides(selection, registry)));
  return { ...inheritedShellVarResets(vars), ...vars };
}

/**
 * The running app's own theme (e.g. the tenant's shared theme) sets component and shell variables on the page root.
 * A preview theme only redefines the ones IT has, so the rest would leak in from the app (light text on a light
 * sidebar). Resetting them to `initial` makes the components use their built-in fallbacks, as the preview theme intends.
 */
function inheritedShellVarResets(own: Readonly<Record<string, string>>): Record<string, string> {
  const resets: Record<string, string> = {};
  if (typeof document === 'undefined') return resets;
  const style = document.documentElement.style;
  for (let i = 0; i < style.length; i += 1) {
    const name = style.item(i);
    if ((name.startsWith('--maw-comp-') || name.startsWith('--maw-shell-')) && !(name in own)) resets[name] = 'initial';
  }
  return resets;
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
