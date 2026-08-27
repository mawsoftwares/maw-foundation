import type { ErrorHandler } from 'hono';
import { AppError, ErrorCode } from '@mawsoftwares/sdk/kernel/errors';
import { ApiResponse } from '@mawsoftwares/api';

export interface GlobalErrorHandlerOptions {
  readonly redact?: <T>(obj: T) => T;
  readonly logger?: { error: (message: string, ...args: readonly unknown[]) => void };
}

export function createGlobalErrorHandler(
  options: GlobalErrorHandlerOptions = {},
): ErrorHandler {
  const { redact, logger = console } = options;

  return (err, c) => {
    const requestId = c.req.header('x-request-id');

    const errObj = err as any;
    const isAppError = errObj && typeof errObj === 'object' && 'code' in errObj && 'statusCode' in errObj && 'message' in errObj;

    if (isAppError) {
      const details = errObj.details !== undefined
        ? (redact ? redact(errObj.details) : errObj.details) as Record<string, unknown>
        : undefined;
      const body = ApiResponse.error(errObj.code, errObj.message, details, requestId);
      return c.json(body, errObj.statusCode as 400);
    }

    const message = err instanceof Error ? err.message : 'Unknown error';
    const logPayload = { message, path: c.req.path, method: c.req.method };
    logger.error('Unhandled error', redact ? redact(logPayload) : logPayload);

    return c.json(
      ApiResponse.error(ErrorCode.INTERNAL, 'Internal server error', undefined, requestId),
      500,
    );
  };
}
