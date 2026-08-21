import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { AppError, ErrorCode } from '@maw/sdk/kernel/errors';
import { HttpStatus } from '@maw/sdk/config/constants';

export interface GlobalErrorHandlerOptions {
  readonly redact?: <T>(obj: T) => T;
  readonly logger?: { error: (message: string, context?: Record<string, unknown>) => void };
}

export function createGlobalErrorHandler(
  options: GlobalErrorHandlerOptions = {},
): ErrorRequestHandler {
  const logger = options.logger ?? { error: (msg: string, ctx?: Record<string, unknown>) => console.error(msg, ctx) };
  const { redact } = options;

  return (err: unknown, req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      const body = {
        error: err.message,
        code: err.code,
        ...(err.details !== undefined ? { details: redact ? redact(err.details) : err.details } : {}),
      };
      res.status(err.statusCode).json(body);
      return;
    }

    const message = err instanceof Error ? err.message : 'Unknown error';
    const logPayload = { message, path: req.path, method: req.method };
    logger.error('Unhandled error', redact ? redact(logPayload) : logPayload);

    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: 'Internal server error',
      code: ErrorCode.INTERNAL,
    });
  };
}
