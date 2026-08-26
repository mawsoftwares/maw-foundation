import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, CSSProperties } from 'react';

const base: CSSProperties = { fontFamily: 'var(--maw-font-family)', boxSizing: 'border-box' };

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------

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
