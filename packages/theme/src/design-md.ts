import type { Palette, ShellTokens, TenantBranding, ThemeOverrides } from './index';

/**
 * Parses a human-writable design file into theme overrides.
 *
 * Two formats are recognized:
 *
 * 1. YAML frontmatter (design-system spec), e.g.
 *
 *        ---
 *        colors:
 *          primary: "#fe6e00"
 *          background: "#fcfaf7"
 *        ---
 *
 * 2. Markdown `Key: value` list lines (legacy), e.g.
 *
 *        - **Primary Color**: #4f46e5
 *
 * Unrecognized lines and invalid values are reported in `warnings` rather than thrown,
 * so a partially-correct file still themes what it can.
 */

const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const CSS_COLOR = /^(#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+(?:\s*,\s*[\d.]+)?\s*\)|transparent)$/i;

const FIELD_ALIASES: Record<string, keyof TenantBranding> = {
  'primary color': 'primaryColor',
  'brand color': 'primaryColor',
  primary: 'primaryColor',
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
};

/** YAML `colors.*` keys → light palette roles. */
const YAML_COLOR_TO_PALETTE: Record<string, keyof Palette> = {
  background: 'bgSubtle',
  'on-background': 'fg',
  surface: 'bgMuted',
  'surface-soft': 'bgMuted',
  'surface-elevated': 'bg',
  'on-surface': 'fg',
  'on-surface-muted': 'fgMuted',
  outline: 'border',
  primary: 'brand',
  'primary-strong': 'brandDark',
  'primary-warm': 'brandLight',
  'primary-focus': 'borderFocus',
  'on-primary': 'brandContrast',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  info: 'info',
  'status-production-bg': 'successBg',
  'status-mock-bg': 'warningBg',
  'status-development-bg': 'infoBg',
};

const YAML_DARK_COLOR_TO_PALETTE: Record<string, keyof Palette> = {
  'dark-background': 'bgSubtle',
  'dark-surface': 'bg',
  'dark-on-surface': 'fg',
  'dark-on-surface-muted': 'fgMuted',
};

export interface DesignMdParseResult {
  readonly branding: TenantBranding;
  readonly overrides: ThemeOverrides;
  readonly recognized: readonly { field: string; value: string }[];
  readonly warnings: readonly string[];
}

type YamlValue = string | number | boolean | YamlMap;
interface YamlMap { [key: string]: YamlValue }

function stripMarkdownEmphasis(text: string): string {
  return text.replace(/\*\*|__|\*|_|`/g, '').trim();
}

function unquote(text: string): string {
  const trimmed = text.trim();
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

/**
 * Indent-based YAML map parser. Supports nested maps, quoted keys/values, and
 * scalars. Lists, anchors, and multiline blocks are ignored — this file format
 * does not need them.
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
      rest = '';
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
    if (/^(version|name|colors|typography|rounded|spacing)\s*:/m.test(trimmedStart)) {
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

function parsePx(value: string): number | undefined {
  const trimmed = value.trim();
  if (/^-?\d+(\.\d+)?rem$/i.test(trimmed)) {
    return Number.parseFloat(trimmed) * 16;
  }
  const n = Number.parseInt(trimmed.replace(/px$/i, ''), 10);
  return Number.isNaN(n) || n < 0 ? undefined : n;
}

function isCssColor(value: string): boolean {
  return CSS_COLOR.test(value.trim());
}

function hexToRgba(hex: string, opacity: number): string {
  let h = hex.replace('#', '');
  if (h.length === 3) h = `${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
  const r = Number.parseInt(h.slice(0, 2), 16);
  const g = Number.parseInt(h.slice(2, 4), 16);
  const b = Number.parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function applyYamlColors(
  colors: YamlMap,
  root: YamlMap,
  palette: Partial<Palette>,
  recognized: { field: string; value: string }[],
  warnings: string[],
  map: Record<string, keyof Palette>,
  prefix: string,
): void {
  for (const [key, raw] of Object.entries(colors)) {
    const field = map[key];
    if (field === undefined) continue;
    const resolved = resolveTokenRefs(asString(raw) ?? '', root);
    if (!isCssColor(resolved)) {
      warnings.push(`"${prefix}${key}" value "${resolved}" is not a valid color — skipped`);
      continue;
    }
    palette[field] = resolved;
    recognized.push({ field: `${prefix}${key}`, value: resolved });
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
    if (!key.startsWith('code') && key !== 'mono') continue;
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
  const palette: Partial<Palette> = {};
  const paletteDark: Partial<Palette> = {};
  const branding: TenantBranding = {};
  const radius: NonNullable<ThemeOverrides['radius']> = {};
  const spacing: NonNullable<ThemeOverrides['spacing']> = {};
  const shadows: NonNullable<ThemeOverrides['shadows']> = {};
  const transitions: NonNullable<ThemeOverrides['transitions']> = {};
  const typographyOverride: NonNullable<ThemeOverrides['typography']> = {};
  const shell: ShellTokens = {};

  const colors = isYamlMap(root.colors) ? root.colors : {};
  applyYamlColors(colors, root, palette, recognized, warnings, YAML_COLOR_TO_PALETTE, 'colors.');
  applyYamlColors(colors, root, paletteDark, recognized, warnings, YAML_DARK_COLOR_TO_PALETTE, 'colors.');

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
      recognized.push({ field: 'typography.fontFamily', value: resolved });
    }
    const mono = firstMonoFamily(typography);
    if (mono !== undefined) {
      const resolved = resolveTokenRefs(mono, root);
      typographyOverride.monoFamily = resolved;
      recognized.push({ field: 'typography.monoFamily', value: resolved });
    }
  }

  const rounded = isYamlMap(root.rounded) ? root.rounded : undefined;
  if (rounded !== undefined) {
    const md = parsePx(asString(rounded.md) ?? '');
    const sm = parsePx(asString(rounded.sm) ?? '');
    const lg = parsePx(asString(rounded.lg) ?? '');
    const xl = parsePx(asString(rounded.xl) ?? '');
    const pill = parsePx(asString(rounded.pill) ?? '');
    if (sm !== undefined) radius.sm = sm;
    if (md !== undefined) {
      radius.md = md;
      branding.borderRadius = md;
      recognized.push({ field: 'rounded.md', value: String(md) });
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
    const subtle = asString(shadowNode.subtle);
    const raised = asString(shadowNode.raised);
    const dialog = asString(shadowNode.dialog);
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
    ? resolveTokenRefs(asString(sidebar.backgroundColor) ?? '', root)
    : undefined;
  if (sidebarBg !== undefined && sidebarBg !== '') {
    shell.bg = sidebarBg;
    recognized.push({ field: 'components.shell-sidebar.backgroundColor', value: sidebarBg });
  } else {
    const base = asString(colors['shell-base']);
    const opacity = Number.parseFloat(asString(elevation?.['shell-opacity']) ?? '0.7');
    if (base !== undefined && HEX_COLOR.test(base)) {
      shell.bg = hexToRgba(base, Number.isFinite(opacity) ? opacity : 0.7);
      recognized.push({ field: 'colors.shell-base', value: shell.bg });
    }
  }

  const onShell = sidebar !== undefined
    ? resolveTokenRefs(asString(sidebar.textColor) ?? '', root)
    : asString(colors['on-shell']);
  if (onShell !== undefined && onShell !== '') {
    shell.fg = onShell;
    recognized.push({ field: 'shell.fg', value: onShell });
  }

  const navFg = navItem !== undefined
    ? resolveTokenRefs(asString(navItem.textColor) ?? '', root)
    : undefined;
  if (navFg !== undefined && navFg !== '') {
    shell.fgMuted = navFg;
  } else if (shell.fg !== undefined) {
    shell.fgMuted = 'rgba(255, 255, 255, 0.70)';
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
  } else if (shell.bg !== undefined) {
    shell.border = 'rgba(255, 255, 255, 0.10)';
  }

  if (shell.bg !== undefined && shell.hover === undefined) {
    shell.hover = 'rgba(255, 255, 255, 0.10)';
  }

  const overrides: ThemeOverrides = { branding };
  if (Object.keys(palette).length > 0) overrides.palette = palette;
  if (Object.keys(paletteDark).length > 0) overrides.paletteDark = paletteDark;
  if (Object.keys(radius).length > 0) overrides.radius = radius;
  if (Object.keys(spacing).length > 0) overrides.spacing = spacing;
  if (Object.keys(shadows).length > 0) overrides.shadows = shadows;
  if (Object.keys(transitions).length > 0) overrides.transitions = transitions;
  if (Object.keys(typographyOverride).length > 0) overrides.typography = typographyOverride;
  if (Object.keys(shell).length > 0) overrides.shell = shell;
  return overrides;
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
      if (!HEX_COLOR.test(value) && !isCssColor(value)) {
        warnings.push(`"${key}" value "${value}" is not a valid hex color (expected #rrggbb) — skipped`);
        continue;
      }
      branding[field] = value;
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

export function parseDesignMarkdown(content: string): DesignMdParseResult {
  const branding: TenantBranding = {};
  const recognized: { field: string; value: string }[] = [];
  const warnings: string[] = [];

  const { yaml, body } = extractFrontmatter(content);
  let overrides: ThemeOverrides = { branding };

  if (yaml !== null && yaml.trim() !== '') {
    const root = parseYamlMap(yaml);
    overrides = yamlToOverrides(root, recognized, warnings);
    Object.assign(branding, overrides.branding);
    overrides.branding = branding;
  }

  const matchedList = parseMarkdownList(yaml !== null ? body : content, branding, recognized, warnings);
  if (matchedList) {
    overrides.branding = branding;
    if (overrides.palette === undefined) {
      overrides.palette = {};
    }
    if (branding.primaryColor !== undefined) {
      overrides.palette.brand = branding.primaryColor;
      overrides.palette.borderFocus = branding.primaryColor;
    }
    if (branding.secondaryColor !== undefined) overrides.palette.brandLight = branding.secondaryColor;
    if (branding.accentColor !== undefined) overrides.palette.brandDark = branding.accentColor;
  }

  if (recognized.length === 0 && warnings.length === 0) {
    warnings.push('No recognized design tokens found — expected YAML `colors:` keys or "Primary Color: #4f46e5" lines.');
  }

  return { branding, overrides, recognized, warnings };
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
