import type { AccountStatusValue } from '@mawsoftwares/sdk/security/AccountStatus';

/**
 * Web-side user contract. Keep in step with `server/application/dto/index.ts` when you add or rename fields — the
 * web module deliberately does not import server code, so it can be copied into a front-end-only app on its own.
 */
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
}

export interface CreateUserDto {
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password?: string;
  /** Auth role code (preferred). */
  role?: string;
  /** Profile image URL (e.g. from /files/upload). */
  avatar?: string;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  role?: string;
  status?: AccountStatusValue;
}

export interface UsersListResult {
  items: UserResponseDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface RoleOption {
  readonly code: string;
  readonly name: string;
}
