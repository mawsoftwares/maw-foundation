import { AppError, isAppError, type ErrorCodeValue } from '@mawsoftwares/sdk/kernel/errors';
import type { PaginatedResult } from '@mawsoftwares/sdk/config/constants';
import type {
  ApiSuccessResponse,
  ApiErrorResponse,
  ApiErrorDetail,
  ResponseMeta,
  PaginationMeta,
} from './types';

export const ApiResponse = {
  success<T>(data: T, message?: string, meta?: ResponseMeta): ApiSuccessResponse<T> {
    return {
      success: true,
      data,
      ...(message !== undefined ? { message } : {}),
      ...(meta !== undefined ? { meta } : {}),
    };
  },

  created<T>(data: T, message?: string): ApiSuccessResponse<T> & { readonly _statusHint: 201 } {
    return {
      ...ApiResponse.success(data, message),
      _statusHint: 201 as const,
    };
  },

  noContent(): { readonly _statusHint: 204 } {
    return { _statusHint: 204 as const };
  },

  paginated<T>(
    result: PaginatedResult<T>,
    extraMeta?: Partial<ResponseMeta>,
  ): ApiSuccessResponse<T[]> {
    const pagination: PaginationMeta = {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      totalPages: result.totalPages,
    };
    return {
      success: true,
      data: result.data,
      meta: { ...extraMeta, pagination },
    };
  },

  error(
    code: ErrorCodeValue | string,
    message: string,
    details?: readonly ApiErrorDetail[] | Record<string, unknown>,
    requestId?: string,
  ): ApiErrorResponse {
    return {
      success: false,
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
        ...(requestId !== undefined ? { requestId } : {}),
      },
    };
  },

  fromAppError(err: AppError, requestId?: string): ApiErrorResponse {
    return ApiResponse.error(err.code, err.message, err.details as Record<string, unknown> | undefined, requestId);
  },

  fromUnknownError(err: unknown, requestId?: string): ApiErrorResponse {
    if (isAppError(err)) return ApiResponse.fromAppError(err, requestId);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return ApiResponse.error('INTERNAL', message, undefined, requestId);
  },
} as const;
