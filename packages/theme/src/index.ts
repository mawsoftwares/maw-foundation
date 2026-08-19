/**
 * Platform-agnostic design tokens — plain values, no React, no DOM, no React Native. Both
 * UI kits (`@maw/ui-web`, `@maw/ui-native`) consume these so a web app and a native app
 * render with the same palette, spacing, and type scale without sharing components.
 *
 * Merged from Restaurant OS `@ros/ui/theme` and Sushmapet `theme/tokens/*`. A product
 * overrides `tokens` per client (Sushmapet's per-client theming) — the values are config.
 */

export const palette = {
  brand: '#4f46e5',
  brandContrast: '#ffffff',
  bg: '#ffffff',
  bgMuted: '#f5f6f8',
  fg: '#111827',
  fgMuted: '#6b7280',
  border: '#e5e7eb',
  success: '#16a34a',
  danger: '#dc2626',
  warning: '#d97706',
} as const;

export const paletteDark = {
  brand: '#818cf8',
  brandContrast: '#0b1020',
  bg: '#0b1020',
  bgMuted: '#151b2e',
  fg: '#f3f4f6',
  fgMuted: '#9ca3af',
  border: '#273244',
  success: '#22c55e',
  danger: '#f87171',
  warning: '#fbbf24',
} as const;

/** 4px base spacing scale. */
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 4, md: 8, lg: 12, pill: 999 } as const;

export const typography = {
  fontFamily: "'Geist Variable', system-ui, -apple-system, sans-serif",
  size: { xs: 12, sm: 14, md: 16, lg: 20, xl: 28 },
  weight: { regular: 400, medium: 500, semibold: 600, bold: 700 },
} as const;

export const tokens = { palette, paletteDark, spacing, radius, typography } as const;

export type Tokens = typeof tokens;

/** Emit the light/dark palettes as CSS custom properties (used by `@maw/ui-web`). */
export function tokensToCssVars(dark = false): Record<string, string> {
  const p = dark ? paletteDark : palette;
  const vars: Record<string, string> = {};
  for (const [k, v] of Object.entries(p)) vars[`--maw-${k}`] = v;
  for (const [k, v] of Object.entries(spacing)) vars[`--maw-space-${k}`] = `${v}px`;
  for (const [k, v] of Object.entries(radius)) vars[`--maw-radius-${k}`] = `${v}px`;
  return vars;
}
