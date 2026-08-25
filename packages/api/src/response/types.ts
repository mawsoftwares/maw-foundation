import type { ErrorCodeValue } from '@maw/sdk/kernel/errors';

export interface PaginationMeta {
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly totalPages: number;
}

export interface ResponseMeta {
  readonly requestId?: string;
  readonly timestamp?: string;
  readonly pagination?: PaginationMeta;
  readonly version?: string;
  readonly processingTimeMs?: number;
}

export interface ApiSuccessResponse<T> {
  readonly success: true;
  readonly data: T;
  readonly message?: string;
  readonly meta?: ResponseMeta;
}

export interface ApiErrorDetail {
  readonly field?: string;
  readonly code?: string;
  readonly message: string;
}

export interface ApiErrorBody {
  readonly code: ErrorCodeValue | string;
  readonly message: string;
  readonly details?: readonly ApiErrorDetail[] | Record<string, unknown>;
  readonly requestId?: string;
}

export interface ApiErrorResponse {
  readonly success: false;
  readonly error: ApiErrorBody;
}

export type ApiEnvelope<T> = ApiSuccessResponse<T> | ApiErrorResponse;
