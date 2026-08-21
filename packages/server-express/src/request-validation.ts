import type { RequestHandler, Request, Response, NextFunction } from 'express';
import { HttpStatus } from '@maw/sdk/config/constants';

export interface ValidationSchema {
  readonly parse: (data: unknown) => unknown;
}

export function validateBody(schema: ValidationSchema): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid request body';
      res.status(HttpStatus.BAD_REQUEST).json({ error: 'Validation failed', details: message });
    }
  };
}

export function validateQuery(schema: ValidationSchema): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.query);
      next();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid query parameters';
      res.status(HttpStatus.BAD_REQUEST).json({ error: 'Validation failed', details: message });
    }
  };
}

export function validateParams(schema: ValidationSchema): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.params);
      next();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid path parameters';
      res.status(HttpStatus.BAD_REQUEST).json({ error: 'Validation failed', details: message });
    }
  };
}
