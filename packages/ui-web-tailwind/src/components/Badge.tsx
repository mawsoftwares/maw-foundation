import type { CSSProperties, ReactNode } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../lib/cn';

export type BadgeVariant = 'default' | 'neutral' | 'success' | 'danger' | 'warning' | 'info';

const badgeStyles = cva(
  'box-border inline-flex items-center gap-1 rounded-[var(--maw-comp-badges-border-radius,var(--maw-radius-pill))] px-2.5 py-0.5 font-sans text-xs font-medium ring-1 ring-inset',
  {
    variants: {
      variant: {
        default: 'bg-bg-muted text-fg-muted ring-border',
        neutral: 'bg-bg-muted text-fg-muted ring-border',
        success: 'bg-success-bg text-success ring-success/25',
        danger: 'bg-danger-bg text-danger ring-danger/25',
        warning: 'bg-warning-bg text-warning ring-warning/25',
        info: 'bg-info-bg text-info ring-info/25',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export function Badge({
  variant = 'default',
  children,
  style,
  className,
}: {
  variant?: BadgeVariant;
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}): ReactNode {
  return (
    <span className={cn(badgeStyles({ variant }), className)} style={style}>
      {children}
    </span>
  );
}
