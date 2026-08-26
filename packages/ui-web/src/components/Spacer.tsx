import {
  useState,
  type ReactNode,
  type CSSProperties,
} from 'react';

const base: CSSProperties = { fontFamily: 'var(--maw-font-family)', boxSizing: 'border-box' };

// ---------------------------------------------------------------------------
// Spacer
// ---------------------------------------------------------------------------

export interface SpacerProps {
  readonly size?: string;
  readonly axis?: 'horizontal' | 'vertical';
  readonly style?: CSSProperties;
}

export function Spacer({
  size = 'var(--maw-space-md)',
  axis = 'vertical',
  style,
}: SpacerProps): ReactNode {
  return (
    <div
      aria-hidden="true"
      style={{
        ...base,
        ...(axis === 'vertical'
          ? { height: size, width: '100%' }
          : { width: size, height: '100%', display: 'inline-block' }),
        flexShrink: 0,
        ...style,
      }}
    />
  );
}
