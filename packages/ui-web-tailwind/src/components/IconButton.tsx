import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

/** Same props as the `IconButton` in @mawsoftwares/ui-web. */
export function IconButton({
  label,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }): ReactNode {
  return (
    <button
      type="button"
      {...props}
      aria-label={label}
      title={label}
      className={cn(
        'box-border inline-flex size-9 cursor-pointer items-center justify-center rounded-md p-0 text-fg-muted transition-colors',
        'hover:bg-bg-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-brand',
        'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent',
        className,
      )}
    />
  );
}
