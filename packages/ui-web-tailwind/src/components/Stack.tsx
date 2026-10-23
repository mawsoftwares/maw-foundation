import type { CSSProperties, ReactNode } from 'react';
import { cn } from '../lib/cn';
import { resolveResponsive, type ResponsiveProp } from '../lib/responsive';

export interface StackProps {
  readonly direction?: ResponsiveProp<'row' | 'column'>;
  readonly gap?: ResponsiveProp<string | number>;
  readonly align?: ResponsiveProp<CSSProperties['alignItems']>;
  readonly justify?: ResponsiveProp<CSSProperties['justifyContent']>;
  readonly children: ReactNode;
  readonly style?: CSSProperties;
  readonly className?: string;
}

// Tailwind only generates classes it can read statically, so the per-breakpoint rules are spelled out
// once and fed by CSS variables (set inline below) instead of building class names at runtime.
const RESPONSIVE_CLASSES = cn(
  '[flex-direction:var(--d-xs)] sm:[flex-direction:var(--d-sm)] md:[flex-direction:var(--d-md)] lg:[flex-direction:var(--d-lg)] xl:[flex-direction:var(--d-xl)] 2xl:[flex-direction:var(--d-2xl)]',
  '[gap:var(--g-xs)] sm:[gap:var(--g-sm)] md:[gap:var(--g-md)] lg:[gap:var(--g-lg)] xl:[gap:var(--g-xl)] 2xl:[gap:var(--g-2xl)]',
  '[align-items:var(--a-xs)] sm:[align-items:var(--a-sm)] md:[align-items:var(--a-md)] lg:[align-items:var(--a-lg)] xl:[align-items:var(--a-xl)] 2xl:[align-items:var(--a-2xl)]',
  '[justify-content:var(--j-xs)] sm:[justify-content:var(--j-sm)] md:[justify-content:var(--j-md)] lg:[justify-content:var(--j-lg)] xl:[justify-content:var(--j-xl)] 2xl:[justify-content:var(--j-2xl)]',
);

function toVars<T>(prefix: string, prop: ResponsiveProp<T> | undefined, fallback: T | undefined): Record<string, string> {
  const resolved = resolveResponsive(prop === undefined && fallback !== undefined ? (fallback as ResponsiveProp<T>) : prop);
  const vars: Record<string, string> = {};
  if (resolved === undefined) return vars;
  for (const [bp, value] of Object.entries(resolved)) {
    vars[`--${prefix}-${bp}`] = typeof value === 'number' ? `${value}px` : String(value);
  }
  return vars;
}

/** Same props as the `Stack` in @mawsoftwares/ui-web, including per-breakpoint objects. */
export function Stack({
  direction,
  gap,
  align,
  justify,
  children,
  style,
  className,
}: StackProps): ReactNode {
  const vars = {
    ...toVars('d', direction, 'column'),
    ...toVars('g', gap, 'var(--maw-space-md)'),
    ...toVars('a', align, undefined),
    ...toVars('j', justify, undefined),
  };
  return (
    <div className={cn('flex', RESPONSIVE_CLASSES, className)} style={{ ...vars, ...style } as CSSProperties}>
      {children}
    </div>
  );
}
