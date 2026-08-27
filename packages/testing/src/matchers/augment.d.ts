import 'vitest';

declare module 'vitest' {
  interface Assertion<T = unknown> {
    toBeAppError(code?: string): T;
    toHaveErrorCode(code: string): T;
    toHaveStatusCode(status: number): T;
    toEqualMoney(minor: number): T;
    toBePositiveMoney(): T;
    toBeSuccessEnvelope(): T;
    toBeErrorEnvelope(code?: string): T;
  }

  interface AsymmetricMatchersContaining {
    toBeAppError(code?: string): void;
    toHaveErrorCode(code: string): void;
    toHaveStatusCode(status: number): void;
    toEqualMoney(minor: number): void;
    toBePositiveMoney(): void;
    toBeSuccessEnvelope(): void;
    toBeErrorEnvelope(code?: string): void;
  }
}
