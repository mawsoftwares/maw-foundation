import type { Palette, ThemeOverrides, TypographyOverrides } from '../index';
import type { ProvenanceMap, TokenMeta } from '../core/provenance';
import type { ResponsiveTokens } from '../core/responsive';
import type { ColorRoles, NormalizedDesign, ShadowLayer, Sourced } from './types';

export interface GeneratedTheme {
  readonly overrides: ThemeOverrides;
  /** Same as `overrides.provenance`, surfaced for convenience. */
  readonly provenance: ProvenanceMap;
  readonly warnings: readonly string[];
}

/** Normalized colour role → theme palette key. Roles not listed become `color-<role>` extra tokens. */
export const ROLE_TO_PALETTE: Readonly<Record<string, keyof Palette>> = {
  primary: 'brand',
  primaryDark: 'brandDark',
  primaryLight: 'brandLight',
  onPrimary: 'brandContrast',
  focus: 'borderFocus',
  background: 'bgSubtle',
  card: 'bg',
  surfaceMuted: 'bgMuted',
  text: 'fg',
  textMuted: 'fgMuted',
  textSubtle: 'fgSubtle',
  border: 'border',
  success: 'success',
  warning: 'warning',
  error: 'danger',
  info: 'info',
  successBg: 'successBg',
  warningBg: 'warningBg',
  errorBg: 'dangerBg',
  infoBg: 'infoBg',
  overlay: 'overlay',
};

/** Roles with no palette slot that override the derived `--maw-state-*` tokens (focus already follows `borderFocus`). */
const ROLE_TO_STATE_VAR: Readonly<Record<string, string>> = {
  hover: 'state-hover',
  active: 'state-active',
  disabled: 'state-disabled-bg',
  divider: 'color-divider',
};

const SPACING_KEYS = new Set(['xs', 'sm', 'md', 'lg', 'xl', 'xxl', 'xxxl']);
const RADIUS_KEYS = new Set(['none', 'sm', 'md', 'lg', 'xl', 'pill']);
const SHADOW_KEYS = new Set(['sm', 'md', 'lg', 'xl', 'inner', 'none']);
const TRANSITION_KEYS = new Set(['fast', 'normal', 'slow', 'smooth', 'bounce']);
const SHELL_KEYS = new Set(['bg', 'fg', 'fgMuted', 'border', 'blur', 'hover']);
const DEVICES = ['desktop', 'tablet', 'mobile'] as const;

const kebab = (name: string): string => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

export function shadowToCss(layers: readonly ShadowLayer[]): string {
  if (layers.length === 0) return 'none';
  return layers
    .map((l) => {
      const color = l.opacity === undefined ? l.color : `color-mix(in srgb, ${l.color} ${Math.round(l.opacity * 100)}%, transparent)`;
      return `${l.inset === true ? 'inset ' : ''}${l.offsetX}px ${l.offsetY}px ${l.blur}px ${l.spread}px ${color}`;
    })
    .join(', ');
}

/**
 * NormalizedDesign → ThemeOverrides. Works only from the normalized model, so every input format
 * (design.md, Figma, image, PDF, manual) reaches the theme the same way. Nothing the design stated is dropped:
 * values without a dedicated slot become `extraTokens`.
 */
