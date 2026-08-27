import type { INetworkManager, NetworkStatus } from '@mawsoftwares/sdk/contracts/INetworkManager';

interface NetInfoState {
  readonly isConnected: boolean | null;
  readonly isInternetReachable: boolean | null;
}

type NetInfoSubscription = () => void;

let NetInfo: {
  fetch(): Promise<NetInfoState>;
  addEventListener(listener: (state: NetInfoState) => void): NetInfoSubscription;
};

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  NetInfo = require('@react-native-community/netinfo').default as typeof NetInfo;
} catch {
  throw new Error('@react-native-community/netinfo is required for NativeNetworkManager. Install it with: npx expo install @react-native-community/netinfo');
}

function mapState(state: NetInfoState): NetworkStatus {
  if (state.isConnected === false) return 'offline';
  if (state.isInternetReachable === false) return 'degraded';
  return 'online';
}

export class NativeNetworkManager implements INetworkManager {
  private _status: NetworkStatus = 'online';
  private readonly listeners = new Set<(status: NetworkStatus) => void>();
  private unsubscribe: NetInfoSubscription | null = null;

  constructor() {
    this.unsubscribe = NetInfo.addEventListener((state) => {
      this.setStatus(mapState(state));
    });
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
    const state = await NetInfo.fetch();
    const next = mapState(state);
    this.setStatus(next);
    return next;
  }

  destroy(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.listeners.clear();
  }

  private setStatus(next: NetworkStatus): void {
    if (next === this._status) return;
    this._status = next;
    for (const fn of this.listeners) fn(next);
  }
}
