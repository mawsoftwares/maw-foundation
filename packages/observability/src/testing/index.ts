import type { LogLevel, LogEntry, LogTransport } from '@mawsoftwares/sdk/kernel/logger';
import { noopTransport } from '@mawsoftwares/sdk/kernel/logger';
import { randomUUID } from 'node:crypto';
import { createEnhancedLogger, type EnhancedLogger } from '../logger/enhanced-logger.js';
import { InMemoryMetricsProvider } from '../metrics/in-memory-provider.js';
import type { MetricsService } from '../metrics/types.js';
import { createMetricsService } from '../metrics/types.js';
import type { TracingProvider, Span } from '../tracing/types.js';
import { createTracingService, type TracingService } from '../tracing/types.js';
import { createHealthCheckService, type HealthCheckService } from '../health/enhanced-health.js';
import { runWithContext } from '../context/store.js';
import type { ObservabilityContext } from '../context/types.js';

export interface TestLogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

export interface TestLogger extends EnhancedLogger {
  readonly entries: TestLogEntry[];
  reset(): void;
}

export function createTestLogger(namespace = 'test'): TestLogger {
  const entries: TestLogEntry[] = [];

  const capturingTransport: LogTransport = {
    write(entry: LogEntry) {
      entries.push({
        level: entry.level,
        message: entry.message,
        context: entry.context,
      });
    },
  };

  const inner = createEnhancedLogger({
    namespace,
    level: 'debug',
    transport: capturingTransport,
  });

  return Object.assign(inner, {
    entries,
    reset() { entries.length = 0; },
  });
}

export function createTestMetrics(): MetricsService & { provider: InMemoryMetricsProvider } {
  const provider = new InMemoryMetricsProvider();
  const silentLogger = createEnhancedLogger({ namespace: 'test-metrics', level: 'silent', transport: noopTransport });
  const service = createMetricsService(provider, silentLogger);
  return Object.assign(service, { provider });
}

interface RecordedSpan {
  name: string;
  attributes: Record<string, string | number | boolean>;
  status?: 'ok' | 'error';
  statusMessage?: string;
  ended: boolean;
}

export function createTestTracer(): TracingService & { getSpans(): RecordedSpan[] } {
  const spans: RecordedSpan[] = [];
  const silentLogger = createEnhancedLogger({ namespace: 'test-tracing', level: 'silent', transport: noopTransport });

  const provider: TracingProvider = {
    startSpan(name, options) {
      const record: RecordedSpan = {
        name,
        attributes: (options?.attributes as Record<string, string | number | boolean>) ?? {},
        ended: false,
      };
      spans.push(record);

      const span: Span = {
        traceId: randomUUID(),
        spanId: randomUUID(),
        name,
        setAttribute(key, value) { record.attributes[key] = value; },
        setStatus(status, message) { record.status = status; record.statusMessage = message; },
        end() { record.ended = true; },
      };
      return span;
    },
    async shutdown() { spans.length = 0; },
  };

  const service = createTracingService(provider, silentLogger);
  return Object.assign(service, { getSpans: () => [...spans] });
}

export function createTestHealthRegistry(): HealthCheckService {
  return createHealthCheckService({ defaultTimeoutMs: 1000 });
}

export function withTestContext<T>(
  overrides: Partial<ObservabilityContext>,
  fn: () => T,
): T {
  const ctx: ObservabilityContext = {
    requestId: overrides.requestId ?? randomUUID(),
    correlationId: overrides.correlationId ?? randomUUID(),
    ...overrides,
  };
  return runWithContext(ctx, fn);
}
