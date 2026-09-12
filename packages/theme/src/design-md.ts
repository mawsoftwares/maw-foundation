import type { Palette, ShellTokens, TenantBranding, ThemeOverrides } from './index';

/**
 * design.md → MAW theme adapter.
 *
 * Goal: any design file (YAML frontmatter, bare YAML, markdown lists, CSS vars,
 * JSON/DTCG, unlabeled hex in prose) becomes a live app theme that fits our
 * token system — not a 1:1 dump of every color onto every surface.
 *
 * Pipeline:
 * 1. Parse whatever format the file uses.
 * 2. Map named roles → MAW tokens (primary→brand, background→canvas, surface→card, …).
 * 3. Adapt for feasibility: saturated accents stay on buttons/links; page chrome
 *    stays quiet and readable; missing neutrals are derived from brand; contrast
 *    is fixed when text would disappear.
 *
 * Well-labeled files (e.g. Evreghen) pass through with high fidelity.
 * Game-art / mood-board files (e.g. yellow “surface”) are remapped so the shell
 * stays usable while brand colors still drive the look.
 */

const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const BARE_HEX = /^([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const CSS_FUNC_COLOR = /^(transparent|currentcolor|rgba?\([^)]+\)|hsla?\([^)]+\)|oklch\([^)]+\)|oklab\([^)]+\)|hwb\([^)]+\)|lab\([^)]+\)|lch\([^)]+\)|color\([^)]+\))$/i;
const COLOR_IN_TEXT = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b|(?:rgba?|hsla?|oklch|oklab|hwb|lab|lch|color)\([^)]+\)/gi;
/** shadcn-style space HSL channel triples, e.g. `222.2 47.4% 11.2%` */
const SPACE_HSL = /^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%(?:\s*\/\s*([\d.]+%?))?$/;
const SCALE_KEYS = new Set(['default', 'DEFAULT', 'main', 'base', 'DEFAULT'.toLowerCase(), '500', '600', '400', 'value', '$value', 'hex', 'color']);
const NAMED_CSS_COLORS: Record<string, string> = {
  black: '#000000', white: '#ffffff', red: '#ff0000', blue: '#0000ff', green: '#008000',
  orange: '#ffa500', purple: '#800080', teal: '#008080', navy: '#000080', gray: '#808080',
  grey: '#808080', silver: '#c0c0c0', maroon: '#800000', olive: '#808000', lime: '#00ff00',
  aqua: '#00ffff', cyan: '#00ffff', fuchsia: '#ff00ff', magenta: '#ff00ff',
};

const FIELD_ALIASES: Record<string, keyof TenantBranding> = {
  'primary color': 'primaryColor',
  'brand color': 'primaryColor',
  primary: 'primaryColor',
  brand: 'primaryColor',
  'secondary color': 'secondaryColor',
  secondary: 'secondaryColor',
  'accent color': 'accentColor',
  accent: 'accentColor',
  'font family': 'fontFamily',
  font: 'fontFamily',
  'font-family': 'fontFamily',
  logo: 'logo',
  'logo url': 'logo',
  favicon: 'favicon',
  'border radius': 'borderRadius',
  radius: 'borderRadius',
  rounding: 'borderRadius',
};

const LIGHT_COLOR_ALIASES: Record<string, keyof Palette> = {
  primary: 'brand',
  'primary-color': 'brand',
  brand: 'brand',
  'brand-color': 'brand',
  'brand-primary': 'brand',
  'color-primary': 'brand',
  'theme-primary': 'brand',
  action: 'brand',
  cta: 'brand',
  'primary-strong': 'brandDark',
  'primary-dark': 'brandDark',
  'brand-dark': 'brandDark',
  accent: 'brandDark',
  'accent-color': 'brandDark',
  'primary-warm': 'brandLight',
  'primary-light': 'brandLight',
  'brand-light': 'brandLight',
  secondary: 'brandLight',
  'secondary-color': 'brandLight',
  'primary-focus': 'borderFocus',
  focus: 'borderFocus',
  'focus-color': 'borderFocus',
  'border-focus': 'borderFocus',
  ring: 'borderFocus',
  'on-primary': 'brandContrast',
  'primary-foreground': 'brandContrast',
  'brand-contrast': 'brandContrast',
  'brand-foreground': 'brandContrast',
  background: 'bgSubtle',
  'background-color': 'bgSubtle',
  bg: 'bgSubtle',
  canvas: 'bgSubtle',
  'page-background': 'bgSubtle',
  'app-background': 'bgSubtle',
  'bg-subtle': 'bgSubtle',
  'bg-canvas': 'bgSubtle',
  'on-background': 'fg',
  surface: 'bgMuted',
  'surface-color': 'bgMuted',
  'surface-soft': 'bgMuted',
  'surface-muted': 'bgMuted',
  'bg-muted': 'bgMuted',
  muted: 'bgMuted',
  'surface-elevated': 'bg',
  card: 'bg',
  'card-background': 'bg',
  'card-bg': 'bg',
  'bg-elevated': 'bg',
  'bg-surface': 'bg',
  'on-surface': 'fg',
  foreground: 'fg',
  'foreground-color': 'fg',
  fg: 'fg',
  text: 'fg',
  'text-color': 'fg',
  'on-surface-muted': 'fgMuted',
  'text-muted': 'fgMuted',
  'fg-muted': 'fgMuted',
  'foreground-muted': 'fgMuted',
  'muted-foreground': 'fgMuted',
  'muted-text': 'fgMuted',
  outline: 'border',
  border: 'border',
  'border-color': 'border',
  divider: 'border',
  'outline-strong': 'fgSubtle',
  success: 'success',
  'success-color': 'success',
  warning: 'warning',
  'warning-color': 'warning',
  danger: 'danger',
  'danger-color': 'danger',
  error: 'danger',
  'error-color': 'danger',
  destructive: 'danger',
  info: 'info',
  'info-color': 'info',
  'success-bg': 'successBg',
  'success-background': 'successBg',
  'status-production-bg': 'successBg',
  'warning-bg': 'warningBg',
  'status-mock-bg': 'warningBg',
  'danger-bg': 'dangerBg',
  'error-bg': 'dangerBg',
  'info-bg': 'infoBg',
  'status-development-bg': 'infoBg',
};

const DARK_COLOR_ALIASES: Record<string, keyof Palette> = {
  'dark-background': 'bgSubtle',
  'dark-bg': 'bgSubtle',
  'dark-canvas': 'bgSubtle',
  'dark-surface': 'bg',
  'dark-on-surface': 'fg',
  'dark-foreground': 'fg',
  'dark-text': 'fg',
  'dark-on-surface-muted': 'fgMuted',
  'dark-text-muted': 'fgMuted',
  'dark-muted': 'fgMuted',
  'dark-border': 'border',
};

const PALETTE_TO_CANONICAL: Partial<Record<keyof Palette, string>> = {
  bgSubtle: 'background',
  fg: 'on-surface',
  bgMuted: 'surface',
  bg: 'surface-elevated',
  fgMuted: 'on-surface-muted',
  border: 'outline',
  brand: 'primary',
  brandDark: 'primary-strong',
  brandLight: 'primary-warm',
  borderFocus: 'primary-focus',
  brandContrast: 'on-primary',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  info: 'info',
  successBg: 'status-production-bg',
  warningBg: 'status-mock-bg',
  infoBg: 'status-development-bg',
};

const DARK_PALETTE_TO_CANONICAL: Partial<Record<keyof Palette, string>> = {
  bgSubtle: 'dark-background',
  bg: 'dark-surface',
  fg: 'dark-on-surface',
  fgMuted: 'dark-on-surface-muted',
};

const SHELL_PATH_HINTS = ['shell', 'sidebar', 'header', 'chrome', 'topbar', 'top-bar', 'navbar', 'nav-bar', 'nav-item'];
const NEUTRAL_STEMS = new Set(['gray', 'grey', 'slate', 'zinc', 'neutral', 'stone', 'cool-gray', 'blue-gray']);

export interface DesignMdParseResult {
  readonly branding: TenantBranding;
  readonly overrides: ThemeOverrides;
  readonly recognized: readonly { field: string; value: string }[];
  readonly warnings: readonly string[];
  readonly name?: string;
}

export interface DesignMdNormalizeResult extends DesignMdParseResult {
  readonly canonical: string;
  readonly converted: boolean;
}

type YamlValue = string | number | boolean | YamlMap;
interface YamlMap { [key: string]: YamlValue }

