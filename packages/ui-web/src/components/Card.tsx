import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, CSSProperties } from 'react';
import { useResponsiveProp, type ResponsiveProp } from '../responsive';

const base: CSSProperties = { fontFamily: 'var(--maw-font-family)', boxSizing: 'border-box' };

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

export type CardVariant = 'default' | 'elevated' | 'bordered' | 'interactive';

export interface CardProps {
  readonly children: ReactNode;
  readonly variant?: CardVariant;
  readonly padding?: ResponsiveProp<string>;
  readonly style?: CSSProperties;
}

export function Card({ children, variant = 'default', padding, style }: CardProps): ReactNode {
  const resolvedPadding = useResponsiveProp(
    padding ?? { xs: 'var(--maw-space-lg)', md: 'var(--maw-space-xl)' },
    'var(--maw-space-xl)'
  );

  return (
    <div
      className={`maw-card maw-card--${variant} maw-card-hover`}
      style={{
        ...base,
        background: `var(--maw-comp-cards-${variant}-background, var(--maw-comp-cards-background, var(--maw-surface)))`,
        border: `var(--maw-comp-cards-${variant}-border, var(--maw-comp-cards-border, ${variant === 'bordered' ? '1px solid var(--maw-border)' : 'none'}))`,
        borderRadius: 'var(--maw-comp-cards-border-radius, var(--maw-radius-lg))',
        padding: `var(--maw-comp-cards-padding, ${resolvedPadding})`,
        boxShadow: `var(--maw-comp-cards-${variant}-shadow, var(--maw-comp-cards-shadow, ${variant === 'elevated' ? 'var(--maw-shadow-lg)' : variant === 'bordered' ? 'none' : 'var(--maw-shadow-sm)'}))`,
        backdropFilter: 'var(--maw-comp-cards-backdrop-filter, none)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
