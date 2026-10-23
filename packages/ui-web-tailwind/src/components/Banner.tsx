import type { ReactNode } from 'react';
import { cva } from 'class-variance-authority';
import { X } from 'lucide-react';
import type { BannerProps, BannerVariant } from '@mawsoftwares/ui-contract';

export type { BannerVariant };

const bannerStyles = cva(
  'box-border flex items-center gap-4 px-6 py-2 font-sans text-sm font-medium text-[var(--maw-comp-banners-text-color,#fff)]',
  {
    variants: {
      variant: {
        info: 'bg-[var(--maw-comp-banners-info-background,var(--maw-comp-banners-background,var(--maw-info)))]',
        success: 'bg-[var(--maw-comp-banners-success-background,var(--maw-comp-banners-background,var(--maw-success)))]',
        warning: 'bg-[var(--maw-comp-banners-warning-background,var(--maw-comp-banners-background,var(--maw-warning)))]',
        danger: 'bg-[var(--maw-comp-banners-danger-background,var(--maw-comp-banners-background,var(--maw-danger)))]',
      },
    },
    defaultVariants: { variant: 'info' },
  },
);

/** Same props as the `Banner` in @mawsoftwares/ui-web: a full-width status bar with an optional action and dismiss. */
export function Banner({ variant = 'info', children, onDismiss, action, style }: BannerProps): ReactNode {
  return (
    <div role="status" style={style} className={bannerStyles({ variant })}>
      <div className="min-w-0 flex-1">{children}</div>
      {action !== undefined && <div className="shrink-0">{action}</div>}
      {onDismiss !== undefined && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-sm text-current opacity-80 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-current"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
