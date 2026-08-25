import { describe, it, expect, vi } from 'vitest';
import { IdempotencyService } from '../idempotency/service';
import { MemoryIdempotencyStore } from '../idempotency/memory-store';

describe('IdempotencyService', () => {
  it('executes on first call and caches result', async () => {
    const store = new MemoryIdempotencyStore();
    const service = new IdempotencyService(store);
    const execute = vi.fn().mockResolvedValue({ id: 1 });

    const result = await service.process('key-1', execute);
    expect(result).toEqual({ id: 1 });
    expect(execute).toHaveBeenCalledOnce();
  });

  it('returns cached result on second call', async () => {
    const store = new MemoryIdempotencyStore();
    const service = new IdempotencyService(store);
    const execute = vi.fn().mockResolvedValue({ id: 1 });

    await service.process('key-2', execute);
    const second = await service.process('key-2', execute);
    expect(second).toEqual({ id: 1 });
    expect(execute).toHaveBeenCalledOnce();
  });

  it('re-executes after TTL expiry', async () => {
    const store = new MemoryIdempotencyStore();
    const service = new IdempotencyService(store);
    let callCount = 0;
    const execute = vi.fn().mockImplementation(async () => ({ count: ++callCount }));

    await service.process('key-3', execute, 1);
    await new Promise((r) => setTimeout(r, 10));
    const result = await service.process('key-3', execute, 1);
    expect(result).toEqual({ count: 2 });
    expect(execute).toHaveBeenCalledTimes(2);
  });
});
