import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { AppError, ErrorCode } from '@mawsoftwares/sdk/kernel/errors';
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

    const errObj = err as any;
    const isAppError = errObj && typeof errObj === 'object' && 'code' in errObj && 'statusCode' in errObj && 'message' in errObj;

    if (isAppError) {
      const details = errObj.details !== undefined
        ? (redact ? redact(errObj.details) : errObj.details) as Record<string, unknown>
        : undefined;
      const body = ApiResponse.error(errObj.code, errObj.message, details, requestId);
      res.status(errObj.statusCode).json(body);
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
