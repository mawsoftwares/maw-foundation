import { describe, it, expect } from 'vitest';
import { createErrorTrackingService } from '../errors/types';
import { LoggerFallbackProvider } from '../errors/logger-fallback-provider';
import { createEnhancedLogger } from '../logger/enhanced-logger';
import type { LogTransport, LogEntry } from '@mawsoftwares/sdk/kernel/logger';
import { noopTransport } from '@mawsoftwares/sdk/kernel/logger';
import { runWithContext } from '../context/store';
import type { ObservabilityContext } from '../context/types';

function createCapturingTransport(): LogTransport & { entries: LogEntry[] } {
  const entries: LogEntry[] = [];
  return { entries, write(entry) { entries.push(entry); } };
}

describe('LoggerFallbackProvider', () => {
  it('captureException logs error with stack', () => {
    const t = createCapturingTransport();
    const logger = createEnhancedLogger({ namespace: 'test', level: 'debug', transport: t });
    const provider = new LoggerFallbackProvider(logger);

    const error = new Error('test error');
    provider.captureException(error);

    expect(t.entries).toHaveLength(1);
    expect(t.entries[0]!.level).toBe('error');
    expect(t.entries[0]!.message).toBe('test error');
    expect(t.entries[0]!.context?.['stack']).toBeDefined();
  });

  it('captureMessage logs at corresponding level', () => {
    const t = createCapturingTransport();
    const logger = createEnhancedLogger({ namespace: 'test', level: 'debug', transport: t });
    const provider = new LoggerFallbackProvider(logger);

    provider.captureMessage('info msg', 'info');
    provider.captureMessage('warn msg', 'warning');
    provider.captureMessage('err msg', 'error');

    expect(t.entries).toHaveLength(3);
    expect(t.entries[0]!.level).toBe('info');
    expect(t.entries[1]!.level).toBe('warn');
    expect(t.entries[2]!.level).toBe('error');
  });
});

describe('ErrorTrackingService', () => {
  it('enriches context from ALS', () => {
    const captured: Array<{ error: Error; tags?: Record<string, string> }> = [];
    const mockProvider = {
      captureException(error: Error, context?: { tags?: Record<string, string> }) {
        captured.push({ error, tags: context?.tags });
      },
      captureMessage() {},
      setUser() {},
      async shutdown() {},
    };

    const logger = createEnhancedLogger({ namespace: 'test', level: 'debug', transport: noopTransport });
    const service = createErrorTrackingService(mockProvider, logger);

    const ctx: ObservabilityContext = {
      requestId: 'req-1',
      correlationId: 'cor-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
    };

    runWithContext(ctx, () => {
      service.captureException(new Error('test'));
    });

    expect(captured).toHaveLength(1);
    expect(captured[0]!.tags?.['requestId']).toBe('req-1');
    expect(captured[0]!.tags?.['tenantId']).toBe('tenant-1');
    expect(captured[0]!.tags?.['userId']).toBe('user-1');
  });

  it('redacts extra fields', () => {
    const captured: Array<{ extra?: Record<string, unknown> }> = [];
    const mockProvider = {
      captureException(_error: Error, context?: { extra?: Record<string, unknown> }) {
        captured.push({ extra: context?.extra });
      },
      captureMessage() {},
      setUser() {},
      async shutdown() {},
    };

    const logger = createEnhancedLogger({ namespace: 'test', level: 'debug', transport: noopTransport });
    const service = createErrorTrackingService(mockProvider, logger);

    service.captureException(new Error('test'), {
      extra: { password: 'secret', safe: 'ok' },
    });

    expect(captured[0]!.extra?.['password']).toBe('[REDACTED]');
    expect(captured[0]!.extra?.['safe']).toBe('ok');
  });

  it('does not throw when provider fails', () => {
    const mockProvider = {
      captureException() { throw new Error('provider broken'); },
      captureMessage() { throw new Error('provider broken'); },
      setUser() { throw new Error('provider broken'); },
      async shutdown() {},
    };

    const logger = createEnhancedLogger({ namespace: 'test', level: 'debug', transport: noopTransport });
    const service = createErrorTrackingService(mockProvider, logger);

    expect(() => service.captureException(new Error('test'))).not.toThrow();
    expect(() => service.captureMessage('test', 'error')).not.toThrow();
    expect(() => service.setUser({ id: '1' })).not.toThrow();
  });
});
