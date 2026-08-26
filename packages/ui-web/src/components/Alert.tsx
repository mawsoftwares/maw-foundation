import type { BannerVariant } from './Banner';
import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
  type CSSProperties,
} from 'react';

const base: CSSProperties = { fontFamily: 'var(--maw-font-family)', boxSizing: 'border-box' };

// ---------------------------------------------------------------------------
// Alert
// ---------------------------------------------------------------------------

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

export interface AlertProps {
  readonly variant?: AlertVariant;
  readonly title?: string;
  readonly children: ReactNode;
  readonly onDismiss?: () => void;
  readonly icon?: string;
  readonly style?: CSSProperties;
}

const alertColors: Record<AlertVariant, { bg: string; border: string; fg: string; icon: string }> = {
  info: { bg: 'var(--maw-bgSubtle)', border: 'var(--maw-info)', fg: 'var(--maw-fg)', icon: 'ℹ️' },
  success: { bg: 'var(--maw-bgSubtle)', border: 'var(--maw-success)', fg: 'var(--maw-fg)', icon: '✓' },
  warning: { bg: 'var(--maw-bgSubtle)', border: 'var(--maw-warning)', fg: 'var(--maw-fg)', icon: '⚠' },
  danger: { bg: 'var(--maw-bgSubtle)', border: 'var(--maw-danger)', fg: 'var(--maw-fg)', icon: '✕' },
};

export function Alert({
  variant = 'info',
  title,
  children,
  onDismiss,
  icon,
  style,
}: AlertProps): ReactNode {
  const colors = alertColors[variant];
  return (
    <div
      role="alert"
      style={{
        ...base,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--maw-space-sm)',
        padding: 'var(--maw-space-md) var(--maw-space-lg)',
        borderRadius: 'var(--maw-radius-md)',
        background: colors.bg,
        borderLeft: `4px solid ${colors.border}`,
        color: colors.fg,
        ...style,
      }}
    >
      <span style={{ flexShrink: 0, fontSize: 'var(--maw-text-lg)' }}>{icon ?? colors.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && (
          <div style={{ fontWeight: 600, marginBottom: 'var(--maw-space-xs)', fontSize: 'var(--maw-text-sm)' }}>
            {title}
          </div>
        )}
        <div style={{ fontSize: 'var(--maw-text-sm)' }}>{children}</div>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          style={{
            ...base,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--maw-fgMuted)',
            padding: 'var(--maw-space-xs)',
            flexShrink: 0,
          }}
        >✕</button>
      )}
    </div>
  );
}