export function generateTheme(design: NormalizedDesign): GeneratedTheme {
  const provenance: Record<string, TokenMeta> = {};
  const extraTokens: Record<string, string> = {};
  const warnings = [...design.warnings];

  const note = (path: string, token: TokenMeta): void => {
    provenance[path] = { source: token.source, confidence: token.confidence, ...(token.note === undefined ? {} : { note: token.note }) };
  };
  const extra = (key: string, token: Sourced<string>): void => {
    extraTokens[key] = token.value;
    note(`extraTokens.${key}`, token);
  };
  const extraTokensDark: Record<string, string> = {};
  const extraDark = (key: string, token: Sourced<string>): void => {
    extraTokensDark[key] = token.value;
    note(`extraTokensDark.${key}`, token);
  };

  // --- colours -----------------------------------------------------------------
  const mapRoles = (roles: ColorRoles | undefined, target: 'palette' | 'paletteDark'): Partial<Palette> => {
    const out: Partial<Palette> = {};
    if (roles === undefined) return out;
    const set = (key: keyof Palette, token: Sourced<string>): void => {
      out[key] = token.value;
      note(`${target}.${key}`, token);
    };
    for (const [role, token] of Object.entries(roles)) {
      const paletteKey = ROLE_TO_PALETTE[role];
      if (paletteKey !== undefined) set(paletteKey, token);
      const stateVar = ROLE_TO_STATE_VAR[role];
      if (target === 'palette') {
        if (stateVar !== undefined) extra(stateVar, token);
        if (paletteKey === undefined && stateVar === undefined && role !== 'surface') extra(`color-${kebab(role)}`, token);
      } else if (stateVar !== undefined) {
        extraDark(stateVar, token);
      }
    }
    // Palette distinguishes card (`bg`), nested surface (`bgMuted`) and canvas (`bgSubtle`); designs often name two.
    const surface = roles.surface;
    if (surface !== undefined) {
      if (roles.card !== undefined) set('bgMuted', surface);
      else set('bg', surface);
    }
    return out;
  };

  const palette = mapRoles(design.colors.light, 'palette');
  const paletteDark = mapRoles(design.colors.dark, 'paletteDark');
  for (const [name, token] of Object.entries(design.colors.gradients ?? {})) extra(`gradient-${kebab(name)}`, token);
  for (const [name, token] of Object.entries(design.colors.opacity ?? {})) {
    extra(`opacity-${kebab(name)}`, token);
    if (name === 'disabled') extra('state-disabled-opacity', token);
  }

  // --- typography ----------------------------------------------------------------
  const typography: TypographyOverrides = {};
  const t = design.typography;
  if (t.fontFamily !== undefined) { typography.fontFamily = t.fontFamily.value; note('typography.fontFamily', t.fontFamily); }
  if (t.monoFamily !== undefined) { typography.monoFamily = t.monoFamily.value; note('typography.monoFamily', t.monoFamily); }
  const scale: NonNullable<TypographyOverrides['scale']> = {};
  for (const [name, step] of Object.entries(t.scale)) {
    const out: NonNullable<TypographyOverrides['scale']>[string] = {};
    const fields = [
      ['size', 'size'], ['weight', 'weight'], ['lineHeight', 'lineHeight'], ['letterSpacing', 'letterSpacing'], ['family', 'family'],
    ] as const;
    for (const [prop, key] of fields) {
      const token = step[prop];
      if (token !== undefined) { out[key] = token.value; note(`typography.scale.${name}.${prop}`, token); }
    }
    if (step.textTransform !== undefined) extra(`text-${kebab(name)}-transform`, step.textTransform);
    scale[name] = out;
  }
  if (Object.keys(scale).length > 0) typography.scale = scale;

  // --- spacing, radii, borders, shadows, sizing ------------------------------------
  const spacing: NonNullable<ThemeOverrides['spacing']> = {};
  for (const [name, token] of Object.entries(design.spacing.scale)) {
    if (SPACING_KEYS.has(name)) {
      spacing[name as keyof typeof spacing] = token.value;
      note(`spacing.${name}`, token);
    } else extra(`space-${kebab(name)}`, { ...token, value: `${token.value}px` });
  }

  const responsive: Record<string, ResponsiveTokens[string]> = {};
  const setResponsive = (key: string, map: Partial<Record<(typeof DEVICES)[number], Sourced<string>>>): void => {
    const values = DEVICES.flatMap((d) => (map[d] === undefined ? [] : [[d, map[d]] as const]));
    if (values.length === 0) return;
    const distinct = new Set(values.map(([, token]) => token.value));
    if (distinct.size === 1) {
      const [, first] = values[0] as readonly [string, Sourced<string>];
      extra(key, first);
      return;
    }
    const out: Partial<Record<(typeof DEVICES)[number], string>> = {};
    for (const [device, token] of values) { out[device] = token.value; note(`responsive.${key}.${device}`, token); }
    responsive[key] = out;
  };
  for (const [name, map] of Object.entries(design.spacing.semantic ?? {})) setResponsive(`space-${kebab(name)}`, map);
  for (const [key, map] of Object.entries(design.responsive)) setResponsive(key, map);

  const radius: NonNullable<ThemeOverrides['radius']> = {};
  for (const [name, token] of Object.entries(design.radii)) {
    if (RADIUS_KEYS.has(name)) { radius[name as keyof typeof radius] = token.value; note(`radius.${name}`, token); }
    else extra(`radius-${kebab(name)}`, { ...token, value: `${token.value}px` });
  }

  for (const [name, token] of Object.entries(design.borders)) extra(`border-${kebab(name)}`, token);

  const shadows: NonNullable<ThemeOverrides['shadows']> = {};
  for (const [name, token] of Object.entries(design.shadows)) {
    const css = typeof token.value === 'string' ? token.value : shadowToCss(token.value);
    if (SHADOW_KEYS.has(name)) { shadows[name as keyof typeof shadows] = css; note(`shadows.${name}`, token); }
    else extra(`shadow-${kebab(name)}`, { ...token, value: css });
  }

  const transitions: NonNullable<ThemeOverrides['transitions']> = {};
  for (const [name, token] of Object.entries(design.transitions)) {
    if (TRANSITION_KEYS.has(name)) { transitions[name as keyof typeof transitions] = token.value; note(`transitions.${name}`, token); }
    else extra(`transition-${kebab(name)}`, token);
  }

  const shell: NonNullable<ThemeOverrides['shell']> = {};
  for (const [name, token] of Object.entries(design.shell)) {
    if (SHELL_KEYS.has(name)) { shell[name as keyof typeof shell] = token.value; note(`shell.${name}`, token); }
    else extra(`shell-${kebab(name)}`, token);
  }

  for (const [name, token] of Object.entries(design.sizing)) extra(`size-${kebab(name)}`, token);

  // --- components, extras, assets -----------------------------------------------------
  const components: Record<string, Record<string, string>> = {};
  for (const [name, props] of Object.entries(design.components)) {
    const out: Record<string, string> = {};
    for (const [prop, token] of Object.entries(props)) { out[prop] = token.value; note(`components.${name}.${prop}`, token); }
    components[name] = out;
  }
  for (const [key, token] of Object.entries(design.extras)) extra(key, token);

  const branding: NonNullable<ThemeOverrides['branding']> = {};
  if (design.assets.logo !== undefined) { branding.logo = design.assets.logo.value; note('branding.logo', design.assets.logo); }
  if (design.assets.favicon !== undefined) { branding.favicon = design.assets.favicon.value; note('branding.favicon', design.assets.favicon); }
  for (const font of design.assets.fonts ?? []) {
    if (font.url === undefined) warnings.push(`Font "${font.family}" has no source URL; it may be unavailable at runtime.`);
  }

  const overrides: ThemeOverrides = {
    ...(Object.keys(branding).length > 0 ? { branding } : {}),
    ...(Object.keys(palette).length > 0 ? { palette } : {}),
    ...(Object.keys(paletteDark).length > 0 ? { paletteDark } : {}),
    ...(Object.keys(spacing).length > 0 ? { spacing } : {}),
    ...(Object.keys(radius).length > 0 ? { radius } : {}),
    ...(Object.keys(shadows).length > 0 ? { shadows } : {}),
    ...(Object.keys(transitions).length > 0 ? { transitions } : {}),
    ...(Object.keys(shell).length > 0 ? { shell } : {}),
    ...(Object.keys(typography).length > 0 ? { typography } : {}),
    ...(Object.keys(components).length > 0 ? { components } : {}),
    ...(Object.keys(extraTokens).length > 0 ? { extraTokens } : {}),
    ...(Object.keys(extraTokensDark).length > 0 ? { extraTokensDark } : {}),
    ...(Object.keys(responsive).length > 0 ? { responsive } : {}),
    provenance,
  };
  return { overrides, provenance, warnings };
}
