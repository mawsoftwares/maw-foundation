import {
  type ReactNode,
  type CSSProperties,
} from 'react';
import { useResponsiveProp, type ResponsiveProp } from '../responsive';

const base: CSSProperties = { fontFamily: 'var(--maw-font-family)', boxSizing: 'border-box' };

// ---------------------------------------------------------------------------
// Grid
// ---------------------------------------------------------------------------

export interface GridProps {
  readonly children: ReactNode;
  readonly columns?: ResponsiveProp<number | string>;
  readonly gap?: ResponsiveProp<string | number>;
  readonly minChildWidth?: number;
  readonly style?: CSSProperties;
}

export function Grid({
  children,
  columns,
  gap = 'var(--maw-space-md)',
  minChildWidth,
  style,
}: GridProps): ReactNode {
  const currentColumns = useResponsiveProp(columns, undefined);
  const currentGap = useResponsiveProp(gap, 'var(--maw-space-md)');

  const gridTemplateColumns = minChildWidth
    ? `repeat(auto-fill, minmax(${minChildWidth}px, 1fr))`
    : typeof currentColumns === 'number'
      ? `repeat(${currentColumns}, 1fr)`
      : currentColumns ?? 'repeat(auto-fill, minmax(250px, 1fr))';

  return (
    <div style={{
      ...base,
      display: 'grid',
      gridTemplateColumns,
      gap: currentGap,
      ...style,
    }}>
      {children}
    </div>
  );
}