function stripMarkdownEmphasis(text: string): string {
  return text.replace(/\*\*|__|\*|_|`/g, '').trim();
}

function unquote(text: string): string {
  const trimmed = text.trim().replace(/[;,]+$/, '').trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2)
    || (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2)
  ) {
    return trimmed.slice(1, -1).replace(/\\(["'\\])/g, '$1');
  }
  return trimmed;
}

function parseScalar(raw: string): string | number | boolean {
  const v = unquote(raw);
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v === 'null' || v === '~' || v === '') return '';
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}

function isYamlMap(value: YamlValue | undefined): value is YamlMap {
  return typeof value === 'object' && value !== null;
}

function getPath(root: YamlMap, path: string): YamlValue | undefined {
  const parts = path.split('.');
  let current: YamlValue = root;
  for (const part of parts) {
    if (!isYamlMap(current)) return undefined;
    current = current[part] as YamlValue;
    if (current === undefined) return undefined;
  }
  return current;
}

function asString(value: YamlValue | undefined): string | undefined {
  if (value === undefined || value === '') return undefined;
  if (typeof value === 'object') return undefined;
  return String(value);
}

function resolveTokenRefs(value: string, root: YamlMap): string {
  return value.replace(/\{([A-Za-z0-9_.-]+)\}/g, (full, path: string) => {
    const found = asString(getPath(root, path));
    return found ?? full;
  });
}

function normalizeTokenKey(key: string): string {
  return key
    .trim()
    .replace(/['"]/g, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function isCssColor(value: string): boolean {
  const trimmed = value.trim();
  if (HEX_COLOR.test(trimmed)) return true;
  if (BARE_HEX.test(trimmed)) return true;
  if (CSS_FUNC_COLOR.test(trimmed)) return true;
  if (SPACE_HSL.test(trimmed)) return true;
  if (NAMED_CSS_COLORS[trimmed.toLowerCase()] !== undefined) return true;
  return false;
}

/** Normalize any color-ish string into a CSS color the browser can use. */
function extractCssColor(value: string): string | undefined {
  const trimmed = unquote(value).trim();
  if (trimmed === '') return undefined;
  if (HEX_COLOR.test(trimmed)) return trimmed;
  if (BARE_HEX.test(trimmed)) return `#${trimmed}`;
  if (NAMED_CSS_COLORS[trimmed.toLowerCase()] !== undefined) {
    return NAMED_CSS_COLORS[trimmed.toLowerCase()];
  }
  if (CSS_FUNC_COLOR.test(trimmed)) return trimmed;
  const spaceHsl = trimmed.match(SPACE_HSL);
  if (spaceHsl !== null) {
    const alpha = spaceHsl[4];
    return alpha !== undefined
      ? `hsl(${spaceHsl[1]} ${spaceHsl[2]}% ${spaceHsl[3]}% / ${alpha})`
      : `hsl(${spaceHsl[1]} ${spaceHsl[2]}% ${spaceHsl[3]}%)`;
  }
  const match = trimmed.match(COLOR_IN_TEXT);
  if (match?.[0] !== undefined) return match[0];
  return undefined;
}

function collectAllColors(text: string): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  const push = (c: string) => {
    const key = c.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    found.push(c);
  };
  for (const match of text.matchAll(COLOR_IN_TEXT)) {
    if (match[0] !== undefined) push(match[0]);
  }
  for (const line of text.split(/\r?\n/)) {
    const cleaned = line.replace(/^[-*|]\s*/, '').trim();
    const color = extractCssColor(cleaned);
    if (color !== undefined) push(color);
    const afterColon = cleaned.includes(':') ? cleaned.slice(cleaned.indexOf(':') + 1) : '';
    const fromPair = extractCssColor(afterColon);
    if (fromPair !== undefined) push(fromPair);
  }
  return found;
}

