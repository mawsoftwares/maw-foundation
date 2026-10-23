import type { ReactNode } from 'react';
import type { TextAreaProps } from '@mawsoftwares/ui-contract';
import { cn } from '../lib/cn';

/** Same props as the `TextArea` in @mawsoftwares/ui-web (label, error + native textarea props). */
export function TextArea({ label, error, className, ...props }: TextAreaProps): ReactNode {
  const hasError = error !== undefined;
  return (
    <label className="mb-4 block font-sans">
      {label !== undefined && <span className="mb-1.5 block text-sm font-medium text-fg-muted">{label}</span>}
      <textarea
        {...props}
        aria-invalid={hasError ? true : props['aria-invalid']}
        className={cn(
          'box-border min-h-20 w-full resize-y rounded-[var(--maw-comp-inputs-border-radius,var(--maw-radius-md))] border bg-[var(--maw-comp-inputs-background,var(--maw-bg))] px-3 py-2 text-base text-[var(--maw-comp-inputs-text-color,var(--maw-fg))]',
          'placeholder:text-fg-subtle transition-[border-color,box-shadow] duration-150 outline-none',
          'focus:border-brand focus:ring-4 focus:ring-brand/15',
          'disabled:cursor-not-allowed disabled:opacity-60',
          hasError ? 'border-danger focus:border-danger focus:ring-danger/15' : 'border-border',
          className,
        )}
      />
      {hasError && (
        <span role="alert" className="mt-1.5 block text-xs text-danger">
          {error}
        </span>
      )}
    </label>
  );
}
