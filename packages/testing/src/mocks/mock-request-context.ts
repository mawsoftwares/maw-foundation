import { newId } from '@mawsoftwares/sdk/kernel/id';
import { DEFAULT_TENANT_ID } from '@mawsoftwares/sdk/contracts/identity';

export interface RequestContext {
  readonly requestId: string;
  readonly correlationId: string;
  readonly userId: string;
  readonly tenantId: string;
  readonly timestamp: string;
}

export function createMockRequestContext(overrides?: Partial<RequestContext>): RequestContext {
  return {
    requestId: newId('req'),
    correlationId: newId('cor'),
    userId: newId('user'),
    tenantId: DEFAULT_TENANT_ID,
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}
