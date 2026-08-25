import type { ControllerResult } from '../controller/types';

export interface IdempotencyRecord {
  readonly key: string;
  readonly response: ControllerResult<unknown>;
  readonly createdAt: string;
  readonly expiresAt: string;
}

export interface IIdempotencyStore {
  get(key: string): Promise<IdempotencyRecord | null>;
  set(record: IdempotencyRecord): Promise<void>;
}
