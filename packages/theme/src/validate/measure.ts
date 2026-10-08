import { resolveCssValue } from './accessibility';
import { parsePx } from '../design/analyze';
import { shadowToCss } from '../design/generator';
import { parseShadowCss } from '../design/shadow';
import type { NormalizedDesign, Sourced } from '../design/types';
import { areaForComponent } from './fidelity';
import { parseColor } from './color';
import type { ValidationFinding } from './types';

/**
 * Compare what a design says with what the real components render. The browser half (mounting probe
 * elements and reading computed styles) lives in ui-web; this half is pure so it can be tested without a DOM.
 */

/** Component names the probes can render. Everything else cannot be compared visually. */
export const RENDER_PROBES = [
  'button-primary', 'button-secondary', 'button-outline', 'button-ghost', 'button-destructive', 'button-link',
  'input', 'card', 'badge-default', 'badge-success', 'badge-danger', 'badge-warning', 'badge-info',
] as const;
export type RenderProbe = (typeof RENDER_PROBES)[number];

const PROBE_ALIASES: Readonly<Record<string, RenderProbe>> = {
  button: 'button-primary', 'button-danger': 'button-destructive', badge: 'badge-default', 'badge-neutral': 'badge-default',
  'badge-error': 'badge-danger', 'input-default': 'input', 'card-default': 'card',
};

export type ComparedProp = 'background' | 'text-color' | 'border-radius' | 'height' | 'font-size' | 'font-weight' | 'shadow';

/** Design property → the computed-style property to read, and how to compare it. */
export const PROP_MEASURE: Readonly<Record<ComparedProp, { cssProp: string; kind: 'color' | 'length' | 'number' | 'shadow' }>> = {
  background: { cssProp: 'background-color', kind: 'color' },
  'text-color': { cssProp: 'color', kind: 'color' },
  'border-radius': { cssProp: 'border-top-left-radius', kind: 'length' },
  height: { cssProp: 'height', kind: 'length' },
  'font-size': { cssProp: 'font-size', kind: 'length' },
  'font-weight': { cssProp: 'font-weight', kind: 'number' },
  shadow: { cssProp: 'box-shadow', kind: 'shadow' },
};

const PROP_NAMES: Readonly<Record<string, ComparedProp>> = {
  backgroundColor: 'background', background: 'background', textColor: 'text-color', color: 'text-color',
  rounded: 'border-radius', borderRadius: 'border-radius', radius: 'border-radius', height: 'height',
  fontSize: 'font-size', fontWeight: 'font-weight', shadow: 'shadow', boxShadow: 'shadow', elevation: 'shadow',
};

export interface RenderExpectation {
  readonly probe: RenderProbe;
  readonly prop: ComparedProp;
  readonly expected: string;
  readonly designPath: string;
  readonly confidence: number;
}

/** probe → computed CSS property → value, as read from the DOM. */
export type Measurements = Readonly<Partial<Record<RenderProbe, Readonly<Record<string, string>>>>>;

/** What the design asserts about resting components, resolved to literal values. States (hover…) are not probed. */
export function expectationsFromDesign(design: NormalizedDesign, vars: Readonly<Record<string, string>>): readonly RenderExpectation[] {
  const out: RenderExpectation[] = [];
  const probeFor = (name: string): RenderProbe | undefined =>
    (RENDER_PROBES as readonly string[]).includes(name) ? (name as RenderProbe) : PROBE_ALIASES[name];

  const push = (probe: RenderProbe, prop: ComparedProp, raw: string, path: string, token: Sourced<unknown>): void => {
    const expected = resolveCssValue(raw, vars);
    if (expected === undefined || expected.includes('var(') || expected.includes('color-mix')) return;
    out.push({ probe, prop, expected, designPath: path, confidence: token.confidence });
  };

  for (const [name, props] of Object.entries(design.components)) {
    const probe = probeFor(name);
    if (probe === undefined) continue;
    for (const [rawProp, token] of Object.entries(props)) {
      const path = `components.${name}.${rawProp}`;
      if (rawProp === 'typography') {
        const step = design.typography.scale[token.value];
        if (step?.size !== undefined) push(probe, 'font-size', step.size.value, `${path} → typography.scale.${token.value}.size`, step.size);
        if (step?.weight !== undefined) push(probe, 'font-weight', step.weight.value, `${path} → typography.scale.${token.value}.weight`, step.weight);
        continue;
      }
      const prop = PROP_NAMES[rawProp];
      if (prop !== undefined) push(probe, prop, token.value, path, token);
    }
  }
  return out;
}

/**
 * Canonical form of a `box-shadow` for comparison. Browsers report computed shadows colour-first
 * (`rgba(0,0,0,.1) 0px 4px 12px 0px`) with every length spelled out; authored CSS is length-first and terse.
 * Both are reduced to the same layered form.
 */
function normalizeShadow(value: string): string {
  const layers = value
    .split(/,(?![^(]*\))/)
    .map((layer) => {
      const t = layer.trim();
      const color = /^(rgba?\([^)]*\)|#[0-9a-f]+)\s+/i.exec(t)?.[1];
      return color === undefined ? t : `${t.slice(color.length).trim()} ${color}`;
    })
    .join(',');
  const parsed = parseShadowCss(layers);
  const canonical = parsed === undefined ? layers : shadowToCss(parsed);
  return canonical.replace(/\s+/g, '').toLowerCase();
}

function matches(kind: (typeof PROP_MEASURE)[ComparedProp]['kind'], expected: string, actual: string): boolean {
  if (kind === 'color') {
    const [e, a] = [parseColor(expected), parseColor(actual)];
    return e === undefined || a === undefined
      ? expected.trim().toLowerCase() === actual.trim().toLowerCase()
      : Math.abs(e.r - a.r) <= 1 && Math.abs(e.g - a.g) <= 1 && Math.abs(e.b - a.b) <= 1 && Math.abs(e.a - a.a) < 0.02;
  }
  if (kind === 'length') {
    const [e, a] = [parsePx(expected), parsePx(actual)];
    if (e === undefined || a === undefined) return expected.trim() === actual.trim();
    // Pill radii: any value far above half the control height renders identically.
    return Math.abs(e - a) <= 0.5 || (e >= 100 && a >= 100);
  }
  if (kind === 'number') return Number.parseFloat(expected) === Number.parseFloat(actual);
  return normalizeShadow(expected) === normalizeShadow(actual);
}

/** Findings for every expectation the rendered components do not meet. Expectations with no measurement are skipped. */
export function compareRendered(expectations: readonly RenderExpectation[], measurements: Measurements): readonly ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  for (const e of expectations) {
    const { cssProp, kind } = PROP_MEASURE[e.prop];
    const actual = measurements[e.probe]?.[cssProp];
    if (actual === undefined) continue;
    if (matches(kind, e.expected, actual)) continue;
    findings.push({
      id: `render.${e.probe}.${e.prop}`,
      area: areaForComponent(e.probe),
      severity: 'warning',
      path: e.designPath,
      message: `${e.probe} ${e.prop.replace('-', ' ')} differs: design ${e.expected}, rendered ${actual}.`
        + (e.confidence < 0.8 ? ` (design value is an estimate, ${Math.round(e.confidence * 100)}% confidence)` : ''),
    });
  }
  return findings;
}

