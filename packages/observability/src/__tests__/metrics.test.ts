import { describe, it, expect } from 'vitest';
import { InMemoryMetricsProvider } from '../metrics/in-memory-provider';
import { createMetricsService } from '../metrics/types';
import { createEnhancedLogger } from '../logger/enhanced-logger';
import { noopTransport } from '@mawsoftwares/sdk/kernel/logger';

function createSilentLogger() {
  return createEnhancedLogger({ namespace: 'test', level: 'silent', transport: noopTransport });
}

describe('InMemoryMetricsProvider', () => {
  it('counter increments', () => {
    const provider = new InMemoryMetricsProvider();
    const counter = provider.counter('requests');
    counter.inc();
    counter.inc(5);

    const snapshot = provider.getSnapshot();
    expect(snapshot.get('requests')?.value).toBe(6);
  });

  it('gauge sets, increments, and decrements', () => {
    const provider = new InMemoryMetricsProvider();
    const gauge = provider.gauge('connections');
    gauge.set(10);
    gauge.inc(2);
    gauge.dec(3);

    const snapshot = provider.getSnapshot();
    expect(snapshot.get('connections')?.value).toBe(9);
  });

  it('histogram records observations', () => {
    const provider = new InMemoryMetricsProvider();
    const histogram = provider.histogram('latency', [10, 50, 100]);
    histogram.observe(15);
    histogram.observe(42);
    histogram.observe(99);

    const snapshot = provider.getSnapshot();
    const entry = snapshot.get('latency');
    expect(entry?.observations).toEqual([15, 42, 99]);
    expect(entry?.value).toBe(3);
  });

  it('supports labels', () => {
    const provider = new InMemoryMetricsProvider();
    provider.counter('http.requests', { method: 'GET' }).inc();
    provider.counter('http.requests', { method: 'POST' }).inc(3);

    const snapshot = provider.getSnapshot();
    expect(snapshot.size).toBe(2);
  });

  it('reset clears all metrics', () => {
    const provider = new InMemoryMetricsProvider();
    provider.counter('a').inc();
    provider.reset();
    expect(provider.getSnapshot().size).toBe(0);
  });
});

describe('MetricsService', () => {
  it('wraps provider calls safely', () => {
    const provider = new InMemoryMetricsProvider();
    const service = createMetricsService(provider, createSilentLogger());

    service.counter('test').inc();
    const snapshot = provider.getSnapshot();
    expect(snapshot.get('test')?.value).toBe(1);
  });

  it('enforces cardinality limit', () => {
    const provider = new InMemoryMetricsProvider();
    const logger = createEnhancedLogger({ namespace: 'test', level: 'debug', transport: noopTransport });
    const service = createMetricsService(provider, logger, 3);

    service.counter('req', { path: '/a' }).inc();
    service.counter('req', { path: '/b' }).inc();
    service.counter('req', { path: '/c' }).inc();
    service.counter('req', { path: '/d' }).inc();

    const snapshot = provider.getSnapshot();
    expect(snapshot.size).toBe(3);
  });

  it('does not throw when provider fails', () => {
    const brokenProvider = {
      counter() { throw new Error('broken'); },
      gauge() { throw new Error('broken'); },
      histogram() { throw new Error('broken'); },
      async shutdown() {},
    };

    const service = createMetricsService(
      brokenProvider as unknown as InMemoryMetricsProvider,
      createSilentLogger(),
    );

    const counter = service.counter('test');
    expect(() => counter.inc()).not.toThrow();
  });
});
