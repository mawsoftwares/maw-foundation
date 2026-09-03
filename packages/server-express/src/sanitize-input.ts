import type { RequestHandler, Request, Response, NextFunction } from 'express';

const SCRIPT_RE = /<script[\s\S]*?<\/script>/gi;
const HTML_TAG_RE = /<\/?[a-z][^>]*>/gi;
const EVENT_HANDLER_RE = /\bon\w+\s*=/gi;
const JS_URI_RE = /javascript\s*:/gi;
const DATA_HTML_URI_RE = /data\s*:\s*text\/html/gi;
const NULL_BYTE_RE = /\0/g;
// HTML entity-encoded angle brackets: &#60; &#x3C; &lt; (and closing variants)
const ENTITY_TAG_RE = /(?:&#(?:x3[cC]|0*60);|&lt;)\/?[a-z][\s\S]*?(?:&#(?:x3[eE]|0*62);|&gt;)/gi;

function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return value
      .replace(NULL_BYTE_RE, '')
      .replace(SCRIPT_RE, '')
      .replace(ENTITY_TAG_RE, '')
      .replace(HTML_TAG_RE, '')
      .replace(EVENT_HANDLER_RE, '')
      .replace(JS_URI_RE, '')
      .replace(DATA_HTML_URI_RE, '');
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
