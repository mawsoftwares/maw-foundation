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
import { useIsMobile } from '../responsive';

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
        background: 'var(--maw-comp-modals-overlay-background, var(--maw-overlay))',
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        zIndex: 'var(--maw-z-modal)' as unknown as number,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="maw-animate-in"
        style={{
          ...base,
          background: 'var(--maw-comp-modals-background, var(--maw-surface))',
          borderRadius: isMobile
            ? 'var(--maw-radius-lg) var(--maw-radius-lg) 0 0'
            : 'var(--maw-comp-modals-border-radius, var(--maw-radius-lg))',
          boxShadow: 'var(--maw-comp-modals-shadow, var(--maw-shadow-xl))',
          width: isMobile ? '100%' : width,
          maxWidth: isMobile ? '100%' : '90vw',
          maxHeight: isMobile ? '90vh' : '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {title !== undefined && (
          <div style={{ padding: 'var(--maw-comp-modals-header-padding, var(--maw-space-lg) var(--maw-space-xl))', background: 'var(--maw-comp-modals-header-background, transparent)', borderBottom: 'var(--maw-comp-modals-header-border, 1px solid var(--maw-border))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0, fontSize: 'var(--maw-comp-modals-title-font-size, var(--maw-text-lg))', fontWeight: 'var(--maw-comp-modals-title-font-weight, 600)' as unknown as number, color: 'var(--maw-comp-modals-title-text-color, var(--maw-fg))' }}>{title}</h2>
            <IconButton label="Close" onClick={onClose} style={{ color: 'var(--maw-comp-modals-close-text-color, inherit)' }}>✕</IconButton>
          </div>
        )}
        <div style={{ padding: 'var(--maw-comp-modals-body-padding, var(--maw-space-xl))', color: 'var(--maw-comp-modals-body-text-color, inherit)', overflowY: 'auto', flex: 1 }}>{children}</div>
        {footer !== undefined && (
          <div style={{ padding: 'var(--maw-comp-modals-footer-padding, var(--maw-space-lg) var(--maw-space-xl))', background: 'var(--maw-comp-modals-footer-background, transparent)', borderTop: 'var(--maw-comp-modals-footer-border, 1px solid var(--maw-border))', display: 'flex', gap: 'var(--maw-space-sm)', justifyContent: 'flex-end' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
