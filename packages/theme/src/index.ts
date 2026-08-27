/**
 * Platform-agnostic design tokens. Both UI kits (@mawsoftwares/ui-web, @mawsoftwares/ui-native) consume
 * these so web and native apps render with the same palette, spacing, and type scale.
 *
 * Per-tenant branding: call `createTheme(tenantOverrides)` to produce a merged token set
 * that the UI kit consumes. No code changes needed for white-label — just config.
 */

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------

export const palette = {
  brand: '#6366f1',
  brandLight: '#818cf8',
  brandDark: '#4f46e5',
  brandContrast: '#ffffff',
  bg: '#ffffff',
  bgMuted: '#f8fafc',
  bgSubtle: '#f1f5f9',
  fg: '#0f172a',
  fgMuted: '#64748b',
  fgSubtle: '#94a3b8',
  border: '#e2e8f0',
  borderFocus: '#6366f1',
  success: '#16a34a',
  successBg: '#f0fdf4',
  danger: '#dc2626',
  dangerBg: '#fef2f2',
  warning: '#d97706',
  warningBg: '#fffbeb',
  info: '#2563eb',
  infoBg: '#eff6ff',
  overlay: 'rgba(15, 23, 42, 0.4)',
} as const;

export const paletteDark = {
  brand: '#818cf8',
  brandLight: '#a5b4fc',
  brandDark: '#6366f1',
  brandContrast: '#020617',
  bg: '#000000',
  bgMuted: '#09090b',
  bgSubtle: '#18181b',
  fg: '#fafafa',
  fgMuted: '#a1a1aa',
  fgSubtle: '#71717a',
  border: '#27272a',
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

export const radius = { none: 0, sm: 6, md: 10, lg: 16, xl: 24, pill: 999 } as const;

export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
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
  smooth: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
  bounce: '400ms cubic-bezier(0.175, 0.885, 0.32, 1.275)',
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
// Breakpoints & Containers (for responsive design)
// ---------------------------------------------------------------------------

export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  xxl: 1536,
} as const;

export const containerWidths = {
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
  containerWidths,
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
  containerWidths: { [K in keyof typeof containerWidths]: number };
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
    containerWidths,
    branding,
  };
}

export const defaultTheme: Theme = createTheme();

// ---------------------------------------------------------------------------
// CSS custom properties generation
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// React Native style generation
// ---------------------------------------------------------------------------

export interface RNShadow {
  readonly shadowColor: string;
  readonly shadowOffset: { readonly width: number; readonly height: number };
  readonly shadowOpacity: number;
  readonly shadowRadius: number;
  readonly elevation: number;
}

export interface RNStyles {
  readonly colors: Palette;
  readonly spacing: { readonly [K in keyof typeof spacing]: number };
  readonly radius: { readonly [K in keyof typeof radius]: number };
  readonly shadows: { readonly [K in keyof typeof shadows]: RNShadow };
  readonly typography: {
    readonly fontFamily: string;
    readonly monoFamily: string;
    readonly size: { readonly [K in keyof typeof typography.size]: number };
    readonly weight: { readonly [K in keyof typeof typography.weight]: string };
    readonly lineHeight: { readonly [K in keyof typeof typography.lineHeight]: number };
  };
}

const SHADOW_NONE: RNShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0,
  shadowRadius: 0,
  elevation: 0,
};

export function parseCSSShadow(shadow: string): RNShadow {
  if (shadow === 'none') return SHADOW_NONE;

  const isInset = shadow.startsWith('inset');
  const parts = shadow.replace(/^inset\s*/, '');

  const colorMatch = parts.match(/rgba?\([^)]+\)/);
  const shadowColor = colorMatch?.[0] ?? '#000';

  const nums = parts.replace(/rgba?\([^)]+\)/, '').trim().split(/\s+/).map(parseFloat).filter((n) => !isNaN(n));
  const offsetX = nums[0] ?? 0;
  const offsetY = nums[1] ?? 0;
  const blur = nums[2] ?? 0;

  let opacity = 0.1;
  const opacityMatch = shadowColor.match(/,\s*([\d.]+)\s*\)/);
  if (opacityMatch) opacity = parseFloat(opacityMatch[1] ?? '0.1');

  return {
    shadowColor: shadowColor.replace(/,\s*[\d.]+\s*\)/, ', 1)'),
    shadowOffset: { width: isInset ? 0 : offsetX, height: isInset ? 0 : offsetY },
    shadowOpacity: isInset ? 0 : opacity,
    shadowRadius: blur / 2,
    elevation: isInset ? 0 : Math.max(1, Math.round(blur / 2)),
  };
}

