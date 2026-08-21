import type { RequestHandler, Request, Response, NextFunction } from 'express';

const HTML_TAG_RE = /<\/?[a-z][^>]*>/gi;
const SCRIPT_RE = /<script[\s\S]*?<\/script>/gi;

function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.replace(SCRIPT_RE, '').replace(HTML_TAG_RE, '');
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value !== null && typeof value === 'object') {
    return sanitizeObject(value as Record<string, unknown>);
  }
  return value;
}

function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    result[key] = sanitizeValue(val);
  }
  return result;
}

export function createSanitizeMiddleware(): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (req.body !== undefined && req.body !== null && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body as Record<string, unknown>);
    }
    next();
  };
}
