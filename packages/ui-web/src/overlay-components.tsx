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
}: DrawerProps): ReactNode {
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
        zIndex: 'var(--maw-z-modal)' as unknown as number,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          ...base,
          position: 'absolute',
          top: 0,
          bottom: 0,
          [side]: 0,
          width,
          maxWidth: '90vw',
          background: 'var(--maw-bg)',
          boxShadow: 'var(--maw-shadow-xl)',
          display: 'flex',
          flexDirection: 'column',
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

// ---------------------------------------------------------------------------
// Dialog — semantic wrapper around Modal with role="dialog"
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

// ---------------------------------------------------------------------------
// Popover
// ---------------------------------------------------------------------------

export interface PopoverProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly anchorRef: React.RefObject<HTMLElement | null>;
  readonly children: ReactNode;
  readonly placement?: 'top' | 'bottom' | 'left' | 'right';
  readonly style?: CSSProperties;
}

export function Popover({
  open,
  onClose,
  anchorRef,
  children,
  placement = 'bottom',
  style,
}: PopoverProps): ReactNode {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const gap = 8;

    switch (placement) {
      case 'top':
        setPos({ top: rect.top - gap, left: rect.left + rect.width / 2 });
        break;
      case 'bottom':
        setPos({ top: rect.bottom + gap, left: rect.left + rect.width / 2 });
        break;
      case 'left':
        setPos({ top: rect.top + rect.height / 2, left: rect.left - gap });
        break;
      case 'right':
        setPos({ top: rect.top + rect.height / 2, left: rect.right + gap });
        break;
    }
  }, [open, anchorRef, placement]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    const escHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', escHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', escHandler);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  const transformOrigin: Record<string, string> = {
    top: 'bottom center',
    bottom: 'top center',
    left: 'center right',
    right: 'center left',
  };

  const translate: Record<string, string> = {
    top: 'translate(-50%, -100%)',
    bottom: 'translate(-50%, 0)',
    left: 'translate(-100%, -50%)',
    right: 'translate(0, -50%)',
  };

  return (
    <div
      ref={popoverRef}
      role="dialog"
      style={{
        ...base,
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        transform: translate[placement],
        transformOrigin: transformOrigin[placement],
        background: 'var(--maw-bg)',
        border: '1px solid var(--maw-border)',
        borderRadius: 'var(--maw-radius-md)',
        boxShadow: 'var(--maw-shadow-lg)',
        padding: 'var(--maw-space-md)',
        zIndex: 'var(--maw-z-modal)' as unknown as number,
        minWidth: 200,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Alert — inline alert/callout
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

// ---------------------------------------------------------------------------
// Banner — full-width top/bottom notification strip
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

  const confirmBg = variant === 'danger' ? 'var(--maw-danger)' : 'var(--maw-primary)';

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
          background: 'var(--maw-bg)',
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
