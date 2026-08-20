/**
 * Network status detection contract.
 * Implementations: browser online/offline events (web), NetInfo (React Native).
 */

export type NetworkStatus = 'online' | 'offline' | 'degraded';

export interface INetworkManager {
  readonly status: NetworkStatus;
  isOnline(): boolean;
  onStatusChange(listener: (status: NetworkStatus) => void): () => void;
  checkNow(): Promise<NetworkStatus>;
}
