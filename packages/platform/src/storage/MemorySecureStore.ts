import type { ISecureStore } from '@mawsoftwares/sdk/contracts/ISecureStore';

/**
 * In-memory `ISecureStore` — for Node, tests, and SSR. Web and native apps provide
 * their own (localStorage / expo-secure-store) behind the same contract.
 */
export class MemorySecureStore implements ISecureStore {
  private readonly map = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.map.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    this.map.set(key, value);
  }

  async remove(key: string): Promise<void> {
    this.map.delete(key);
  }
}
