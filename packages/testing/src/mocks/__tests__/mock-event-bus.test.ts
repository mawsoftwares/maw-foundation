import { describe, it, expect, beforeEach } from 'vitest';
import { MockEventBus } from '../mock-event-bus';

describe('MockEventBus', () => {
  let bus: MockEventBus;

  beforeEach(() => {
    bus = new MockEventBus();
  });

  it('records emitted events', async () => {
    await bus.emit('user.created', { id: '1' });
    await bus.emit('order.placed', { total: 100 });

    expect(bus.emitted).toHaveLength(2);
    expect(bus.emitted[0]).toEqual({ event: 'user.created', payload: { id: '1' } });
  });

  it('calls registered handlers on emit', async () => {
    const received: unknown[] = [];
    bus.on('test', (p) => { received.push(p); });

    await bus.emit('test', { value: 42 });

    expect(received).toEqual([{ value: 42 }]);
  });

  it('once handlers fire only once', async () => {
    let count = 0;
    bus.once('ping', () => { count++; });

    await bus.emit('ping', null);
    await bus.emit('ping', null);

    expect(count).toBe(1);
  });

  it('off removes a handler', async () => {
    let count = 0;
    const handler = () => { count++; };
    bus.on('x', handler);
    bus.off('x', handler);

    await bus.emit('x', null);
    expect(count).toBe(0);
  });

  it('clear removes all handlers for an event', async () => {
    let count = 0;
    bus.on('a', () => { count++; });
    bus.clear('a');

    await bus.emit('a', null);
    expect(count).toBe(0);
  });

  it('assertEmitted passes on match', async () => {
    await bus.emit('done', { ok: true });
    expect(() => bus.assertEmitted('done')).not.toThrow();
  });

  it('assertEmitted throws on miss', () => {
    expect(() => bus.assertEmitted('missing')).toThrow(/Expected event "missing"/);
  });

  it('assertEmitted with payload matcher', async () => {
    await bus.emit('done', { value: 5 });
    expect(() => bus.assertEmitted('done', (p) => (p as { value: number }).value === 5)).not.toThrow();
    expect(() => bus.assertEmitted('done', (p) => (p as { value: number }).value === 99)).toThrow(/no payload matched/);
  });

  it('assertNotEmitted passes when absent', () => {
    expect(() => bus.assertNotEmitted('nope')).not.toThrow();
  });

  it('reset clears everything', async () => {
    bus.on('x', () => {});
    await bus.emit('x', null);
    bus.reset();

    expect(bus.emitted).toHaveLength(0);
  });
});
