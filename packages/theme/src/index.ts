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

/**
 * Palette roles (do not invert these):
 * - `bg`        elevated surface — cards, inputs, header, sidebar, popovers
 * - `bgMuted`   nested chrome — table headers, wells, disabled fills
 * - `bgSubtle`  page canvas — html/body, AppShell, auth screens
 *
 * CSS aliases: `--maw-surface` → bg, `--maw-canvas` → bgSubtle
 */
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
  bg: '#18181b',
  bgMuted: '#27272a',
  bgSubtle: '#09090b',
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

export const radius = { none: 0, sm: 4, md: 4, lg: 8, xl: 12, pill: 999 } as const;

export const shadows = {
  sm: '0px 2px 1px -1px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 1px 3px 0px rgba(0,0,0,0.12)',
  md: '0px 3px 3px -2px rgba(0,0,0,0.2), 0px 3px 4px 0px rgba(0,0,0,0.14), 0px 1px 8px 0px rgba(0,0,0,0.12)',
  lg: '0px 2px 4px -1px rgba(0,0,0,0.2), 0px 4px 5px 0px rgba(0,0,0,0.14), 0px 1px 10px 0px rgba(0,0,0,0.12)',
  xl: '0px 5px 5px -3px rgba(0,0,0,0.2), 0px 8px 10px 1px rgba(0,0,0,0.14), 0px 3px 14px 2px rgba(0,0,0,0.12)',
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
  fontFamily: "'Roboto', 'Helvetica', 'Arial', sans-serif",
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

/** Frosted application chrome (sidebar + header). Optional — defaults fall back to surface tokens. */
export interface ShellTokens {
  bg?: string;
  fg?: string;
  fgMuted?: string;
  border?: string;
  blur?: string;
  hover?: string;
}

export interface TypographyOverrides {
  fontFamily?: string;
  monoFamily?: string;
  scale?: Record<string, { size?: string; weight?: string; lineHeight?: string; family?: string; letterSpacing?: string }>;
}

/**
 * Design-file type-scale names → the semantic text classes ui-web ships (`.text-h1`, `.text-body`, …).
 * A design.md can name its scale anything (`headline-xl`); both the raw name and the alias get CSS vars.
 */
export const TYPE_SCALE_ALIASES: Readonly<Record<string, string>> = {
  'display-hero': 'hero', display: 'hero', 'display-lg': 'hero',
  'headline-xl': 'h1', 'headline-1': 'h1', 'heading-1': 'h1',
  'headline-lg': 'h2', headline: 'h2', 'headline-2': 'h2', 'heading-2': 'h2',
  'title-md': 'h3', title: 'h3', 'headline-3': 'h3', 'heading-3': 'h3',
  'body-md': 'body', 'body-base': 'body',
  'body-sm': 'caption',
};

export interface ComponentOverrides {
  [componentName: string]: Record<string, string>;
}

export interface ThemeOverrides {
  branding?: TenantBranding;
  palette?: Partial<Palette>;
  paletteDark?: Partial<Palette>;
  spacing?: Partial<Record<keyof typeof spacing, number>>;
  radius?: Partial<Record<keyof typeof radius, number>>;
  shadows?: Partial<Record<keyof typeof shadows, string>>;
  transitions?: Partial<Record<keyof typeof transitions, string>>;
  typography?: TypographyOverrides;
  shell?: ShellTokens;
  components?: ComponentOverrides;
  /**
   * Design tokens with no dedicated slot (layout sizes, extra spacing/motion/elevation, non-palette colors).
   * Key is the CSS custom-property name without `--maw-`, e.g. `layout-container-max`, `color-status-mock-bg`.
   */
  extraTokens?: Record<string, string>;
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
    scale?: TypographyOverrides['scale'];
  };
  breakpoints: { [K in keyof typeof breakpoints]: number };
  containerWidths: { [K in keyof typeof containerWidths]: number };
  branding: TenantBranding;
  shell?: ShellTokens;
  components?: ComponentOverrides;
  extraTokens?: Record<string, string>;
}

