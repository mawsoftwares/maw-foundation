import type { ControllerResult } from '../controller/types';
import type { IIdempotencyStore } from './types';

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

export class IdempotencyService {
  constructor(private readonly store: IIdempotencyStore) {}

  async process<T>(
    key: string,
    execute: () => Promise<ControllerResult<T>>,
    ttlMs: number = DEFAULT_TTL_MS,
  ): Promise<ControllerResult<T>> {
    const existing = await this.store.get(key);
    if (existing !== null) {
      const now = new Date();
      if (now < new Date(existing.expiresAt)) {
        return existing.response as ControllerResult<T>;
      }
    }

    const result = await execute();

    const now = new Date();
    await this.store.set({
      key,
      response: result,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
    });

    return result;
  }
}
