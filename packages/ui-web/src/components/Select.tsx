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

// ---------------------------------------------------------------------------
// Select
// ---------------------------------------------------------------------------

export function Select({
  label,
  error,
  options,
  placeholder,
  style,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  options: readonly { value: string; label: string }[];
  placeholder?: string;
}): ReactNode {
  return (
    <label style={{ ...base, display: 'block', marginBottom: 'var(--maw-space-md)' }}>
      {label !== undefined && (
        <span style={{ display: 'block', marginBottom: 'var(--maw-space-xs)', fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fgMuted)' }}>
          {label}
        </span>
      )}
      <select
        {...props}
        style={{
          ...base,
          width: '100%',
          padding: 'var(--maw-space-sm) var(--maw-space-md)',
          borderRadius: 'var(--maw-radius-md)',
          border: `1px solid ${error ? 'var(--maw-danger)' : 'var(--maw-border)'}`,
          fontSize: 'var(--maw-text-md)',
          color: 'var(--maw-fg)',
          background: 'var(--maw-bg)',
          outline: 'none',
          ...style,
        }}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error !== undefined && (
        <span style={{ display: 'block', marginTop: 'var(--maw-space-xs)', fontSize: 'var(--maw-text-xs)', color: 'var(--maw-danger)' }}>
          {error}
        </span>
      )}
    </label>
  );
}
