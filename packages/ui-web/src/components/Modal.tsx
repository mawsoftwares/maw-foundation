import { IconButton } from './IconButton';
import {
  useState,
  useRef,
  useEffect,
  type ReactNode,
  type CSSProperties,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type TextareaHTMLAttributes,
  type SelectHTMLAttributes,
} from 'react';

const base: CSSProperties = { fontFamily: 'var(--maw-font-family)', boxSizing: 'border-box' };

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 480,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}): ReactNode {
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
        }}
      >
        {title !== undefined && (
          <div style={{ padding: 'var(--maw-space-lg) var(--maw-space-xl)', borderBottom: '1px solid var(--maw-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0, fontSize: 'var(--maw-text-lg)', fontWeight: 600, color: 'var(--maw-fg)' }}>{title}</h2>
            <IconButton label="Close" onClick={onClose}>✕</IconButton>
          </div>
        )}
        <div style={{ padding: 'var(--maw-space-xl)', overflowY: 'auto', flex: 1 }}>{children}</div>
        {footer !== undefined && (
          <div style={{ padding: 'var(--maw-space-lg) var(--maw-space-xl)', borderTop: '1px solid var(--maw-border)', display: 'flex', gap: 'var(--maw-space-sm)', justifyContent: 'flex-end' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
