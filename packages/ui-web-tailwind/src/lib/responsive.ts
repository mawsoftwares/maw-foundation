import type { ResponsiveProp } from '@mawsoftwares/ui-contract';

export type { ResponsiveProp };

export const BREAKPOINT_KEYS = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const;
export type BreakpointKey = (typeof BREAKPOINT_KEYS)[number];

/**
 * Resolves a responsive prop to one value per breakpoint, each inheriting from the next smaller one
 * (same rule as ui-web's useResponsiveProp). Returns undefined when the prop is not set at all.
 */
export function resolveResponsive<T>(prop: ResponsiveProp<T> | undefined): Record<BreakpointKey, T> | undefined {
  if (prop === undefined) return undefined;
  const source: Partial<Record<BreakpointKey, T>> =
    typeof prop === 'object' && prop !== null ? (prop as Partial<Record<BreakpointKey, T>>) : { xs: prop as T };
  const out = {} as Record<BreakpointKey, T>;
  let carry: T | undefined;
  for (const key of BREAKPOINT_KEYS) {
    carry = source[key] ?? carry;
    if (carry !== undefined) out[key] = carry;
  }
  return Object.keys(out).length === 0 ? undefined : out;
}
