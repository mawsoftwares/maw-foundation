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
  const v = colors[variant] !== undefined ? variant : 'default';
  return (
    <span
      style={{
        ...base,
        display: 'inline-block',
        padding: 'var(--maw-comp-badges-padding, 2px var(--maw-space-sm))',
        borderRadius: 'var(--maw-comp-badges-border-radius, var(--maw-radius-pill))',
        fontSize: 'var(--maw-comp-badges-font-size, var(--maw-text-xs))',
        fontWeight: 'var(--maw-comp-badges-font-weight, 500)',
        background: `var(--maw-comp-badges-${v}-background, var(--maw-comp-badges-background, ${c.bg}))`,
        color: `var(--maw-comp-badges-${v}-text-color, var(--maw-comp-badges-text-color, ${c.fg}))`,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
