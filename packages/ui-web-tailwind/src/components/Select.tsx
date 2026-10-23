import type { ReactNode, SelectHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

/**
 * Same props as the `Select` in @mawsoftwares/ui-web. Deliberately a styled native <select>:
 * keeps `onChange(event)`, form submission and the OS picker on mobile. A Radix/shadcn Select
 * (custom listbox) has a different value API, so it belongs behind a separate component
 * (ui-web's SearchableSelect) rather than replacing this one.
 */
export function Select({
  label,
  error,
  helperText,
  options,
  placeholder,
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  helperText?: string;
  options: readonly { value: string; label: string }[];
  placeholder?: string;
}): ReactNode {
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
      <div className="relative">
        <select
          {...props}
          aria-invalid={hasError ? true : props['aria-invalid']}
          className={cn(
            'box-border w-full cursor-pointer appearance-none rounded-[var(--maw-comp-inputs-border-radius,var(--maw-radius-md))] border bg-[var(--maw-comp-inputs-background,var(--maw-bg))] py-2 pl-3 pr-9 text-base text-[var(--maw-comp-inputs-text-color,var(--maw-fg))]',
            'transition-[border-color,box-shadow] duration-150 outline-none',
            'focus:border-brand focus:ring-4 focus:ring-brand/15',
            'disabled:cursor-not-allowed disabled:opacity-60',
            hasError ? 'border-danger focus:border-danger focus:ring-danger/15' : 'border-border',
            className,
          )}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m5 7.5 5 5 5-5" />
        </svg>
      </div>
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