function parseHexRgb(color: string): { r: number; g: number; b: number } | null {
  if (HEX_COLOR.test(color)) {
    let h = color.slice(1);
    if (h.length === 3) h = `${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
    return {
      r: Number.parseInt(h.slice(0, 2), 16),
      g: Number.parseInt(h.slice(2, 4), 16),
      b: Number.parseInt(h.slice(4, 6), 16),
    };
  }
  const rgb = color.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
  if (rgb !== null) {
    return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) };
  }
  return null;
}

function relativeLuminance(color: string): number {
  const rgb = parseHexRgb(color);
  if (rgb === null) return 0.5;
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

function colorSaturation(color: string): number {
  const rgb = parseHexRgb(color);
  if (rgb === null) return 0.5;
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  if (max === 0) return 0;
  return (max - min) / max;
}

function mixHex(a: string, b: string, t: number): string | undefined {
  const left = parseHexRgb(a);
  const right = parseHexRgb(b);
  if (left === null || right === null) return undefined;
  const mix = (x: number, y: number) => Math.round(x + (y - x) * t);
  const hex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
  return `#${hex(mix(left.r, right.r))}${hex(mix(left.g, right.g))}${hex(mix(left.b, right.b))}`;
}

function contrastOn(background: string): string {
  return relativeLuminance(background) > 0.45 ? '#0f172a' : '#ffffff';
}

function contrastRatio(a: string, b: string): number {
  const L1 = relativeLuminance(a);
  const L2 = relativeLuminance(b);
  const hi = Math.max(L1, L2);
  const lo = Math.min(L1, L2);
  return (hi + 0.05) / (lo + 0.05);
}

interface ScoredColor {
  readonly c: string;
  readonly lum: number;
  readonly sat: number;
  readonly neutral: boolean;
  readonly nearWhite: boolean;
  readonly nearBlack: boolean;
}

function scoreColor(c: string): ScoredColor {
  const lum = relativeLuminance(c);
  const sat = colorSaturation(c);
  return {
    c,
    lum,
    sat,
    neutral: sat < 0.22,
    nearWhite: lum > 0.9,
    nearBlack: lum < 0.1,
  };
}

/**
 * Build a readable product palette from a bag of colors.
 * Neutrals → canvas / cards / text. Saturated mid-tones → primary only.
 */
function inferPaletteFromColors(
  colors: string[],
  overrides: ThemeOverrides,
  recognized: { field: string; value: string }[],
): void {
  if (colors.length === 0) return;
  const palette = overrides.palette ?? (overrides.palette = {});
  const scored = colors.map(scoreColor);
  const neutrals = scored.filter((s) => s.neutral || s.nearWhite || s.nearBlack);
  const accents = scored.filter((s) => !s.neutral && !s.nearWhite && !s.nearBlack);
  const byLum = [...scored].sort((a, b) => a.lum - b.lum);
  const lightMode = (byLum[byLum.length - 1]?.lum ?? 1) >= 0.55
    || scored.filter((s) => s.lum > 0.7).length >= scored.filter((s) => s.lum < 0.35).length;

  const brand = accents.sort((a, b) => b.sat - a.sat || Math.abs(0.45 - a.lum) - Math.abs(0.45 - b.lum))[0]
    ?? scored.filter((s) => s.sat > 0.15).sort((a, b) => b.sat - a.sat)[0];

  if (palette.brand === undefined && brand !== undefined) {
    palette.brand = brand.c;
    palette.borderFocus = brand.c;
    record(recognized, 'inferred.primary', brand.c);
  }

  if (lightMode) {
    const paper = [...neutrals].filter((s) => s.lum > 0.85).sort((a, b) => b.lum - a.lum)[0]
      ?? [...scored].filter((s) => s.lum > 0.85).sort((a, b) => a.sat - b.sat)[0];
    const ink = [...neutrals].filter((s) => s.lum < 0.35).sort((a, b) => a.lum - b.lum)[0]
      ?? byLum[0];
    const white = scored.find((s) => s.nearWhite && s.sat < 0.08)?.c ?? '#ffffff';

    if (palette.bgSubtle === undefined && paper !== undefined) {
      // Prefer a soft paper canvas, not pure white, so cards can lift
      palette.bgSubtle = paper.nearWhite && paper.sat < 0.05 && scored.some((s) => s.lum > 0.85 && s.sat > 0.03)
        ? (scored.filter((s) => s.lum > 0.85 && s.sat > 0.03).sort((a, b) => a.lum - b.lum)[0]?.c ?? paper.c)
        : paper.c;
      record(recognized, 'inferred.background', palette.bgSubtle);
    }
    if (palette.bg === undefined) {
      palette.bg = white;
      record(recognized, 'inferred.surface-elevated', white);
    }
    if (palette.fg === undefined && ink !== undefined) {
      palette.fg = ink.c;
      record(recognized, 'inferred.on-surface', ink.c);
    }
  } else {
    const voidBg = byLum[0];
    const mist = [...byLum].reverse().find((s) => s.lum > 0.7) ?? byLum[byLum.length - 1];
    if (palette.bgSubtle === undefined && voidBg !== undefined) {
      palette.bgSubtle = voidBg.c;
      record(recognized, 'inferred.background', voidBg.c);
    }
    if (palette.bg === undefined) {
      const panel = byLum.find((s) => s.lum > 0.08 && s.lum < 0.25) ?? voidBg;
      if (panel !== undefined) palette.bg = panel.c;
    }
    if (palette.fg === undefined && mist !== undefined) {
      palette.fg = mist.c;
      record(recognized, 'inferred.on-surface', mist.c);
    }
  }
}

/**
 * Adapt harvested colors into MAW roles so any design.md is feasible in-app.
 * Preserves quiet author neutrals; relocates loud mislabeled surfaces to accents.
 */
function adaptPaletteToSystem(
  overrides: ThemeOverrides,
  recognized: { field: string; value: string }[],
): boolean {
  const palette = overrides.palette ?? (overrides.palette = {});
  const cleared = new Set<string>();

  const rescueAccent = (value: string, prefer: 'brand' | 'brandLight' | 'brandDark' | 'info'): void => {
    if (prefer === 'brand' && palette.brand === undefined) {
      palette.brand = value;
      palette.borderFocus = value;
      record(recognized, 'adapted.primary', value);
      return;
    }
    if (prefer === 'brandLight' && (palette.brandLight === undefined || colorSaturation(palette.brandLight) < 0.15)) {
      palette.brandLight = value;
      record(recognized, 'adapted.primary-warm', value);
      return;
    }
    if (prefer === 'brandDark' && palette.brandDark === undefined) {
      palette.brandDark = value;
      return;
    }
    if (prefer === 'info' && palette.info === undefined) {
      palette.info = value;
      record(recognized, 'adapted.info', value);
    }
  };

  const isLoudSurface = (value: string): boolean => {
    // Only reclassify hex/rgb we can measure — leave hsl/oklch author values alone
    if (parseHexRgb(value) === null) return false;
    const scored = scoreColor(value);
    if (scored.nearWhite && scored.sat < 0.15) return false;
    return scored.sat >= 0.28;
  };

  // Strip loud colors off surface / border / muted-text roles
  for (const role of ['bgSubtle', 'bg', 'bgMuted', 'border'] as const) {
    const value = palette[role];
    if (value === undefined || !isLoudSurface(value)) continue;

    const scored = scoreColor(value);
    if (scored.lum > 0.55) rescueAccent(value, palette.brand === undefined ? 'brand' : 'brandLight');
    else if (scored.lum > 0.25) rescueAccent(value, palette.brand === undefined ? 'brand' : 'brandDark');
    else rescueAccent(value, 'brandDark');

    delete palette[role];
    cleared.add(role);
    record(recognized, `adapted.cleared-${role}`, value);
  }

  if (palette.fgMuted !== undefined && scoreColor(palette.fgMuted).sat > 0.25) {
    rescueAccent(palette.fgMuted, 'info');
    delete palette.fgMuted;
    cleared.add('fgMuted');
    record(recognized, 'adapted.cleared-fgMuted', palette.info ?? '');
  }

  if (palette.fg !== undefined && parseHexRgb(palette.fg) !== null) {
    const ink = scoreColor(palette.fg);
    if (ink.sat > 0.45 && ink.lum > 0.35) {
      const deepened = mixHex(palette.fg, '#0f172a', 0.45) ?? palette.fg;
      if (palette.brandDark === undefined) palette.brandDark = palette.fg;
      palette.fg = deepened;
      record(recognized, 'adapted.text', deepened);
    }
  }

  let brand = palette.brand;
  if (brand !== undefined && palette.brandLight !== undefined) {
    const b = scoreColor(brand);
    const light = scoreColor(palette.brandLight);
    if (b.lum > 0.72 && light.sat > 0.3 && light.lum < b.lum) {
      palette.brandLight = brand;
      palette.brand = light.c;
      brand = light.c;
      palette.borderFocus = brand;
    }
  }
  if (brand === undefined && palette.brandLight !== undefined) {
    palette.brand = palette.brandLight;
    brand = palette.brand;
    palette.borderFocus = brand;
  }

  const lightIntent = (() => {
    const canvas = palette.bgSubtle ?? palette.bg;
    if (canvas !== undefined) return relativeLuminance(canvas) >= 0.45;
    return true;
  })();

  if (brand !== undefined) {
    palette.brandContrast = contrastOn(brand);
    if (palette.borderFocus === undefined) palette.borderFocus = brand;
    const brandSat = colorSaturation(brand);
    if (palette.brandLight === undefined && brandSat > 0.08) {
      palette.brandLight = mixHex(brand, '#ffffff', 0.35) ?? brand;
    }
    if (palette.brandDark === undefined && brandSat > 0.08) {
      palette.brandDark = mixHex(brand, '#000000', 0.28) ?? brand;
    }
  }

  if (lightIntent) {
    const paper = brand !== undefined
      ? (mixHex(brand, '#ffffff', 0.93) ?? '#faf8f5')
      : '#f8fafc';
    const well = brand !== undefined
      ? (mixHex(brand, '#ffffff', 0.88) ?? '#f1f5f9')
      : '#f1f5f9';

    // Only replace surfaces we cleared or that were missing — keep author neutrals
    // Pure white page + rescued brand yellows → soft paper canvas so white cards can lift
    if (
      brand !== undefined
      && cleared.size > 0
      && palette.bgSubtle !== undefined
      && scoreColor(palette.bgSubtle).nearWhite
      && scoreColor(palette.bgSubtle).sat < 0.05
    ) {
      palette.bgSubtle = paper;
    }
    if (palette.bgSubtle === undefined || cleared.has('bgSubtle')) {
      palette.bgSubtle = paper;
    }
    if (palette.bg === undefined || cleared.has('bg')) {
      palette.bg = '#ffffff';
    }
    if (palette.bgMuted === undefined || cleared.has('bgMuted')) {
      palette.bgMuted = well;
    }
    if (palette.border === undefined || cleared.has('border')) {
      palette.border = mixHex(palette.bgSubtle, palette.fg ?? '#0f172a', 0.12) ?? '#e8e4dc';
    }
    if (palette.fg === undefined) {
      palette.fg = brand !== undefined && colorSaturation(brand) > 0.08
        ? (mixHex(brand, '#0f172a', 0.78) ?? '#0f172a')
        : '#0f172a';
    }
    if (
      parseHexRgb(palette.fg) !== null
      && parseHexRgb(palette.bgSubtle) !== null
      && contrastRatio(palette.fg, palette.bgSubtle) < 4.5
    ) {
      palette.fg = '#0f172a';
    }
    if (palette.fgMuted === undefined || cleared.has('fgMuted')) {
      palette.fgMuted = (parseHexRgb(palette.fg) !== null
        ? mixHex(palette.fg, palette.bgSubtle, 0.4)
        : undefined) ?? '#6b7280';
    }
    if (palette.fgSubtle === undefined) {
      palette.fgSubtle = (parseHexRgb(palette.fgMuted) !== null
        ? mixHex(palette.fgMuted, palette.bgSubtle, 0.35)
        : undefined) ?? '#9ca3af';
    }
  } else {
    if (palette.bgSubtle === undefined) palette.bgSubtle = '#09090b';
    if (palette.bg === undefined) palette.bg = '#18181b';
    if (palette.bgMuted === undefined) palette.bgMuted = '#27272a';
    if (palette.fg === undefined) palette.fg = '#fafafa';
    if (palette.fgMuted === undefined) palette.fgMuted = '#a1a1aa';
    if (palette.border === undefined) palette.border = '#27272a';
    if (brand !== undefined) palette.brandContrast = contrastOn(brand);
  }

  if (palette.success !== undefined && palette.successBg === undefined) {
    palette.successBg = mixHex(palette.success, lightIntent ? '#ffffff' : '#000000', lightIntent ? 0.9 : 0.85) ?? palette.success;
  }
  if (palette.danger !== undefined && palette.dangerBg === undefined) {
    palette.dangerBg = mixHex(palette.danger, lightIntent ? '#ffffff' : '#000000', lightIntent ? 0.9 : 0.85) ?? palette.danger;
  }
  if (palette.warning !== undefined && palette.warningBg === undefined) {
    palette.warningBg = mixHex(palette.warning, lightIntent ? '#ffffff' : '#000000', lightIntent ? 0.88 : 0.85) ?? palette.warning;
  }
  if (palette.info !== undefined && palette.infoBg === undefined) {
    palette.infoBg = mixHex(palette.info, lightIntent ? '#ffffff' : '#000000', lightIntent ? 0.9 : 0.85) ?? palette.info;
  }

  let shell = overrides.shell;
  const shellBg = shell?.bg;
  const shellLooksDark = shellBg !== undefined && (
    shellBg.toLowerCase().includes('rgba(0, 0, 0')
    || shellBg.toLowerCase().includes('rgba(0,0,0')
    || (parseHexRgb(shellBg) !== null && relativeLuminance(shellBg) < 0.35)
  );

  if (shell !== undefined && shellBg !== undefined && brand !== undefined && shellBg.toLowerCase() === brand.toLowerCase()) {
    delete shell.bg;
    delete shell.fg;
    delete shell.fgMuted;
    delete shell.border;
    delete shell.blur;
    delete shell.hover;
  } else if (shell !== undefined && shellLooksDark) {
    shell.fg = shell.fg ?? '#ffffff';
    shell.fgMuted = shell.fgMuted ?? 'rgba(255, 255, 255, 0.70)';
    shell.border = shell.border ?? 'rgba(255, 255, 255, 0.10)';
    shell.hover = shell.hover ?? 'rgba(255, 255, 255, 0.10)';
    shell.blur = shell.blur ?? '12px';
    const opaqueShell = !shellBg.includes('rgba') && !shellBg.includes('rgb');
    if (opaqueShell && shellBg.startsWith('#') && shellBg.length <= 7) {
      shell.bg = hexToRgba(shellBg, 0.72);
    }
  } else if (lightIntent) {
    // Light design systems (Vivid Curator, etc.): quiet sidebar, no frosted black chrome
    shell = overrides.shell ?? (overrides.shell = {});
    if (shell.bg === undefined) {
      // Prefer canvas/muted over elevated white so cards still lift off the shell
      shell.bg = palette.bgSubtle ?? palette.bgMuted ?? palette.bg ?? '#f8fafc';
    }
    if (shell.fg === undefined) shell.fg = palette.fg ?? '#0f172a';
    if (shell.fgMuted === undefined) shell.fgMuted = palette.fgMuted ?? '#64748b';
    if (shell.border === undefined) {
      shell.border = palette.border ?? '#e2e8f0';
    }
    if (shell.hover === undefined) {
      shell.hover = brand !== undefined
        ? (mixHex(brand, '#ffffff', 0.9) ?? palette.bgMuted ?? '#f1f5f9')
        : (palette.bgMuted ?? '#f1f5f9');
    }
    if (shell.blur === undefined) shell.blur = '0px';
  }

  return cleared.size > 0;
}

function nestedColorValue(node: YamlMap): string | undefined {
  for (const key of ['$value', 'value', 'hex', 'color', 'DEFAULT', 'default', 'main', 'base', '500', '600']) {
    const raw = asString(node[key]);
    if (raw !== undefined) {
      const color = extractCssColor(raw);
      if (color !== undefined) return color;
    }
  }
  return undefined;
}

function isScaleKey(key: string): boolean {
  return SCALE_KEYS.has(key) || SCALE_KEYS.has(key.toLowerCase()) || /^\d{2,3}$/.test(key);
}

function hexToRgba(hex: string, opacity: number): string {
  let h = hex.replace('#', '');
  if (h.length === 3) h = `${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
  const r = Number.parseInt(h.slice(0, 2), 16);
  const g = Number.parseInt(h.slice(2, 4), 16);
  const b = Number.parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function parsePx(value: string): number | undefined {
  const trimmed = value.trim();
  if (/^-?\d+(\.\d+)?rem$/i.test(trimmed)) {
    return Number.parseFloat(trimmed) * 16;
  }
  const n = Number.parseInt(trimmed.replace(/px$/i, ''), 10);
  return Number.isNaN(n) || n < 0 ? undefined : n;
}

function looksLikeUnquotedHex(value: string): boolean {
  const first = value.trim().split(/\s+/)[0] ?? '';
  return HEX_COLOR.test(first);
}

/**
 * Indent-based YAML map parser. Supports nested maps, quoted keys/values, and
 * scalars. Unquoted hex colors (`primary: #fe6e00`) are kept as colors, not comments.
 */
function parseYamlMap(text: string): YamlMap {
  const root: YamlMap = {};
  const stack: { indent: number; obj: YamlMap }[] = [{ indent: -1, obj: root }];
  const lines = text.replace(/\t/g, '  ').split(/\r?\n/);

  for (const raw of lines) {
    if (raw.trim() === '' || raw.trim().startsWith('#')) continue;
    const indent = raw.match(/^ */)?.[0].length ?? 0;
    const line = raw.trim();
    const match = line.match(
      /^("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[^\s:#][^:]*?)\s*:\s*(.*?)$/,
    );
    if (match === null) continue;

    const key = unquote(match[1] ?? '');
    if (key === '') continue;
    let rest = (match[2] ?? '').trim();
    if (rest.startsWith('#')) {
      rest = looksLikeUnquotedHex(rest) ? (rest.trim().split(/\s+/)[0] ?? '') : '';
    } else if (rest.includes(' #') && !(rest.startsWith('"') || rest.startsWith("'"))) {
      rest = rest.slice(0, rest.indexOf(' #')).trim();
    }

    while (stack.length > 1 && indent <= (stack[stack.length - 1]?.indent ?? -1)) {
      stack.pop();
    }
    const parent = stack[stack.length - 1]?.obj ?? root;

    if (rest === '' || rest === '|' || rest === '>') {
      const child: YamlMap = {};
      parent[key] = child;
      stack.push({ indent, obj: child });
    } else {
      parent[key] = parseScalar(rest);
    }
  }

  return root;
}

function extractFrontmatter(content: string): { yaml: string | null; body: string } {
  const trimmedStart = content.replace(/^\uFEFF/, '');
  const start = trimmedStart.match(/^\s*---\s*(?:\r?\n|$)/);
  if (start === null) {
    if (/^(version|name|colors|palette|tokens|theme|typography|rounded|spacing|\$schema|semantic)\s*:/m.test(trimmedStart)) {
      return { yaml: trimmedStart, body: '' };
    }
    return { yaml: null, body: content };
  }
  const afterOpen = trimmedStart.slice(start[0].length);
  const close = afterOpen.search(/\r?\n---\s*(?:\r?\n|$)/);
  if (close === -1) return { yaml: afterOpen, body: '' };
  const closeLine = afterOpen.slice(close).match(/^\r?\n---\s*/);
  const yaml = afterOpen.slice(0, close);
  const body = afterOpen.slice(close + (closeLine?.[0].length ?? 0));
  return { yaml, body };
}

function extractFencedBlocks(content: string): { lang: string; body: string }[] {
  const blocks: { lang: string; body: string }[] = [];
  const fence = /```([a-zA-Z0-9_-]*)[^\n]*\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = fence.exec(content)) !== null) {
    blocks.push({ lang: (match[1] ?? '').toLowerCase(), body: match[2] ?? '' });
  }
  return blocks;
}

function jsonToYamlMap(text: string): YamlMap | null {
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as YamlMap;
    }
  } catch {
    return null;
  }
  return null;
}

function collectYamlRoots(content: string): YamlMap[] {
  const roots: YamlMap[] = [];
  const trimmed = content.replace(/^\uFEFF/, '').trim();

  // Whole-file JSON design tokens
  if (trimmed.startsWith('{')) {
    const json = jsonToYamlMap(trimmed);
    if (json !== null) roots.push(json);
  }

  const { yaml } = extractFrontmatter(content);
  if (yaml !== null && yaml.trim() !== '') roots.push(parseYamlMap(yaml));

  for (const block of extractFencedBlocks(content)) {
    if (block.lang === 'json' || block.lang === 'jsonc') {
      const json = jsonToYamlMap(block.body);
      if (json !== null) roots.push(json);
      continue;
    }
    if (block.lang === 'css' || block.lang === 'scss') {
      // CSS blocks are harvested via harvestLooseLines / collectAllColors
      continue;
    }
    if (block.lang === '' || block.lang === 'yaml' || block.lang === 'yml' || block.lang === 'toml') {
      if (/:/.test(block.body)) roots.push(parseYamlMap(block.body));
    }
  }

  // Bare YAML/TOML-looking documents without frontmatter fences
  if (roots.length === 0 && /^(colors|palette|tokens|theme|\$schema)\s*:/m.test(trimmed)) {
    roots.push(parseYamlMap(trimmed));
  }
  return roots;
}

function pathLooksDark(path: readonly string[], key: string): boolean {
  const joined = [...path, key].map(normalizeTokenKey).join('-');
  return joined.includes('dark');
}

function pathLooksShell(path: readonly string[], key: string): boolean {
  const joined = [...path, key].map(normalizeTokenKey).join('-');
  return SHELL_PATH_HINTS.some((hint) => joined.includes(hint));
}

function resolveLightRole(key: string): keyof Palette | undefined {
  const norm = normalizeTokenKey(key)
    .replace(/^(colors?|palette|tokens?|theme|semantic|sys|ref)-/, '');
  const direct = LIGHT_COLOR_ALIASES[norm] ?? LIGHT_COLOR_ALIASES[key.toLowerCase()];
  if (direct !== undefined) return direct;

  const scale = norm.match(/^(.+?)-(50|100|200|300|400|500|600|700|800|900|950)$/);
  if (scale?.[1] === undefined || scale[2] === undefined) return undefined;
  const stem = scale[1];
  const step = scale[2];

  if (NEUTRAL_STEMS.has(stem)) {
    if (step === '50' || step === '100') return 'bgSubtle';
    if (step === '200' || step === '300') return 'border';
    if (step === '400' || step === '500') return 'fgMuted';
    return 'fg';
  }

  const base = LIGHT_COLOR_ALIASES[stem];
  if (base === 'brand') {
    if (step === '50' || step === '100' || step === '200' || step === '300') return 'brandLight';
    if (step === '700' || step === '800' || step === '900' || step === '950') return 'brandDark';
    return 'brand';
  }
  return base;
}

function resolveDarkRole(key: string): keyof Palette | undefined {
  const norm = normalizeTokenKey(key);
  return DARK_COLOR_ALIASES[norm] ?? resolveLightRole(norm.replace(/^dark-/, ''));
}

function emptyOverrides(): ThemeOverrides {
  return {
    branding: {},
    palette: {},
    paletteDark: {},
    radius: {},
    spacing: {},
    shadows: {},
    transitions: {},
    typography: {},
    shell: {},
  };
}

function record(
  recognized: { field: string; value: string }[],
  field: string,
  value: string,
): void {
  recognized.push({ field, value });
}

function assignPalette(
  overrides: ThemeOverrides,
  role: keyof Palette,
  value: string,
  dark: boolean,
  recognized: { field: string; value: string }[],
  field: string,
  overwrite: boolean,
): void {
  const bucket = dark ? overrides.paletteDark : overrides.palette;
  if (bucket === undefined) return;
  if (!overwrite && bucket[role] !== undefined) return;
  bucket[role] = value;
  record(recognized, field, value);
}

function assignShell(
  overrides: ThemeOverrides,
  key: string,
  value: string,
  recognized: { field: string; value: string }[],
  overwrite: boolean,
): void {
  const shell = overrides.shell ?? (overrides.shell = {});
  const norm = normalizeTokenKey(key);
  if (/(background|bg)$/.test(norm) || norm === 'shell-base') {
    if (overwrite || shell.bg === undefined) {
      shell.bg = value;
      record(recognized, 'shell.bg', value);
    }
    return;
  }
  if (/(text|foreground|fg|on-shell|color)$/.test(norm) && !norm.includes('border')) {
    if (overwrite || shell.fg === undefined) {
      shell.fg = value;
      record(recognized, 'shell.fg', value);
    }
    return;
  }
  if (norm.includes('border')) {
    if (overwrite || shell.border === undefined) {
      shell.border = value;
      record(recognized, 'shell.border', value);
    }
  }
}

function assignColorToken(
  overrides: ThemeOverrides,
  path: readonly string[],
  key: string,
  raw: string,
  recognized: { field: string; value: string }[],
  overwrite: boolean,
): void {
  const value = extractCssColor(raw);
  if (value === undefined) return;
  const field = [...path, key].join('.');
  if (pathLooksShell(path, key)) {
    assignShell(overrides, key, value, recognized, overwrite);
    return;
  }
  if (pathLooksDark(path, key)) {
    const role = resolveDarkRole(key) ?? resolveDarkRole([...path, key].join('-'));
    if (role !== undefined) assignPalette(overrides, role, value, true, recognized, field, overwrite);
    return;
  }

  const parent = path[path.length - 1] ?? '';
  const parentNorm = normalizeTokenKey(parent);
  const keyNorm = normalizeTokenKey(key);

  // primary.foreground / brand.on → brandContrast; primary.DEFAULT → brand
  if ((parentNorm === 'primary' || parentNorm === 'brand' || parentNorm === 'accent') && (
    keyNorm === 'foreground' || keyNorm === 'on' || keyNorm === 'contrast' || keyNorm === 'text'
  )) {
    assignPalette(overrides, 'brandContrast', value, false, recognized, field, overwrite);
    return;
  }
  if (isScaleKey(key) || keyNorm === 'default') {
    const parentRole = resolveLightRole(parent);
    if (parentRole !== undefined) {
      assignPalette(overrides, parentRole, value, false, recognized, field, overwrite);
      return;
    }
  }

  const role = resolveLightRole(key)
    ?? resolveLightRole([...path, key].join('-'))
    ?? resolveLightRole(parent);
  if (role !== undefined) assignPalette(overrides, role, value, false, recognized, field, overwrite);
}

function walkYamlForTokens(
  node: YamlMap,
  path: string[],
  overrides: ThemeOverrides,
  recognized: { field: string; value: string }[],
  overwrite: boolean,
): void {
  // Nested color object: primary: { DEFAULT: "#x", foreground: "#y" } or DTCG { $value: "#x" }
  const nestedColor = nestedColorValue(node);
  if (nestedColor !== undefined && path.length > 0) {
    const leaf = path[path.length - 1] ?? 'color';
    assignColorToken(overrides, path.slice(0, -1), leaf, nestedColor, recognized, overwrite);
  }

  for (const [key, value] of Object.entries(node)) {
    if (isYamlMap(value)) {
      // Prefer scale DEFAULT as the parent token color
      const scaleColor = nestedColorValue(value);
      if (scaleColor !== undefined) {
        assignColorToken(overrides, path, key, scaleColor, recognized, overwrite);
        // Still walk children for foreground / on-* siblings
        for (const [childKey, childVal] of Object.entries(value)) {
          if (isScaleKey(childKey)) continue;
          if (isYamlMap(childVal)) {
            walkYamlForTokens(childVal, [...path, key, childKey], overrides, recognized, overwrite);
            continue;
          }
          const childStr = asString(childVal);
          if (childStr === undefined) continue;
          const childColor = extractCssColor(childStr);
          if (childColor !== undefined) {
            assignColorToken(overrides, [...path, key], childKey, childColor, recognized, overwrite);
          }
        }
        continue;
      }
      walkYamlForTokens(value, [...path, key], overrides, recognized, overwrite);
      continue;
    }
    const str = asString(value);
    if (str === undefined) continue;
    if (path[0] === 'components' && !pathLooksShell(path, key)) {
      const component = normalizeTokenKey(path[1] ?? '');
      const color = extractCssColor(str);
      if (color !== undefined && (component.includes('primary') || component.includes('brand') || component.includes('button'))) {
        assignPalette(overrides, 'brand', color, false, recognized, [...path, key].join('.'), overwrite);
      }
      continue;
    }
    const color = extractCssColor(str);
    if (color !== undefined) {
      assignColorToken(overrides, path, key, color, recognized, overwrite);
      continue;
    }
    const norm = normalizeTokenKey(key);
    if ((norm === 'font-family' || norm === 'font' || norm === 'sans' || norm === 'family') && /[A-Za-z]/.test(str)) {
      if (overwrite || overrides.typography?.fontFamily === undefined) {
        const typography = overrides.typography ?? (overrides.typography = {});
        typography.fontFamily = str;
        const branding = overrides.branding ?? (overrides.branding = {});
        branding.fontFamily = str;
        record(recognized, 'typography.fontFamily', str);
      }
    }
    if ((norm === 'border-radius' || norm === 'radius' || norm === 'rounding') && path.length <= 3) {
      const radius = parsePx(str);
      if (radius !== undefined && (overwrite || overrides.radius?.md === undefined)) {
        const radiusMap = overrides.radius ?? (overrides.radius = {});
        radiusMap.md = radius;
        const branding = overrides.branding ?? (overrides.branding = {});
        branding.borderRadius = radius;
        record(recognized, 'rounded.md', String(radius));
      }
    }
  }
}

function applyYamlColors(
  colors: YamlMap,
  root: YamlMap,
  palette: Partial<Palette>,
  recognized: { field: string; value: string }[],
  warnings: string[],
  map: Record<string, keyof Palette>,
  prefix: string,
  allowLightFallback = true,
): void {
  for (const [key, raw] of Object.entries(colors)) {
    const field = map[key] ?? (allowLightFallback ? resolveLightRole(key) : undefined);
    if (field === undefined) continue;
    const resolved = resolveTokenRefs(asString(raw) ?? '', root);
    const color = extractCssColor(resolved) ?? (isCssColor(resolved) ? resolved : '');
    if (color === '') {
      warnings.push(`"${prefix}${key}" value "${resolved}" is not a valid color — skipped`);
      continue;
    }
    palette[field] = color;
    recognized.push({ field: `${prefix}${key}`, value: color });
  }
}

function firstFontFamily(typography: YamlMap): string | undefined {
  const direct = asString(typography.fontFamily) ?? asString(typography['font-family']);
  if (direct !== undefined && direct !== '') return direct;
  for (const value of Object.values(typography)) {
    if (!isYamlMap(value)) continue;
    const nested = asString(value.fontFamily) ?? asString(value['font-family']);
    if (nested !== undefined && nested !== '') return nested;
  }
  return undefined;
}

function firstMonoFamily(typography: YamlMap): string | undefined {
  for (const [key, value] of Object.entries(typography)) {
    if (!isYamlMap(value)) continue;
    if (!key.startsWith('code') && key !== 'mono' && normalizeTokenKey(key) !== 'mono') continue;
    const nested = asString(value.fontFamily) ?? asString(value['font-family']);
    if (nested !== undefined && nested !== '') return nested;
  }
  return undefined;
}

function yamlToOverrides(
  root: YamlMap,
  recognized: { field: string; value: string }[],
  warnings: string[],
): ThemeOverrides {
  const overrides = emptyOverrides();
  const palette = overrides.palette ?? {};
  const paletteDark = overrides.paletteDark ?? {};
  const branding = overrides.branding ?? {};
  const radius = overrides.radius ?? {};
  const spacing = overrides.spacing ?? {};
  const shadows = overrides.shadows ?? {};
  const transitions = overrides.transitions ?? {};
  const typographyOverride = overrides.typography ?? {};
  const shell = overrides.shell ?? {};

  const colors = isYamlMap(root.colors) ? root.colors
    : isYamlMap(root.palette) ? root.palette
      : isYamlMap(root.tokens) && isYamlMap((root.tokens as YamlMap).colors)
        ? (root.tokens as YamlMap).colors as YamlMap
        : {};
  applyYamlColors(colors, root, palette, recognized, warnings, LIGHT_COLOR_ALIASES, 'colors.', true);
  applyYamlColors(colors, root, paletteDark, recognized, warnings, DARK_COLOR_ALIASES, 'colors.', false);

  walkYamlForTokens(root, [], overrides, recognized, false);

  if (palette.bg !== undefined && paletteDark.bgMuted === undefined && paletteDark.bg !== undefined) {
    paletteDark.bgMuted = paletteDark.bg;
  }

  if (palette.brand !== undefined) {
    branding.primaryColor = palette.brand;
    if (paletteDark.brand === undefined) {
      paletteDark.brand = palette.brand;
      paletteDark.brandLight = palette.brandLight;
      paletteDark.brandDark = palette.brandDark;
      paletteDark.brandContrast = palette.brandContrast;
      paletteDark.borderFocus = palette.borderFocus ?? palette.brand;
    }
  } else if (palette.brandDark !== undefined) {
    palette.brand = palette.brandDark;
    branding.primaryColor = palette.brandDark;
  }
  if (palette.brandLight !== undefined) branding.secondaryColor = palette.brandLight;
  if (palette.brandDark !== undefined) branding.accentColor = palette.brandDark;

  const typography = isYamlMap(root.typography) ? root.typography : undefined;
  if (typography !== undefined) {
    const family = firstFontFamily(typography);
    if (family !== undefined) {
      const resolved = resolveTokenRefs(family, root);
      branding.fontFamily = resolved;
      typographyOverride.fontFamily = resolved;
      record(recognized, 'typography.fontFamily', resolved);
    }
    const mono = firstMonoFamily(typography);
    if (mono !== undefined) {
      const resolved = resolveTokenRefs(mono, root);
      typographyOverride.monoFamily = resolved;
      record(recognized, 'typography.monoFamily', resolved);
    }
  }

  const rounded = isYamlMap(root.rounded) ? root.rounded : isYamlMap(root.radius) ? root.radius : undefined;
  if (rounded !== undefined) {
    const md = parsePx(asString(rounded.md) ?? asString(rounded.default) ?? '');
    const sm = parsePx(asString(rounded.sm) ?? '');
    const lg = parsePx(asString(rounded.lg) ?? '');
    const xl = parsePx(asString(rounded.xl) ?? '');
    const pill = parsePx(asString(rounded.pill) ?? '');
    if (sm !== undefined) radius.sm = sm;
    if (md !== undefined) {
      radius.md = md;
      branding.borderRadius = md;
      record(recognized, 'rounded.md', String(md));
    }
    if (lg !== undefined) radius.lg = lg;
    if (xl !== undefined) radius.xl = xl;
    if (pill !== undefined) radius.pill = pill;
  }

  const spacingNode = isYamlMap(root.spacing) ? root.spacing : undefined;
  if (spacingNode !== undefined) {
    const pairs: Array<readonly [string, keyof NonNullable<ThemeOverrides['spacing']>]> = [
      ['xs', 'xs'], ['sm', 'sm'], ['md', 'md'], ['lg', 'lg'], ['xl', 'xl'],
      ['2xl', 'xxl'], ['3xl', 'xxxl'],
    ];
    for (const [from, to] of pairs) {
      const n = parsePx(asString(spacingNode[from]) ?? '');
      if (n !== undefined) spacing[to] = n;
    }
  }

  const shadowNode = isYamlMap(root.shadows) ? root.shadows : undefined;
  if (shadowNode !== undefined) {
    const subtle = asString(shadowNode.subtle) ?? asString(shadowNode.sm);
    const raised = asString(shadowNode.raised) ?? asString(shadowNode.md);
    const dialog = asString(shadowNode.dialog) ?? asString(shadowNode.lg);
    if (subtle !== undefined) shadows.sm = subtle;
    if (raised !== undefined) shadows.md = raised;
    if (dialog !== undefined) {
      shadows.lg = dialog;
      shadows.xl = dialog;
    }
  }

  const motion = isYamlMap(root.motion) ? root.motion : undefined;
  if (motion !== undefined) {
    const easing = asString(motion['easing-standard']) ?? 'ease';
    for (const key of ['fast', 'normal', 'slow'] as const) {
      const duration = asString(motion[key]);
      if (duration !== undefined) {
        transitions[key] = duration.includes(' ') ? duration : `${duration} ${easing}`;
      }
    }
    if (asString(motion.fast) !== undefined && asString(motion['easing-standard']) !== undefined) {
      const fast = asString(motion.fast) ?? '150ms';
      transitions.smooth = `${asString(motion.slow) ?? '300ms'} ${easing}`;
      transitions.bounce = `${fast} ${easing}`;
    }
  }

  const components = isYamlMap(root.components) ? root.components : undefined;
  const elevation = isYamlMap(root.elevation) ? root.elevation : undefined;
  const sidebar = components !== undefined && isYamlMap(components['shell-sidebar'])
    ? components['shell-sidebar']
    : undefined;
  const navItem = components !== undefined && isYamlMap(components['nav-item'])
    ? components['nav-item']
    : undefined;

  const sidebarBg = sidebar !== undefined
    ? resolveTokenRefs(asString(sidebar.backgroundColor) ?? asString(sidebar.background) ?? '', root)
    : undefined;
  if (sidebarBg !== undefined && sidebarBg !== '') {
    shell.bg = sidebarBg;
    record(recognized, 'components.shell-sidebar.backgroundColor', sidebarBg);
  } else {
    const base = asString(colors['shell-base']);
    const opacity = Number.parseFloat(asString(elevation?.['shell-opacity']) ?? '0.7');
    if (base !== undefined && HEX_COLOR.test(base)) {
      shell.bg = hexToRgba(base, Number.isFinite(opacity) ? opacity : 0.7);
      record(recognized, 'colors.shell-base', shell.bg);
    }
  }

  const onShell = sidebar !== undefined
    ? resolveTokenRefs(asString(sidebar.textColor) ?? asString(sidebar.color) ?? '', root)
    : asString(colors['on-shell']);
  if (onShell !== undefined && onShell !== '') {
    shell.fg = onShell;
    record(recognized, 'shell.fg', onShell);
  }

  const navFg = navItem !== undefined
    ? resolveTokenRefs(asString(navItem.textColor) ?? '', root)
    : undefined;
  if (navFg !== undefined && navFg !== '') {
    shell.fgMuted = navFg;
  }

  const blur = asString(elevation?.['shell-blur']);
  if (blur !== undefined) {
    shell.blur = blur.includes('px') ? blur : `${blur}px`;
  }

  const borderColor = asString(colors['shell-border']);
  const borderOpacity = Number.parseFloat(asString(elevation?.['shell-border-opacity']) ?? '');
  if (borderColor !== undefined && HEX_COLOR.test(borderColor) && Number.isFinite(borderOpacity)) {
    shell.border = hexToRgba(borderColor, borderOpacity);
  } else if (borderColor !== undefined && isCssColor(resolveTokenRefs(borderColor, root))) {
    shell.border = resolveTokenRefs(borderColor, root);
  }

  // Dark-shell frosted defaults only when the author set a dark chrome color
  if (shell.bg !== undefined) {
    const darkChrome = shell.bg.toLowerCase().includes('rgba(0')
      || (HEX_COLOR.test(shell.bg) && relativeLuminance(shell.bg) < 0.35);
    if (darkChrome) {
      if (shell.fgMuted === undefined && shell.fg !== undefined) {
        shell.fgMuted = 'rgba(255, 255, 255, 0.70)';
      }
      if (shell.border === undefined) shell.border = 'rgba(255, 255, 255, 0.10)';
      if (shell.hover === undefined) shell.hover = 'rgba(255, 255, 255, 0.10)';
    }
  }

  return compactOverrides(overrides, branding, palette, paletteDark, radius, spacing, shadows, transitions, typographyOverride, shell);
}

function compactOverrides(
  overrides: ThemeOverrides,
  branding: TenantBranding,
  palette: Partial<Palette>,
  paletteDark: Partial<Palette>,
  radius: NonNullable<ThemeOverrides['radius']>,
  spacing: NonNullable<ThemeOverrides['spacing']>,
  shadows: NonNullable<ThemeOverrides['shadows']>,
  transitions: NonNullable<ThemeOverrides['transitions']>,
  typographyOverride: NonNullable<ThemeOverrides['typography']>,
  shell: ShellTokens,
): ThemeOverrides {
  const next: ThemeOverrides = { branding: { ...branding, ...overrides.branding } };
  const mergedPalette = { ...palette, ...overrides.palette };
  const mergedDark = { ...paletteDark, ...overrides.paletteDark };
  const mergedRadius = { ...radius, ...overrides.radius };
  const mergedSpacing = { ...spacing, ...overrides.spacing };
  const mergedShadows = { ...shadows, ...overrides.shadows };
  const mergedTransitions = { ...transitions, ...overrides.transitions };
  const mergedTypo = { ...typographyOverride, ...overrides.typography };
  const mergedShell = { ...shell, ...overrides.shell };
  if (Object.keys(mergedPalette).length > 0) next.palette = mergedPalette;
  if (Object.keys(mergedDark).length > 0) next.paletteDark = mergedDark;
  if (Object.keys(mergedRadius).length > 0) next.radius = mergedRadius;
  if (Object.keys(mergedSpacing).length > 0) next.spacing = mergedSpacing;
  if (Object.keys(mergedShadows).length > 0) next.shadows = mergedShadows;
  if (Object.keys(mergedTransitions).length > 0) next.transitions = mergedTransitions;
  if (Object.keys(mergedTypo).length > 0) next.typography = mergedTypo;
  if (Object.keys(mergedShell).length > 0) next.shell = mergedShell;
  return next;
}

function parseMarkdownList(
  content: string,
  branding: TenantBranding,
  recognized: { field: string; value: string }[],
  warnings: string[],
): boolean {
  let matchedAnyField = false;
  const lines = content.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) continue;

    const withoutBullet = line.replace(/^[-*]\s+/, '');
    const separatorIndex = withoutBullet.indexOf(':');
    if (separatorIndex === -1) continue;

    const key = stripMarkdownEmphasis(withoutBullet.slice(0, separatorIndex)).toLowerCase();
    const value = stripMarkdownEmphasis(withoutBullet.slice(separatorIndex + 1));
    const field = FIELD_ALIASES[key];
    if (field === undefined || value === '') continue;
    matchedAnyField = true;

    if (field === 'primaryColor' || field === 'secondaryColor' || field === 'accentColor') {
      const color = extractCssColor(value);
      if (color === undefined) {
        warnings.push(`"${key}" value "${value}" is not a valid hex color (expected #rrggbb) — skipped`);
        continue;
      }
      branding[field] = color;
    } else if (field === 'borderRadius') {
      const radius = parsePx(value);
      if (radius === undefined) {
        warnings.push(`"${key}" value "${value}" is not a valid radius — skipped`);
        continue;
      }
      branding.borderRadius = radius;
    } else {
      branding[field] = value;
    }
    recognized.push({ field, value: String(branding[field]) });
  }
  return matchedAnyField;
}

function harvestLooseLines(
  content: string,
  overrides: ThemeOverrides,
  recognized: { field: string; value: string }[],
): void {
  const withoutFences = content.replace(/```[\s\S]*?```/g, '');
  for (const rawLine of withoutFences.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) continue;
    const table = line.match(/^\|\s*(.+?)\s*\|\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/);
    const pair = table
      ? { key: table[1] ?? '', value: table[2] ?? '' }
      : (() => {
        const cleaned = line.replace(/^[-*]\s+/, '');
        const idx = cleaned.search(/[:=]/);
        if (idx === -1) return null;
        return { key: cleaned.slice(0, idx), value: cleaned.slice(idx + 1) };
      })();
    if (pair === null) continue;
    const key = stripMarkdownEmphasis(pair.key);
    const value = stripMarkdownEmphasis(pair.value);
    const color = extractCssColor(value);
    if (color !== undefined) {
      assignColorToken(overrides, [], key, color, recognized, false);
      continue;
    }
    const norm = normalizeTokenKey(key);
    if (norm === 'font-family' || norm === 'font' || norm === 'sans') {
      if (overrides.typography?.fontFamily === undefined && value !== '') {
        const typography = overrides.typography ?? (overrides.typography = {});
        typography.fontFamily = unquote(value);
        const branding = overrides.branding ?? (overrides.branding = {});
        branding.fontFamily = typography.fontFamily;
        record(recognized, 'typography.fontFamily', typography.fontFamily);
      }
    }
    if (norm === 'border-radius' || norm === 'radius') {
      const radius = parsePx(unquote(value));
      if (radius !== undefined && overrides.radius?.md === undefined) {
        const radiusMap = overrides.radius ?? (overrides.radius = {});
        radiusMap.md = radius;
        const branding = overrides.branding ?? (overrides.branding = {});
        branding.borderRadius = radius;
        record(recognized, 'rounded.md', String(radius));
      }
    }
  }

  const cssVars = /--(?:color-)?([A-Za-z0-9_-]+)\s*:\s*([^;]+)/g;
  let match: RegExpExecArray | null;
  while ((match = cssVars.exec(content)) !== null) {
    const key = match[1] ?? '';
    const value = match[2] ?? '';
    const color = extractCssColor(value);
    if (color !== undefined) assignColorToken(overrides, [], key, color, recognized, false);
  }
}

