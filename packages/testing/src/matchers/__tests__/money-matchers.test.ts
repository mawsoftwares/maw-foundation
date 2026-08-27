import { describe, it, expect } from 'vitest';
import '../index';
import { toMinor } from '@mawsoftwares/sdk/kernel/money';

describe('money matchers', () => {
  it('toEqualMoney passes on exact match', () => {
    const amount = toMinor(10);
    expect(amount).toEqualMoney(1000);
  });

  it('toEqualMoney fails on mismatch', () => {
    expect(() => expect(1000).toEqualMoney(2000)).toThrow();
  });

  it('toEqualMoney fails for non-number', () => {
    expect(() => expect('not-money').toEqualMoney(1000)).toThrow(/expected a number/);
  });

  it('toBePositiveMoney passes for positive', () => {
    expect(500).toBePositiveMoney();
  });

  it('toBePositiveMoney fails for zero', () => {
    expect(() => expect(0).toBePositiveMoney()).toThrow();
  });

  it('toBePositiveMoney fails for negative', () => {
    expect(() => expect(-100).toBePositiveMoney()).toThrow();
  });
});
