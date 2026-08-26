import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, CSSProperties } from 'react';

const base: CSSProperties = { fontFamily: 'var(--maw-font-family)', boxSizing: 'border-box' };

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }): ReactNode {
  return (
    <div
      className="maw-card-hover"
      style={{
        ...base,
        background: 'var(--maw-bg)',
        border: '1px solid var(--maw-border)',
        borderRadius: 'var(--maw-radius-lg)',
        padding: 'var(--maw-space-xl)',
        boxShadow: 'var(--maw-shadow-sm)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
