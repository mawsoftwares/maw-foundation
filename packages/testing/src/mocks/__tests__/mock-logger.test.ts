import { describe, it, expect, beforeEach } from 'vitest';
import { MockLogger } from '../mock-logger';

describe('MockLogger', () => {
  let logger: MockLogger;

  beforeEach(() => {
    logger = new MockLogger();
  });

  it('records log entries', () => {
    logger.info('hello');
    logger.warn('caution', { code: 42 });

    expect(logger.entries).toHaveLength(2);
    expect(logger.entries[0]).toEqual({ level: 'info', message: 'hello', context: undefined });
    expect(logger.entries[1]).toEqual({ level: 'warn', message: 'caution', context: { code: 42 } });
  });

  it('assertLogged passes on match', () => {
    logger.error('something broke');
    expect(() => logger.assertLogged('error', 'broke')).not.toThrow();
  });

  it('assertLogged throws on miss', () => {
    logger.info('ok');
    expect(() => logger.assertLogged('error', 'broke')).toThrow(/Expected a "error" log/);
  });

  it('assertLogged works with regex', () => {
    logger.debug('request-id-abc123');
    expect(() => logger.assertLogged('debug', /request-id-\w+/)).not.toThrow();
  });

  it('assertNotLogged passes when absent', () => {
    logger.info('ok');
    expect(() => logger.assertNotLogged('error', 'fail')).not.toThrow();
  });

  it('assertNotLogged throws when present', () => {
    logger.error('fail');
    expect(() => logger.assertNotLogged('error', 'fail')).toThrow(/Expected no "error" log/);
  });

  it('reset clears entries', () => {
    logger.info('a');
    logger.warn('b');
    logger.reset();
    expect(logger.entries).toHaveLength(0);
  });

  it('child propagates entries to parent', () => {
    const child = logger.child('sub');
    child.info('from child');

    expect(child.entries).toHaveLength(1);
    expect(logger.entries).toHaveLength(1);
    expect(logger.entries[0]!.message).toBe('from child');
  });
});
