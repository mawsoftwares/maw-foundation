import { expect } from 'vitest';
import { toBeAppError, toHaveErrorCode, toHaveStatusCode } from './error-matchers';
import { toEqualMoney, toBePositiveMoney } from './money-matchers';
import { toBeSuccessEnvelope, toBeErrorEnvelope } from './envelope-matchers';

expect.extend({
  toBeAppError,
  toHaveErrorCode,
  toHaveStatusCode,
  toEqualMoney,
  toBePositiveMoney,
  toBeSuccessEnvelope,
  toBeErrorEnvelope,
});

export { toBeAppError, toHaveErrorCode, toHaveStatusCode } from './error-matchers';
export { toEqualMoney, toBePositiveMoney } from './money-matchers';
export { toBeSuccessEnvelope, toBeErrorEnvelope } from './envelope-matchers';
