/**
 * Express audit middleware — auto-records every authenticated request.
 * Framework-agnostic core; this file provides the Express adapter.
 */

import type { IAuditStore, AuditInput } from './types';

interface AuditMiddlewareOptions {
  store: IAuditStore;
  extractUser: (req: unknown) => { tenantId: string; userId: string } | undefined;
  ignorePaths?: readonly string[];
  extractDetails?: (req: unknown, res: unknown) => Record<string, unknown> | undefined;
}

type Middleware = (req: unknown, res: unknown, next: () => void) => void;

export function createAuditMiddleware(options: AuditMiddlewareOptions): Middleware {
  const {
    store,
    extractUser,
    ignorePaths = ['/health'],
    extractDetails,
  } = options;

  return (req: unknown, res: unknown, next: () => void) => {
    const r = req as { method: string; path: string; ip?: string };
    const s = res as { statusCode: number; end: (...args: unknown[]) => unknown };

    if (ignorePaths.some((p) => r.path === p || r.path.startsWith(p + '/'))) {
      next();
      return;
    }

    const origEnd = s.end;
    s.end = function (...args: unknown[]) {
      const user = extractUser(req);
      if (user) {
        const entry: AuditInput = {
          tenantId: user.tenantId,
          userId: user.userId,
          action: r.method,
          resource: r.path,
          ip: r.ip,
          details: extractDetails
            ? extractDetails(req, res)
            : { statusCode: s.statusCode },
        };
        void store.record(entry);
      }
      return origEnd.apply(s, args);
    };

    next();
  };
}
