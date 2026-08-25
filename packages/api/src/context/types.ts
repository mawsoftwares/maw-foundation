import { randomUUID } from 'node:crypto';

export interface RequestContext {
  readonly requestId: string;
  readonly correlationId: string;
  readonly userId?: string;
  readonly tenantId?: string;
  readonly sessionId?: string;
  readonly roles?: readonly string[];
  readonly permissions?: readonly string[];
  readonly locale?: string;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly timestamp: string;
}

export function createRequestContext(
  partial?: Partial<RequestContext>,
): RequestContext {
  const requestId = partial?.requestId ?? randomUUID();
  return {
    requestId,
    correlationId: partial?.correlationId ?? requestId,
    timestamp: partial?.timestamp ?? new Date().toISOString(),
    ...partial,
  };
}
