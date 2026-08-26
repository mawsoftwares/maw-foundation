import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, CSSProperties } from 'react';

const base: CSSProperties = { fontFamily: 'var(--maw-font-family)', boxSizing: 'border-box' };

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

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
