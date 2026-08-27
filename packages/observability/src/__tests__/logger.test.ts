import { describe, it, expect, vi } from 'vitest';
import type { LogTransport, LogEntry } from '@mawsoftwares/sdk/kernel/logger';
import { createEnhancedLogger } from '../logger/enhanced-logger';
import { createMultiTransport } from '../logger/multi-transport';
import { runWithContext } from '../context/store';
import type { ObservabilityContext } from '../context/types';

function createCapturingTransport(): LogTransport & { entries: LogEntry[] } {
  const entries: LogEntry[] = [];
  return {
    entries,
    write(entry: LogEntry) { entries.push(entry); },
  };
}

describe('EnhancedLogger', () => {
  it('logs at all levels', () => {
    const t = createCapturingTransport();
    const logger = createEnhancedLogger({ namespace: 'test', level: 'debug', transport: t });

    logger.debug('d');
    logger.info('i');
    logger.warn('w');
    logger.error('e');

    expect(t.entries).toHaveLength(4);
    expect(t.entries.map((e) => e.level)).toEqual(['debug', 'info', 'warn', 'error']);
  });

  it('respects log level', () => {
    const t = createCapturingTransport();
    const logger = createEnhancedLogger({ namespace: 'test', level: 'warn', transport: t });

    logger.debug('skip');
    logger.info('skip');
    logger.warn('show');
    logger.error('show');

    expect(t.entries).toHaveLength(2);
  });

  it('fatal logs at error level with fatal flag', () => {
    const t = createCapturingTransport();
    const logger = createEnhancedLogger({ namespace: 'test', level: 'debug', transport: t });

    logger.fatal('critical');

    expect(t.entries).toHaveLength(1);
    expect(t.entries[0]!.level).toBe('error');
    expect(t.entries[0]!.context?.['fatal']).toBe(true);
  });

  it('merges ALS context into log entries', () => {
    const t = createCapturingTransport();
    const logger = createEnhancedLogger({ namespace: 'test', level: 'debug', transport: t });

    const ctx: ObservabilityContext = {
      requestId: 'req-123',
      correlationId: 'cor-456',
      tenantId: 'tenant-1',
    };

    runWithContext(ctx, () => {
      logger.info('hello');
    });

    expect(t.entries[0]!.context?.['requestId']).toBe('req-123');
    expect(t.entries[0]!.context?.['correlationId']).toBe('cor-456');
    expect(t.entries[0]!.context?.['tenantId']).toBe('tenant-1');
  });

  it('redacts sensitive fields in context', () => {
    const t = createCapturingTransport();
    const logger = createEnhancedLogger({ namespace: 'test', level: 'debug', transport: t });

    logger.info('with secret', { password: 'hunter2', safe: 'ok' });

    expect(t.entries[0]!.context?.['password']).toBe('[REDACTED]');
    expect(t.entries[0]!.context?.['safe']).toBe('ok');
  });

  it('supports per-namespace level overrides', () => {
    const t = createCapturingTransport();
    const logger = createEnhancedLogger({
      namespace: 'database',
      level: 'warn',
      transport: t,
      namespaceLevels: { database: 'debug' },
    });

    logger.debug('db debug');
    expect(t.entries).toHaveLength(1);
  });

  it('child inherits config', () => {
    const t = createCapturingTransport();
    const logger = createEnhancedLogger({ namespace: 'app', level: 'debug', transport: t });
    const child = logger.child('db');

    child.info('from child');
    expect(t.entries[0]!.namespace).toBe('app:db');
  });

  it('does not crash on transport failure', () => {
    const failingTransport: LogTransport = {
      write() { throw new Error('transport broken'); },
    };
    const logger = createEnhancedLogger({ namespace: 'test', level: 'debug', transport: failingTransport });

    expect(() => logger.info('should not crash')).not.toThrow();
  });
});

describe('createMultiTransport', () => {
  it('fans out to multiple transports', () => {
    const t1 = createCapturingTransport();
    const t2 = createCapturingTransport();
    const multi = createMultiTransport([t1, t2]);

    multi.write({ level: 'info', namespace: 'test', message: 'hello', timestamp: new Date().toISOString() });

    expect(t1.entries).toHaveLength(1);
    expect(t2.entries).toHaveLength(1);
  });

  it('continues if one transport fails', () => {
    const failing: LogTransport = { write() { throw new Error('fail'); } };
    const t2 = createCapturingTransport();
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const multi = createMultiTransport([failing, t2]);
    multi.write({ level: 'info', namespace: 'test', message: 'hello', timestamp: new Date().toISOString() });

    expect(t2.entries).toHaveLength(1);
    stderrSpy.mockRestore();
  });
});
