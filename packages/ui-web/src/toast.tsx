import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  variant: ToastVariant;
  message: string;
  description?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: readonly Toast[];
  toast: (variant: ToastVariant, message: string, options?: { description?: string; duration?: number }) => string;
  success: (message: string, description?: string) => string;
  error: (message: string, description?: string) => string;
  warning: (message: string, description?: string) => string;
  info: (message: string, description?: string) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastCounter = 0;

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ToastProvider({ children, maxToasts = 5 }: { children: ReactNode; maxToasts?: number }): ReactNode {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  const addToast = useCallback(
    (variant: ToastVariant, message: string, options?: { description?: string; duration?: number }) => {
      const id = `toast-${++toastCounter}`;
      const duration = options?.duration ?? (variant === 'error' ? 6000 : 4000);
      const t: Toast = { id, variant, message, description: options?.description, duration };
      setToasts((prev) => [...prev.slice(-(maxToasts - 1)), t]);
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [maxToasts, dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toasts,
      toast: addToast,
      success: (msg, desc) => addToast('success', msg, { description: desc }),
      error: (msg, desc) => addToast('error', msg, { description: desc }),
      warning: (msg, desc) => addToast('warning', msg, { description: desc }),
      info: (msg, desc) => addToast('info', msg, { description: desc }),
      dismiss,
      dismissAll,
    }),
    [toasts, addToast, dismiss, dismissAll],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (ctx === null) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

const variantColors: Record<ToastVariant, { bg: string; border: string; icon: string }> = {
  success: { bg: 'var(--maw-successBg)', border: 'var(--maw-success)', icon: '✓' },
  error: { bg: 'var(--maw-dangerBg)', border: 'var(--maw-danger)', icon: '✗' },
  warning: { bg: 'var(--maw-warningBg)', border: 'var(--maw-warning)', icon: '⚠' },
  info: { bg: 'var(--maw-infoBg)', border: 'var(--maw-info)', icon: 'ℹ' },
};

function ToastContainer({ toasts, onDismiss }: { toasts: readonly Toast[]; onDismiss: (id: string) => void }): ReactNode {
  if (toasts.length === 0) return null;
  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 'var(--maw-z-toast)' as unknown as number,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        maxWidth: 380,
        width: '100%',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => {
        const c = variantColors[t.variant];
        return (
          <div
            key={t.id}
            style={{
              fontFamily: 'var(--maw-font-family)',
              background: c.bg,
              borderLeft: `4px solid ${c.border}`,
              borderRadius: 'var(--maw-radius-md)',
              boxShadow: 'var(--maw-shadow-lg)',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              pointerEvents: 'auto',
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>{c.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 'var(--maw-text-sm)', fontWeight: 600, color: 'var(--maw-fg)' }}>{t.message}</div>
              {t.description !== undefined && (
                <div style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgMuted)', marginTop: 2 }}>{t.description}</div>
              )}
            </div>
            <button
              onClick={() => onDismiss(t.id)}
              style={{
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: 'var(--maw-fgMuted)',
                fontSize: 14,
                padding: 0,
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
