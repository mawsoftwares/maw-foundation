import { describe, it, expect, vi } from 'vitest';
import { AppError, ErrorCode } from '@mawsoftwares/sdk/kernel/errors';
import { createGlobalErrorHandler } from './error-handler';
import type { Request, Response, NextFunction } from 'express';

function mockRes() {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(body: unknown) {
      res.body = body;
      return res;
    },
  };
  return res;
}

describe('createGlobalErrorHandler', () => {
  it('maps AppError to the standard envelope', () => {
    const handler = createGlobalErrorHandler({ logger: { error: vi.fn() } });
    const res = mockRes();
    const req = { headers: { 'x-request-id': 'req-1' }, path: '/api/v1/users', method: 'POST' };

    handler(
      new AppError(ErrorCode.DUPLICATE_EMAIL, 'An account with this email already exists', 409, { field: 'email' }),
      req as unknown as Request,
      res as unknown as Response,
      vi.fn() as unknown as NextFunction,
    );

    expect(res.statusCode).toBe(409);
    expect(res.body).toEqual({
      success: false,
      error: {
        code: 'DUPLICATE_EMAIL',
        message: 'An account with this email already exists',
        details: { field: 'email' },
        requestId: 'req-1',
      },
    });
  });

  it('hides generic Error messages', () => {
    const handler = createGlobalErrorHandler({ logger: { error: vi.fn() } });
    const res = mockRes();
    const req = { headers: {}, path: '/api/v1/users', method: 'POST' };

    handler(
      new Error('USER_EMAIL_ALREADY_EXISTS'),
      req as unknown as Request,
      res as unknown as Response,
      vi.fn() as unknown as NextFunction,
    );

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      success: false,
      error: { code: 'INTERNAL', message: 'Internal server error' },
    });
  });
});
