import type { ReactNode } from 'react';
import { cva } from 'class-variance-authority';
import { CircleCheck, CircleX, Info, TriangleAlert, X } from 'lucide-react';
import type { AlertProps, AlertVariant } from '@mawsoftwares/ui-contract';
import { cn } from '../lib/cn';

export type { AlertVariant };

const alertStyles = cva(
  'box-border flex items-start gap-3 rounded-[var(--maw-comp-alerts-border-radius,var(--maw-radius-md))] border-l-4 bg-bg-subtle px-4 py-3 font-sans text-fg',
  {
    variants: {
      variant: {
        info: 'border-info',
        success: 'border-success',
        warning: 'border-warning',
        danger: 'border-danger',
      },
    },
    defaultVariants: { variant: 'info' },
  },
);

const ICONS = { info: Info, success: CircleCheck, warning: TriangleAlert, danger: CircleX } as const;
const ICON_COLOR = { info: 'text-info', success: 'text-success', warning: 'text-warning', danger: 'text-danger' } as const;

/** Same props as the `Alert` in @mawsoftwares/ui-web (`icon` is a text/emoji glyph that replaces the default icon). */
export function Alert({ variant = 'info', title, children, onDismiss, icon, style }: AlertProps): ReactNode {
  const Glyph = ICONS[variant];
  return (
    <div role="alert" style={style} className={alertStyles({ variant })}>
      <span className={cn('mt-px flex shrink-0 text-lg leading-none', ICON_COLOR[variant])} aria-hidden="true">
        {icon ?? <Glyph className="size-5" />}
      </span>
      <div className="min-w-0 flex-1">
        {title !== undefined && title !== '' && <div className="mb-1 text-sm font-semibold">{title}</div>}
        <div className="text-sm">{children}</div>
      </div>
      {onDismiss !== undefined && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-sm text-fg-muted transition-colors hover:bg-bg-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-brand"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