function mergeOverrideGaps(base: ThemeOverrides, extra: ThemeOverrides): ThemeOverrides {
  return {
    branding: { ...extra.branding, ...base.branding },
    palette: { ...extra.palette, ...base.palette },
    paletteDark: { ...extra.paletteDark, ...base.paletteDark },
    spacing: { ...extra.spacing, ...base.spacing },
    radius: { ...extra.radius, ...base.radius },
    shadows: { ...extra.shadows, ...base.shadows },
    transitions: { ...extra.transitions, ...base.transitions },
    typography: { ...extra.typography, ...base.typography },
    shell: { ...extra.shell, ...base.shell },
  };
}

function pruneEmpty(overrides: ThemeOverrides): ThemeOverrides {
  const next: ThemeOverrides = { branding: overrides.branding ?? {} };
  if (overrides.palette !== undefined && Object.keys(overrides.palette).length > 0) next.palette = overrides.palette;
  if (overrides.paletteDark !== undefined && Object.keys(overrides.paletteDark).length > 0) next.paletteDark = overrides.paletteDark;
  if (overrides.spacing !== undefined && Object.keys(overrides.spacing).length > 0) next.spacing = overrides.spacing;
  if (overrides.radius !== undefined && Object.keys(overrides.radius).length > 0) next.radius = overrides.radius;
  if (overrides.shadows !== undefined && Object.keys(overrides.shadows).length > 0) next.shadows = overrides.shadows;
  if (overrides.transitions !== undefined && Object.keys(overrides.transitions).length > 0) next.transitions = overrides.transitions;
  if (overrides.typography !== undefined && Object.keys(overrides.typography).length > 0) next.typography = overrides.typography;
  if (overrides.shell !== undefined && Object.keys(overrides.shell).length > 0) next.shell = overrides.shell;
  return next;
}

