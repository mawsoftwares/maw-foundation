import { describe, it, expect } from 'vitest';
import { translateError, withErrorTranslation } from '../errors/translate';
import { AppError, ErrorCode } from '@mawsoftwares/sdk/kernel/errors';

describe('translateError', () => {
  it('maps AppError to correct status via toHttpStatus', () => {
    const err = new AppError(ErrorCode.NOT_FOUND, 'not found', 404);
    const result = translateError(err, 'req-1');
    expect(result.statusCode).toBe(404);
    expect(result.body?.success).toBe(false);
    if (result.body && !result.body.success) {
      expect(result.body.error.code).toBe(ErrorCode.NOT_FOUND);
      expect(result.body.error.requestId).toBe('req-1');
    }
  });

  it('maps generic Error to 500', () => {
    const result = translateError(new Error('crash'));
    expect(result.statusCode).toBe(500);
    if (result.body && !result.body.success) {
      expect(result.body.error.code).toBe('INTERNAL');
      expect(result.body.error.message).toBe('Internal server error');
    }
  });

  it('maps structural AppError-like values', () => {
    const result = translateError({
      code: 'DUPLICATE_EMAIL',
      statusCode: 409,
      message: 'An account with this email already exists',
    });
    expect(result.statusCode).toBe(409);
    if (result.body && !result.body.success) {
      expect(result.body.error.code).toBe('DUPLICATE_EMAIL');
      expect(result.body.error.message).toBe('An account with this email already exists');
    }
  });

  it('maps non-Error to 500', () => {
    const result = translateError('string error');
    expect(result.statusCode).toBe(500);
  });
});

describe('withErrorTranslation', () => {
  it('passes through successful controller results', async () => {
    const controller = async () => ({
      statusCode: 200,
      body: { success: true as const, data: 'ok' },
    });
    const safe = withErrorTranslation(controller);
    const result = await safe({
      body: undefined,
      params: {},
      query: {},
      context: {
        requestId: 'r1',
        correlationId: 'c1',
        timestamp: new Date().toISOString(),
      },
    });
    expect(result.statusCode).toBe(200);
  });

  it('catches thrown AppError and translates', async () => {
    const controller = async () => {
      throw new AppError(ErrorCode.FORBIDDEN, 'no access', 403);
    };
    const safe = withErrorTranslation(controller);
    const result = await safe({
      body: undefined,
      params: {},
      query: {},
      context: {
        requestId: 'r2',
        correlationId: 'c2',
        timestamp: new Date().toISOString(),
      },
    });
    expect(result.statusCode).toBe(403);
  });
});
