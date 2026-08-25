import type { Request, Response, NextFunction, RequestHandler } from 'express';

export function correlationIdMiddleware(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const correlationId =
      (req.headers['x-correlation-id'] as string | undefined) ??
      (req.headers['x-request-id'] as string | undefined) ??
      '';
    req.headers['x-correlation-id'] = correlationId;
    if (correlationId) {
      res.setHeader('x-correlation-id', correlationId);
    }
    next();
  };
}
