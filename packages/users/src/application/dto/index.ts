import {
  required,
  email,
  phone,
  minLength,
  maxLength,
} from '@maw/sdk/kernel/validate';
import type { AccountStatusValue } from '@maw/sdk/security/AccountStatus';

export interface CreateUserDto {
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password?: string;
  roleId?: string; // Optional RBAC role integration
}

export const CreateUserSchema = {
  tenantId: [required],
  firstName: [required, minLength(1), maxLength(100)],
  lastName: [required, minLength(1), maxLength(100)],
  email: [required, email],
  phone: [(val: string | undefined) => (val ? phone(val) : { valid: true })],
  password: [required, minLength(8)],
};

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  status?: AccountStatusValue;
}

export const UpdateUserSchema = {
  firstName: [(val: string | undefined) => (val === undefined ? { valid: true } : minLength(1)(val))],
  lastName: [(val: string | undefined) => (val === undefined ? { valid: true } : minLength(1)(val))],
  email: [(val: string | undefined) => (val === undefined ? { valid: true } : email(val))],
  phone: [(val: string | undefined) => (val === undefined ? { valid: true } : phone(val))],
};

export interface ListUsersQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  status?: AccountStatusValue;
  role?: string;
  createdFrom?: string;
  createdTo?: string;
}

export interface UserResponseDto {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
  status: AccountStatusValue;
  emailVerifiedAt?: string;
  phoneVerifiedAt?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedUserResponse {
  items: UserResponseDto[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
