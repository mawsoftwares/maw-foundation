import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, CSSProperties } from 'react';
import { Spinner } from './Spinner';

const base: CSSProperties = { fontFamily: 'var(--maw-font-family)', boxSizing: 'border-box' };

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

const spinnerStyle: Record<string, CSSProperties> = {
  primary: { borderColor: 'rgba(255,255,255,0.4)', borderTopColor: 'var(--maw-brandContrast)' },
  secondary: { borderColor: 'var(--maw-border)', borderTopColor: 'var(--maw-fg)' },
  outline: { borderColor: 'var(--maw-border)', borderTopColor: 'var(--maw-brand)' },
  link: { borderColor: 'var(--maw-border)', borderTopColor: 'var(--maw-brand)' },
  danger: { borderColor: 'rgba(255,255,255,0.4)', borderTopColor: '#ffffff' },
  ghost: { borderColor: 'var(--maw-border)', borderTopColor: 'var(--maw-fg)' },
};

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'destructive' | 'link';

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
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; loading?: boolean }): ReactNode {
  const styles: Record<string, CSSProperties> = {
    primary: {
      background: 'var(--maw-comp-buttons-primary-background, var(--maw-brand))',
      color: 'var(--maw-comp-buttons-primary-text-color, var(--maw-brandContrast))',
      border: 'var(--maw-comp-buttons-primary-border, none)',
      boxShadow: 'var(--maw-shadow-sm)',
    },
    secondary: {
      background: 'var(--maw-comp-buttons-secondary-background, var(--maw-bgMuted))',
      color: 'var(--maw-comp-buttons-secondary-text-color, var(--maw-fg))',
      border: 'var(--maw-comp-buttons-secondary-border, none)',
      boxShadow: 'none',
    },
    outline: {
      background: 'var(--maw-comp-buttons-outline-background, transparent)',
      color: 'var(--maw-comp-buttons-outline-text-color, var(--maw-brand))',
      border: 'var(--maw-comp-buttons-outline-border, 1px solid var(--maw-brand))',
      boxShadow: 'none',
    },
    link: {
      background: 'var(--maw-comp-buttons-link-background, transparent)',
      color: 'var(--maw-comp-buttons-link-text-color, var(--maw-brand))',
      border: 'var(--maw-comp-buttons-link-border, none)',
      boxShadow: 'none',
      textDecoration: 'underline',
      textTransform: 'none',
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
  const look = styles[variant === 'destructive' ? 'danger' : variant];
  // Token variant name: `danger` is the older spelling of `destructive`.
  const tv = variant === 'danger' ? 'destructive' : variant;
  return (
    <button
      {...props}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={`maw-btn maw-btn--${variant} maw-btn-hover maw-focusable ${props.className || ''}`.trim()}
      style={{
        ...base,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--maw-space-xs)',
        // Per-variant token, then family-wide, then the legacy `medium-*` (what the primary alias sets), then the default.
        height: `var(--maw-comp-buttons-${tv}-height, var(--maw-comp-buttons-height, var(--maw-comp-buttons-medium-height, auto)))`,
        padding: `var(--maw-comp-buttons-${tv}-padding, var(--maw-comp-buttons-padding, var(--maw-comp-buttons-medium-padding-h, var(--maw-space-sm) var(--maw-space-lg))))`,
        borderRadius: `var(--maw-comp-buttons-${tv}-border-radius, var(--maw-comp-buttons-border-radius, var(--maw-radius-md)))`,
        fontSize: `var(--maw-comp-buttons-${tv}-font-size, var(--maw-comp-buttons-font-size, var(--maw-comp-buttons-medium-font-size, var(--maw-text-sm))))`,
        fontWeight: `var(--maw-comp-buttons-${tv}-font-weight, var(--maw-comp-buttons-font-weight, 500))` as unknown as number,
        textTransform: 'uppercase',
        letterSpacing: '0.02857em',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled && !loading ? 0.6 : 1,
        transition: 'all var(--maw-transition-smooth)',
        ...look,
        ...style,
      }}
    >
      {loading && <Spinner size={14} style={{ borderWidth: 2, ...spinnerStyle[variant === 'destructive' ? 'danger' : variant] }} />}
      {children}
    </button>
  );
}
