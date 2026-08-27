import type { User } from '@mawsoftwares/sdk/domains/user';
import { createTestEmail, createTestTimestamps } from './primitives';

export function createTestUser(overrides?: Partial<User>): User {
  return {
    email: createTestEmail(),
    role: 'viewer',
    createdAt: createTestTimestamps().createdAt,
    ...overrides,
  };
}
