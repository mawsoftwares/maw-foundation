/**
 * Platform-agnostic design tokens. Both UI kits (@maw/ui-web, @maw/ui-native) consume
 * these so web and native apps render with the same palette, spacing, and type scale.
 *
 * Per-tenant branding: call `createTheme(tenantOverrides)` to produce a merged token set
 * that the UI kit consumes. No code changes needed for white-label — just config.
 */

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------

export const palette = {
  brand: '#4f46e5',
  brandLight: '#818cf8',
  brandDark: '#3730a3',
  brandContrast: '#ffffff',
  bg: '#ffffff',
  bgMuted: '#f5f6f8',
  bgSubtle: '#f0f1f3',
  fg: '#111827',
  fgMuted: '#6b7280',
  fgSubtle: '#9ca3af',
  border: '#e5e7eb',
  borderFocus: '#4f46e5',
  success: '#16a34a',
  successBg: '#f0fdf4',
  danger: '#dc2626',
  dangerBg: '#fef2f2',
  warning: '#d97706',
  warningBg: '#fffbeb',
  info: '#2563eb',
  infoBg: '#eff6ff',
  overlay: 'rgba(0, 0, 0, 0.5)',
} as const;

export const paletteDark = {
  brand: '#818cf8',
  brandLight: '#a5b4fc',
  brandDark: '#6366f1',
  brandContrast: '#0b1020',
  bg: '#0b1020',
  bgMuted: '#151b2e',
  bgSubtle: '#1e2640',
  fg: '#f3f4f6',
  fgMuted: '#9ca3af',
  fgSubtle: '#6b7280',
  border: '#273244',
  borderFocus: '#818cf8',
  success: '#22c55e',
  successBg: '#052e16',
  danger: '#f87171',
  dangerBg: '#450a0a',
  warning: '#fbbf24',
  warningBg: '#451a03',
  info: '#60a5fa',
  infoBg: '#172554',
  overlay: 'rgba(0, 0, 0, 0.7)',
} as const;

export type PaletteKey = keyof typeof palette;
export type Palette = { [K in PaletteKey]: string };

// ---------------------------------------------------------------------------
// Spacing, radius, shadows, z-index, transitions
// ---------------------------------------------------------------------------

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

export const radius = { none: 0, sm: 4, md: 8, lg: 12, xl: 16, pill: 999 } as const;

export const shadows = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  inner: 'inset 0 2px 4px rgba(0, 0, 0, 0.05)',
  none: 'none',
} as const;

export const zIndex = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  overlay: 300,
  modal: 400,
  popover: 500,
  toast: 600,
  tooltip: 700,
} as const;

export const transitions = {
  fast: '150ms ease',
  normal: '200ms ease',
  slow: '300ms ease',
} as const;

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

export const typography = {
  fontFamily: "'Geist Variable', system-ui, -apple-system, sans-serif",
  monoFamily: "'Geist Mono', 'Fira Code', 'Cascadia Code', monospace",
  size: { xs: 12, sm: 14, md: 16, lg: 20, xl: 28, xxl: 36 },
  weight: { regular: 400, medium: 500, semibold: 600, bold: 700 },
  lineHeight: { tight: 1.25, normal: 1.5, relaxed: 1.75 },
} as const;

// ---------------------------------------------------------------------------
// Breakpoints (for responsive design)
// ---------------------------------------------------------------------------

export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  xxl: 1536,
} as const;

// ---------------------------------------------------------------------------
// Aggregated tokens
// ---------------------------------------------------------------------------

export const tokens = {
  palette,
  paletteDark,
  spacing,
  radius,
  shadows,
  zIndex,
  transitions,
  typography,
  breakpoints,
} as const;

export type Tokens = typeof tokens;

// ---------------------------------------------------------------------------
// Per-tenant branding override
// ---------------------------------------------------------------------------

export interface TenantBranding {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
  logo?: string;
  favicon?: string;
  borderRadius?: number;
}

export interface ThemeOverrides {
  branding?: TenantBranding;
  palette?: Partial<Palette>;
  paletteDark?: Partial<Palette>;
}

export interface Theme {
  light: Palette;
  dark: Palette;
  spacing: { [K in keyof typeof spacing]: number };
  radius: { [K in keyof typeof radius]: number };
  shadows: { [K in keyof typeof shadows]: string };
  zIndex: { [K in keyof typeof zIndex]: number };
  transitions: { [K in keyof typeof transitions]: string };
  typography: {
    fontFamily: string;
    monoFamily: string;
    size: { [K in keyof typeof typography.size]: number };
    weight: { [K in keyof typeof typography.weight]: number };
    lineHeight: { [K in keyof typeof typography.lineHeight]: number };
  };
  breakpoints: { [K in keyof typeof breakpoints]: number };
  branding: TenantBranding;
}

export function createTheme(overrides?: ThemeOverrides): Theme {
  const branding = overrides?.branding ?? {};

  const lightOverrides: Partial<Palette> = {
    ...(overrides?.palette ?? {}),
  };
  if (branding.primaryColor) {
    lightOverrides.brand = branding.primaryColor;
    lightOverrides.borderFocus = branding.primaryColor;
  }

  const darkOverrides: Partial<Palette> = {
    ...(overrides?.paletteDark ?? {}),
  };
  if (branding.accentColor) {
    darkOverrides.brand = branding.accentColor;
    darkOverrides.borderFocus = branding.accentColor;
  }

  const mergedTypo = branding.fontFamily
    ? { ...typography, fontFamily: `'${branding.fontFamily}', ${typography.fontFamily}` }
    : typography;

  const mergedRadius = branding.borderRadius !== undefined
    ? { ...radius, md: branding.borderRadius, lg: branding.borderRadius + 4 }
    : radius;

  return {
    light: { ...palette, ...lightOverrides },
    dark: { ...paletteDark, ...darkOverrides },
    spacing,
    radius: mergedRadius,
    shadows,
    zIndex,
    transitions,
    typography: mergedTypo,
    breakpoints,
    branding,
  };
}

export const defaultTheme: Theme = createTheme();

// ---------------------------------------------------------------------------
// CSS custom properties generation
// ---------------------------------------------------------------------------

export function tokensToCssVars(dark = false, theme?: Theme): Record<string, string> {
  const t = theme ?? defaultTheme;
  const p = dark ? t.dark : t.light;
  const vars: Record<string, string> = {};

  for (const [k, v] of Object.entries(p)) vars[`--maw-${k}`] = v;
  for (const [k, v] of Object.entries(t.spacing)) vars[`--maw-space-${k}`] = `${v}px`;
  for (const [k, v] of Object.entries(t.radius)) vars[`--maw-radius-${k}`] = `${v}px`;
  for (const [k, v] of Object.entries(t.shadows)) vars[`--maw-shadow-${k}`] = v;
  for (const [k, v] of Object.entries(t.zIndex)) vars[`--maw-z-${k}`] = `${v}`;
  for (const [k, v] of Object.entries(t.transitions)) vars[`--maw-transition-${k}`] = v;

  vars['--maw-font-family'] = t.typography.fontFamily;
  vars['--maw-font-mono'] = t.typography.monoFamily;
  for (const [k, v] of Object.entries(t.typography.size)) vars[`--maw-text-${k}`] = `${v}px`;
  for (const [k, v] of Object.entries(t.typography.weight)) vars[`--maw-weight-${k}`] = `${v}`;

  return vars;
}
