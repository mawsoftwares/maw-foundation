import type { AlertVariant } from './Alert';
import type { BannerVariant } from './Banner';
import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
  type CSSProperties,
} from 'react';
import { useIsMobile } from '../responsive';

const base: CSSProperties = { fontFamily: 'var(--maw-font-family)', boxSizing: 'border-box' };

// ---------------------------------------------------------------------------
// Drawer
// ---------------------------------------------------------------------------

export interface DrawerProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title?: string;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  readonly side?: 'left' | 'right';
  readonly width?: number | string;
  readonly style?: CSSProperties;
  readonly contentStyle?: CSSProperties;
}

export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
  side = 'right',
  width = 400,
  style,
  contentStyle,
}: DrawerProps): ReactNode {
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      className="maw-fade-in"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--maw-overlay)',
        zIndex: 'var(--maw-z-modal)' as unknown as number,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="maw-slide-in-right"
        style={{
          ...base,
          position: 'absolute',
          top: 0,
          bottom: 0,
          [side]: 0,
          width: isMobile ? '100%' : width,
          maxWidth: isMobile ? '100%' : '90vw',
          background: 'color-mix(in srgb, var(--maw-bg) 85%, transparent)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: '-4px 0 24px color-mix(in srgb, #000 12%, transparent)',
          display: 'flex',
          flexDirection: 'column',
          ...style,
        }}
      >
        {title !== undefined && (
          <div style={{
            padding: 'var(--maw-space-xl)',
            borderBottom: '1px solid var(--maw-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <h2 style={{ margin: 0, fontSize: 'var(--maw-text-xl)', fontWeight: 600, color: 'var(--maw-fg)' }}>{title}</h2>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                ...base,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 'var(--maw-text-lg)',
                color: 'var(--maw-fgMuted)',
                padding: 'var(--maw-space-xs)',
              }}
            >✕</button>
          </div>
        )}
        <div style={{ flex: 1, overflow: 'auto', padding: 'var(--maw-space-xl)', ...contentStyle }}>
          {children}
        </div>
        {footer && (
          <div style={{
            padding: 'var(--maw-space-lg) var(--maw-space-xl)',
            borderTop: '1px solid var(--maw-border)',
            display: 'flex',
            gap: 'var(--maw-space-sm)',
            justifyContent: 'flex-end',
            flexShrink: 0,
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
