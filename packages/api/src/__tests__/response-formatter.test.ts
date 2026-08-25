import { describe, it, expect } from 'vitest';
import { ApiResponse } from '../response/formatter';
import { AppError, ErrorCode } from '@maw/sdk/kernel/errors';

describe('ApiResponse', () => {
  describe('success', () => {
    it('wraps data in standard envelope', () => {
      const result = ApiResponse.success({ id: 1, name: 'test' });
      expect(result).toEqual({
        success: true,
        data: { id: 1, name: 'test' },
      });
    });

    it('includes optional message', () => {
      const result = ApiResponse.success('ok', 'Operation completed');
      expect(result.message).toBe('Operation completed');
    });

    it('includes optional meta', () => {
      const result = ApiResponse.success('ok', undefined, { requestId: 'abc' });
      expect(result.meta).toEqual({ requestId: 'abc' });
    });
  });

  describe('created', () => {
    it('returns success envelope with 201 hint', () => {
      const result = ApiResponse.created({ id: 42 });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 42 });
      expect(result._statusHint).toBe(201);
    });
  });

  describe('noContent', () => {
    it('returns 204 hint', () => {
      const result = ApiResponse.noContent();
      expect(result._statusHint).toBe(204);
    });
  });

  describe('paginated', () => {
    it('wraps PaginatedResult with pagination meta', () => {
      const result = ApiResponse.paginated({
        data: [{ id: 1 }, { id: 2 }],
        page: 1,
        pageSize: 10,
        total: 25,
        totalPages: 3,
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.meta?.pagination).toEqual({
        page: 1,
        pageSize: 10,
        total: 25,
        totalPages: 3,
      });
    });
  });

  describe('error', () => {
    it('wraps error in standard envelope', () => {
      const result = ApiResponse.error('NOT_FOUND', 'Resource not found');
      expect(result).toEqual({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Resource not found' },
      });
    });

    it('includes requestId when provided', () => {
      const result = ApiResponse.error('INTERNAL', 'fail', undefined, 'req-123');
      expect(result.error.requestId).toBe('req-123');
    });

    it('includes details when provided', () => {
      const result = ApiResponse.error('VALIDATION', 'Invalid input', [
        { field: 'email', message: 'required' },
      ]);
      expect(result.error.details).toHaveLength(1);
    });
  });

  describe('fromAppError', () => {
    it('translates AppError to standard envelope', () => {
      const err = new AppError(ErrorCode.NOT_FOUND, 'User not found', 404);
      const result = ApiResponse.fromAppError(err, 'req-456');
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(ErrorCode.NOT_FOUND);
      expect(result.error.message).toBe('User not found');
      expect(result.error.requestId).toBe('req-456');
    });
  });

  describe('fromUnknownError', () => {
    it('handles AppError', () => {
      const err = new AppError(ErrorCode.FORBIDDEN, 'No access', 403);
      const result = ApiResponse.fromUnknownError(err);
      expect(result.error.code).toBe(ErrorCode.FORBIDDEN);
    });

    it('handles generic Error', () => {
      const result = ApiResponse.fromUnknownError(new Error('boom'));
      expect(result.error.code).toBe('INTERNAL');
      expect(result.error.message).toBe('boom');
    });

    it('handles non-Error values', () => {
      const result = ApiResponse.fromUnknownError('something');
      expect(result.error.code).toBe('INTERNAL');
    });
  });
});
