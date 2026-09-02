import type { ErrorHandler } from 'hono';
import { ErrorCode, isAppErrorLike } from '@mawsoftwares/sdk/kernel/errors';
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

    if (isAppErrorLike(err)) {
      const details = err.details !== undefined
        ? (redact ? redact(err.details) : err.details)
        : undefined;
      return c.json(
        ApiResponse.error(err.code, err.message, details, requestId),
        err.statusCode as 400,
      );
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
