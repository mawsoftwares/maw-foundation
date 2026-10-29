import type { CSSProperties, ReactNode } from 'react';
import { cva } from 'class-variance-authority';
import type { CardProps as ContractCardProps, CardVariant } from '@mawsoftwares/ui-contract';
import { cn } from '../lib/cn';
import { resolveResponsive } from '../lib/responsive';

export type { CardVariant };

const cardStyles = cva(
  'box-border font-sans text-fg bg-[var(--maw-comp-cards-background,var(--maw-surface))] rounded-[var(--maw-comp-cards-border-radius,var(--maw-radius-lg))] transition-all duration-300 ease-out',
  {
    variants: {
      variant: {
        default: 'shadow-sm',
        elevated: 'shadow-lg',
        bordered: 'border border-border',
        interactive:
          'cursor-pointer border border-transparent shadow-sm hover:-translate-y-1 hover:border-border-focus hover:shadow-lg',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

// Per-breakpoint padding: classes are static (Tailwind scans source), values arrive through CSS variables.
const PADDING_CLASSES =
  'p-[var(--p-xs)] sm:p-[var(--p-sm)] md:p-[var(--p-md)] lg:p-[var(--p-lg)] xl:p-[var(--p-xl)] 2xl:p-[var(--p-2xl)]';

export type CardProps = ContractCardProps & { readonly className?: string };

/** Same props as the `Card` in @mawsoftwares/ui-web, including per-breakpoint `padding` objects. */
export function Card({ children, variant = 'default', padding, style, className }: CardProps): ReactNode {
  const resolved = resolveResponsive(padding);
  const vars: Record<string, string> = {};
  if (resolved !== undefined) {
    for (const [bp, value] of Object.entries(resolved)) vars[`--p-${bp}`] = value;
  }
  return (
    <div
      className={cn('maw-card', cardStyles({ variant }), resolved === undefined ? 'p-4 md:p-6' : PADDING_CLASSES, className)}
      style={{ ...vars, ...style } as CSSProperties}
    >
      {children}
    </div>
  );
}
