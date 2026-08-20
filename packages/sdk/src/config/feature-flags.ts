/**
 * Lightweight feature-flag registry — isomorphic, zero dependencies.
 * Works standalone or alongside rbac-core's module-level gating.
 *
 * Usage:
 *   const flags = createFlagStore({ darkMode: false, newCheckout: true });
 *   flags.set('darkMode', true);
 *   if (flags.isEnabled('darkMode')) { ... }
 */

export interface FlagStore<K extends string = string> {
  isEnabled(flag: K): boolean;
  set(flag: K, enabled: boolean): void;
  setAll(flags: Partial<Record<K, boolean>>): void;
  getAll(): Record<K, boolean>;
  reset(): void;
  onChange(listener: FlagChangeListener<K>): () => void;
}

export type FlagChangeListener<K extends string = string> = (
  flag: K,
  enabled: boolean,
) => void;

export function createFlagStore<K extends string>(
  defaults: Record<K, boolean>,
): FlagStore<K> {
  const initial = { ...defaults };
  const state = { ...defaults };
  const listeners = new Set<FlagChangeListener<K>>();

  function notify(flag: K, enabled: boolean) {
    for (const fn of listeners) fn(flag, enabled);
  }

  return {
    isEnabled(flag) {
      return state[flag] ?? false;
    },

    set(flag, enabled) {
      if (state[flag] === enabled) return;
      state[flag] = enabled;
      notify(flag, enabled);
    },

    setAll(flags) {
      for (const [flag, enabled] of Object.entries(flags) as [K, boolean][]) {
        if (state[flag] !== enabled) {
          state[flag] = enabled;
          notify(flag, enabled);
        }
      }
    },

    getAll() {
      return { ...state };
    },

    reset() {
      for (const flag of Object.keys(initial) as K[]) {
        const def = initial[flag]!;
        if (state[flag] !== def) {
          state[flag] = def;
          notify(flag, def);
        }
      }
    },

    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

// ---------------------------------------------------------------------------
// Percentage-based rollout helper
// ---------------------------------------------------------------------------

export function isRolledOut(
  userId: string,
  percentage: number,
): boolean {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return (Math.abs(hash) % 100) < percentage;
}
