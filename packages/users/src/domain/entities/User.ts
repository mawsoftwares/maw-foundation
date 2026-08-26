import type {
  AuditableEntity,
  TenantScopedEntity,
  SoftDeletableEntity,
} from '@maw/database';
import type { AccountStatusValue } from '@maw/sdk/security/AccountStatus';

export interface User extends AuditableEntity, TenantScopedEntity, SoftDeletableEntity {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  passwordHash: string;
  avatar?: string;
  status: AccountStatusValue;
  emailVerifiedAt?: string;
  phoneVerifiedAt?: string;
  lastLoginAt?: string;
}
