import { toMajor } from '@mawsoftwares/sdk/kernel/money';

export function toEqualMoney(received: unknown, expectedMinor: number): { pass: boolean; message: () => string } {
  const pass = typeof received === 'number' && received === expectedMinor;
  return {
    pass,
    message: () =>
      pass
        ? `expected ${received} (${toMajor(received as number)} major) NOT to equal ${expectedMinor} (${toMajor(expectedMinor)} major)`
        : typeof received === 'number'
          ? `expected ${expectedMinor} minor (${toMajor(expectedMinor)} major) but got ${received} minor (${toMajor(received)} major)`
          : `expected a number (Money) but got ${typeof received}`,
  };
}

export function toBePositiveMoney(received: unknown): { pass: boolean; message: () => string } {
  const pass = typeof received === 'number' && received > 0;
  return {
    pass,
    message: () =>
      pass
        ? `expected ${received} NOT to be positive`
        : typeof received === 'number'
          ? `expected positive Money but got ${received}`
          : `expected a number (Money) but got ${typeof received}`,
  };
}
