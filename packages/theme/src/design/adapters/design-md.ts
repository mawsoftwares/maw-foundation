import { createTheme, palette as defaultPalette, paletteDark as defaultPaletteDark, radius as defaultRadius, transitions as defaultTransitions, type Palette, type ThemeOverrides } from '../../index';
import { parseDesignMarkdown, type DesignMdParseResult } from '../../design-md';
import { tokenMeta, type TokenMeta } from '../../core/provenance';
import { emptyNormalizedDesign } from '../manual';
import { parseShadowCss } from '../shadow';
import type { DesignAdapter, DesignInput, DesignInputKind, NormalizedDesign, ShadowLayer, Sourced, TypeStep } from '../types';

/** Palette key → normalized role (the inverse of the generator's table). */
const PALETTE_TO_ROLE: Readonly<Record<keyof Palette, string>> = {
  brand: 'primary', brandLight: 'primaryLight', brandDark: 'primaryDark', brandContrast: 'onPrimary',
  bg: 'card', bgMuted: 'surfaceMuted', bgSubtle: 'background',
  fg: 'text', fgMuted: 'textMuted', fgSubtle: 'textSubtle',
  border: 'border', borderFocus: 'focus',
  success: 'success', successBg: 'successBg', danger: 'error', dangerBg: 'errorBg',
  warning: 'warning', warningBg: 'warningBg', info: 'info', infoBg: 'infoBg', overlay: 'overlay',
};

/** Input kinds the design.md importer can read (it also understands CSS custom properties and JSON/DTCG tokens). */
const HANDLED_KINDS: readonly DesignInputKind[] = ['design-md', 'css', 'json-tokens', 'theme-config'];

const norm = (value: unknown): string => String(value ?? '').trim().toLowerCase().replace(/\s+/g, '');

function textOf(input: DesignInput): string {
  return typeof input.content === 'string' ? input.content : new TextDecoder().decode(input.content);
}

/**
 * Where did each colour come from? The importer reports every value the file stated (`recognized`) and which
 * ones it guessed from unlabeled colours (`inferred.*`); anything else in the final palette was adapted or derived.
 */
function colorClassifier(parsed: DesignMdParseResult): (value: string, keyStated: boolean) => TokenMeta {
  const stated = new Set<string>();
  const inferred = new Set<string>();
  for (const { field, value } of parsed.recognized) {
    (field.startsWith('inferred.') ? inferred : stated).add(norm(value));
  }
  return (value, keyStated) => {
    // A role the importer never set is derived even if its value happens to equal a stated colour.
    if (!keyStated) return tokenMeta('derived', 0.85, 'derived from other tokens');
    const v = norm(value);
    if (stated.has(v)) return tokenMeta('design');
    if (inferred.has(v)) return tokenMeta('estimated', 0.5, 'inferred from unlabeled colors in the file');
    return tokenMeta('derived', 0.8, 'set by the importer, not stated in the file');
  };
}

const sourced = <T,>(value: T, meta: TokenMeta): Sourced<T> => ({ value, ...meta });
const exact = <T,>(value: T): Sourced<T> => sourced(value, tokenMeta('design'));

/**
 * design.md (and CSS-variable / JSON-token files the same importer reads) → NormalizedDesign.
 *
 * Wraps the existing importer rather than replacing it, so what it understands stays identical. The value added
 * here is provenance: stated values are `design`, guessed ones `estimated`, adapted ones `derived`.
 * Colours come from the *resolved* theme so effects `createTheme` applies (dark brand follows the light brand, the
 * focus ring follows the brand) are explicit in the normalized model instead of being lost.
 */
export interface DesignMdAdapterOptions {
  /**
   * `as-stated` (default): colours are exactly what the file says, so contrast problems in the design are reported
   * instead of being quietly repaired. `importer`: the Theme Designer's behaviour, which re-maps loud or
   * low-contrast colours to keep the shell readable.
   */
  readonly adaptation?: 'as-stated' | 'importer';
}

