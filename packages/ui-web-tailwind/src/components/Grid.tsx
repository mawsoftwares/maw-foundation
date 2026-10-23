import type { CSSProperties, ReactNode } from 'react';
import type { GridProps } from '@mawsoftwares/ui-contract';
import { resolveResponsive, type ResponsiveProp } from '../lib/responsive';

const DEFAULT_COLUMNS = 'repeat(auto-fill, minmax(250px, 1fr))';
const DEFAULT_GAP = 'var(--maw-space-md)';

// Static class names (Tailwind scans source); per-breakpoint values arrive through CSS variables set inline.
const GRID_CLASSES = [
  'grid',
  '[grid-template-columns:var(--c-xs)] sm:[grid-template-columns:var(--c-sm)] md:[grid-template-columns:var(--c-md)] lg:[grid-template-columns:var(--c-lg)] xl:[grid-template-columns:var(--c-xl)] 2xl:[grid-template-columns:var(--c-2xl)]',
  '[gap:var(--g-xs)] sm:[gap:var(--g-sm)] md:[gap:var(--g-md)] lg:[gap:var(--g-lg)] xl:[gap:var(--g-xl)] 2xl:[gap:var(--g-2xl)]',
  'box-border font-sans',
].join(' ');

/** Same props as the `Grid` in @mawsoftwares/ui-web, including per-breakpoint `columns` / `gap` and `minChildWidth`. */
export function Grid({ children, columns, gap = DEFAULT_GAP, minChildWidth, style }: GridProps): ReactNode {
  const vars: Record<string, string> = {};

  // Always resolve through resolveResponsive so a value set at one breakpoint carries up to the larger ones
  // (the classes read --c-<bp> at every breakpoint; an unset variable would collapse the grid to `none`).
  const columnSource: ResponsiveProp<number | string> =
    minChildWidth !== undefined && minChildWidth > 0
      ? `repeat(auto-fill, minmax(${minChildWidth}px, 1fr))`
      : (columns ?? DEFAULT_COLUMNS);
  const columnValues = resolveResponsive<number | string>(columnSource);
  if (columnValues !== undefined) {
    for (const [bp, value] of Object.entries(columnValues)) {
      vars[`--c-${bp}`] = typeof value === 'number' ? `repeat(${value}, 1fr)` : String(value);
    }
  }

  const gapValues = resolveResponsive<string | number>(gap);
  if (gapValues !== undefined) {
    for (const [bp, value] of Object.entries(gapValues)) {
      vars[`--g-${bp}`] = typeof value === 'number' ? `${value}px` : String(value);
    }
  }

  return (
    <div className={GRID_CLASSES} style={{ ...vars, ...style } as CSSProperties}>
      {children}
    </div>
  );
}
