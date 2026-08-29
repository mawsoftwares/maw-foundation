import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, CSSProperties } from 'react';
import { useResponsiveProp, type ResponsiveProp } from '../responsive';

const base: CSSProperties = { fontFamily: 'var(--maw-font-family)', boxSizing: 'border-box' };

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

export interface CardProps {
  readonly children: ReactNode;
  readonly padding?: ResponsiveProp<string>;
  readonly style?: CSSProperties;
}

export function Card({ children, padding, style }: CardProps): ReactNode {
  const resolvedPadding = useResponsiveProp(
    padding ?? { xs: 'var(--maw-space-lg)', md: 'var(--maw-space-xl)' },
    'var(--maw-space-xl)'
  );

  return (
    <div
      className="maw-card-hover"
      style={{
        ...base,
        background: 'var(--maw-surface)',
        border: '1px solid var(--maw-border)',
        borderRadius: 'var(--maw-radius-lg)',
        padding: resolvedPadding,
        boxShadow: 'var(--maw-shadow-sm)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
