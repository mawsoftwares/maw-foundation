import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, CSSProperties } from 'react';

const base: CSSProperties = { fontFamily: 'var(--maw-font-family)', boxSizing: 'border-box' };

// ---------------------------------------------------------------------------
// TextField
// ---------------------------------------------------------------------------

export function TextField({
  label,
  error,
  style,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }): ReactNode {
  return (
    <label style={{ ...base, display: 'block', marginBottom: 'var(--maw-space-md)' }}>
      {label !== undefined && (
        <span
          style={{
            display: 'block',
            marginBottom: 'var(--maw-space-xs)',
            fontSize: 'var(--maw-text-sm)',
            color: 'var(--maw-fgMuted)',
          }}
        >
          {label}
        </span>
      )}
      <input
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
          transition: 'var(--maw-transition-fast)',
          outline: 'none',
          ...style,
        }}
      />
      {error !== undefined && (
        <span
          style={{
            display: 'block',
            marginTop: 'var(--maw-space-xs)',
            fontSize: 'var(--maw-text-xs)',
            color: 'var(--maw-danger)',
          }}
        >
          {error}
        </span>
      )}
    </label>
  );
}
