import type { RequestContext } from '../context/types';
import { createRequestContext } from '../context/types';
import type { ApiSuccessResponse, ApiErrorResponse } from '../response/types';
import type { ErrorCodeValue } from '@maw/sdk/kernel/errors';

export function assertSuccessEnvelope<T>(
  response: unknown,
): asserts response is ApiSuccessResponse<T> {
  const r = response as Record<string, unknown>;
  if (r.success !== true) {
    throw new Error(`Expected success response, got: ${JSON.stringify(response)}`);
  }
  if (!('data' in r)) {
    throw new Error('Success response missing "data" field');
  }
}

export function assertErrorEnvelope(
  response: unknown,
  expectedCode?: ErrorCodeValue | string,
): asserts response is ApiErrorResponse {
  const r = response as Record<string, unknown>;
  if (r.success !== false) {
    throw new Error(`Expected error response, got: ${JSON.stringify(response)}`);
  }
  const error = r.error as Record<string, unknown> | undefined;
  if (error === undefined || typeof error.code !== 'string' || typeof error.message !== 'string') {
    throw new Error('Error response missing "error.code" or "error.message"');
  }
  if (expectedCode !== undefined && error.code !== expectedCode) {
    throw new Error(`Expected error code "${expectedCode}", got "${error.code}"`);
  }
}

export function assertPaginatedResponse<T>(
  response: unknown,
): asserts response is ApiSuccessResponse<T[]> {
  assertSuccessEnvelope(response);
  const meta = (response as ApiSuccessResponse<T[]>).meta;
  if (meta?.pagination === undefined) {
    throw new Error('Paginated response missing "meta.pagination"');
  }
  const p = meta.pagination;
  if (typeof p.page !== 'number' || typeof p.pageSize !== 'number' ||
      typeof p.total !== 'number' || typeof p.totalPages !== 'number') {
    throw new Error('Invalid pagination meta shape');
  }
}

export function createMockRequestContext(
  overrides?: Partial<RequestContext>,
): RequestContext {
  return createRequestContext({
    requestId: 'test-request-id',
    correlationId: 'test-correlation-id',
    userId: 'test-user',
    tenantId: 'test-tenant',
    timestamp: '2024-01-01T00:00:00.000Z',
    ...overrides,
  });
}
