import type { MawModule } from './contract';

/** Merges the `roleGrants` of all modules into one role code -> permission codes map (deduplicated). */
export function collectRoleGrants(modules: readonly MawModule[]): Record<string, string[]> {
  const merged = new Map<string, Set<string>>();
  for (const m of modules) {
    for (const [role, codes] of Object.entries(m.roleGrants ?? {})) {
      const set = merged.get(role) ?? new Set<string>();
      for (const code of codes) set.add(code);
      merged.set(role, set);
    }
  }
  return Object.fromEntries([...merged].map(([role, set]) => [role, [...set]]));
}
