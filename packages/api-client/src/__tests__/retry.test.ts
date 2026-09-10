import { describe, it, expect, vi, afterEach } from 'vitest';
import { computeBackoffMs } from '../index';

describe('computeBackoffMs', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('grows exponentially with attempt number, before jitter and capping', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1); // no downward jitter, multiplier = 1
    expect(computeBackoffMs(0, 100, 10_000)).toBe(100);
    expect(computeBackoffMs(1, 100, 10_000)).toBe(200);
    expect(computeBackoffMs(2, 100, 10_000)).toBe(400);
    expect(computeBackoffMs(3, 100, 10_000)).toBe(800);
  });

  it('caps at maxBackoffMs', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1);
    expect(computeBackoffMs(10, 100, 500)).toBe(500);
  });

  it('applies jitter within the documented [0.5, 1.0] multiplier range', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const low = computeBackoffMs(2, 100, 10_000); // raw = 400, multiplier 0.5
    expect(low).toBe(200);

    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const mid = computeBackoffMs(2, 100, 10_000); // multiplier 0.75
    expect(mid).toBe(300);
  });

  it('never returns a negative or NaN value for attempt 0', () => {
    const value = computeBackoffMs(0, 100, 10_000);
    expect(Number.isFinite(value)).toBe(true);
    expect(value).toBeGreaterThanOrEqual(0);
  });
});