function yamlQuote(value: string): string {
  return JSON.stringify(value);
}

function emitMap(lines: string[], indent: string, entries: Array<readonly [string, string]>): void {
  for (const [key, value] of entries) {
    const quotedKey = /[^A-Za-z0-9_-]/.test(key) ? yamlQuote(key) : key;
    lines.push(`${indent}${quotedKey}: ${yamlQuote(value)}`);
  }
}

export function toCanonicalDesignMarkdown(parsed: DesignMdParseResult): string {
  const overrides = parsed.overrides;
  const palette = overrides.palette ?? {};
  const dark = overrides.paletteDark ?? {};
  const shell = overrides.shell ?? {};
  const name = parsed.name ?? 'Imported Theme';
  const lines: string[] = ['---', 'version: alpha', `name: ${yamlQuote(name)}`];

  const colorEntries: Array<readonly [string, string]> = [];
  for (const [role, canonical] of Object.entries(PALETTE_TO_CANONICAL) as Array<[keyof Palette, string]>) {
    const value = palette[role];
    if (value !== undefined) colorEntries.push([canonical, value]);
  }
  for (const [role, canonical] of Object.entries(DARK_PALETTE_TO_CANONICAL) as Array<[keyof Palette, string]>) {
    const value = dark[role];
    if (value !== undefined) colorEntries.push([canonical, value]);
  }
  if (shell.fg !== undefined && palette.brandContrast === undefined) {
    colorEntries.push(['on-shell', shell.fg]);
  }
  if (colorEntries.length > 0) {
    lines.push('colors:');
    emitMap(lines, '  ', colorEntries);
  }

  const family = overrides.typography?.fontFamily ?? parsed.branding.fontFamily;
  const mono = overrides.typography?.monoFamily;
  if (family !== undefined || mono !== undefined) {
    lines.push('typography:');
    if (family !== undefined) {
      lines.push('  body-md:');
      lines.push(`    fontFamily: ${yamlQuote(family)}`);
    }
    if (mono !== undefined) {
      lines.push('  code-sm:');
      lines.push(`    fontFamily: ${yamlQuote(mono)}`);
    }
  }

  const md = overrides.radius?.md ?? parsed.branding.borderRadius;
  if (md !== undefined || overrides.radius?.sm !== undefined || overrides.radius?.lg !== undefined) {
    lines.push('rounded:');
    if (overrides.radius?.sm !== undefined) lines.push(`  sm: ${yamlQuote(`${overrides.radius.sm}px`)}`);
    if (md !== undefined) lines.push(`  md: ${yamlQuote(`${md}px`)}`);
    if (overrides.radius?.lg !== undefined) lines.push(`  lg: ${yamlQuote(`${overrides.radius.lg}px`)}`);
    if (overrides.radius?.pill !== undefined) lines.push(`  pill: ${yamlQuote(`${overrides.radius.pill}px`)}`);
  }

  if (overrides.spacing !== undefined && Object.keys(overrides.spacing).length > 0) {
    lines.push('spacing:');
    const map: Array<readonly [string, keyof NonNullable<ThemeOverrides['spacing']>]> = [
      ['xs', 'xs'], ['sm', 'sm'], ['md', 'md'], ['lg', 'lg'], ['xl', 'xl'],
      ['2xl', 'xxl'], ['3xl', 'xxxl'],
    ];
    for (const [from, to] of map) {
      const n = overrides.spacing[to];
      if (n !== undefined) lines.push(`  ${/^[0-9]/.test(from) ? yamlQuote(from) : from}: ${yamlQuote(`${n}px`)}`);
    }
  }

  if (shell.bg !== undefined || shell.blur !== undefined) {
    if (shell.blur !== undefined) {
      lines.push('elevation:');
      lines.push(`  shell-blur: ${yamlQuote(shell.blur)}`);
    }
    lines.push('components:');
    lines.push('  shell-sidebar:');
    if (shell.bg !== undefined) lines.push(`    backgroundColor: ${yamlQuote(shell.bg)}`);
    if (shell.fg !== undefined) lines.push(`    textColor: ${yamlQuote(shell.fg)}`);
    if (shell.fgMuted !== undefined) {
      lines.push('  nav-item:');
      lines.push(`    textColor: ${yamlQuote(shell.fgMuted)}`);
    }
  }

  lines.push('---');
  lines.push('');
  lines.push('# Canonical MAW design tokens (adapted from any design.md format).');
  lines.push('# Edit and click Apply changes to update the live theme.');
  return `${lines.join('\n')}\n`;
}

