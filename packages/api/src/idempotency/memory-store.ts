import type { IdempotencyRecord, IIdempotencyStore } from './types';

export class MemoryIdempotencyStore implements IIdempotencyStore {
  private readonly records = new Map<string, IdempotencyRecord>();

  async get(key: string): Promise<IdempotencyRecord | null> {
    return this.records.get(key) ?? null;
  }

  async set(record: IdempotencyRecord): Promise<void> {
    this.records.set(record.key, record);
  }

  clear(): void {
    this.records.clear();
  }
}
