export interface ICache<T = unknown> {
  get(key: string): Promise<T | undefined>;
  set(key: string, value: T, ttlMs?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

export class MockCache<T = unknown> implements ICache<T> {
  private readonly store = new Map<string, T>();

  async get(key: string): Promise<T | undefined> {
    return this.store.get(key);
  }

  async set(key: string, value: T, _ttlMs?: number): Promise<void> {
    this.store.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  assertHas(key: string): void {
    if (!this.store.has(key)) {
      throw new Error(`Expected cache to contain key "${key}" but it does not.\nKeys: ${JSON.stringify([...this.store.keys()])}`);
    }
  }

  assertMiss(key: string): void {
    if (this.store.has(key)) {
      throw new Error(`Expected cache NOT to contain key "${key}" but it does.`);
    }
  }

  snapshot(): ReadonlyMap<string, T> {
    return new Map(this.store);
  }

  reset(): void {
    this.store.clear();
  }
}