export function parseDesignMarkdown(content: string): DesignMdParseResult {
  const branding: TenantBranding = {};
  const recognized: { field: string; value: string }[] = [];
  const warnings: string[] = [];
  let name: string | undefined;
  let overrides: ThemeOverrides = emptyOverrides();

  const roots = collectYamlRoots(content);
  for (const root of roots) {
    const fromYaml = yamlToOverrides(root, recognized, warnings);
    overrides = mergeOverrideGaps(fromYaml, overrides);
    const yamlName = asString(root.name);
    if (yamlName !== undefined) name = yamlName;
  }

  Object.assign(branding, overrides.branding);
  overrides.branding = branding;

  const { yaml, body } = extractFrontmatter(content);
  const matchedList = parseMarkdownList(yaml !== null ? body : content, branding, recognized, warnings);
  if (matchedList) {
    overrides.branding = branding;
    const palette = overrides.palette ?? (overrides.palette = {});
    if (branding.primaryColor !== undefined) {
      palette.brand = branding.primaryColor;
      palette.borderFocus = branding.primaryColor;
    }
    if (branding.secondaryColor !== undefined) palette.brandLight = branding.secondaryColor;
    if (branding.accentColor !== undefined) palette.brandDark = branding.accentColor;
    if (branding.fontFamily !== undefined) {
      const typography = overrides.typography ?? (overrides.typography = {});
      typography.fontFamily = branding.fontFamily;
    }
    if (branding.borderRadius !== undefined) {
      const radius = overrides.radius ?? (overrides.radius = {});
      radius.md = branding.borderRadius;
    }
  }

  harvestLooseLines(content, overrides, recognized);

  // Last resort: invent a palette from any unlabeled colors found in the file
  if (overrides.palette?.brand === undefined || Object.keys(overrides.palette ?? {}).length < 2) {
    const unlabeled = collectAllColors(content);
    if (unlabeled.length > 0) {
      inferPaletteFromColors(unlabeled, overrides, recognized);
      if (recognized.some((r) => r.field.startsWith('inferred.'))) {
        warnings.push('Mapped unlabeled colors into MAW theme roles (brand, canvas, text).');
      }
    }
  }

  if (Object.keys(overrides.palette ?? {}).length > 0 || Object.keys(overrides.shell ?? {}).length > 0) {
    if (adaptPaletteToSystem(overrides, recognized)) {
      warnings.push('Adapted into MAW roles: accents on actions, quiet neutrals on page chrome.');
    }
  }

  if (overrides.palette?.brand !== undefined) {
    branding.primaryColor = overrides.palette.brand;
  }
  // Keep secondary/accent only when the source file provided them (not derived mixes)
  if (branding.secondaryColor !== undefined && overrides.palette?.brandLight !== undefined) {
    branding.secondaryColor = overrides.palette.brandLight;
  }
  if (branding.accentColor !== undefined && overrides.palette?.brandDark !== undefined) {
    branding.accentColor = overrides.palette.brandDark;
  }
  if (overrides.typography?.fontFamily !== undefined) branding.fontFamily = overrides.typography.fontFamily;
  if (overrides.radius?.md !== undefined) branding.borderRadius = overrides.radius.md;
  overrides.branding = branding;

  overrides = pruneEmpty(overrides);

  if (recognized.length === 0 && warnings.length === 0) {
    warnings.push('No recognized design tokens found — expected colors, CSS variables, or "Primary Color: #4f46e5" lines.');
  }

  return { branding, overrides, recognized, warnings, name };
}

