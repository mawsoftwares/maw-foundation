import { AppError } from '@mawsoftwares/sdk/kernel/errors';

export function toBeAppError(received: unknown, expectedCode?: string): { pass: boolean; message: () => string } {
  const pass = received instanceof AppError && (expectedCode === undefined || received.code === expectedCode);
  return {
    pass,
    message: () =>
      pass
        ? `expected value NOT to be an AppError${expectedCode ? ` with code "${expectedCode}"` : ''}`
        : received instanceof AppError
          ? `expected AppError with code "${expectedCode}" but got code "${received.code}"`
          : `expected an AppError but got ${typeof received}: ${String(received)}`,
  };
}

export function toHaveErrorCode(received: unknown, code: string): { pass: boolean; message: () => string } {
  const isAppError = received instanceof AppError;
  const pass = isAppError && received.code === code;
  return {
    pass,
    message: () =>
      pass
        ? `expected error NOT to have code "${code}"`
        : isAppError
          ? `expected error code "${code}" but got "${received.code}"`
          : `expected an AppError but got ${typeof received}`,
  };
}

export function toHaveStatusCode(received: unknown, status: number): { pass: boolean; message: () => string } {
  const isAppError = received instanceof AppError;
  const pass = isAppError && received.statusCode === status;
  return {
    pass,
    message: () =>
      pass
        ? `expected error NOT to have status ${status}`
        : isAppError
          ? `expected status ${status} but got ${received.statusCode}`
          : `expected an AppError but got ${typeof received}`,
  };
}
