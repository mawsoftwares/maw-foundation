import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
  type CSSProperties,
} from 'react';
import type { INetworkManager, NetworkStatus } from '@maw/sdk/contracts/INetworkManager';
import type { ISyncEngine, SyncProgress, SyncState } from '@maw/sdk/contracts/ISyncEngine';
import type { ConflictDetail, ConflictResolution } from '@maw/sdk/contracts/IConflictResolver';
import { Button, Card, Badge } from './components';
import { Spinner, Stack, Modal, Progress } from './ui-kit';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface OfflineContextValue {
  readonly enabled: boolean;
  readonly networkStatus: NetworkStatus;
  readonly isOnline: boolean;
  readonly syncState: SyncState;
  readonly syncProgress: SyncProgress;
  readonly networkManager: INetworkManager | null;
  readonly syncEngine: ISyncEngine | null;
}

const NOOP_PROGRESS: SyncProgress = { total: 0, completed: 0, failed: 0, state: 'idle' };

const DEFAULT_VALUE: OfflineContextValue = {
  enabled: false,
  networkStatus: 'online',
  isOnline: true,
  syncState: 'idle',
  syncProgress: NOOP_PROGRESS,
  networkManager: null,
  syncEngine: null,
};

const OfflineContext = createContext<OfflineContextValue>(DEFAULT_VALUE);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface OfflineProviderProps {
  readonly networkManager?: INetworkManager;
  readonly syncEngine?: ISyncEngine;
  readonly enabled?: boolean;
  readonly children: ReactNode;
}

