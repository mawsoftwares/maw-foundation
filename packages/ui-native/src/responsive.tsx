import { useState, useEffect, useCallback } from 'react';
import { Dimensions } from 'react-native';
import { breakpoints as themeBreakpoints } from '@mawsoftwares/theme';

const BREAKPOINTS = {
  sm: themeBreakpoints.sm,
  md: themeBreakpoints.md,
  lg: themeBreakpoints.lg,
  xl: themeBreakpoints.xl,
  '2xl': themeBreakpoints.xxl,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

function resolveBreakpoint(width: number): Breakpoint | 'xs' {
  if (width >= BREAKPOINTS['2xl']) return '2xl';
  if (width >= BREAKPOINTS.xl) return 'xl';
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  if (width >= BREAKPOINTS.sm) return 'sm';
  return 'xs';
}

export function useBreakpoint(): Breakpoint | 'xs' {
  const [bp, setBp] = useState<Breakpoint | 'xs'>(() =>
    resolveBreakpoint(Dimensions.get('window').width),
  );

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setBp(resolveBreakpoint(window.width));
    });
    return () => sub.remove();
  }, []);

  return bp;
}

export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(
    () => Dimensions.get('window').width < BREAKPOINTS.md,
  );

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setMobile(window.width < BREAKPOINTS.md);
    });
    return () => sub.remove();
  }, []);

  return mobile;
}

export type ResponsiveProp<T> = T | {
  readonly xs?: T;
  readonly sm?: T;
  readonly md?: T;
  readonly lg?: T;
  readonly xl?: T;
  readonly '2xl'?: T;
};

export function useResponsiveProp<T>(prop: ResponsiveProp<T> | undefined, fallback: T): T {
  const breakpoint = useBreakpoint();

  if (prop === undefined) return fallback;
  if (typeof prop !== 'object' || prop === null) return prop as T;

  const p = prop as Record<string, T>;

  if (breakpoint === '2xl') return p['2xl'] ?? p.xl ?? p.lg ?? p.md ?? p.sm ?? p.xs ?? fallback;
  if (breakpoint === 'xl') return p.xl ?? p.lg ?? p.md ?? p.sm ?? p.xs ?? fallback;
  if (breakpoint === 'lg') return p.lg ?? p.md ?? p.sm ?? p.xs ?? fallback;
  if (breakpoint === 'md') return p.md ?? p.sm ?? p.xs ?? fallback;
  if (breakpoint === 'sm') return p.sm ?? p.xs ?? fallback;
  return p.xs ?? fallback;
}

export { BREAKPOINTS };
