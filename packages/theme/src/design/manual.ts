import { tokenMeta } from '../core/provenance';
import type { DesignInput, NormalizedDesign, Sourced } from './types';

/** A normalized design with nothing in it — the starting point for hand-entered values. */
export function emptyNormalizedDesign(adapter = 'manual', inputKind: NormalizedDesign['meta']['inputKind'] = 'manual'): NormalizedDesign {
  return {
    meta: { adapter, inputKind },
    colors: { light: {} },
    typography: { scale: {} },
    spacing: { scale: {} },
    radii: {},
    borders: {},
    shadows: {},
    sizing: {},
    shell: {},
    transitions: {},
    components: {},
    responsive: {},
    assets: {},
    extras: {},
    warnings: [],
  };
}

/** Wrap a value a person entered: exact, full confidence. */
export function manualValue<T>(value: T, note?: string): Sourced<T> {
  return { value, ...tokenMeta('manual', 1, note) };
}

function layer<T extends Record<string, Sourced<unknown> | undefined>>(base: T, extra: T | undefined): T {
  return extra === undefined ? base : { ...base, ...extra };
}

/**
 * Apply hand-entered corrections on top of what an adapter extracted. Manual values win token by token;
 * everything the person did not touch keeps the adapter's value and its confidence.
 */
export function mergeNormalizedDesign(auto: NormalizedDesign, manual: Partial<NormalizedDesign>): NormalizedDesign {
  const components: Record<string, Record<string, Sourced<string>>> = {};
  for (const [name, props] of Object.entries(auto.components)) components[name] = { ...props };
  for (const [name, props] of Object.entries(manual.components ?? {})) components[name] = { ...components[name], ...props };

  return {
    meta: { ...auto.meta, ...manual.meta },
    colors: {
      light: layer(auto.colors.light, manual.colors?.light),
      dark: auto.colors.dark === undefined && manual.colors?.dark === undefined
        ? undefined
        : layer(auto.colors.dark ?? {}, manual.colors?.dark),
      gradients: layer(auto.colors.gradients ?? {}, manual.colors?.gradients),
      opacity: layer(auto.colors.opacity ?? {}, manual.colors?.opacity),
    },
    typography: {
      fontFamily: manual.typography?.fontFamily ?? auto.typography.fontFamily,
      monoFamily: manual.typography?.monoFamily ?? auto.typography.monoFamily,
      scale: Object.fromEntries(
        [...new Set([...Object.keys(auto.typography.scale), ...Object.keys(manual.typography?.scale ?? {})])].map((key) => [
          key,
          { ...auto.typography.scale[key], ...manual.typography?.scale[key] },
        ]),
      ),
    },
    spacing: {
      system: manual.spacing?.system ?? auto.spacing.system,
      scale: layer(auto.spacing.scale, manual.spacing?.scale),
      semantic: { ...auto.spacing.semantic, ...manual.spacing?.semantic },
    },
    radii: layer(auto.radii, manual.radii),
    borders: layer(auto.borders, manual.borders),
    shadows: layer(auto.shadows, manual.shadows),
    sizing: layer(auto.sizing, manual.sizing),
    shell: layer(auto.shell, manual.shell),
    transitions: layer(auto.transitions, manual.transitions),
    components,
    responsive: { ...auto.responsive, ...manual.responsive },
    assets: { ...auto.assets, ...manual.assets },
    extras: layer(auto.extras, manual.extras),
    warnings: auto.warnings,
  };
}

/**
 * Fallback for inputs no adapter can read: the input is a JSON file holding a partial `NormalizedDesign`
 * (each value shaped `{ value, source: 'manual', confidence: 1 }`, see `manualValue`). Lets someone transcribe
 * a design by hand instead of the pipeline failing.
 */
export function parseManualMapping(input: DesignInput): NormalizedDesign {
  const text = typeof input.content === 'string' ? input.content : new TextDecoder().decode(input.content);
  const raw = JSON.parse(text) as unknown;
  if (raw === null || typeof raw !== 'object') throw new Error('Manual design mapping must be a JSON object');
  const partial = raw as Partial<NormalizedDesign>;
  return mergeNormalizedDesign(emptyNormalizedDesign('manual', input.kind), partial);
}

