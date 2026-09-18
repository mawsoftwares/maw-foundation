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
      background: 'var(--maw-comp-buttons-primary-background, var(--maw-brand))',
      color: 'var(--maw-comp-buttons-primary-text-color, var(--maw-brandContrast))',
      border: 'var(--maw-comp-buttons-primary-border, none)',
      boxShadow: 'var(--maw-shadow-sm)',
    },
    ghost: {
      background: 'var(--maw-comp-buttons-ghost-background, transparent)',
      color: 'var(--maw-comp-buttons-ghost-text-color, var(--maw-fg))',
      border: 'var(--maw-comp-buttons-ghost-border, 1px solid var(--maw-border))',
      boxShadow: 'none',
    },
    danger: {
      background: 'var(--maw-comp-buttons-destructive-background, var(--maw-comp-buttons-danger-background, var(--maw-danger)))',
      color: 'var(--maw-comp-buttons-destructive-text-color, var(--maw-comp-buttons-danger-text-color, #ffffff))',
      border: 'var(--maw-comp-buttons-destructive-border, var(--maw-comp-buttons-danger-border, none))',
      boxShadow: 'var(--maw-shadow-sm)',
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
        height: 'var(--maw-comp-buttons-medium-height, auto)',
        padding: 'var(--maw-comp-buttons-medium-padding-h, var(--maw-space-sm) var(--maw-space-lg))',
        borderRadius: 'var(--maw-comp-buttons-border-radius, var(--maw-radius-md))',
        fontSize: 'var(--maw-comp-buttons-medium-font-size, var(--maw-text-sm))',
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '0.02857em',
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
