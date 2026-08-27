import { describe, it, expect, beforeEach } from 'vitest';
import { MockCache } from '../mock-cache';

describe('MockCache', () => {
  let cache: MockCache<string>;

  beforeEach(() => {
    cache = new MockCache<string>();
  });

  it('get returns undefined for missing keys', async () => {
    expect(await cache.get('x')).toBeUndefined();
  });

  it('set and get round-trip', async () => {
    await cache.set('key', 'value');
    expect(await cache.get('key')).toBe('value');
  });

  it('delete removes a key', async () => {
    await cache.set('a', 'b');
    await cache.delete('a');
    expect(await cache.get('a')).toBeUndefined();
  });

  it('clear removes all keys', async () => {
    await cache.set('a', '1');
    await cache.set('b', '2');
    await cache.clear();
    expect(await cache.get('a')).toBeUndefined();
    expect(await cache.get('b')).toBeUndefined();
  });

  it('assertHas passes for existing key', async () => {
    await cache.set('x', 'y');
    expect(() => cache.assertHas('x')).not.toThrow();
  });

  it('assertHas throws for missing key', () => {
    expect(() => cache.assertHas('x')).toThrow(/Expected cache to contain key "x"/);
  });

  it('assertMiss passes for missing key', () => {
    expect(() => cache.assertMiss('x')).not.toThrow();
  });

  it('assertMiss throws for existing key', async () => {
    await cache.set('x', 'y');
    expect(() => cache.assertMiss('x')).toThrow(/Expected cache NOT to contain key "x"/);
  });

  it('snapshot returns current state', async () => {
    await cache.set('a', '1');
    await cache.set('b', '2');
    const snap = cache.snapshot();
    expect(snap.get('a')).toBe('1');
    expect(snap.get('b')).toBe('2');
  });

  it('reset clears the cache', async () => {
    await cache.set('a', '1');
    cache.reset();
    expect(await cache.get('a')).toBeUndefined();
  });
});
