import type { AlertVariant } from './Alert';
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
// Banner
// ---------------------------------------------------------------------------

export type BannerVariant = 'info' | 'success' | 'warning' | 'danger';

export interface BannerProps {
  readonly variant?: BannerVariant;
  readonly children: ReactNode;
  readonly onDismiss?: () => void;
  readonly action?: ReactNode;
  readonly style?: CSSProperties;
}

const bannerBg: Record<BannerVariant, string> = {
  info: 'var(--maw-info)',
  success: 'var(--maw-success)',
  warning: 'var(--maw-warning)',
  danger: 'var(--maw-danger)',
};

export function Banner({
  variant = 'info',
  children,
  onDismiss,
  action,
  style,
}: BannerProps): ReactNode {
  return (
    <div
      role="status"
      style={{
        ...base,
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--maw-space-md)',
        padding: 'var(--maw-space-sm) var(--maw-space-xl)',
        background: bannerBg[variant],
        color: '#fff',
        fontSize: 'var(--maw-text-sm)',
        fontWeight: 500,
        ...style,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          style={{
            ...base,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#fff',
            padding: 'var(--maw-space-xs)',
            flexShrink: 0,
            opacity: 0.8,
          }}
        >✕</button>
      )}
    </div>
  );
}
