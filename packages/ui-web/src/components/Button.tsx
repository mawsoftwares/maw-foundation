import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, CSSProperties } from 'react';
import { Spinner } from './Spinner';

const base: CSSProperties = { fontFamily: 'var(--maw-font-family)', boxSizing: 'border-box' };

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

const spinnerStyle: Record<string, CSSProperties> = {
  primary: { borderColor: 'rgba(255,255,255,0.4)', borderTopColor: 'var(--maw-brandContrast)' },
  danger: { borderColor: 'rgba(255,255,255,0.4)', borderTopColor: '#ffffff' },
  ghost: { borderColor: 'var(--maw-border)', borderTopColor: 'var(--maw-fg)' },
};

/**
 * `loading` forces `disabled` and swaps in a spinner ahead of the label — the single
 * place every module gets a busy-button state from, so feature code only ever passes
 * `loading={saving}` instead of hand-rolling a spinner per call site.
 */
export function Button({
  variant = 'primary',
  loading = false,
  disabled,
  children,
  style,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger'; loading?: boolean }): ReactNode {
  const styles: Record<string, CSSProperties> = {
    primary: {
      background: 'var(--maw-brand)',
      color: 'var(--maw-brandContrast)',
      border: 'none',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--maw-fg)',
      border: '1px solid var(--maw-border)',
    },
    danger: {
      background: 'var(--maw-danger)',
      color: '#ffffff',
      border: 'none',
    },
  };
  const isDisabled = disabled === true || loading;
  return (
    <button
      {...props}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={`maw-btn-hover ${props.className || ''}`.trim()}
      style={{
        ...base,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--maw-space-xs)',
        padding: 'var(--maw-space-sm) var(--maw-space-lg)',
        borderRadius: 'var(--maw-radius-md)',
        fontSize: 'var(--maw-text-md)',
        fontWeight: 600,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled && !loading ? 0.6 : 1,
        transition: 'all var(--maw-transition-smooth)',
        ...styles[variant],
        ...style,
      }}
    >
      {loading && <Spinner size={14} style={{ borderWidth: 2, ...spinnerStyle[variant] }} />}
      {children}
    </button>
  );
}
