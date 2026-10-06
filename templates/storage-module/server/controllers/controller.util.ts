import type { RequestContext } from '@mawsoftwares/api';
import { UnauthorizedError } from '@mawsoftwares/sdk/kernel/errors';
import type { StorageActor } from '../services/mappers';

/**
 * Tenant and user always come from the authenticated request context (JWT claims) —
 * never from the body, query or headers supplied by the client.
 */
export function actorOf(context: RequestContext): StorageActor {
  if (context.tenantId === undefined || context.tenantId.length === 0) {
    throw new UnauthorizedError('Tenant context required');
  }
  return { tenantId: context.tenantId, userId: context.userId ?? null };
}

export function paramOf(params: Record<string, string>, name: string): string {
  return params[name] ?? '';
}
