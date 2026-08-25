import type { AccountStatusValue } from '../security/AccountStatus';

export interface UserRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly role: string;
  readonly name?: string;
  readonly accountStatus: AccountStatusValue;
  readonly emailVerified: boolean;
  readonly mfaEnabled: boolean;
  readonly lastLoginAt?: string;
  readonly phone?: string;
  readonly phoneVerified?: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateUserInput {
  readonly tenantId: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly role: string;
  readonly name?: string;
  readonly accountStatus: AccountStatusValue;
}

export interface IUserRepository {
  findById(id: string): Promise<UserRecord | null>;
  findByEmail(tenantId: string, email: string): Promise<UserRecord | null>;
  create(input: CreateUserInput): Promise<UserRecord>;
  updatePassword(userId: string, passwordHash: string): Promise<void>;
  updateStatus(userId: string, status: AccountStatusValue): Promise<void>;
  updateEmailVerified(userId: string, verified: boolean): Promise<void>;
  updateLastLogin(userId: string, timestamp: string): Promise<void>;
  updateMfaEnabled(userId: string, enabled: boolean): Promise<void>;
}
