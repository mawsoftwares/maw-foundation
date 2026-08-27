import { isAppError, ErrorCode, toHttpStatus } from '@mawsoftwares/sdk/kernel/errors';
import type { ControllerResult, Controller } from '../controller/types';
import { ApiResponse } from '../response/formatter';

export function translateError(err: unknown, requestId?: string): ControllerResult<never> {
  if (isAppError(err)) {
    return {
      statusCode: err.statusCode,
      body: ApiResponse.fromAppError(err, requestId),
    };
  }

  return {
    statusCode: toHttpStatus(ErrorCode.INTERNAL),
    body: ApiResponse.error(
      ErrorCode.INTERNAL,
      'Internal server error',
      undefined,
      requestId,
    ),
  };
}

export function withErrorTranslation<
  TBody = unknown,
  TParams = Record<string, string>,
  TQuery = Record<string, string | string[] | undefined>,
  TResult = unknown,
>(
  controller: Controller<TBody, TParams, TQuery, TResult>,
): Controller<TBody, TParams, TQuery, TResult> {
  return async (input) => {
    try {
      return await controller(input);
    } catch (err) {
      return translateError(err, input.context.requestId) as ControllerResult<TResult>;
    }
  };
}
