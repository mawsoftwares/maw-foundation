import type { ErrorCodeValue } from '@maw/sdk/kernel/errors';
import { toHttpStatus } from '@maw/sdk/kernel/errors';
import type { PaginatedResult } from '@maw/sdk/config/constants';
import type { RequestContext } from '../context/types';
import type { ApiEnvelope } from '../response/types';
import { ApiResponse } from '../response/formatter';

export interface ControllerInput<
  TBody = unknown,
  TParams = Record<string, string>,
  TQuery = Record<string, string | string[] | undefined>,
> {
  readonly body: TBody;
  readonly params: TParams;
  readonly query: TQuery;
  readonly context: RequestContext;
}

export interface ControllerResult<T = unknown> {
  readonly statusCode: number;
  readonly body?: ApiEnvelope<T>;
  readonly headers?: Record<string, string>;
}

export type Controller<
  TBody = unknown,
  TParams = Record<string, string>,
  TQuery = Record<string, string | string[] | undefined>,
  TResult = unknown,
> = (input: ControllerInput<TBody, TParams, TQuery>) => Promise<ControllerResult<TResult>>;

export function ok<T>(data: T, message?: string): ControllerResult<T> {
  return { statusCode: 200, body: ApiResponse.success(data, message) };
}

export function created<T>(data: T, message?: string): ControllerResult<T> {
  return { statusCode: 201, body: ApiResponse.success(data, message) };
}

export function accepted<T>(data: T, message?: string): ControllerResult<T> {
  return { statusCode: 202, body: ApiResponse.success(data, message) };
}

export function noContent(): ControllerResult<never> {
  return { statusCode: 204 };
}

export function paginated<T>(result: PaginatedResult<T>): ControllerResult<T[]> {
  return { statusCode: 200, body: ApiResponse.paginated(result) };
}

export function errorResult(
  code: ErrorCodeValue,
  message: string,
  details?: Record<string, unknown>,
): ControllerResult<never> {
  return {
    statusCode: toHttpStatus(code),
    body: ApiResponse.error(code, message, details),
  };
}
