import { describe, it, expect } from 'vitest';
import { measure, startTimer, createSlowOperationDetector } from '../performance/measure';
import { createEnhancedLogger } from '../logger/enhanced-logger';
import type { LogTransport, LogEntry } from '@mawsoftwares/sdk/kernel/logger';

function createCapturingTransport(): LogTransport & { entries: LogEntry[] } {
  const entries: LogEntry[] = [];
  return { entries, write(entry) { entries.push(entry); } };
}

describe('measure', () => {
  it('returns the function result', async () => {
    const result = await measure('test-op', () => 42);
    expect(result).toBe(42);
  });

  it('returns async function result', async () => {
    const result = await measure('async-op', async () => {
      await new Promise((r) => setTimeout(r, 10));
      return 'done';
    });
    expect(result).toBe('done');
  });

  it('re-throws errors', async () => {
    await expect(
      measure('fail-op', () => { throw new Error('boom'); }),
    ).rejects.toThrow('boom');
  });

  it('logs warning for slow operations', async () => {
    const t = createCapturingTransport();
    const logger = createEnhancedLogger({ namespace: 'test', level: 'debug', transport: t });

    await measure('slow-op', async () => {
      await new Promise((r) => setTimeout(r, 60));
    }, { warnThresholdMs: 30, logger });

    const warnings = t.entries.filter((e) => e.level === 'warn');
    expect(warnings).toHaveLength(1);
    expect(warnings[0]!.message).toContain('slow-op');
  });
});

describe('startTimer', () => {
  it('returns duration in ms', async () => {
    const timer = startTimer('test');
    await new Promise((r) => setTimeout(r, 20));
    const { durationMs } = timer.stop();
    expect(durationMs).toBeGreaterThanOrEqual(15);
  });
});

describe('createSlowOperationDetector', () => {
  it('logs warning when threshold exceeded', () => {
    const t = createCapturingTransport();
    const logger = createEnhancedLogger({ namespace: 'test', level: 'debug', transport: t });
    const detector = createSlowOperationDetector({ 'db.query': 50 });

    detector.check('db.query', 100, logger);
    expect(t.entries).toHaveLength(1);
    expect(t.entries[0]!.level).toBe('warn');
  });

  it('does not log when within threshold', () => {
    const t = createCapturingTransport();
    const logger = createEnhancedLogger({ namespace: 'test', level: 'debug', transport: t });
    const detector = createSlowOperationDetector({ 'db.query': 50 });

    detector.check('db.query', 30, logger);
    expect(t.entries).toHaveLength(0);
  });

  it('uses default threshold for unknown operations', () => {
    const t = createCapturingTransport();
    const logger = createEnhancedLogger({ namespace: 'test', level: 'debug', transport: t });
    const detector = createSlowOperationDetector({}, 100);

    detector.check('unknown-op', 150, logger);
    expect(t.entries).toHaveLength(1);
  });
});
