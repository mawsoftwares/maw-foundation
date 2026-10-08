import type { SpacingSystem } from './types';

/** Share of values that must sit on a grid for it to count as "the" system. */
const FIT_THRESHOLD = 0.9;

/**
 * Detect whether a set of spacing values (px) follows a 4px system, an 8px system, some other consistent
 * base, or no single grid. Does not force an 8px system: values like 4, 12, 20 are 4px-grid but not 8px-grid.
 */
export function detectSpacingSystem(values: readonly number[]): SpacingSystem {
  const nonZero = values.filter((v) => Number.isFinite(v) && v > 0);
  if (nonZero.length === 0) return { kind: 'custom' };
  const fit = (base: number): number => nonZero.filter((v) => Math.abs(v / base - Math.round(v / base)) < 1e-6).length / nonZero.length;

  if (fit(8) >= FIT_THRESHOLD) return { kind: '8px', base: 8, fit: fit(8) };
  if (fit(4) >= FIT_THRESHOLD) return { kind: '4px', base: 4, fit: fit(4) };

  // Another consistent base (3, 5, 6, 10 …): the largest base that fits nearly everything.
  const integers = nonZero.every((v) => Number.isInteger(v));
  if (integers) {
    for (const base of [10, 6, 5, 3, 2]) {
      if (fit(base) >= FIT_THRESHOLD) return { kind: 'custom', base, fit: fit(base) };
    }
  }
  return { kind: 'mixed', fit: Math.max(fit(4), fit(8)) };
}
