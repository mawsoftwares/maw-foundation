import type { Logger } from '@mawsoftwares/sdk/kernel/logger';
import { runWithContext, getContext } from '../context/store.js';
import type { ObservabilityContext } from '../context/types.js';

export interface Span {
  readonly traceId: string;
  readonly spanId: string;
  readonly name: string;
  setAttribute(key: string, value: string | number | boolean): void;
  setStatus(status: 'ok' | 'error', message?: string): void;
  end(): void;
}

export interface TracingProvider {
  startSpan(name: string, options?: { parentSpan?: Span; attributes?: Record<string, string | number | boolean> }): Span;
  shutdown(): Promise<void>;
}

export interface TracingService {
  startSpan(name: string, options?: { parentSpan?: Span; attributes?: Record<string, string | number | boolean> }): Span;
  withSpan<T>(name: string, fn: (span: Span) => T | Promise<T>, options?: { attributes?: Record<string, string | number | boolean> }): Promise<T>;
  shutdown(): Promise<void>;
}

export function createTracingService(provider: TracingProvider, logger: Logger): TracingService {
  return {
    startSpan(name, options) {
      try {
        return provider.startSpan(name, options);
      } catch {
        logger.warn(`Failed to start span "${name}"`);
        return createNoopSpan(name);
      }
    },

    async withSpan<T>(
      name: string,
      fn: (span: Span) => T | Promise<T>,
      options?: { attributes?: Record<string, string | number | boolean> },
    ): Promise<T> {
      let span: Span;
      try {
        span = provider.startSpan(name, options);
      } catch {
        return fn(createNoopSpan(name));
      }

      const currentCtx = getContext();
      const childCtx: ObservabilityContext = {
        requestId: currentCtx?.requestId ?? '',
        correlationId: currentCtx?.correlationId ?? '',
        ...currentCtx,
        traceId: span.traceId,
        spanId: span.spanId,
      };

      try {
        const result = await runWithContext(childCtx, () => fn(span));
        span.setStatus('ok');
        span.end();
        return result;
      } catch (err) {
        span.setStatus('error', err instanceof Error ? err.message : String(err));
        span.end();
        throw err;
      }
    },

    async shutdown(): Promise<void> {
      try {
        await provider.shutdown();
      } catch {
        // fail-safe
      }
    },
  };
}

function createNoopSpan(name: string): Span {
  return {
    traceId: '',
    spanId: '',
    name,
    setAttribute() {},
    setStatus() {},
    end() {},
  };
}
