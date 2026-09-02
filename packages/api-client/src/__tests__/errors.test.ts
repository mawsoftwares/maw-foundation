import { describe, it, expect } from 'vitest';
import { ApiError, parseApiErrorPayload, getApiErrorMessage, getApiErrorFields } from '../errors';

describe('parseApiErrorPayload', () => {
  it('reads the standard envelope', () => {
    const result = parseApiErrorPayload(
      { success: false, error: { code: 'DUPLICATE_EMAIL', message: 'An account with this email already exists' } },
      'Conflict',
    );
    expect(result).toEqual({
      message: 'An account with this email already exists',
      code: 'DUPLICATE_EMAIL',
    });
  });

  it('does not stringify the error object', () => {
    const result = parseApiErrorPayload(
      { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
      'Not Found',
    );
    expect(result.message).not.toContain('[object');
  });

  it('falls back to legacy message field', () => {
    const result = parseApiErrorPayload(
      { success: false, data: null, message: 'USER_EMAIL_ALREADY_EXISTS', meta: {} },
      'Bad Request',
    );
    expect(result.message).toBe('USER_EMAIL_ALREADY_EXISTS');
  });
});

describe('getApiErrorMessage', () => {
  it('uses ApiError.message', () => {
    const err = new ApiError(409, 'An account with this email already exists', {}, 'DUPLICATE_EMAIL');
    expect(getApiErrorMessage(err)).toBe('An account with this email already exists');
  });
});

describe('getApiErrorFields', () => {
  it('maps details.field onto a form field', () => {
    const err = new ApiError(409, 'An account with this email already exists', {
      success: false,
      error: {
        code: 'DUPLICATE_EMAIL',
        message: 'An account with this email already exists',
        details: { field: 'email' },
      },
    });
    expect(getApiErrorFields(err)).toEqual([
      { field: 'email', message: 'An account with this email already exists' },
    ]);
  });

  it('maps validation fields array', () => {
    const err = new ApiError(400, 'Validation failed', {
      success: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Validation failed',
        details: { fields: [{ field: 'email', error: 'Invalid email address' }] },
      },
    });
    expect(getApiErrorFields(err)).toEqual([
      { field: 'email', message: 'Invalid email address' },
    ]);
  });
});
