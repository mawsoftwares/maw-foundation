import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, CSSProperties } from 'react';

const base: CSSProperties = { fontFamily: 'var(--maw-font-family)', boxSizing: 'border-box' };

// ---------------------------------------------------------------------------
// Divider
// ---------------------------------------------------------------------------

export function Divider({ style }: { style?: CSSProperties } = {}): ReactNode {
  return (
    <hr
      style={{
        border: 'none',
        borderTop: '1px solid var(--maw-border)',
        margin: 'var(--maw-space-lg) 0',
        ...style,
      }}
    />
  );
}
