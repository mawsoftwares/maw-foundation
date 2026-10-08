import { needsReview, type TokenMeta, type TokenSource } from '../core/provenance';
import { detectSpacingSystem } from './spacing';
import type { NormalizedDesign, Sourced, SpacingSystem } from './types';

export type RadiusStyle = 'sharp' | 'slightly-rounded' | 'rounded' | 'pill';

/** Roles a usable theme needs; a missing one means the theme leans on built-in defaults for it. */
const REQUIRED_ROLES: readonly (readonly string[])[] = [
  ['primary'], ['onPrimary'], ['background'], ['card', 'surface'], ['text'], ['textMuted'], ['border'],
  ['success'], ['warning'], ['error'], ['info'],
];

export interface DesignAnalysis {
  readonly spacingSystem: SpacingSystem;
  /** `detected` from the design's own values; `given` when the adapter or a person stated it; `insufficient` with < 3 values. */
  readonly spacingSystemBasis: 'detected' | 'given' | 'insufficient';
  readonly radiusStyle?: RadiusStyle;
  readonly hasDarkMode: boolean;
  readonly typeScaleSteps: readonly string[];
  readonly coverage: { readonly present: readonly string[]; readonly missing: readonly string[] };
  /** How many tokens came from each source. */
  readonly sources: Readonly<Record<TokenSource, number>>;
  /** Normalized token paths a person should review, lowest confidence first. */
  readonly review: readonly { readonly path: string; readonly meta: TokenMeta }[];
}

/** Every sourced value in the design with a stable path, for counting and review. */
export function collectTokens(design: NormalizedDesign): readonly { path: string; token: Sourced<unknown> }[] {
  const out: { path: string; token: Sourced<unknown> }[] = [];
  const add = (path: string, token: Sourced<unknown> | undefined): void => {
    if (token !== undefined) out.push({ path, token });
  };
  const flat = (prefix: string, group: Readonly<Record<string, Sourced<unknown>>> | undefined): void => {
    for (const [k, v] of Object.entries(group ?? {})) add(`${prefix}.${k}`, v);
  };
  flat('colors.light', design.colors.light);
  flat('colors.dark', design.colors.dark);
  flat('colors.gradients', design.colors.gradients);
  flat('colors.opacity', design.colors.opacity);
  add('typography.fontFamily', design.typography.fontFamily);
  add('typography.monoFamily', design.typography.monoFamily);
  for (const [name, step] of Object.entries(design.typography.scale)) flat(`typography.scale.${name}`, step as Record<string, Sourced<unknown>>);
  flat('spacing.scale', design.spacing.scale);
  for (const [name, map] of Object.entries(design.spacing.semantic ?? {})) flat(`spacing.semantic.${name}`, map as Record<string, Sourced<unknown>>);
  flat('radii', design.radii);
  flat('borders', design.borders);
  flat('shadows', design.shadows);
  flat('sizing', design.sizing);
  flat('shell', design.shell);
  flat('transitions', design.transitions);
  for (const [name, props] of Object.entries(design.components)) flat(`components.${name}`, props);
  for (const [name, map] of Object.entries(design.responsive)) flat(`responsive.${name}`, map as Record<string, Sourced<unknown>>);
  add('assets.logo', design.assets.logo);
  add('assets.favicon', design.assets.favicon);
  add('assets.iconStyle', design.assets.iconStyle);
  flat('extras', design.extras);
  return out;
}

/** `16px`, `16`, `1rem` → 16. Anything else (percentages, calc, var) → undefined. */
export function parsePx(value: string | number): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  const match = /^(-?(?:\d+\.?\d*|\.\d+))(px|rem)?$/.exec(value.trim());
  if (match === null) return undefined;
  const n = Number.parseFloat(match[1] ?? '');
  return match[2] === 'rem' ? n * 16 : n;
}

function classifyRadius(px: number, controlHeight: number): RadiusStyle {
  if (px <= 0) return 'sharp';
  if (px >= 999 || px >= controlHeight / 2) return 'pill';
  if (px <= 4) return 'slightly-rounded';
  return 'rounded';
}

/**
 * Read the design's own values and say what kind of system it is. Pure: returns a report and the design with
 * the spacing system filled in; never changes a token value.
 */
export function analyzeDesign(design: NormalizedDesign): { design: NormalizedDesign; analysis: DesignAnalysis } {
  const spacingValues = [
    ...Object.values(design.spacing.scale).map((t) => t.value),
    ...Object.values(design.spacing.semantic ?? {}).flatMap((map) =>
      [map.desktop, map.tablet, map.mobile].flatMap((t) => (t === undefined ? [] : [parsePx(t.value)]))),
  ].filter((v): v is number => v !== undefined);

  let spacingSystem: SpacingSystem;
  let basis: DesignAnalysis['spacingSystemBasis'];
  if (design.spacing.system !== undefined) { spacingSystem = design.spacing.system; basis = 'given'; }
  else if (spacingValues.length < 3) { spacingSystem = { kind: 'custom' }; basis = 'insufficient'; }
  else { spacingSystem = detectSpacingSystem(spacingValues); basis = 'detected'; }

  const radiusToken = design.radii.button ?? design.radii.md ?? design.radii.card;
  const heightToken = design.components.button?.height ?? design.components['button-primary']?.height ?? design.sizing['button-height'];
  const controlHeight = (heightToken === undefined ? undefined : parsePx(heightToken.value)) ?? 40;
  const radiusStyle = radiusToken === undefined ? undefined : classifyRadius(radiusToken.value, controlHeight);

  const present = REQUIRED_ROLES.filter((alts) => alts.some((r) => design.colors.light[r] !== undefined)).map((alts) => alts[0] as string);
  const missing = REQUIRED_ROLES.filter((alts) => !alts.some((r) => design.colors.light[r] !== undefined)).map((alts) => alts[0] as string);

  const tokens = collectTokens(design);
  const sources: Record<TokenSource, number> = { design: 0, derived: 0, estimated: 0, manual: 0, default: 0 };
  for (const { token } of tokens) sources[token.source]++;
  const review = tokens
    .filter(({ token }) => needsReview(token))
    .map(({ path, token }) => ({ path, meta: { source: token.source, confidence: token.confidence } as TokenMeta }))
    .sort((a, b) => a.meta.confidence - b.meta.confidence || a.path.localeCompare(b.path));

  return {
    design: { ...design, spacing: { ...design.spacing, system: spacingSystem } },
    analysis: {
      spacingSystem,
      spacingSystemBasis: basis,
      ...(radiusStyle === undefined ? {} : { radiusStyle }),
      hasDarkMode: Object.keys(design.colors.dark ?? {}).length > 0,
      typeScaleSteps: Object.keys(design.typography.scale),
      coverage: { present, missing },
      sources,
      review,
    },
  };
}
