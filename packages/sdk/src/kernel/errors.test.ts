import { describe, it, expect } from 'vitest';
import { AppError, ErrorCode, isAppError, isAppErrorLike } from './errors';

describe('isAppErrorLike', () => {
  it('accepts AppError instances', () => {
    const err = new AppError(ErrorCode.DUPLICATE_EMAIL, 'exists', 409);
    expect(isAppError(err)).toBe(true);
    expect(isAppErrorLike(err)).toBe(true);
  });

  it('accepts structural app errors', () => {
    const err = { code: 'CONFLICT', statusCode: 409, message: 'taken', details: { field: 'email' } };
    expect(isAppError(err)).toBe(false);
    expect(isAppErrorLike(err)).toBe(true);
  });

  it('rejects generic Error', () => {
    expect(isAppErrorLike(new Error('USER_EMAIL_ALREADY_EXISTS'))).toBe(false);
  });
});