function stripFontFallbacks(family: string): string {
  const first = family.split(',')[0]?.trim() ?? 'System';
  return first.replace(/^['"]|['"]$/g, '');
}

export function tokensToRNStyles(dark = false, theme?: Theme): RNStyles {
  const t = theme ?? defaultTheme;
  const p = dark ? t.dark : t.light;

  const rnShadows = {} as Record<string, RNShadow>;
  for (const [k, v] of Object.entries(t.shadows)) {
    const first = v.split(/,(?![^(]*\))/).map((s) => s.trim())[0] ?? v;
    rnShadows[k] = parseCSSShadow(first);
  }

  return {
    colors: p,
    spacing: t.spacing,
    radius: t.radius,
    shadows: rnShadows as RNStyles['shadows'],
    typography: {
      fontFamily: stripFontFallbacks(t.typography.fontFamily),
      monoFamily: stripFontFallbacks(t.typography.monoFamily),
      size: t.typography.size,
      weight: {
        regular: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },
      lineHeight: t.typography.lineHeight,
    },
  };
}

// ---------------------------------------------------------------------------
// CSS custom properties generation
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// BrandConfig → ThemeOverrides bridge
// ---------------------------------------------------------------------------

export interface BrandColorConfig {
  readonly primary: string;
  readonly secondary?: string;
  readonly accent?: string;
  readonly success?: string;
  readonly warning?: string;
  readonly error?: string;
  readonly background?: string;
  readonly surface?: string;
  readonly text?: string;
  readonly textMuted?: string;
  readonly border?: string;
}

export interface BrandConfigLike {
  readonly colors: BrandColorConfig;
  readonly typography?: { readonly fontFamily?: string; readonly headingFontFamily?: string };
  readonly theme?: { readonly radius?: number };
  readonly customTokens?: Readonly<Record<string, string>>;
}

export function brandConfigToThemeOverrides(brand: BrandConfigLike): ThemeOverrides {
  const c = brand.colors;

  const paletteOverrides: Partial<Palette> = {};
  if (c.primary) paletteOverrides.brand = c.primary;
  if (c.secondary) paletteOverrides.brandLight = c.secondary;
  if (c.accent) paletteOverrides.brandDark = c.accent;
  if (c.success) paletteOverrides.success = c.success;
  if (c.warning) paletteOverrides.warning = c.warning;
  if (c.error) paletteOverrides.danger = c.error;
  if (c.background) paletteOverrides.bg = c.background;
  if (c.surface) paletteOverrides.bgMuted = c.surface;
  if (c.text) paletteOverrides.fg = c.text;
  if (c.textMuted) paletteOverrides.fgMuted = c.textMuted;
  if (c.border) paletteOverrides.border = c.border;
  if (c.primary) paletteOverrides.borderFocus = c.primary;

  const branding: TenantBranding = {
    primaryColor: c.primary,
    secondaryColor: c.secondary,
    accentColor: c.accent,
    fontFamily: brand.typography?.fontFamily,
    borderRadius: brand.theme?.radius,
  };

  return {
    branding,
    palette: paletteOverrides,
  };
}

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
  for (const [k, v] of Object.entries(t.containerWidths)) vars[`--maw-container-${k}`] = `${v}px`;

  vars['--maw-font-family'] = t.typography.fontFamily;
  vars['--maw-font-mono'] = t.typography.monoFamily;
  for (const [k, v] of Object.entries(t.typography.size)) vars[`--maw-text-${k}`] = `${v}px`;
  for (const [k, v] of Object.entries(t.typography.weight)) vars[`--maw-weight-${k}`] = `${v}`;

  return vars;
}
