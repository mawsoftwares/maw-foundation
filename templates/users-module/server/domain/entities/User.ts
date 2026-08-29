import type { AuditableEntity, TenantScopedEntity, SoftDeletableEntity } from '@mawsoftwares/database';
import type { AccountStatusValue } from '@mawsoftwares/sdk/security/AccountStatus';

/**
 * Users Module Template — User Entity
 *
 * This is the CANONICAL baseline. In your project, freely add fields:
 *
 * Restaurant SaaS:
 *   waiterCode?: string;
 *   outletId?: string;
 *   operationalRole?: string;
 *   cashierAccess?: boolean;
 *   kitchenAccess?: boolean;
 *
 * ERP / HR:
 *   employeeCode?: string;
 *   departmentId?: string;
 *   plantId?: string;
 *   designation?: string;
 *   shift?: string;
 *   joiningDate?: string;
 *
 * CRM:
 *   salesRegion?: string;
 *   teamId?: string;
 *   targetAmount?: number;
 *
 * After adding fields, update:
 *   - infrastructure/database/migrations/001_create_users_table.ts
 *   - infrastructure/repositories/UserRepository.ts (mapper + insert columns)
 *   - application/dto/index.ts (CreateUserDto, UpdateUserDto, UserResponseDto)
 *   - web/components/UserForm.tsx (add form fields)
 */
export interface User extends AuditableEntity, TenantScopedEntity, SoftDeletableEntity {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  passwordHash: string;
  avatar?: string;
  /** RBAC role code (e.g. 'owner', 'manager', 'viewer'). */
  role?: string;
  status: AccountStatusValue;
  emailVerifiedAt?: string;
  phoneVerifiedAt?: string;
  lastLoginAt?: string;

  // ── Add project-specific fields below ────────────────────────────────────
}
