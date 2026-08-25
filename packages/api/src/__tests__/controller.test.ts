import { describe, it, expect } from 'vitest';
import { ok, created, noContent, paginated, errorResult } from '../controller/types';

describe('controller helpers', () => {
  describe('ok', () => {
    it('returns 200 with success envelope', () => {
      const result = ok({ name: 'test' });
      expect(result.statusCode).toBe(200);
      expect(result.body?.success).toBe(true);
      if (result.body?.success) {
        expect(result.body.data).toEqual({ name: 'test' });
      }
    });
  });

  describe('created', () => {
    it('returns 201 with success envelope', () => {
      const result = created({ id: 42 });
      expect(result.statusCode).toBe(201);
      expect(result.body?.success).toBe(true);
    });
  });

  describe('noContent', () => {
    it('returns 204 with no body', () => {
      const result = noContent();
      expect(result.statusCode).toBe(204);
      expect(result.body).toBeUndefined();
    });
  });

  describe('paginated', () => {
    it('returns 200 with pagination meta', () => {
      const result = paginated({
        data: [1, 2, 3],
        page: 1,
        pageSize: 10,
        total: 3,
        totalPages: 1,
      });
      expect(result.statusCode).toBe(200);
      if (result.body?.success) {
        expect(result.body.data).toEqual([1, 2, 3]);
        expect(result.body.meta?.pagination?.total).toBe(3);
      }
    });
  });

  describe('errorResult', () => {
    it('returns error envelope with correct status', () => {
      const result = errorResult('NOT_FOUND', 'not found');
      expect(result.statusCode).toBe(404);
      expect(result.body?.success).toBe(false);
    });
  });
});
