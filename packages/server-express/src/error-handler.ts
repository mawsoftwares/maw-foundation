import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ErrorCode, isAppErrorLike } from '@mawsoftwares/sdk/kernel/errors';
import { HttpStatus } from '@mawsoftwares/sdk/config/constants';
import { ApiResponse } from '@mawsoftwares/api';

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
    const requestId = req.headers['x-request-id'] as string | undefined;

    if (isAppErrorLike(err)) {
      const details = err.details !== undefined
        ? (redact ? redact(err.details) : err.details)
        : undefined;
      res.status(err.statusCode).json(
        ApiResponse.error(err.code, err.message, details, requestId),
      );
      return;
    }

    const message = err instanceof Error ? err.message : 'Unknown error';
    const logPayload = { message, path: req.path, method: req.method };
    logger.error('Unhandled error', redact ? redact(logPayload) : logPayload);

    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      ApiResponse.error(ErrorCode.INTERNAL, 'Internal server error', undefined, requestId),
    );
  };
}
