import { AsyncLocalStorage } from 'node:async_hooks';
import type { ObservabilityContext } from './types.js';

const als = new AsyncLocalStorage<ObservabilityContext>();

export function runWithContext<T>(ctx: ObservabilityContext, fn: () => T): T {
  return als.run(ctx, fn);
}

export function getContext(): ObservabilityContext | undefined {
  return als.getStore();
}

export function getContextOrEmpty(): Partial<ObservabilityContext> {
  return als.getStore() ?? {};
}
