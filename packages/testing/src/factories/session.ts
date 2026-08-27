import type { Session } from '@mawsoftwares/sdk/contracts/identity';
import { DEFAULT_TENANT_ID } from '@mawsoftwares/sdk/contracts/identity';
import { createTestUserId } from './primitives';

export function createTestSession(overrides?: Partial<Session>): Session {
  return {
    userId: createTestUserId(),
    tenantId: DEFAULT_TENANT_ID,
    role: 'admin',
    entitlements: [],
    ...overrides,
  };
}
