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
// ConfirmationDialog
// ---------------------------------------------------------------------------

export interface ConfirmationDialogProps {
  readonly open: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  readonly title?: string;
  readonly message: string;
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
  readonly variant?: 'primary' | 'danger';
  readonly loading?: boolean;
}

export function ConfirmationDialog({
  open,
  onConfirm,
  onCancel,
  title = 'Confirm',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  loading = false,
}: ConfirmationDialogProps): ReactNode {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;

  const confirmBg = variant === 'danger' ? 'var(--maw-danger)' : 'var(--maw-brand)';

  return (
    <div
      onClick={onCancel}
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
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        style={{
          ...base,
          background: 'var(--maw-surface)',
          borderRadius: 'var(--maw-radius-lg)',
          boxShadow: 'var(--maw-shadow-xl)',
          width: 420,
          maxWidth: '90vw',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: 'var(--maw-space-xl)' }}>
          <h3 style={{ margin: '0 0 var(--maw-space-sm) 0', fontSize: 'var(--maw-text-lg)', fontWeight: 600, color: 'var(--maw-fg)' }}>
            {title}
          </h3>
          <p style={{ margin: 0, color: 'var(--maw-fgMuted)', fontSize: 'var(--maw-text-sm)', lineHeight: 1.5 }}>
            {message}
          </p>
        </div>
        <div style={{
          padding: 'var(--maw-space-md) var(--maw-space-xl)',
          borderTop: '1px solid var(--maw-border)',
          display: 'flex',
          gap: 'var(--maw-space-sm)',
          justifyContent: 'flex-end',
        }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              ...base,
              padding: 'var(--maw-space-sm) var(--maw-space-lg)',
              borderRadius: 'var(--maw-radius-md)',
              border: '1px solid var(--maw-border)',
              background: 'transparent',
              color: 'var(--maw-fg)',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 'var(--maw-text-sm)',
              fontWeight: 500,
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              ...base,
              padding: 'var(--maw-space-sm) var(--maw-space-lg)',
              borderRadius: 'var(--maw-radius-md)',
              border: 'none',
              background: confirmBg,
              color: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 'var(--maw-text-sm)',
              fontWeight: 500,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Loading…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
