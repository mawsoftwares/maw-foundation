import type { ThemeOverrides } from '../index';

function mergeRecords<T>(a: Record<string, T> | undefined, b: Record<string, T> | undefined): Record<string, T> | undefined {
  if (a === undefined) return b;
  if (b === undefined) return a;
  return { ...a, ...b };
}

/** Merge one level deeper than `mergeThemeOverrides`: per-component props, per-step type scale. */
function mergeNested<T extends Record<string, string | undefined>>(
  a: Record<string, T> | undefined,
  b: Record<string, T> | undefined,
): Record<string, T> | undefined {
  if (a === undefined) return b;
  if (b === undefined) return a;
  const out: Record<string, T> = { ...a };
  for (const [key, value] of Object.entries(b)) out[key] = { ...out[key], ...value };
  return out;
}

function pairMerge(base: ThemeOverrides, extra: ThemeOverrides): ThemeOverrides {
  const typography = base.typography === undefined && extra.typography === undefined
    ? undefined
    : {
        ...base.typography,
        ...extra.typography,
        scale: mergeNested(base.typography?.scale, extra.typography?.scale),
      };
  const result: ThemeOverrides = {
    branding: base.branding === undefined && extra.branding === undefined ? undefined : { ...base.branding, ...extra.branding },
    palette: { ...base.palette, ...extra.palette },
    paletteDark: { ...base.paletteDark, ...extra.paletteDark },
    spacing: { ...base.spacing, ...extra.spacing },
    radius: { ...base.radius, ...extra.radius },
    shadows: { ...base.shadows, ...extra.shadows },
    transitions: { ...base.transitions, ...extra.transitions },
    typography,
    shell: base.shell === undefined && extra.shell === undefined ? undefined : { ...base.shell, ...extra.shell },
    components: mergeNested(base.components, extra.components),
    extraTokens: mergeRecords(base.extraTokens, extra.extraTokens),
    extraTokensDark: mergeRecords(base.extraTokensDark, extra.extraTokensDark),
    responsive: mergeRecords(base.responsive, extra.responsive),
    provenance: mergeRecords(base.provenance, extra.provenance),
  };
  return result;
}

/**
 * Base theme + client overrides: only the tokens a layer sets replace the base, everything else is inherited.
 * Layers apply left to right; `undefined` layers are skipped. Never mutates its inputs.
 *
 *   const clientTheme = extendTheme(baseOverrides, { palette: { brand: '#0a7' } });
 */
export function extendTheme(base: ThemeOverrides, ...layers: readonly (ThemeOverrides | undefined)[]): ThemeOverrides {
  let result = base;
  for (const layer of layers) {
    if (layer !== undefined) result = pairMerge(result, layer);
  }
  return result;
}
