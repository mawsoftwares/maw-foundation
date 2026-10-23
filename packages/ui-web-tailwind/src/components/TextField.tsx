import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

/** Same props as the `TextField` in @mawsoftwares/ui-web (label, error, helperText + native input props). */
export function TextField({
  label,
  error,
  helperText,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string; helperText?: string }): ReactNode {
  const hasError = error !== undefined;
  return (
    <label className="mb-4 block font-sans">
      {label !== undefined && (
        <span className="mb-1.5 block text-sm font-medium text-fg-muted">
          {label}
          {props.required === true && (
            <span aria-hidden="true" className="ml-0.5 text-danger">
              *
            </span>
          )}
        </span>
      )}
      <input
        {...props}
        aria-invalid={hasError ? true : props['aria-invalid']}
        className={cn(
          'box-border w-full rounded-[var(--maw-comp-inputs-border-radius,var(--maw-radius-md))] border bg-[var(--maw-comp-inputs-background,var(--maw-bg))] px-3 py-2 text-base text-[var(--maw-comp-inputs-text-color,var(--maw-fg))]',
          'placeholder:text-fg-subtle transition-[border-color,box-shadow] duration-150 outline-none',
          'focus:border-brand focus:ring-4 focus:ring-brand/15',
          'disabled:cursor-not-allowed disabled:opacity-60',
          hasError ? 'border-danger focus:border-danger focus:ring-danger/15' : 'border-border',
          className,
        )}
      />
      {hasError ? (
        <span role="alert" className="mt-1.5 block text-xs text-danger">
          {error}
        </span>
      ) : (
        helperText !== undefined && <span className="mt-1.5 block text-xs text-fg-subtle">{helperText}</span>
      )}
    </label>
  );
}