/**
 * Parse any design.md-like document and rewrite it as canonical YAML the
 * Theme Designer can round-trip. Returns the original text as `canonical`
 * when nothing could be extracted, so an unreadable file is not wiped.
 */
export function normalizeDesignMarkdown(content: string): DesignMdNormalizeResult {
  const parsed = parseDesignMarkdown(content);
  if (parsed.recognized.length === 0) {
    return { ...parsed, canonical: content, converted: false };
  }
  const canonical = toCanonicalDesignMarkdown(parsed);
  const converted = canonical.trim() !== content.trim();
  const reparsed = parseDesignMarkdown(canonical);
  return {
    branding: reparsed.branding,
    overrides: reparsed.overrides,
    recognized: reparsed.recognized,
    warnings: parsed.warnings,
    name: parsed.name,
    canonical,
    converted,
  };
}

/**
 * Accepts either a stored `ThemeOverrides` object (current) or a legacy
 * `TenantBranding` blob from before YAML import landed.
 */
export function storedDesignToOverrides(stored: unknown): ThemeOverrides | null {
  if (stored === null || typeof stored !== 'object') return null;
  const value = stored as Record<string, unknown>;
  if (
    'palette' in value
    || 'paletteDark' in value
    || 'shell' in value
    || 'branding' in value
    || 'radius' in value
    || 'typography' in value
  ) {
    return stored as ThemeOverrides;
  }
  if (
    'primaryColor' in value
    || 'secondaryColor' in value
    || 'accentColor' in value
    || 'fontFamily' in value
    || 'borderRadius' in value
  ) {
    return { branding: stored as TenantBranding };
  }
  return null;
}
