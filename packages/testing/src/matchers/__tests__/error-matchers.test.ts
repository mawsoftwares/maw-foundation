import { describe, it, expect } from 'vitest';
import '../index';
import { AppError, ErrorCode } from '@mawsoftwares/sdk/kernel/errors';

describe('error matchers', () => {
  it('toBeAppError passes for AppError', () => {
    const err = new AppError(ErrorCode.NOT_FOUND, 'missing');
    expect(err).toBeAppError();
  });

  it('toBeAppError with code passes on match', () => {
    const err = new AppError(ErrorCode.NOT_FOUND, 'missing');
    expect(err).toBeAppError(ErrorCode.NOT_FOUND);
  });

  it('toBeAppError fails for plain Error', () => {
    expect(() => expect(new Error('nope')).toBeAppError()).toThrow();
  });

  it('toBeAppError with wrong code fails', () => {
    const err = new AppError(ErrorCode.NOT_FOUND, 'missing');
    expect(() => expect(err).toBeAppError(ErrorCode.CONFLICT)).toThrow();
  });

  it('toHaveErrorCode passes on match', () => {
    const err = new AppError(ErrorCode.VALIDATION_FAILED, 'bad input');
    expect(err).toHaveErrorCode(ErrorCode.VALIDATION_FAILED);
  });

  it('toHaveErrorCode fails on mismatch', () => {
    const err = new AppError(ErrorCode.NOT_FOUND, 'nope');
    expect(() => expect(err).toHaveErrorCode(ErrorCode.CONFLICT)).toThrow();
  });

  it('toHaveStatusCode passes on match', () => {
    const err = new AppError(ErrorCode.NOT_FOUND, 'missing');
    expect(err).toHaveStatusCode(404);
  });

  it('toHaveStatusCode fails on mismatch', () => {
    const err = new AppError(ErrorCode.NOT_FOUND, 'missing');
    expect(() => expect(err).toHaveStatusCode(500)).toThrow();
  });
});
