import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'destructive' | 'link';

// Per-tenant component tokens (--maw-comp-buttons-*) keep priority over the Tailwind defaults,
// exactly as in @mawsoftwares/ui-web, so a branded theme restyles both kits identically.
const buttonStyles = cva(
  [
    'box-border inline-flex items-center justify-center gap-2 select-none whitespace-nowrap font-medium font-sans',
    'rounded-[var(--maw-comp-buttons-border-radius,var(--maw-radius-md))]',
    'h-10 px-4 text-sm',
    'transition-all duration-200 ease-out',
    'hover:-translate-y-px hover:shadow-md active:translate-y-0 active:scale-[0.98]',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
    'disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none',
  ],
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--maw-comp-buttons-primary-background,var(--maw-brand))] text-[var(--maw-comp-buttons-primary-text-color,var(--maw-brandContrast))] shadow-sm hover:brightness-110',
        secondary:
          'bg-[var(--maw-comp-buttons-secondary-background,var(--maw-bgMuted))] text-[var(--maw-comp-buttons-secondary-text-color,var(--maw-fg))] hover:brightness-95',
        outline:
          'border border-brand bg-transparent text-brand hover:bg-brand/10',
        ghost:
          'border border-border bg-transparent text-fg hover:bg-bg-muted',
        danger:
          'bg-danger text-white shadow-sm hover:brightness-110',
        link: 'h-auto bg-transparent px-0 text-brand underline underline-offset-4 shadow-none hover:translate-y-0 hover:shadow-none',
      },
    },
    defaultVariants: { variant: 'primary' },
  },
);

/** Same props as the `Button` in @mawsoftwares/ui-web. */
export function Button({
  variant = 'primary',
  loading = false,
  disabled,
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; loading?: boolean }): ReactNode {
  const resolved = variant === 'destructive' ? 'danger' : variant;
  return (
    <button
      {...props}
      disabled={disabled === true || loading}
      aria-busy={loading || undefined}
      className={cn(buttonStyles({ variant: resolved }), className)}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent opacity-80"
        />
      )}
      {children}
    </button>
  );
}
