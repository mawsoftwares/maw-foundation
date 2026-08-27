import { describe, it, expect } from 'vitest';
import { ShutdownManager } from '../shutdown/shutdown-manager';
import { createEnhancedLogger } from '../logger/enhanced-logger';
import { noopTransport } from '@mawsoftwares/sdk/kernel/logger';

function createSilentLogger() {
  return createEnhancedLogger({ namespace: 'test', level: 'silent', transport: noopTransport });
}

describe('ShutdownManager', () => {
  it('runs hooks in order', async () => {
    const order: string[] = [];
    const manager = new ShutdownManager(createSilentLogger());

    manager.register({ name: 'second', fn: () => { order.push('second'); }, order: 200 });
    manager.register({ name: 'first', fn: () => { order.push('first'); }, order: 100 });
    manager.register({ name: 'third', fn: () => { order.push('third'); }, order: 300 });

    await manager.shutdown('test');
    expect(order).toEqual(['first', 'second', 'third']);
  });

  it('failing hook does not block subsequent hooks', async () => {
    const order: string[] = [];
    const manager = new ShutdownManager(createSilentLogger());

    manager.register({ name: 'fail', fn: () => { throw new Error('oops'); }, order: 1 });
    manager.register({ name: 'success', fn: () => { order.push('ok'); }, order: 2 });

    await manager.shutdown('test');
    expect(order).toEqual(['ok']);
  });

  it('hook timeout does not block others', async () => {
    const order: string[] = [];
    const manager = new ShutdownManager(createSilentLogger(), 50);

    manager.register({
      name: 'stalling',
      fn: () => new Promise((r) => setTimeout(r, 500)),
      order: 1,
    });
    manager.register({ name: 'fast', fn: () => { order.push('fast'); }, order: 2 });

    await manager.shutdown('test');
    expect(order).toEqual(['fast']);
  });

  it('only shuts down once', async () => {
    let count = 0;
    const manager = new ShutdownManager(createSilentLogger());
    manager.register({ name: 'counter', fn: () => { count++; } });

    await manager.shutdown('first');
    await manager.shutdown('second');
    expect(count).toBe(1);
  });

  it('uses default order of 100', async () => {
    const order: string[] = [];
    const manager = new ShutdownManager(createSilentLogger());

    manager.register({ name: 'default', fn: () => { order.push('default'); } });
    manager.register({ name: 'early', fn: () => { order.push('early'); }, order: 50 });
    manager.register({ name: 'late', fn: () => { order.push('late'); }, order: 150 });

    await manager.shutdown('test');
    expect(order).toEqual(['early', 'default', 'late']);
  });
});
