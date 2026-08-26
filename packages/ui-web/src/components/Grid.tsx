import {
  useState,
  type ReactNode,
  type CSSProperties,
} from 'react';

const base: CSSProperties = { fontFamily: 'var(--maw-font-family)', boxSizing: 'border-box' };

// ---------------------------------------------------------------------------
// Grid
// ---------------------------------------------------------------------------

export interface GridProps {
  readonly children: ReactNode;
  readonly columns?: number | string;
  readonly gap?: string;
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
  const gridTemplateColumns = minChildWidth
    ? `repeat(auto-fill, minmax(${minChildWidth}px, 1fr))`
    : typeof columns === 'number'
      ? `repeat(${columns}, 1fr)`
      : columns ?? 'repeat(auto-fill, minmax(250px, 1fr))';

  return (
    <div style={{
      ...base,
      display: 'grid',
      gridTemplateColumns,
      gap,
      ...style,
    }}>
      {children}
    </div>
  );
}