export function designMdToNormalized(
  content: string,
  inputKind: DesignInputKind = 'design-md',
  options: DesignMdAdapterOptions = {},
): NormalizedDesign {
  const parsed = parseDesignMarkdown(content, { adapt: options.adaptation === 'importer' });
  const o: ThemeOverrides = parsed.overrides;
  const resolved = createTheme(o);
  const classify = colorClassifier(parsed);
  const design = emptyNormalizedDesign('design-md', inputKind);

  const roles = (
    values: Palette,
    defaults: Palette,
    stated: Partial<Palette> | undefined,
  ): Record<string, Sourced<string>> => {
    const out: Record<string, Sourced<string>> = {};
    for (const key of Object.keys(values) as (keyof Palette)[]) {
      // The importer can leave an explicit `undefined` in its palette; that is "not set", not a colour.
      if (typeof values[key] !== 'string') continue;
      const keyStated = stated?.[key] !== undefined;
      if (!keyStated && values[key] === defaults[key]) continue;
      out[PALETTE_TO_ROLE[key]] = sourced(values[key], classify(values[key], keyStated));
    }
    return out;
  };
  const light = roles(resolved.light, defaultPalette, o.palette);
  const dark = roles(resolved.dark, defaultPaletteDark, o.paletteDark);

  const scale: Record<string, TypeStep> = {};
  for (const [name, step] of Object.entries(o.typography?.scale ?? {})) {
    scale[name] = {
      ...(step.size === undefined ? {} : { size: exact(step.size) }),
      ...(step.weight === undefined ? {} : { weight: exact(step.weight) }),
      ...(step.lineHeight === undefined ? {} : { lineHeight: exact(step.lineHeight) }),
      ...(step.letterSpacing === undefined ? {} : { letterSpacing: exact(step.letterSpacing) }),
      ...(step.family === undefined ? {} : { family: exact(step.family) }),
    };
  }

  const radii: Record<string, Sourced<number>> = {};
  for (const key of Object.keys(defaultRadius) as (keyof typeof defaultRadius)[]) {
    if (o.radius?.[key] !== undefined || resolved.radius[key] !== defaultRadius[key]) {
      radii[key] = o.radius?.[key] !== undefined ? exact(resolved.radius[key]) : sourced(resolved.radius[key], tokenMeta('derived', 0.85));
    }
  }

  const shadows: Record<string, Sourced<readonly ShadowLayer[] | string>> = {};
  for (const [name, css] of Object.entries(o.shadows ?? {})) {
    shadows[name] = exact(parseShadowCss(css) ?? css);
  }
  const transitions: Record<string, Sourced<string>> = {};
  for (const key of Object.keys(defaultTransitions)) {
    const value = o.transitions?.[key as keyof typeof defaultTransitions];
    if (value !== undefined) transitions[key] = exact(value);
  }

  const components: Record<string, Record<string, Sourced<string>>> = {};
  for (const [name, props] of Object.entries(o.components ?? {})) {
    components[name] = Object.fromEntries(Object.entries(props).map(([k, v]) => [k, exact(v)]));
  }

  const shell: Record<string, Sourced<string>> = {};
  for (const [key, value] of Object.entries(o.shell ?? {})) {
    if (value !== undefined) shell[key] = sourced(value, classify(value, true));
  }

  const warnings = [...parsed.warnings];
  const fontFamily = o.typography?.fontFamily;
  const result: NormalizedDesign = {
    ...design,
    meta: {
      adapter: 'design-md',
      inputKind,
      ...(parsed.name === undefined ? {} : { name: parsed.name }),
      ...(parsed.description === undefined ? {} : { description: parsed.description }),
    },
    colors: { light, ...(Object.keys(dark).length > 0 ? { dark } : {}) },
    typography: {
      ...(fontFamily === undefined ? {} : { fontFamily: exact(fontFamily) }),
      ...(o.typography?.monoFamily === undefined ? {} : { monoFamily: exact(o.typography.monoFamily) }),
      scale,
    },
    spacing: { scale: Object.fromEntries(Object.entries(o.spacing ?? {}).flatMap(([k, v]) => (v === undefined ? [] : [[k, exact(v)]]))) },
    radii,
    shadows,
    shell,
    transitions,
    components,
    assets: {
      ...(o.branding?.logo === undefined ? {} : { logo: exact(o.branding.logo) }),
      ...(o.branding?.favicon === undefined ? {} : { favicon: exact(o.branding.favicon) }),
      ...(fontFamily === undefined ? {} : { fonts: [{ family: fontFamily.split(',')[0]?.trim().replace(/^['"]|['"]$/g, '') ?? fontFamily }] }),
    },
    extras: Object.fromEntries(Object.entries(o.extraTokens ?? {}).map(([k, v]) => [k, exact(v)])),
    warnings,
  };
  return result;
}

export function createDesignMdAdapter(options: DesignMdAdapterOptions = {}): DesignAdapter {
  return {
    id: 'design-md',
    canHandle: (input) => HANDLED_KINDS.includes(input.kind),
    analyze: async (input) => designMdToNormalized(textOf(input), input.kind, options),
  };
}
