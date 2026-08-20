import { Component, type ErrorInfo, type ReactNode, type CSSProperties } from 'react';

const base: CSSProperties = { fontFamily: 'var(--maw-font-family)', boxSizing: 'border-box' };

// ---------------------------------------------------------------------------
// ErrorBoundary
// ---------------------------------------------------------------------------

interface ErrorBoundaryProps {
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  onError?: (error: Error, info: ErrorInfo) => void;
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    if (this.state.error !== null) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback(this.state.error, this.reset);
      }
      if (this.props.fallback !== undefined) return this.props.fallback;
      return <ErrorState title="Something went wrong" message={this.state.error.message} retry={this.reset} />;
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// ErrorState
// ---------------------------------------------------------------------------

export function ErrorState({
  title = 'Error',
  message,
  retry,
  style,
}: {
  title?: string;
  message?: string;
  retry?: () => void;
  style?: CSSProperties;
}): ReactNode {
  return (
    <div style={{ ...base, textAlign: 'center', padding: 'var(--maw-space-xxl)', color: 'var(--maw-fgMuted)', ...style }}>
      <div style={{ fontSize: 48, marginBottom: 'var(--maw-space-md)' }}>⚠</div>
      <h3 style={{ margin: 0, fontSize: 'var(--maw-text-lg)', fontWeight: 600, color: 'var(--maw-fg)' }}>{title}</h3>
      {message !== undefined && (
        <p style={{ margin: '8px 0 0', fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fgMuted)' }}>{message}</p>
      )}
      {retry !== undefined && (
        <button
          onClick={retry}
          style={{
            ...base,
            marginTop: 'var(--maw-space-lg)',
            padding: 'var(--maw-space-sm) var(--maw-space-xl)',
            border: '1px solid var(--maw-border)',
            borderRadius: 'var(--maw-radius-md)',
            background: 'var(--maw-bg)',
            color: 'var(--maw-fg)',
            fontSize: 'var(--maw-text-sm)',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

export function EmptyState({
  icon = '📭',
  title = 'Nothing here yet',
  message,
  action,
  style,
}: {
  icon?: string;
  title?: string;
  message?: string;
  action?: ReactNode;
  style?: CSSProperties;
}): ReactNode {
  return (
    <div style={{ ...base, textAlign: 'center', padding: 'var(--maw-space-xxl)', color: 'var(--maw-fgMuted)', ...style }}>
      <div style={{ fontSize: 48, marginBottom: 'var(--maw-space-md)' }}>{icon}</div>
      <h3 style={{ margin: 0, fontSize: 'var(--maw-text-lg)', fontWeight: 600, color: 'var(--maw-fg)' }}>{title}</h3>
      {message !== undefined && (
        <p style={{ margin: '8px 0 0', fontSize: 'var(--maw-text-sm)' }}>{message}</p>
      )}
      {action !== undefined && <div style={{ marginTop: 'var(--maw-space-lg)' }}>{action}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = 'var(--maw-radius-sm)',
  style,
}: {
  width?: string | number;
  height?: number;
  borderRadius?: string | number;
  style?: CSSProperties;
}): ReactNode {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background: 'var(--maw-bgMuted)',
        animation: 'maw-skeleton 1.5s ease-in-out infinite',
        ...style,
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Loading overlay
// ---------------------------------------------------------------------------

export function LoadingOverlay({
  loading,
  children,
  label = 'Loading...',
}: {
  loading: boolean;
  children: ReactNode;
  label?: string;
}): ReactNode {
  return (
    <div style={{ position: 'relative' }}>
      {children}
      {loading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'var(--maw-overlay)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--maw-space-sm)',
            borderRadius: 'var(--maw-radius-md)',
            zIndex: 'var(--maw-z-overlay)' as unknown as number,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              border: '3px solid rgba(255,255,255,0.3)',
              borderTopColor: '#fff',
              borderRadius: '50%',
              animation: 'maw-spin 0.6s linear infinite',
            }}
          />
          <span style={{ ...base, fontSize: 'var(--maw-text-sm)', color: '#fff' }}>{label}</span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PageLoader (full-page centered spinner)
// ---------------------------------------------------------------------------

export function PageLoader({ message }: { message?: string }): ReactNode {
  return (
    <div
      style={{
        ...base,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: 'var(--maw-space-md)',
        color: 'var(--maw-fgMuted)',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          border: '3px solid var(--maw-border)',
          borderTopColor: 'var(--maw-brand)',
          borderRadius: '50%',
          animation: 'maw-spin 0.6s linear infinite',
        }}
      />
      {message !== undefined && <span style={{ fontSize: 'var(--maw-text-sm)' }}>{message}</span>}
    </div>
  );
}
