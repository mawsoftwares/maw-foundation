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

const base: CSSProperties = { fontFamily: 'var(--maw-font-family)', boxSizing: 'border-box' };

// ---------------------------------------------------------------------------
// Dialog
// ---------------------------------------------------------------------------

export interface DialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title?: string;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  readonly width?: number;
  readonly closeOnOverlay?: boolean;
  readonly style?: CSSProperties;
}

export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  width = 480,
  closeOnOverlay = true,
  style,
}: DialogProps): ReactNode {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={closeOnOverlay ? onClose : undefined}
      className="maw-fade-in"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--maw-overlay)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 'var(--maw-z-modal)' as unknown as number,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="maw-animate-in"
        style={{
          ...base,
          background: 'var(--maw-bg)',
          borderRadius: 'var(--maw-radius-lg)',
          boxShadow: 'var(--maw-shadow-xl)',
          width,
          maxWidth: '90vw',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          ...style,
        }}
      >
        {title !== undefined && (
          <div style={{
            padding: 'var(--maw-space-lg) var(--maw-space-xl)',
            borderBottom: '1px solid var(--maw-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <h2 style={{ margin: 0, fontSize: 'var(--maw-text-lg)', fontWeight: 600, color: 'var(--maw-fg)' }}>{title}</h2>
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
        <div style={{ flex: 1, overflow: 'auto', padding: 'var(--maw-space-xl)' }}>
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
