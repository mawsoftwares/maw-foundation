import { Component, type ErrorInfo, type ReactNode, type CSSProperties } from 'react';
import { Button } from './components';
import { Spinner } from './components';

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
// ErrorState — uses Button from components
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
    <div style={{ textAlign: 'center', padding: 'var(--maw-space-xxl)', color: 'var(--maw-fgMuted)', ...style }}>
      <div style={{ fontSize: 48, marginBottom: 'var(--maw-space-md)' }}>⚠</div>
      <h3 style={{ margin: 0, fontSize: 'var(--maw-text-lg)', fontWeight: 600, color: 'var(--maw-fg)' }}>{title}</h3>
      {message !== undefined && (
        <p style={{ margin: '8px 0 0', fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fgMuted)' }}>{message}</p>
      )}
      {retry !== undefined && (
        <div style={{ marginTop: 'var(--maw-space-lg)' }}>
          <Button variant="ghost" onClick={retry}>Try again</Button>
        </div>
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
    <div style={{ textAlign: 'center', padding: 'var(--maw-space-xxl)', color: 'var(--maw-fgMuted)', ...style }}>
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
// Loading overlay — uses Spinner from ui-kit
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
          <Spinner size={32} style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
          <span style={{ fontSize: 'var(--maw-text-sm)', color: '#fff' }}>{label}</span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PageLoader — uses Spinner from ui-kit
// ---------------------------------------------------------------------------

export function PageLoader({ message }: { message?: string }): ReactNode {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: 'var(--maw-space-md)',
        color: 'var(--maw-fgMuted)',
      }}
    >
      <Spinner size={40} />
      {message !== undefined && <span style={{ fontSize: 'var(--maw-text-sm)' }}>{message}</span>}
    </div>
  );
}
