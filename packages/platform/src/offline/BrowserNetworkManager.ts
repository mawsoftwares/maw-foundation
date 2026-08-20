import type { INetworkManager, NetworkStatus } from '@maw/sdk/contracts/INetworkManager';

export interface BrowserNetworkManagerOptions {
  readonly healthEndpoint?: string;
  readonly degradedThresholdMs?: number;
}

/**
 * Browser-based INetworkManager using navigator.onLine + online/offline events.
 * Optional health-check ping for degraded detection.
 */
export class BrowserNetworkManager implements INetworkManager {
  private _status: NetworkStatus;
  private readonly listeners = new Set<(status: NetworkStatus) => void>();
  private readonly healthEndpoint?: string;
  private readonly degradedThresholdMs: number;
  private cleanupFns: Array<() => void> = [];

  constructor(options: BrowserNetworkManagerOptions = {}) {
    this.healthEndpoint = options.healthEndpoint;
    this.degradedThresholdMs = options.degradedThresholdMs ?? 3000;
    this._status = typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'online';
    this.setupListeners();
  }

  get status(): NetworkStatus {
    return this._status;
  }

  isOnline(): boolean {
    return this._status !== 'offline';
  }

  onStatusChange(listener: (status: NetworkStatus) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async checkNow(): Promise<NetworkStatus> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.setStatus('offline');
      return 'offline';
    }

    if (!this.healthEndpoint) {
      this.setStatus('online');
      return 'online';
    }

    try {
      const start = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.degradedThresholdMs * 2);

      try {
        await fetch(this.healthEndpoint, {
          method: 'HEAD',
          signal: controller.signal,
          cache: 'no-store',
        });
      } finally {
        clearTimeout(timeoutId);
      }

      const elapsed = Date.now() - start;
      const newStatus: NetworkStatus = elapsed > this.degradedThresholdMs ? 'degraded' : 'online';
      this.setStatus(newStatus);
      return newStatus;
    } catch {
      this.setStatus('offline');
      return 'offline';
    }
  }

  destroy(): void {
    for (const cleanup of this.cleanupFns) cleanup();
    this.cleanupFns = [];
    this.listeners.clear();
  }

  private setStatus(next: NetworkStatus): void {
    if (next === this._status) return;
    this._status = next;
    for (const fn of this.listeners) fn(next);
  }

  private setupListeners(): void {
    if (typeof window === 'undefined') return;

    const onOnline = () => this.setStatus('online');
    const onOffline = () => this.setStatus('offline');

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    this.cleanupFns.push(
      () => window.removeEventListener('online', onOnline),
      () => window.removeEventListener('offline', onOffline),
    );
  }
}
