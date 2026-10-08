import { createTheme, type Theme, type ThemeOverrides } from '../index';
import { extendTheme } from './extend';

export interface ThemeDefinition {
  readonly id: string;
  /** Id of the theme this one builds on; omit for a root theme (which extends the built-in defaults). */
  readonly extends?: string;
  /** Only the tokens that differ from the parent. */
  readonly overrides: ThemeOverrides;
}

export interface ThemeRegistry {
  register(definition: ThemeDefinition): void;
  has(id: string): boolean;
  ids(): readonly string[];
  /** The fully inherited overrides for `id` (parent chain applied root-first). */
  resolveOverrides(id: string): ThemeOverrides;
  resolve(id: string): Theme;
}

/**
 * Named client themes with single inheritance (`client-a` extends `default`). Holds data only — no I/O —
 * so the same registry works on web, native and server.
 */
export function createThemeRegistry(initial: readonly ThemeDefinition[] = []): ThemeRegistry {
  const definitions = new Map<string, ThemeDefinition>();

  const chain = (id: string): readonly ThemeDefinition[] => {
    const out: ThemeDefinition[] = [];
    const seen = new Set<string>();
    let current: string | undefined = id;
    while (current !== undefined) {
      if (seen.has(current)) throw new Error(`Theme inheritance cycle: ${[...seen, current].join(' -> ')}`);
      seen.add(current);
      const def = definitions.get(current);
      if (def === undefined) throw new Error(`Unknown theme "${current}"${current === id ? '' : ` (parent of "${id}")`}`);
      out.unshift(def);
      current = def.extends;
    }
    return out;
  };

  const registry: ThemeRegistry = {
    register(definition) {
      definitions.set(definition.id, definition);
    },
    has: (id) => definitions.has(id),
    ids: () => [...definitions.keys()],
    resolveOverrides(id) {
      const [root, ...rest] = chain(id);
      return extendTheme(root?.overrides ?? {}, ...rest.map((d) => d.overrides));
    },
    resolve: (id) => createTheme(registry.resolveOverrides(id)),
  };

  for (const definition of initial) registry.register(definition);
  return registry;
}