export function mergeThemeOverrides(base?: ThemeOverrides, extra?: ThemeOverrides): ThemeOverrides | undefined {
  if (base === undefined) return extra;
  if (extra === undefined) return base;
  return {
    branding: { ...base.branding, ...extra.branding },
    palette: { ...base.palette, ...extra.palette },
    paletteDark: { ...base.paletteDark, ...extra.paletteDark },
    spacing: { ...base.spacing, ...extra.spacing },
    radius: { ...base.radius, ...extra.radius },
    shadows: { ...base.shadows, ...extra.shadows },
    transitions: { ...base.transitions, ...extra.transitions },
    typography: { ...base.typography, ...extra.typography },
    shell: extra.shell !== undefined || base.shell !== undefined
      ? { ...base.shell, ...extra.shell }
      : undefined,
    components: extra.components !== undefined || base.components !== undefined
      ? { ...base.components, ...extra.components }
      : undefined,
    extraTokens: extra.extraTokens !== undefined || base.extraTokens !== undefined
      ? { ...base.extraTokens, ...extra.extraTokens }
      : undefined,
  };
}

function resolveFontFamily(family: string | undefined): string {
  if (family === undefined || family.trim() === '') return typography.fontFamily;
  const trimmed = family.trim();
  if (trimmed.includes(',') || trimmed.startsWith("'") || trimmed.startsWith('"')) return trimmed;
  return `'${trimmed}', ${typography.fontFamily}`;
}

