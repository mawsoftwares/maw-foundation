import type { AccountStatusValue } from '@mawsoftwares/sdk/security/AccountStatus';

// ── Create ─────────────────────────────────────────────────────────────────

export interface CreateUserDto {
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password?: string;
  avatar?: string;
  role?: string;
  roleId?: string;      // Optional RBAC role assignment

  // Add project-specific fields here (must match User entity)
}

export const CreateUserSchema = {
  firstName: { required: true, minLength: 1, maxLength: 100 },
  lastName:  { required: true, minLength: 1, maxLength: 100 },
  email:     { required: true, format: 'email' },
} as const;

// ── Update ─────────────────────────────────────────────────────────────────

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  role?: string;
  status?: AccountStatusValue;

  // Add project-specific fields here
}

// ── Response ───────────────────────────────────────────────────────────────

export interface UserResponseDto {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
  role?: string;
  status: AccountStatusValue;
  emailVerifiedAt?: string;
  phoneVerifiedAt?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;

  // Add project-specific response fields here
}

// ── List ───────────────────────────────────────────────────────────────────

export interface ListUsersQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  status?: AccountStatusValue;
  role?: string;
  createdFrom?: string;
  createdTo?: string;
}

export interface ListUsersResponseDto {
  items: UserResponseDto[];
  total: number;
  page: number;
  pageSize: number;
}
