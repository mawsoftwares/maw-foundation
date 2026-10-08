import type { ThemeOverrides } from '../index';

type Json = Record<string, unknown>;

const isPlain = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]));
  if (isPlain(a) && isPlain(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    return [...keys].every((k) => deepEqual(a[k], b[k]));
  }
  return false;
}

const isEmptyObject = (v: unknown): boolean => isPlain(v) && Object.keys(v).length === 0;

function diffValues(base: unknown, next: unknown): unknown {
  // An empty section and a missing one mean the same thing (`extendTheme` pads sections with `{}`).
  if (isEmptyObject(next) && (base === undefined || isEmptyObject(base))) return undefined;
  if (isPlain(base) && isPlain(next)) {
    const out: Json = {};
    for (const [key, value] of Object.entries(next)) {
      const changed = diffValues(base[key], value);
      if (changed !== undefined) out[key] = changed;
    }
    return Object.keys(out).length > 0 ? out : undefined;
  }
  return deepEqual(base, next) ? undefined : next;
}

function hasPath(root: unknown, path: readonly string[]): boolean {
  let node: unknown = root;
  for (const part of path) {
    if (!isPlain(node) || !(part in node)) return false;
    node = node[part];
  }
  return true;
}

/**
 * The inverse of `extendTheme`: only the tokens in `next` that differ from `base`, so a client theme stored as
 * "base + this" does not duplicate the whole theme. `extendTheme(base, diffThemeOverrides(base, next))` resolves
 * to the same tokens as `next`. Provenance is kept only for tokens that remain.
 */
export function diffThemeOverrides(base: ThemeOverrides, next: ThemeOverrides): ThemeOverrides {
  const { provenance, ...tokens } = next;
  const { provenance: _baseProvenance, ...baseTokens } = base;
  const diff = (diffValues(baseTokens, tokens) ?? {}) as ThemeOverrides;
  if (provenance !== undefined) {
    const kept = Object.fromEntries(Object.entries(provenance).filter(([path]) => hasPath(diff, path.split('.'))));
    if (Object.keys(kept).length > 0) return { ...diff, provenance: kept };
  }
  return diff;
}