export function OfflineProvider({
  networkManager,
  syncEngine,
  enabled = false,
  children,
}: OfflineProviderProps): ReactNode {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(
    networkManager?.status ?? 'online',
  );
  const [syncState, setSyncState] = useState<SyncState>(syncEngine?.state ?? 'idle');
  const [syncProgress, setSyncProgress] = useState<SyncProgress>(NOOP_PROGRESS);

  useEffect(() => {
    if (!enabled || !networkManager) return;
    setNetworkStatus(networkManager.status);
    return networkManager.onStatusChange(setNetworkStatus);
  }, [enabled, networkManager]);

  useEffect(() => {
    if (!enabled || !syncEngine) return;
    const unsub1 = syncEngine.onStateChange(setSyncState);
    const unsub2 = syncEngine.onProgress(setSyncProgress);
    return () => { unsub1(); unsub2(); };
  }, [enabled, syncEngine]);

  const value = useMemo<OfflineContextValue>(
    () => ({
      enabled,
      networkStatus: enabled ? networkStatus : 'online',
      isOnline: enabled ? networkStatus !== 'offline' : true,
      syncState: enabled ? syncState : 'idle',
      syncProgress: enabled ? syncProgress : NOOP_PROGRESS,
      networkManager: enabled ? (networkManager ?? null) : null,
      syncEngine: enabled ? (syncEngine ?? null) : null,
    }),
    [enabled, networkStatus, syncState, syncProgress, networkManager, syncEngine],
  );

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useOffline(): OfflineContextValue {
  return useContext(OfflineContext);
}

export function useNetworkStatus(): NetworkStatus {
  return useContext(OfflineContext).networkStatus;
}

export function useSyncState(): SyncProgress {
  return useContext(OfflineContext).syncProgress;
}

export function useIsOnline(): boolean {
  return useContext(OfflineContext).isOnline;
}

// ---------------------------------------------------------------------------
// NetworkStatusBadge — uses Badge from components
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<NetworkStatus, { label: string; bg: string; color: string }> = {
  online: { label: 'Online', bg: 'var(--maw-successBg)', color: 'var(--maw-success)' },
  offline: { label: 'Offline', bg: 'var(--maw-dangerBg)', color: 'var(--maw-danger)' },
  degraded: { label: 'Slow', bg: 'var(--maw-warningBg)', color: 'var(--maw-warning)' },
};

export function NetworkStatusBadge({ style }: { style?: CSSProperties } = {}): ReactNode {
  const { enabled, networkStatus } = useOffline();
  if (!enabled) return null;

  const cfg = STATUS_CONFIG[networkStatus];
  return (
    <Badge style={{ background: cfg.bg, color: cfg.color, ...style }}>
      {cfg.label}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// SyncStatusIndicator — uses Spinner, Progress, Badge
// ---------------------------------------------------------------------------

export function SyncStatusIndicator({ style }: { style?: CSSProperties } = {}): ReactNode {
  const { enabled, syncProgress } = useOffline();
  if (!enabled) return null;

  if (syncProgress.state === 'syncing') {
    const pct = syncProgress.total > 0 ? (syncProgress.completed / syncProgress.total) * 100 : 0;
    return (
      <Stack direction="row" align="center" gap="8px" style={style}>
        <Spinner size={16} />
        <Progress value={pct} style={{ width: 80, height: 6 }} />
        <span style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgMuted)' }}>
          {syncProgress.completed}/{syncProgress.total}
        </span>
      </Stack>
    );
  }

  if (syncProgress.state === 'error') {
    return (
      <Badge style={{ background: 'var(--maw-dangerBg)', color: 'var(--maw-danger)', ...style }}>
        Sync failed ({syncProgress.failed})
      </Badge>
    );
  }

  if (syncProgress.total > 0 && syncProgress.completed === syncProgress.total) {
    return (
      <Badge style={{ background: 'var(--maw-successBg)', color: 'var(--maw-success)', ...style }}>
        Synced
      </Badge>
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// OfflineBanner — uses Card, Button, Stack
// ---------------------------------------------------------------------------

export function OfflineBanner({ style }: { style?: CSSProperties } = {}): ReactNode {
  const { enabled, isOnline, syncProgress, syncEngine } = useOffline();
  if (!enabled) return null;
  if (isOnline && syncProgress.state === 'idle' && syncProgress.total === 0) return null;

  const handleRetry = useCallback(() => {
    void syncEngine?.flush();
  }, [syncEngine]);

  if (!isOnline) {
    return (
      <Card style={{ background: 'var(--maw-warningBg)', borderLeft: '4px solid var(--maw-warning)', padding: 'var(--maw-space-md) var(--maw-space-lg)', ...style }}>
        <Stack direction="row" align="center" gap="var(--maw-space-md)">
          <span style={{ fontSize: 18 }}>⚡</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 'var(--maw-text-sm)', fontWeight: 600, color: 'var(--maw-fg)' }}>
              You are offline
            </div>
            <div style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgMuted)' }}>
              Changes will sync when connection is restored
            </div>
          </div>
          {syncProgress.total > 0 && (
            <Badge>{syncProgress.total} pending</Badge>
          )}
        </Stack>
      </Card>
    );
  }

  if (syncProgress.state === 'error') {
    return (
      <Card style={{ background: 'var(--maw-dangerBg)', borderLeft: '4px solid var(--maw-danger)', padding: 'var(--maw-space-md) var(--maw-space-lg)', ...style }}>
        <Stack direction="row" align="center" gap="var(--maw-space-md)">
          <span style={{ fontSize: 18 }}>⚠</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 'var(--maw-text-sm)', fontWeight: 600, color: 'var(--maw-fg)' }}>
              Sync failed
            </div>
            <div style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgMuted)' }}>
              {syncProgress.failed} operation(s) could not be synced
            </div>
          </div>
          <Button variant="ghost" onClick={handleRetry}>Retry</Button>
        </Stack>
      </Card>
    );
  }

  if (syncProgress.state === 'syncing') {
    return (
      <Card style={{ background: 'var(--maw-infoBg)', borderLeft: '4px solid var(--maw-info)', padding: 'var(--maw-space-md) var(--maw-space-lg)', ...style }}>
        <Stack direction="row" align="center" gap="var(--maw-space-md)">
          <Spinner size={18} />
          <div style={{ flex: 1, fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fg)' }}>
            Syncing changes... ({syncProgress.completed}/{syncProgress.total})
          </div>
        </Stack>
      </Card>
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// ConflictResolutionDialog — uses Modal, Button, Card, Stack
// ---------------------------------------------------------------------------

export interface ConflictResolutionDialogProps<T = unknown> {
  readonly conflict: ConflictDetail<T>;
  readonly onResolve: (resolution: ConflictResolution, data: T) => void;
  readonly onDismiss: () => void;
}

export function ConflictResolutionDialog<T>({
  conflict,
  onResolve,
  onDismiss,
}: ConflictResolutionDialogProps<T>): ReactNode {
  return (
    <Modal open onClose={onDismiss} title="Resolve Conflict" width={600}>
      <div style={{ padding: 'var(--maw-space-lg)' }}>
        <div style={{ fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fgMuted)', marginBottom: 'var(--maw-space-md)' }}>
          A conflict was detected for <strong>{conflict.entityType}</strong> (ID: {conflict.entityId}).
          Choose which version to keep:
        </div>

        <Stack direction="row" gap="var(--maw-space-md)" style={{ marginBottom: 'var(--maw-space-lg)' }}>
          <Card style={{ flex: 1, padding: 'var(--maw-space-md)' }}>
            <div style={{ fontSize: 'var(--maw-text-xs)', fontWeight: 600, color: 'var(--maw-fgMuted)', marginBottom: 'var(--maw-space-sm)', textTransform: 'uppercase' }}>
              Your Version
            </div>
            <pre style={{ fontSize: 'var(--maw-text-xs)', margin: 0, overflow: 'auto', maxHeight: 200, whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(conflict.localVersion, null, 2)}
            </pre>
            <div style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgSubtle)', marginTop: 'var(--maw-space-xs)' }}>
              {conflict.localUpdatedAt}
            </div>
          </Card>

          <Card style={{ flex: 1, padding: 'var(--maw-space-md)' }}>
            <div style={{ fontSize: 'var(--maw-text-xs)', fontWeight: 600, color: 'var(--maw-fgMuted)', marginBottom: 'var(--maw-space-sm)', textTransform: 'uppercase' }}>
              Server Version
            </div>
            <pre style={{ fontSize: 'var(--maw-text-xs)', margin: 0, overflow: 'auto', maxHeight: 200, whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(conflict.serverVersion, null, 2)}
            </pre>
            <div style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgSubtle)', marginTop: 'var(--maw-space-xs)' }}>
              {conflict.serverUpdatedAt}
            </div>
          </Card>
        </Stack>

        <Stack direction="row" gap="var(--maw-space-sm)" style={{ justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onDismiss}>Cancel</Button>
          <Button variant="ghost" onClick={() => onResolve('server-wins', conflict.serverVersion)}>
            Use Server
          </Button>
          <Button onClick={() => onResolve('local-wins', conflict.localVersion)}>
            Keep Mine
          </Button>
        </Stack>
      </div>
    </Modal>
  );
}
