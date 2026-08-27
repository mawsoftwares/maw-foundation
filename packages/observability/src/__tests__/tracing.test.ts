import { describe, it, expect } from 'vitest';
import { createTracingService } from '../tracing/types';
import { NoopTracingProvider } from '../tracing/noop-provider';
import { createEnhancedLogger } from '../logger/enhanced-logger';
import { noopTransport } from '@mawsoftwares/sdk/kernel/logger';
import { getContext, runWithContext } from '../context/store';
import type { ObservabilityContext } from '../context/types';
import { createTestTracer } from '../testing/index';

function createSilentLogger() {
  return createEnhancedLogger({ namespace: 'test', level: 'silent', transport: noopTransport });
}

describe('NoopTracingProvider', () => {
  it('returns spans with UUIDs', () => {
    const provider = new NoopTracingProvider();
    const span = provider.startSpan('test-op');
    expect(span.traceId).toBeTruthy();
    expect(span.spanId).toBeTruthy();
    expect(span.name).toBe('test-op');
  });

  it('span operations are no-ops', () => {
    const provider = new NoopTracingProvider();
    const span = provider.startSpan('test');
    expect(() => {
      span.setAttribute('key', 'value');
      span.setStatus('ok');
      span.end();
    }).not.toThrow();
  });
});

describe('TracingService', () => {
  it('withSpan executes function and returns result', async () => {
    const service = createTracingService(new NoopTracingProvider(), createSilentLogger());
    const result = await service.withSpan('op', () => 42);
    expect(result).toBe(42);
  });

  it('withSpan propagates error and sets status', async () => {
    const tracer = createTestTracer();

    await expect(
      tracer.withSpan('fail-op', () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    const spans = tracer.getSpans();
    expect(spans).toHaveLength(1);
    expect(spans[0]!.status).toBe('error');
    expect(spans[0]!.ended).toBe(true);
  });

  it('withSpan updates ALS context with spanId', async () => {
    const tracer = createTestTracer();
    const ctx: ObservabilityContext = { requestId: 'r', correlationId: 'c' };

    await runWithContext(ctx, async () => {
      await tracer.withSpan('inner-op', async (span) => {
        const inner = getContext();
        expect(inner?.spanId).toBe(span.spanId);
      });
    });
  });

  it('records span attributes', async () => {
    const tracer = createTestTracer();

    await tracer.withSpan(
      'attributed-op',
      (span) => {
        span.setAttribute('db.query', 'SELECT 1');
        return 'ok';
      },
      { attributes: { 'http.method': 'GET' } },
    );

    const spans = tracer.getSpans();
    expect(spans[0]!.attributes['http.method']).toBe('GET');
    expect(spans[0]!.attributes['db.query']).toBe('SELECT 1');
    expect(spans[0]!.status).toBe('ok');
  });
});
