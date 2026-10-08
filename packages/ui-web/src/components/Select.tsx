import {
  useState,
  useRef,
  useEffect,
  type ReactNode,
  type CSSProperties,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type TextareaHTMLAttributes,
  type SelectHTMLAttributes,
} from 'react';

const base: CSSProperties = { fontFamily: 'var(--maw-font-family)', boxSizing: 'border-box' };

const hasValue = (v: unknown): boolean => v !== undefined && v !== null && String(v) !== '';

// ---------------------------------------------------------------------------
// Select
// ---------------------------------------------------------------------------

export function Select({
  label,
  error,
  helperText,
  options,
  placeholder,
  style,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  helperText?: string;
  options: readonly { value: string; label: string }[];
  placeholder?: string;
}): ReactNode {
  return (
    <label style={{ ...base, display: 'block', marginBottom: 'var(--maw-space-md)' }}>
      {label !== undefined && (
        <span style={{ display: 'block', marginBottom: 'var(--maw-space-xs)', fontSize: 'var(--maw-comp-forms-label-font-size, var(--maw-text-sm))', fontWeight: 'var(--maw-comp-forms-label-font-weight, 400)' as unknown as number, color: 'var(--maw-comp-forms-label-text-color, var(--maw-fgMuted))' }}>
          {label}
          {props.required === true && (
            <span aria-hidden="true" style={{ color: 'var(--maw-comp-forms-required-text-color, var(--maw-danger))', marginLeft: 2 }}>*</span>
          )}
        </span>
      )}
      <select
        {...props}
        aria-invalid={error !== undefined ? true : props['aria-invalid']}
        className={`maw-focus-ring maw-input${error !== undefined ? ' maw-input--error' : ''}${hasValue(props.value ?? props.defaultValue) ? ' maw-input--filled' : ''} ${props.className || ''}`.trim()}
        style={{
          ...base,
          width: '100%',
          padding: 'var(--maw-comp-inputs-padding, var(--maw-space-sm) var(--maw-space-md))',
          height: 'var(--maw-comp-inputs-height, auto)',
          borderRadius: 'var(--maw-comp-inputs-border-radius, var(--maw-radius-md))',
          border: `1px solid ${error ? 'var(--maw-danger)' : 'var(--maw-comp-inputs-border-color, var(--maw-border))'}`,
          fontSize: 'var(--maw-comp-inputs-font-size, var(--maw-text-md))',
          color: 'var(--maw-comp-inputs-text-color, var(--maw-fg))',
          background: 'var(--maw-comp-inputs-background, var(--maw-bg))',
          outline: 'none',
          ...style,
        }}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error !== undefined ? (
        <span role="alert" style={{ display: 'block', marginTop: 'var(--maw-space-xs)', fontSize: 'var(--maw-comp-forms-error-font-size, var(--maw-text-xs))', color: 'var(--maw-comp-forms-error-text-color, var(--maw-danger))' }}>
          {error}
        </span>
      ) : helperText !== undefined && (
        <span style={{ display: 'block', marginTop: 'var(--maw-space-xs)', fontSize: 'var(--maw-comp-forms-helper-font-size, var(--maw-text-xs))', color: 'var(--maw-comp-forms-helper-text-color, var(--maw-fgSubtle))' }}>
          {helperText}
        </span>
      )}
    </label>
  );
}
