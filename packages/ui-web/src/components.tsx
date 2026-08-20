import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, CSSProperties } from 'react';

/**
 * Token-styled web primitives using CSS custom properties (set by ThemeProvider).
 * Components respond to dark mode and per-tenant branding automatically.
 */

const base: CSSProperties = { fontFamily: 'var(--maw-font-family)', boxSizing: 'border-box' };

export function Button({
  variant = 'primary',
  style,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }): ReactNode {
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
  return (
    <button
      {...props}
      style={{
        ...base,
        padding: 'var(--maw-space-sm) var(--maw-space-lg)',
        borderRadius: 'var(--maw-radius-md)',
        fontSize: 'var(--maw-text-md)',
        fontWeight: 600,
        cursor: props.disabled === true ? 'not-allowed' : 'pointer',
        opacity: props.disabled === true ? 0.6 : 1,
        transition: 'var(--maw-transition-fast)',
        ...styles[variant],
        ...style,
      }}
    />
  );
}

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

export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }): ReactNode {
  return (
    <div
      style={{
        ...base,
        background: 'var(--maw-bg)',
        border: '1px solid var(--maw-border)',
        borderRadius: 'var(--maw-radius-lg)',
        padding: 'var(--maw-space-xl)',
        boxShadow: 'var(--maw-shadow-sm)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Badge({
  variant = 'default',
  children,
  style,
}: {
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'info';
  children: ReactNode;
  style?: CSSProperties;
}): ReactNode {
  const colors: Record<string, { bg: string; fg: string }> = {
    default: { bg: 'var(--maw-bgMuted)', fg: 'var(--maw-fgMuted)' },
    success: { bg: 'var(--maw-successBg)', fg: 'var(--maw-success)' },
    danger: { bg: 'var(--maw-dangerBg)', fg: 'var(--maw-danger)' },
    warning: { bg: 'var(--maw-warningBg)', fg: 'var(--maw-warning)' },
    info: { bg: 'var(--maw-infoBg)', fg: 'var(--maw-info)' },
  };
  const c = colors[variant] ?? colors.default!;
  return (
    <span
      style={{
        ...base,
        display: 'inline-block',
        padding: '2px var(--maw-space-sm)',
        borderRadius: 'var(--maw-radius-pill)',
        fontSize: 'var(--maw-text-xs)',
        fontWeight: 500,
        background: c.bg,
        color: c.fg,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export function Divider({ style }: { style?: CSSProperties } = {}): ReactNode {
  return (
    <hr
      style={{
        border: 'none',
        borderTop: '1px solid var(--maw-border)',
        margin: 'var(--maw-space-lg) 0',
        ...style,
      }}
    />
  );
}