export function createTheme(overrides?: ThemeOverrides): Theme {
  const branding = overrides?.branding ?? {};

  const lightOverrides: Partial<Palette> = {};
  if (branding.primaryColor) {
    lightOverrides.brand = branding.primaryColor;
    lightOverrides.borderFocus = branding.primaryColor;
  }
  Object.assign(lightOverrides, overrides?.palette ?? {});

  const darkOverrides: Partial<Palette> = {};
  if (branding.accentColor) {
    darkOverrides.brand = branding.accentColor;
    darkOverrides.borderFocus = branding.accentColor;
  } else if (lightOverrides.brand && overrides?.paletteDark?.brand === undefined) {
    darkOverrides.brand = lightOverrides.brand;
    darkOverrides.borderFocus = lightOverrides.borderFocus ?? lightOverrides.brand;
    if (lightOverrides.brandLight) darkOverrides.brandLight = lightOverrides.brandLight;
    if (lightOverrides.brandDark) darkOverrides.brandDark = lightOverrides.brandDark;
    if (lightOverrides.brandContrast) darkOverrides.brandContrast = lightOverrides.brandContrast;
  }
  Object.assign(darkOverrides, overrides?.paletteDark ?? {});

  const fontFamily = overrides?.typography?.fontFamily ?? branding.fontFamily;
  const mergedTypo = {
    ...typography,
    fontFamily: resolveFontFamily(fontFamily),
    monoFamily: overrides?.typography?.monoFamily ?? typography.monoFamily,
    scale: overrides?.typography?.scale,
  };

  const mergedRadius = {
    ...radius,
    ...(branding.borderRadius !== undefined
      ? { md: branding.borderRadius, lg: branding.borderRadius + 4 }
      : {}),
    ...(overrides?.radius ?? {}),
  };

  return {
    light: { ...palette, ...lightOverrides },
    dark: { ...paletteDark, ...darkOverrides },
    spacing: { ...spacing, ...overrides?.spacing },
    radius: mergedRadius,
    shadows: { ...shadows, ...overrides?.shadows },
    zIndex,
    transitions: { ...transitions, ...overrides?.transitions },
    typography: mergedTypo,
    breakpoints,
    containerWidths,
    branding,
    shell: overrides?.shell,
    components: overrides?.components,
    extraTokens: overrides?.extraTokens,
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
  /** Page / screen background. Same value as `colors.bgSubtle`. */
  readonly canvas: string;
  /** Elevated surface (cards, chrome). Same value as `colors.bg`. */
  readonly surface: string;
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
    canvas: p.bgSubtle,
    surface: p.bg,
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
  if (c.surface) {
    paletteOverrides.bgMuted = c.surface;
    paletteOverrides.bgSubtle = c.surface;
  }
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

export {
  parseDesignMarkdown,
  normalizeDesignMarkdown,
  toCanonicalDesignMarkdown,
  storedDesignToOverrides,
  injectWebFonts,
  type DesignMdParseResult,
  type DesignMdNormalizeResult,
} from './design-md';

export function tokensToCssVars(dark = false, theme?: Theme): Record<string, string> {
  const t = theme ?? defaultTheme;
  const p = dark ? t.dark : t.light;
  const vars: Record<string, string> = {};

  for (const [k, v] of Object.entries(p)) vars[`--maw-${k}`] = v;
  vars['--maw-canvas'] = p.bgSubtle;
  vars['--maw-surface'] = p.bg;
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

  if (t.typography.scale) {
    for (const [k, v] of Object.entries(t.typography.scale)) {
      if (v.size) vars[`--maw-text-${k}-size`] = v.size;
      if (v.weight) vars[`--maw-text-${k}-weight`] = v.weight;
      if (v.lineHeight) vars[`--maw-text-${k}-lh`] = v.lineHeight;
      if (v.family) vars[`--maw-text-${k}-family`] = v.family;
      if (v.letterSpacing) vars[`--maw-text-${k}-ls`] = v.letterSpacing;
    }
    // Alias design-file names onto the semantic text classes unless the file set them directly.
    for (const [k, v] of Object.entries(t.typography.scale)) {
      const alias = TYPE_SCALE_ALIASES[k];
      if (alias === undefined || t.typography.scale[alias] !== undefined) continue;
      if (v.size) vars[`--maw-text-${alias}-size`] = v.size;
      if (v.weight) vars[`--maw-text-${alias}-weight`] = v.weight;
      if (v.lineHeight) vars[`--maw-text-${alias}-lh`] = v.lineHeight;
      if (v.family) vars[`--maw-text-${alias}-family`] = v.family;
      if (v.letterSpacing) vars[`--maw-text-${alias}-ls`] = v.letterSpacing;
    }
  }

  if (t.components) {
    for (const [comp, props] of Object.entries(t.components)) {
      for (const [prop, val] of Object.entries(props)) {
        vars[`--maw-comp-${comp}-${prop}`] = val;
        const kebab = prop.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
        if (kebab !== prop) vars[`--maw-comp-${comp}-${kebab}`] = val;
      }
    }
    applyComponentAliases(t.components, t.typography.scale, vars);
  }

  if (t.extraTokens) {
    for (const [k, v] of Object.entries(t.extraTokens)) vars[`--maw-${k}`] = v;
  }

  // Shell chrome: light design.md shells must not stick when color mode is dark.
  // Keep an explicit dark/frosted shell (e.g. Evreghen); otherwise follow the active palette.
  const explicitShell = t.shell;
  const keepExplicitShell = explicitShell?.bg !== undefined && (
    !dark || isDarkShellBackground(explicitShell.bg)
  );
  if (keepExplicitShell && explicitShell !== undefined) {
    vars['--maw-shell-bg'] = explicitShell.bg ?? p.bg;
    vars['--maw-shell-fg'] = explicitShell.fg ?? p.fg;
    vars['--maw-shell-fg-muted'] = explicitShell.fgMuted ?? p.fgMuted;
    vars['--maw-shell-border'] = explicitShell.border ?? p.border;
    vars['--maw-shell-blur'] = explicitShell.blur ?? '0px';
    vars['--maw-shell-hover'] = explicitShell.hover ?? p.bgSubtle;
  } else if (dark) {
    vars['--maw-shell-bg'] = p.bgSubtle;
    vars['--maw-shell-fg'] = p.fg;
    vars['--maw-shell-fg-muted'] = p.fgMuted;
    vars['--maw-shell-border'] = p.border;
    vars['--maw-shell-blur'] = '0px';
    vars['--maw-shell-hover'] = p.bgMuted;
  } else {
    vars['--maw-shell-bg'] = explicitShell?.bg ?? p.bg;
    vars['--maw-shell-fg'] = explicitShell?.fg ?? p.fg;
    vars['--maw-shell-fg-muted'] = explicitShell?.fgMuted ?? p.fgMuted;
    vars['--maw-shell-border'] = explicitShell?.border ?? p.border;
    vars['--maw-shell-blur'] = explicitShell?.blur ?? '0px';
    vars['--maw-shell-hover'] = explicitShell?.hover ?? p.bgSubtle;
  }

  // Nav active style follows shell luminance: light chrome → soft brand tint;
  // dark frosted chrome → solid brand fill (Evreghen-style).
  const shellBg = vars['--maw-shell-bg'];
  const darkShell = isDarkShellBackground(shellBg);
  if (darkShell) {
    vars['--maw-shell-nav-active-bg'] = `linear-gradient(135deg, ${p.brand} 0%, color-mix(in srgb, ${p.brand} 80%, black) 100%)`;
    vars['--maw-shell-nav-active-fg'] = p.brandContrast;
    vars['--maw-shell-nav-active-shadow'] = `0 4px 12px color-mix(in srgb, ${p.brand} 30%, transparent)`;
    vars['--maw-shell-nav-active-indicator'] = 'none';
  } else {
    vars['--maw-shell-nav-active-bg'] = `color-mix(in srgb, ${p.brand} 12%, transparent)`;
    vars['--maw-shell-nav-active-fg'] = p.brand;
    vars['--maw-shell-nav-active-shadow'] = 'none';
    vars['--maw-shell-nav-active-indicator'] = `inset 3px 0 0 0 ${p.brand}`;
  }

  return vars;
}

/**
 * Design files name components in the singular (`button-primary`, `input`, `dialog`) with CSS-ish props
 * (`backgroundColor`, `rounded`). ui-web reads `--maw-comp-<family>-[variant-]<prop>` (`buttons`, `inputs`, `modals`, …).
 * This table maps design names onto those families.
 */
const COMPONENT_FAMILIES: Readonly<Record<string, string>> = {
  button: 'buttons', buttons: 'buttons',
  card: 'cards', cards: 'cards',
  input: 'inputs', inputs: 'inputs', field: 'inputs', 'text-field': 'inputs', textfield: 'inputs',
  select: 'inputs', textarea: 'inputs', 'text-area': 'inputs',
  badge: 'badges', badges: 'badges', chip: 'badges', tag: 'badges', status: 'badges',
  tab: 'tabs', tabs: 'tabs',
  modal: 'modals', modals: 'modals', dialog: 'modals', dialogs: 'modals',
  drawer: 'drawers', drawers: 'drawers',
  alert: 'alerts', alerts: 'alerts',
  banner: 'banners', banners: 'banners',
  panel: 'panels', panels: 'panels',
  popover: 'popovers', popovers: 'popovers',
  menu: 'menus', menus: 'menus', dropdown: 'menus', 'dropdown-menu': 'menus',
  tooltip: 'tooltips', tooltips: 'tooltips',
  toggle: 'toggles', toggles: 'toggles', switch: 'toggles',
  table: 'tables', tables: 'tables', 'data-table': 'tables',
};

const COMPONENT_PROP_ALIASES: Readonly<Record<string, string>> = {
  backgroundColor: 'background', background: 'background',
  textColor: 'text-color', color: 'text-color',
  rounded: 'border-radius', borderRadius: 'border-radius', radius: 'border-radius',
  borderColor: 'border-color', border: 'border',
  shadow: 'shadow', boxShadow: 'shadow', elevation: 'shadow',
  fontSize: 'font-size', fontWeight: 'font-weight', lineHeight: 'line-height', letterSpacing: 'letter-spacing',
  padding: 'padding', height: 'height', width: 'width', gap: 'gap',
};

function splitComponentName(name: string): { family: string; variant?: string } | undefined {
  const exact = COMPONENT_FAMILIES[name];
  if (exact !== undefined) return { family: exact };
  const parts = name.split('-');
  for (let i = parts.length - 1; i >= 1; i--) {
    const family = COMPONENT_FAMILIES[parts.slice(0, i).join('-')];
    if (family !== undefined) return { family, variant: parts.slice(i).join('-') };
  }
  return undefined;
}

function applyComponentAliases(
  components: NonNullable<Theme['components']>,
  scale: Theme['typography']['scale'],
  vars: Record<string, string>,
): void {
  for (const [comp, props] of Object.entries(components)) {
    const target = splitComponentName(comp);
    const prefix = target === undefined
      ? `--maw-comp-${comp}`
      : `--maw-comp-${target.family}${target.variant !== undefined && target.variant !== 'default' ? `-${target.variant}` : ''}`;

    const canonical: Record<string, string> = {};
    for (const [prop, val] of Object.entries(props)) {
      if (prop === 'typography') {
        const step = scale?.[val] ?? scale?.[TYPE_SCALE_ALIASES[val] ?? ''];
        if (step?.size !== undefined) canonical['font-size'] = step.size;
        if (step?.weight !== undefined) canonical['font-weight'] = step.weight;
        if (step?.lineHeight !== undefined) canonical['line-height'] = step.lineHeight;
        if (step?.letterSpacing !== undefined) canonical['letter-spacing'] = step.letterSpacing;
        continue;
      }
      const key = COMPONENT_PROP_ALIASES[prop];
      if (key !== undefined && canonical[key] === undefined) canonical[key] = val;
    }
    for (const [key, val] of Object.entries(canonical)) vars[`${prefix}-${key}`] = val;

    // Button predates the generic scheme and reads `medium-*` / family-wide radius for the primary action.
    if (target?.family === 'buttons' && target.variant === 'primary') {
      if (canonical.height !== undefined) vars['--maw-comp-buttons-medium-height'] = canonical.height;
      if (canonical.padding !== undefined) vars['--maw-comp-buttons-medium-padding-h'] = canonical.padding;
      if (canonical['font-size'] !== undefined) vars['--maw-comp-buttons-medium-font-size'] = canonical['font-size'];
      if (canonical['border-radius'] !== undefined) vars['--maw-comp-buttons-border-radius'] = canonical['border-radius'];
    }
  }
}

/** True when sidebar/header chrome should use dark-on-light inverted nav treatments. */
function isDarkShellBackground(bg: string): boolean {
  const value = bg.trim().toLowerCase();
  if (value.includes('rgba(0, 0, 0') || value.includes('rgba(0,0,0')) return true;
  if (value.includes('rgba(255') || value.includes('rgb(255')) return false;
  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex === null) {
    const rgb = value.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);
    if (rgb === null) return false;
    const r = Number(rgb[1]) / 255;
    const g = Number(rgb[2]) / 255;
    const b = Number(rgb[3]) / 255;
    const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b) < 0.35;
  }
  let h = hex[1]!;
  if (h.length === 3) h = `${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
  const r = Number.parseInt(h.slice(0, 2), 16) / 255;
  const g = Number.parseInt(h.slice(2, 4), 16) / 255;
  const b = Number.parseInt(h.slice(4, 6), 16) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b) < 0.35;
}
export { createSharedThemeClient, type SharedThemeClient, type ThemeRequest } from './shared-theme';
