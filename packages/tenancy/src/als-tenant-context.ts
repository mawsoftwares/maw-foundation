import { AsyncLocalStorage } from 'node:async_hooks';
import type { ITenantContextHolder, TenantContext } from './index';

const als = new AsyncLocalStorage<TenantContext>();

export class AlsTenantContextHolder implements ITenantContextHolder {
  get(): TenantContext | null {
    return als.getStore() ?? null;
  }

  set(_context: TenantContext): void {
    throw new Error(
      'AlsTenantContextHolder.set() is not supported — use run() to scope tenant context to an async chain',
    );
  }

  clear(): void {
    // ALS context ends when the run() scope exits — nothing to clear manually
  }

  run<T>(context: TenantContext, fn: () => T): T {
    return als.run(context, fn);
  }
}
