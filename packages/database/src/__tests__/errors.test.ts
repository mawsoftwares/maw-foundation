import { describe, it, expect } from 'vitest';
import { isPgError, translatePgError, withPgErrorTranslation } from '../errors/index';
import { ErrorCode } from '@mawsoftwares/sdk/kernel/errors';

describe('isPgError', () => {
  it('returns true for objects with a string code', () => {
    expect(isPgError({ code: '23505' })).toBe(true);
  });

  it('returns false for non-objects', () => {
    expect(isPgError(null)).toBe(false);
    expect(isPgError('error')).toBe(false);
    expect(isPgError(42)).toBe(false);
  });

  it('returns false for objects without code', () => {
    expect(isPgError({ message: 'fail' })).toBe(false);
  });
});

describe('translatePgError', () => {
  it('maps 23505 to ALREADY_EXISTS', () => {
    const err = translatePgError({ code: '23505', detail: 'Key (email)=(a@b.c) already exists.' });
    expect(err.code).toBe(ErrorCode.ALREADY_EXISTS);
  });

  it('maps 23503 to CONFLICT (foreign key)', () => {
    const err = translatePgError({ code: '23503', constraint: 'fk_user' });
    expect(err.code).toBe(ErrorCode.CONFLICT);
  });

  it('maps 23514 to VALIDATION_FAILED', () => {
    const err = translatePgError({ code: '23514', constraint: 'check_positive' });
    expect(err.code).toBe(ErrorCode.VALIDATION_FAILED);
  });

  it('maps 40001 to CONFLICT (serialization)', () => {
    const err = translatePgError({ code: '40001' });
    expect(err.code).toBe(ErrorCode.CONFLICT);
  });

  it('maps 40P01 to CONFLICT (deadlock)', () => {
    const err = translatePgError({ code: '40P01' });
    expect(err.code).toBe(ErrorCode.CONFLICT);
  });

  it('maps 57014 to TIMEOUT', () => {
    const err = translatePgError({ code: '57014' });
    expect(err.code).toBe(ErrorCode.TIMEOUT);
  });

  it('maps unknown codes to INTERNAL', () => {
    const err = translatePgError({ code: '99999', message: 'unknown' });
    expect(err.code).toBe(ErrorCode.INTERNAL);
  });
});

describe('withPgErrorTranslation', () => {
  it('returns value on success', async () => {
    const result = await withPgErrorTranslation(() => Promise.resolve(42));
    expect(result).toBe(42);
  });

  it('translates PgError into AppError', async () => {
    await expect(
      withPgErrorTranslation(() => Promise.reject({ code: '23505', detail: 'dup' })),
    ).rejects.toMatchObject({ code: ErrorCode.ALREADY_EXISTS });
  });

  it('rethrows non-Pg errors unchanged', async () => {
    const original = new Error('network down');
    await expect(
      withPgErrorTranslation(() => Promise.reject(original)),
    ).rejects.toBe(original);
  });
});
