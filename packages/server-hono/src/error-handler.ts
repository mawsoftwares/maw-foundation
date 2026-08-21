import type { ErrorHandler } from 'hono';
import { AppError, ErrorCode } from '@maw/sdk/kernel/errors';

export interface GlobalErrorHandlerOptions {
  readonly redact?: <T>(obj: T) => T;
  readonly logger?: { error: (message: string, ...args: readonly unknown[]) => void };
}

export function createGlobalErrorHandler(
  options: GlobalErrorHandlerOptions = {},
): ErrorHandler {
  const { redact, logger = console } = options;

  return (err, c) => {
    if (err instanceof AppError) {
      const body = {
        error: err.message,
        code: err.code,
        ...(err.details !== undefined ? { details: redact ? redact(err.details) : err.details } : {}),
      };
      return c.json(body, err.statusCode as 400);
    }

    const message = err instanceof Error ? err.message : 'Unknown error';
    const logPayload = { message, path: c.req.path, method: c.req.method };
    logger.error('Unhandled error', redact ? redact(logPayload) : logPayload);

    return c.json({ error: 'Internal server error', code: ErrorCode.INTERNAL }, 500);
  };
}
