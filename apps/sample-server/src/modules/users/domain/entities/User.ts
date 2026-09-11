import type {
  AuditableEntity,
  TenantScopedEntity,
  SoftDeletableEntity,
} from '@mawsoftwares/database';
import type { AccountStatusValue } from '@mawsoftwares/sdk/security/AccountStatus';

export interface User extends AuditableEntity, TenantScopedEntity, SoftDeletableEntity {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  passwordHash: string;
  avatar?: string;
  /** Auth / RBAC role code (e.g. owner, manager). Optional on the domain; required in auth persistence. */
  role?: string;
  status: AccountStatusValue;
  emailVerifiedAt?: string;
  phoneVerifiedAt?: string;
  lastLoginAt?: string;
}
